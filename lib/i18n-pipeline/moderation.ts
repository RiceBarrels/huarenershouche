// 翻译管线的内容审核(服务端 + Bun 脚本共用;只经 service role 调 RPC,不引入 server-only)。
//
// moderateEntity(实体, id):从库里取「当前要审的全部文字」(i18n_moderation_input 的 mod_payload:车源 = 品牌 / 车型 /
// 款型 + 配置标签 + 描述;帖子 / 提问 = 标题 + 正文 + #标签;其余 = 正文)送审,结论按审核 hash(mod_hash)落库
// (i18n_record_moderation,同一版本只审一次、只花一次钱)。数据库按模式处理违规结论:
//   影子模式(i18n.settings.moderation_enforce = false,默认):记 flagged + ai_moderation.status = 'shadow',不屏蔽;
//   执行模式:记 blocked,并由数据库屏蔽内容(车源下架 / 帖子与提问隐藏 / 评论、回答、评价 blocked)。
// 内容相关的失败(回复解析不了、被截断、结论无效…)记 error,同一版本累计 3 次后数据库放行(skipped)。
// 与内容无关的失败(未配置、审核预算用完、剩余不足 6 s、限流、超时、网络、上游或数据库故障)不记 strike:返回
// verdict = error + failure.systemic,由调用方暂停 / 停机后重试。同一作者每个 UTC 小时最多送审 120 次(api_rate_hit
// 计数,按作者分桶):超出的返回 failure.error = throttled(只推迟这位作者的内容,到下一个整点由审核队列 / 翻译领取补审),
// 一个账号靠反复编辑自己的内容耗不光全站共用的审核预算。可信转载文本入库时就是 skipped,命中缓存不花钱;
// 当前不公开的内容不送审(公开后由 worker 再审)。SQL 还没升级(没有 mod_hash)时按旧接口:payload + extra、按原文 hash 落库。
//
// pipelineRpc():管线 RPC 的统一入口(worker 共用),死锁 / 拿不到锁(40P01 / 55P03)抖动 200–500 ms 后重试一次。

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { isAiConfigured, type AiError } from "@/lib/ai/openrouter";
import type { ContentEntity } from "@/lib/i18n/content/types";
import {
  isModerationFailure,
  moderateContentDetailed,
  MODERATION_MODEL,
  type ModerationFailure,
  type ModerationOutcome,
} from "@/lib/moderate";
import { createServiceClient } from "@/lib/sources/service-client";
import { isMissingFunctionError } from "@/lib/supabase-compat";

/** verdict = error 的原因;systemic = 与内容无关(不记 strike,调用方按 error 暂停 / 停机后重试) */
export interface ModerationFailureInfo {
  systemic: boolean;
  /**
   * budget = 审核预算用完;throttled = 作者本小时送审次数已满(retryAfterMs = 到下一个整点);rpc = 数据库调用失败;
   * verdict = 模型给的结论无效;其余同 lib/ai/openrouter 的 AiError
   */
  error: AiError | "verdict" | "budget" | "throttled" | "rpc";
  status?: number;
  retryAfterMs?: number;
}

export interface ModerateEntityResult {
  verdict: "pass" | "flagged" | "blocked" | "skipped" | "error" | "stale" | "missing";
  reason?: string | null;
  categories?: string[];
  cached: boolean;
  langHint?: string | null;
  /** verdict = error 时的失败原因 */
  failure?: ModerationFailureInfo;
}

/** 同一次 run(一次 drain)共用:审核预算(i18n_budget_state)只查一次;本小时送审次数已满的作者 → 到期时刻(ms) */
export interface ModerationRunCache {
  budgetExhausted?: Promise<boolean>;
  throttledUntil?: Map<string, number>;
}

export interface ModerateOptions {
  /** 调用方领取时看到的审核 hash(i18n_claim / i18n_moderation_queue):库里已换成别的版本 → stale,不送审 */
  expectedModHash?: string | null;
  /** worker 传同一次 run 的缓存;不传(/api/moderate)= 每次现查审核预算 */
  cache?: ModerationRunCache;
}

type Verdict = ModerateEntityResult["verdict"];

/** 死锁(40P01)/ 拿不到锁(55P03):锁顺序冲突导致的瞬时错误,重试一次即可 */
const RETRYABLE_SQLSTATE = new Set(["40P01", "55P03"]);

/** 管线 RPC:40P01 / 55P03 时等 200–500 ms 重试一次,其余错误原样返回 */
export async function pipelineRpc<T>(
  svc: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  let res = await svc.rpc(fn, args);
  if (res.error && RETRYABLE_SQLSTATE.has(res.error.code)) {
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
    res = await svc.rpc(fn, args);
  }
  return { data: (res.data ?? null) as T | null, error: res.error };
}

/** i18n_moderation_input 的一行 */
interface ModerationInput {
  src_hash: string;
  payload: Record<string, unknown> | null;
  moderation: string;
  moderated: boolean | null;
  user_id: string | null;
  /** 旧版 SQL 的附加送审文字 —— car:中文标题 + 配置标签;post:标签(以 " #" 连接);其余 null */
  extra: string | null;
  is_public: boolean | null;
  /** 新版 SQL:审核 hash 与要审的全部字段(旧版没有这两列) */
  mod_hash?: string | null;
  mod_payload?: Record<string, unknown> | null;
}

/** 同一审核 hash 已有结论时直接复用 */
const CACHED: ReadonlySet<string> = new Set(["pass", "flagged", "blocked", "skipped"]);
/** i18n_record_moderation 的返回值 */
const RECORDED: ReadonlySet<string> = new Set(["pass", "flagged", "blocked", "skipped", "error", "stale"]);
/** ai_moderation.content 上限(RPC 内也会截断) */
const AUDIT_TEXT_MAX = 4000;
/** 剩余不足 6 s 时模型层(callModelJson)不会发请求:不送审,也不记 strike */
const MIN_MODERATION_MS = 6_000;
/**
 * 同一作者每个 UTC 小时最多送审的次数(命中缓存、版本已变、没有文字的不算):一个账号每天最多用掉默认审核预算
 * (daily_moderation_cap = 20000)的约 14%;正常发布 / 编辑碰不到,API 批量上传的超出部分到下一个整点再审
 */
export const AUTHOR_HOURLY_MODERATIONS = 120;
const HOUR_MS = 3_600_000;

/** SQL 尚未执行(函数不存在)时每个函数只提示一次,避免每个请求刷屏 */
const warnedMissing = new Set<string>();

function warnRpc(fn: string, entity: string, id: string, error: PostgrestError): void {
  if (isMissingFunctionError(error)) {
    if (warnedMissing.has(fn)) return;
    warnedMissing.add(fn);
  }
  console.warn(`[i18n:moderation] ${fn} ${entity} ${id}: ${error.code} ${error.message}`);
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const textOf = (v: unknown): string | null =>
  typeof v === "string" ? v.trim() || null : typeof v === "number" && Number.isFinite(v) ? String(v) : null;
const listOf = (v: unknown[]): string[] => v.map(textOf).filter((s): s is string => s !== null);

/** mod_payload:车型一行(品牌 车型 款型),其余字段按此顺序;以后新增的字段接在最后,一样送审 */
const VEHICLE_KEYS: readonly string[] = ["make", "model", "trim"];
const FIELD_ORDER: readonly string[] = ["title", "features", "content", "description", "tags"];

/**
 * 送审文本。新版 SQL:mod_payload 的每个字段 —— 车源 = 「品牌 车型 款型」+ 配置(以 · 连接)+ 描述;
 * 帖子 / 提问 = 标题 + 正文 + #标签;其余 = 正文。旧版 SQL(没有 mod_payload):payload + extra。
 */
export function moderationText(
  entity: ContentEntity,
  input: {
    payload?: Record<string, unknown> | null;
    extra?: string | null;
    mod_payload?: Record<string, unknown> | null;
  },
): string {
  const mod = input.mod_payload;
  if (isRecord(mod)) {
    const parts: string[] = [];
    const vehicle = listOf(VEHICLE_KEYS.map((k) => mod[k])).join(" ");
    if (vehicle) parts.push(vehicle);
    const rest = Object.keys(mod).filter((k) => !VEHICLE_KEYS.includes(k) && !FIELD_ORDER.includes(k));
    for (const key of [...FIELD_ORDER, ...rest]) {
      const value = mod[key];
      if (Array.isArray(value)) {
        const items = listOf(value);
        if (items.length === 0) continue;
        parts.push(key === "tags" ? items.map((t) => `#${t.replace(/^[#＃]+/u, "")}`).join(" ") : items.join(" · "));
      } else {
        const text = textOf(value);
        if (text) parts.push(text);
      }
    }
    return parts.join("\n\n");
  }
  const p = isRecord(input.payload) ? input.payload : {};
  const extra = textOf(input.extra);
  const parts =
    entity === "car"
      ? [extra, textOf(p.description)]
      : entity === "post"
        ? [textOf(p.title), textOf(p.content), extra && `#${extra}`]
        : entity === "qa_question"
          ? [textOf(p.title), textOf(p.content)]
          : [textOf(p.content)];
  return parts.filter((s): s is string => !!s).join("\n\n");
}

const failureInfo = (f: ModerationFailure): ModerationFailureInfo => ({
  systemic: f.systemic,
  error: f.error,
  ...(f.status !== undefined ? { status: f.status } : {}),
  ...(f.retryAfterMs !== undefined ? { retryAfterMs: f.retryAfterMs } : {}),
});

/**
 * 审核预算是否已用完(i18n_budget_state;传了 cache 时同一次 run 只查一次,并发调用共用同一个查询)。
 * SQL 还没升级(函数不存在)或查询出错时不拦,与旧版一致。
 */
function moderationBudgetExhausted(
  svc: SupabaseClient,
  entity: ContentEntity,
  id: string,
  cache: ModerationRunCache | undefined,
): Promise<boolean> {
  if (cache?.budgetExhausted) return cache.budgetExhausted;
  const state = pipelineRpc<{ moderation_exhausted: boolean | null }[]>(svc, "i18n_budget_state", {})
    .then(({ data, error }) => {
      if (error) {
        warnRpc("i18n_budget_state", entity, id, error);
        return false;
      }
      return data?.[0]?.moderation_exhausted === true;
    })
    .catch((err: unknown) => {
      console.warn(`[i18n:moderation] i18n_budget_state: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    });
  if (cache) cache.budgetExhausted = state;
  return state;
}

/** 审核调用计入审核预算(i18n_add_usage 的 p_mod_calls);旧版 SQL 没有这个参数时照旧计入总调用数 */
async function addModerationUsage(
  svc: SupabaseClient,
  calls: number,
  entity: ContentEntity,
  id: string,
): Promise<void> {
  if (calls <= 0) return;
  let usage = await pipelineRpc<null>(svc, "i18n_add_usage", { p_calls: 0, p_mod_calls: calls });
  if (usage.error && isMissingFunctionError(usage.error)) {
    usage = await pipelineRpc<null>(svc, "i18n_add_usage", { p_calls: calls });
  }
  if (usage.error) warnRpc("i18n_add_usage", entity, id, usage.error);
}

/**
 * 记这位作者本小时的一次送审(api_rate_hit 原子 +1;桶 = i18n-moderation:作者,时刻取本小时整点 —— api_rate_purge
 * 只删 1 小时前的桶,整点桶在本小时内不会被清掉)。超过 AUTHOR_HOURLY_MODERATIONS 返回到下一个整点的毫秒数,
 * 否则 null。传了 cache 时同一次 run 里已满的作者不再计数。没有作者(user_id 为空)、函数不存在或查询出错时不拦。
 */
async function authorThrottledMs(
  svc: SupabaseClient,
  userId: string | null,
  entity: ContentEntity,
  id: string,
  cache: ModerationRunCache | undefined,
): Promise<number | null> {
  if (!userId) return null;
  const now = Date.now();
  const until = cache?.throttledUntil?.get(userId);
  if (until !== undefined && until > now) return until - now;
  const hourStart = Math.floor(now / HOUR_MS) * HOUR_MS;
  const hit = await pipelineRpc<number>(svc, "api_rate_hit", {
    p_bucket: `i18n-moderation:${userId}`,
    p_minute: new Date(hourStart).toISOString(),
  });
  if (hit.error) {
    warnRpc("api_rate_hit", entity, id, hit.error);
    return null;
  }
  if (Number(hit.data ?? 0) <= AUTHOR_HOURLY_MODERATIONS) return null;
  const end = hourStart + HOUR_MS;
  if (cache) (cache.throttledUntil ??= new Map()).set(userId, end);
  return Math.max(1, end - now);
}

/** 审核一条内容(spec 3.2);任何失败都返回 verdict = error(failure 说明原因),不抛错 */
export async function moderateEntity(
  entity: ContentEntity,
  id: string,
  deadlineAt: number,
  opts: ModerateOptions = {},
): Promise<ModerateEntityResult> {
  return (await moderateEntityWithCalls(entity, id, deadlineAt, opts)).result;
}

/** moderateEntity + 本次实际发出的模型调用数(worker 记 DrainResult.calls / maxCalls 用) */
export async function moderateEntityWithCalls(
  entity: ContentEntity,
  id: string,
  deadlineAt: number,
  opts: ModerateOptions = {},
): Promise<{ result: ModerateEntityResult; calls: number }> {
  const settled = (verdict: Verdict, extra: Partial<Omit<ModerateEntityResult, "verdict">> = {}, calls = 0) => ({
    result: { verdict, cached: false, ...extra },
    calls,
  });
  // 与内容无关的失败:不记 strike
  const unavailable = (failure: ModerationFailureInfo, calls = 0) => settled("error", { failure }, calls);
  if (!isAiConfigured()) return unavailable({ systemic: true, error: "config" });
  try {
    const svc = createServiceClient();
    const input = await pipelineRpc<ModerationInput[]>(svc, "i18n_moderation_input", {
      p_entity: entity,
      p_entity_id: id,
    });
    if (input.error) {
      warnRpc("i18n_moderation_input", entity, id, input.error);
      return unavailable({ systemic: true, error: "rpc" });
    }
    const row = input.data?.[0];
    if (!row) return settled("missing");
    if (row.moderated && CACHED.has(row.moderation)) {
      // 执行模式下被拦、之后由管理员恢复上线的内容:同一版本的结论仍是 blocked,但内容在线(管理员已推翻)
      // → 按 flagged(已记录、未屏蔽)返回:/api/moderate 不再提示作者「已屏蔽」,worker 照常翻译
      const cached = row.moderation === "blocked" && row.is_public === true ? "flagged" : (row.moderation as Verdict);
      return settled(cached, { cached: true });
    }
    // 新版 SQL(有 mod_hash 这一列)的结论按审核 hash 落库;旧版按原文 hash
    const newSql = "mod_hash" in row;
    const modHash = row.mod_hash ?? null;
    // 调用方领取的那个版本已被改掉(或审核 hash 还没算出来):不花钱审,新版本由下一次领取 / 审核队列来审
    if (newSql && (modHash === null || (opts.expectedModHash && modHash !== opts.expectedModHash))) {
      return settled("stale");
    }
    // 不公开(下架、隐藏、车主隐藏…)的内容现在审了也没人看;重新公开时 worker 领取到会先审再翻
    if (row.is_public === false) return settled("missing");

    const content = moderationText(entity, row);
    let outcome: ModerationOutcome | null = null;
    if (content) {
      // 剩余不足 6 s 发不出请求:这一步跳过,什么都不记(不占同一版本的 3 次机会)
      if (deadlineAt - Date.now() < MIN_MODERATION_MS) return unavailable({ systemic: true, error: "deadline" });
      if (await moderationBudgetExhausted(svc, entity, id, opts.cache)) {
        return unavailable({ systemic: true, error: "budget" });
      }
      const throttledMs = await authorThrottledMs(svc, row.user_id, entity, id, opts.cache);
      if (throttledMs !== null) return unavailable({ systemic: true, error: "throttled", retryAfterMs: throttledMs });
      outcome = await moderateContentDetailed(entity, content, { deadlineAt });
      if (isModerationFailure(outcome) && outcome.systemic) {
        await addModerationUsage(svc, outcome.calls, entity, id);
        return unavailable(failureInfo(outcome), outcome.calls);
      }
    }
    const calls = outcome?.calls ?? 0;
    const failed = outcome && isModerationFailure(outcome) ? outcome : null;
    const verdict = outcome && !isModerationFailure(outcome) ? outcome : null;
    // 没有可审的文字 → skipped;内容相关的失败 → error(同一版本累计 3 次后放行);违规 → blocked(影子模式下记为 flagged)
    const proposed = verdict ? (verdict.violation ? "blocked" : "pass") : failed ? "error" : "skipped";
    const recorded = await pipelineRpc<string>(svc, "i18n_record_moderation", {
      p_entity: entity,
      p_entity_id: id,
      ...(newSql ? { p_mod_hash: modHash } : { p_src_hash: row.src_hash }),
      p_verdict: proposed,
      ...(verdict?.violation
        ? {
            p_categories: verdict.categories,
            p_reason: verdict.reason,
            p_model: MODERATION_MODEL,
            p_text: content.slice(0, AUDIT_TEXT_MAX),
            p_user_id: row.user_id,
          }
        : {}),
    });
    if (recorded.error) warnRpc("i18n_record_moderation", entity, id, recorded.error);
    const result: Verdict =
      !recorded.error && recorded.data && RECORDED.has(recorded.data) ? (recorded.data as Verdict) : "error";

    // 预算:i18n_record_moderation 每个结论记 1 次审核调用(新版含内容相关的 error,旧版只记 pass / blocked;
    // 版本已变 stale 时不记);分块多出的、没记上的调用在此补记
    const counted = proposed === "pass" || proposed === "blocked" || (proposed === "error" && newSql);
    const budgeted = counted && !recorded.error && result !== "stale" ? 1 : 0;
    if (calls > budgeted) await addModerationUsage(svc, calls - budgeted, entity, id);

    const flaggedBy = verdict?.violation && (result === "blocked" || result === "flagged") ? verdict : null;
    // error:内容相关的失败已记一次 strike;落库本身失败(RPC 出错 / 返回值不认识)与内容无关
    let failure: ModerationFailureInfo | undefined;
    if (result === "error") {
      failure = failed && recorded.data === "error" ? failureInfo(failed) : { systemic: true, error: "rpc" };
    }
    return settled(
      result,
      {
        reason: flaggedBy ? flaggedBy.reason : null,
        categories: flaggedBy ? flaggedBy.categories : [],
        langHint: verdict?.lang ?? null,
        ...(failure ? { failure } : {}),
      },
      calls,
    );
  } catch (err) {
    console.warn(`[i18n:moderation] ${entity} ${id}: ${err instanceof Error ? err.message : String(err)}`);
    return unavailable({ systemic: true, error: "rpc" });
  }
}
