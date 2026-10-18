// 话题 / 配置标签的 glossary 解析(spec 3.7):drain 的时间片(lib/i18n-pipeline/worker.ts)与
// scripts/i18n-backfill.ts --terms 调用。用 service client;纯模块,不引入 server-only(Bun 脚本共用)。
//
// 一轮 = 一次 i18n_claim_terms:租下 ≤ maxGroups 组(一组 = 一篇公开且已过审帖子的话题,或一辆在售车源的配置,
// 最多 40 个未解析写法),各组并行处理:
//   1. 每组一次 glossaryMessages 模型调用 —— 一次只含一个作者的标签,不会混入别人的内容。
//      调用没有产出(未配置、时间不够、429、401 / 402 / 400 / 404)→ 整组 retry:退还领取时扣的 attempts,按 Retry-After
//      再领(429 缺省 1 分钟,停机类 15 分钟),服务商故障不会把全站共享的写法耗成 dead;停机类(未配置、401 key 失效、
//      402 余额不足、400 / 404 模型 ID 无效或下线、数据策略下没有供应商 —— 对每次调用都一样失败)还经 result.halt
//      通知调用方停机。超时、5xx、网络错误 → failed(按退避重试)
//   2. validateGlossaryItem 逐项校验(按下标对应;tag 原样回显、slug 格式、六种语言标签与文字系统)
//   3. 不可信组(用户内容)把通过校验的标签整体过一次输出审核。判违规时:只有一个写法 → 它记 rejected(unsafe_label);
//      多个写法 → 逐个写法单独复审,只拒自己的标签违规的写法(写法全站共享,不能被同组别的标签连累)。
//      审核失败(含逐个复审失败)→ failed 稍后重试:未审核的标签不上线,也绝不因此记 rejected;
//      这时词表调用已经付费,所以不退 attempts(否则每次重试都要重付一次词表调用)。审核遇到与内容无关的
//      停机类失败(未配置、401 / 402 / 400 / 404)同样停机,本轮其余组不再送审
//   4. i18n_complete_term 逐个写回:只改被租的那条写法;只在 slug 完全相同时并入已有词条;
//      模型给的标签只落在新词条上,不会改写已有词条的标签,也不会变成新的写法(alias)。
//      库里还是旧版函数(没有 'retry' 结局)时 retry 按 failed 写回,与之前的行为一致
// 剩余时间 < 10 s 不开新一轮;模型调用次数与 token 记入每日预算(i18n_add_usage)。

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/sources/service-client";
import { AI_MODEL, callModelJson, isAiConfigured, type AiError, type AiResult } from "@/lib/ai/openrouter";
import { glossaryMessages } from "@/lib/i18n-pipeline/prompts";
import { validateGlossaryItem } from "@/lib/i18n-pipeline/validate";
import {
  isModerationFailure,
  moderateTranslationOutputDetailed,
  type ModerationFailure,
  type ModerationOutcome,
  type ModerationVerdict,
} from "@/lib/moderate";
import { isMissingFunctionError } from "@/lib/supabase-compat";
import { detectLang } from "@/lib/i18n/detect";
import { isSiteLocale } from "@/lib/i18n/content-langs";
import { LOCALES, type Locale } from "@/lib/i18n";

export interface ResolveTermsOptions {
  /** 绝对截止时间(ms 时间戳);剩余 < 10 s 时不再开始新一轮 */
  deadlineAt: number;
  /** 本轮最多租几组,默认 4(SQL 侧上限 20) */
  maxGroups?: number;
  log?: (m: string) => void;
}

type ModelFailure = Extract<AiResult<unknown>, { ok: false }>;

/** 停机原因,与 worker 的 run.halt 同形(drain 可直接 run.halt ??= result.halt) */
export interface TermsHalt {
  /** budget = 402 余额不足;not_configured = 未配置、401 key 失效、400 / 404 模型配置错误 */
  stop: "budget" | "not_configured";
  failure: ModelFailure;
}

export interface ResolveTermsResult {
  /** 本轮处理的组数;0 = 没有待解析的标签(或未配置模型 / 时间不够 / 预算用完) */
  groups: number;
  /** 写成 ok 的写法数 */
  resolved: number;
  /** 写成 rejected 的写法数(模型判定无意义,或自己的标签审核违规) */
  rejected: number;
  /** 写成 failed 的写法数(调用超时 / 出错、回复不合格、审核失败;按退避重试) */
  failed: number;
  /** 写成 retry 的写法数(词表调用没有产出:未配置、时间不够、限流、401 / 402 / 400 / 404;退还 attempts) */
  retried: number;
  /** 模型调用次数(glossary + 标签审核) */
  calls: number;
  /** 模型 401 / 402 / 400 / 404 或未配置:调用方应停止一切新的模型调用;null = 没有 */
  halt: TermsHalt | null;
}

/** i18n_claim_terms 的一行:一个被租下的写法 */
interface ClaimedAlias {
  kind: "topic" | "feature";
  group_id: string;
  alias_norm: string;
  sample_raw: string;
  lease_token: string;
  trusted: boolean;
}

type Accepted = { outcome: "ok"; slug: string; labels: Record<Locale, string> };
type Outcome =
  | Accepted
  | { outcome: "rejected" | "failed"; error: string }
  | { outcome: "retry"; error: string; retryAfterS: number };

interface GroupStats {
  resolved: number;
  rejected: number;
  failed: number;
  retried: number;
  calls: number;
  tokensIn: number;
  tokensOut: number;
}

/** 一轮内各组共享的状态 */
interface Round {
  svc: SupabaseClient;
  deadlineAt: number;
  log: (m: string) => void;
  /** 有组遇到停机类失败(未配置、401 / 402 / 400 / 404)后,本轮不再发新的审核调用 */
  halt: TermsHalt | null;
  /** 库里的 i18n_complete_term 还是旧版(没有 p_retry_after_s / 'retry'):retry 按 failed 写回 */
  legacyComplete: boolean;
}

const DEFAULT_MAX_GROUPS = 4;
const LEASE_SECONDS = 90;
const MIN_LEFT_MS = 10_000;
const MODEL_TITLE = "CLCAuto Glossary";
// retry 多久后再领(秒,SQL 封顶 1 h):429 没带 Retry-After、时间不够(请求没发出)1 分钟;停机类 15 分钟
const SHORT_RETRY_S = 60;
const SYSTEMIC_RETRY_S = 900;
// 停机类 http 状态(与 worker 的 HALT_HTTP 一致):401 key 失效、402 余额不足;400(词表请求不大,只会是模型 ID /
// 参数不被接受)和 404(模型下线、数据策略下没有可用的供应商)对每次调用都一样失败。都没有产出、不计费
const HALT_HTTP: ReadonlySet<number> = new Set([400, 401, 402, 404]);
// 逐个写法复审标签时最多同时在途的审核调用
const ALIAS_MODERATION_CONCURRENCY = 4;
// 死锁 / 锁等待超时:等 200–500 ms 重试一次(spec I15)
const RETRYABLE_SQLSTATES = new Set(["40P01", "55P03"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isAccepted = (x: Outcome): x is Accepted => x.outcome === "ok";

async function withRetry<T extends { error: PostgrestError | null }>(run: () => PromiseLike<T>): Promise<T> {
  const first = await run();
  if (!first.error || !RETRYABLE_SQLSTATES.has(first.error.code)) return first;
  await sleep(200 + Math.random() * 300);
  return run();
}

/** 写法本身的语言(展示规则:标签已是界面语言时原样显示);非站点语言记 null */
function aliasLang(raw: string): Locale | null {
  const { lang } = detectLang(raw);
  return isSiteLocale(lang) ? lang : null;
}

/** 按 (kind, group_id) 分组,保持认领顺序 */
function groupRows(rows: ClaimedAlias[]): ClaimedAlias[][] {
  const groups = new Map<string, ClaimedAlias[]>();
  for (const row of rows) {
    const key = `${row.kind}:${row.group_id}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()];
}

/** 并发 ≤ limit 地处理 items,结果按原顺序 */
async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return out;
}

/** 未配置 / 停机类 http → 停机原因(判断与 worker 的 noteFailure 一致):402 → budget,其余 not_configured;其余错误 null */
function haltOf(error: AiError | "verdict", status?: number): TermsHalt | null {
  if (error === "config") return { stop: "not_configured", failure: { ok: false, error } };
  if (error !== "http" || !HALT_HTTP.has(status ?? 0)) return null;
  return { stop: status === 402 ? "budget" : "not_configured", failure: { ok: false, error, status } };
}

/** 词表调用失败 → 写法结局(见文件头第 1 步) */
function glossaryFailure(r: ModelFailure): Outcome {
  switch (r.error) {
    case "config":
      return { outcome: "retry", error: "not_configured", retryAfterS: SYSTEMIC_RETRY_S };
    case "deadline":
      return { outcome: "retry", error: "deadline", retryAfterS: SHORT_RETRY_S };
    case "rate_limited":
      return {
        outcome: "retry",
        error: "rate_limited",
        retryAfterS: r.retryAfterMs ? Math.ceil(r.retryAfterMs / 1000) : SHORT_RETRY_S,
      };
    case "http":
      // 停机类:没有产出也不计费,退还 attempts(否则模型配置故障期间写法会被耗成 dead)
      if (HALT_HTTP.has(r.status ?? 0)) {
        return { outcome: "retry", error: `http_${r.status}`, retryAfterS: SYSTEMIC_RETRY_S };
      }
      return { outcome: "failed", error: `http_${r.status ?? 0}` };
    default:
      return { outcome: "failed", error: r.error };
  }
}

/** 审核失败 → failed 的错误文本(moderation_rate_limited、moderation_http_503…);null = 本轮已停机,没有送审 */
function moderationError(f: ModerationFailure | null): string {
  if (!f) return "moderation_halted";
  return `moderation_${f.error === "http" ? `http_${f.status ?? 0}` : f.error}`;
}

const categoriesOf = (v: ModerationVerdict) => v.categories.join(",") || "unsafe";

/** 送审写法的六种语言标签(每种语言一段、一个写法一行);本轮已停机时不发调用,返回 null */
async function moderateLabels(round: Round, items: readonly Accepted[]): Promise<ModerationOutcome | null> {
  if (round.halt) return null;
  const v = await moderateTranslationOutputDetailed(
    LOCALES.map((l) => ({ locale: l, text: items.map((a) => a.labels[l]).join("\n") })),
    { deadlineAt: round.deadlineAt },
  );
  // 只有与内容无关的失败才停机:内容相关的 400(超大块,可能超出上下文)只让这组 failed,不连累本轮其余组
  if (isModerationFailure(v) && v.systemic) round.halt ??= haltOf(v.error, v.status);
  return v;
}

/** 不可信组的标签审核(文件头第 3 步):就地改写 outcomes,返回实际发出的审核调用数 */
async function moderateAccepted(round: Round, outcomes: Outcome[], label: string): Promise<number> {
  const accepted: { i: number; a: Accepted }[] = [];
  outcomes.forEach((x, i) => {
    if (isAccepted(x)) accepted.push({ i, a: x });
  });
  if (accepted.length === 0) return 0;

  const verdict = await moderateLabels(round, accepted.map((x) => x.a));
  let calls = verdict?.calls ?? 0;
  if (!verdict || isModerationFailure(verdict)) {
    const error = moderationError(verdict);
    round.log(`[i18n:terms] ${label}: label moderation failed (${error})`);
    for (const { i } of accepted) outcomes[i] = { outcome: "failed", error };
    return calls;
  }
  if (!verdict.violation) return calls;
  if (accepted.length === 1) {
    round.log(`[i18n:terms] ${label}: labels rejected (${categoriesOf(verdict)})`);
    outcomes[accepted[0].i] = { outcome: "rejected", error: "unsafe_label" };
    return calls;
  }
  // 多个写法:逐个复审,只拒自己的标签违规的写法;复审失败(或本轮已停机)→ failed,绝不连坐成 rejected
  const each = await mapPool(accepted, ALIAS_MODERATION_CONCURRENCY, (x) => moderateLabels(round, [x.a]));
  let rejected = 0;
  let failed = 0;
  each.forEach((v, k) => {
    const { i } = accepted[k];
    calls += v?.calls ?? 0;
    if (!v || isModerationFailure(v)) {
      outcomes[i] = { outcome: "failed", error: moderationError(v) };
      failed++;
    } else if (v.violation) {
      outcomes[i] = { outcome: "rejected", error: "unsafe_label" };
      rejected++;
    }
  });
  round.log(
    `[i18n:terms] ${label}: labels flagged (${categoriesOf(verdict)}); per-alias review of ${accepted.length}: ` +
      `${rejected} rejected, ${failed} failed`,
  );
  return calls;
}

/**
 * 写回一个写法(写法级 CAS:租约不符的行 SQL 直接忽略),返回实际写成的结局。retry 带 p_retry_after_s;
 * 库里还是旧版函数(PostgREST 找不到带这个参数的签名)时改按 failed 写回,本轮之后的写法直接走旧版
 */
async function completeTerm(
  round: Round,
  row: ClaimedAlias,
  x: Outcome,
): Promise<{ data: unknown; error: PostgrestError | null; written: Outcome["outcome"] }> {
  const ok = isAccepted(x);
  const args = {
    p_kind: row.kind,
    p_alias_norm: row.alias_norm,
    p_lease: row.lease_token,
    p_outcome: x.outcome,
    p_slug: ok ? x.slug : null,
    p_labels: ok ? x.labels : null,
    p_model: ok ? AI_MODEL : null,
    p_error: ok ? null : x.error,
    p_alias_lang: ok ? aliasLang(row.sample_raw) : null,
  };
  if (x.outcome === "retry" && !round.legacyComplete) {
    const res = await withRetry(() =>
      round.svc.rpc("i18n_complete_term", { ...args, p_retry_after_s: x.retryAfterS }),
    );
    if (!res.error || !isMissingFunctionError(res.error)) return { data: res.data, error: res.error, written: "retry" };
    round.legacyComplete = true;
    round.log("[i18n:terms] i18n_complete_term has no 'retry' outcome yet (apply supabase/i18n-v2.sql); writing failed");
  }
  const outcome = x.outcome === "retry" ? "failed" : x.outcome;
  const res = await withRetry(() => round.svc.rpc("i18n_complete_term", { ...args, p_outcome: outcome }));
  return { data: res.data, error: res.error, written: outcome };
}

async function resolveGroup(round: Round, rows: ClaimedAlias[]): Promise<GroupStats> {
  const stats: GroupStats = { resolved: 0, rejected: 0, failed: 0, retried: 0, calls: 0, tokensIn: 0, tokensOut: 0 };
  const { kind, group_id: groupId, trusted } = rows[0];
  const tags = rows.map((r) => r.sample_raw);
  const { system, user } = glossaryMessages({ kind, tags });
  const res = await callModelJson<{ items?: unknown }>({
    system,
    user,
    maxTokens: Math.min(6000, Math.max(400, 150 * tags.length + 200)),
    deadlineAt: round.deadlineAt,
    title: MODEL_TITLE,
  });
  // config / deadline 时没有发出请求,不计调用次数
  if (res.ok || (res.error !== "config" && res.error !== "deadline")) stats.calls++;

  let outcomes: Outcome[];
  if (!res.ok) {
    round.log(`[i18n:terms] ${kind} ${groupId}: model ${res.error}${res.status ? ` ${res.status}` : ""}`);
    round.halt ??= haltOf(res.error, res.status);
    const failure = glossaryFailure(res);
    outcomes = rows.map(() => failure);
  } else {
    stats.tokensIn += res.usage.in;
    stats.tokensOut += res.usage.out;
    const items = Array.isArray(res.json?.items) ? (res.json.items as unknown[]) : [];
    outcomes = rows.map((r, i): Outcome => {
      const v = validateGlossaryItem(r.sample_raw, items[i]);
      if (v.ok) return { outcome: "ok", slug: v.slug, labels: v.labels };
      return { outcome: v.reason === "meaningless" ? "rejected" : "failed", error: v.reason };
    });
    // 不可信组:模型给的标签会展示给所有语言的用户,上线前过一次输出审核
    if (!trusted) stats.calls += await moderateAccepted(round, outcomes, `${kind} ${groupId}`);
  }

  // 逐个写回。写回出错时不计数,租约到期后会被重新认领
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { data, error, written } = await completeTerm(round, row, outcomes[i]);
    if (error) {
      round.log(`[i18n:terms] complete ${row.kind}/${row.alias_norm} failed: ${error.message}`);
    } else if (written === "ok") {
      // 返回词条 id;null = 租约已失效(过期后被别的 worker 重新认领),这次结果作废
      if (data == null) round.log(`[i18n:terms] lease lost for ${row.kind}/${row.alias_norm}`);
      else stats.resolved++;
    } else if (written === "rejected") {
      stats.rejected++;
    } else if (written === "retry") {
      stats.retried++;
    } else {
      stats.failed++;
    }
  }
  return stats;
}

/** 解析一轮(≤ maxGroups 组)待解析的话题 / 配置写法 */
export async function resolveTerms(o: ResolveTermsOptions): Promise<ResolveTermsResult> {
  const result: ResolveTermsResult = { groups: 0, resolved: 0, rejected: 0, failed: 0, retried: 0, calls: 0, halt: null };
  const log = o.log ?? ((m: string) => console.log(m));
  // 未配置模型时不能认领:认领即消耗 attempts,租了也处理不了
  if (!isAiConfigured() || o.deadlineAt - Date.now() < MIN_LEFT_MS) return result;

  const svc = createServiceClient();
  const claim = await withRetry(() =>
    svc.rpc("i18n_claim_terms", {
      p_max_groups: o.maxGroups ?? DEFAULT_MAX_GROUPS,
      p_lease_seconds: LEASE_SECONDS,
    }),
  );
  if (claim.error) {
    // 含 SQL 尚未执行(PGRST202):下一轮再试
    log(`[i18n:terms] claim failed: ${claim.error.message}`);
    return result;
  }
  const groups = groupRows(Array.isArray(claim.data) ? (claim.data as ClaimedAlias[]) : []);
  if (groups.length === 0) return result;

  const round: Round = { svc, deadlineAt: o.deadlineAt, log, halt: null, legacyComplete: false };
  const stats = await Promise.all(groups.map((rows) => resolveGroup(round, rows)));
  let tokensIn = 0;
  let tokensOut = 0;
  for (const s of stats) {
    result.resolved += s.resolved;
    result.rejected += s.rejected;
    result.failed += s.failed;
    result.retried += s.retried;
    result.calls += s.calls;
    tokensIn += s.tokensIn;
    tokensOut += s.tokensOut;
  }
  result.groups = groups.length;
  result.halt = round.halt;

  if (result.calls > 0) {
    const usage = await withRetry(() =>
      svc.rpc("i18n_add_usage", { p_calls: result.calls, p_in: tokensIn, p_out: tokensOut }),
    );
    if (usage.error) log(`[i18n:terms] usage accounting failed: ${usage.error.message}`);
  }
  log(
    `[i18n:terms] groups=${result.groups} resolved=${result.resolved} rejected=${result.rejected} ` +
      `failed=${result.failed} retried=${result.retried} calls=${result.calls}` +
      (result.halt ? ` halt=${result.halt.stop}` : ""),
  );
  return result;
}
