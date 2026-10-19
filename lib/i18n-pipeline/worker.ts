// 翻译管线 worker(服务端 + Bun 脚本共用;只经 service role 调 i18n_* RPC,不引入 server-only)。
//
// 数据库是唯一的队列与真相源(supabase/i18n-v2.sql):i18n_claim 领取到期实体(源行 SKIP LOCKED + 随机租约 120 s,
// attempts 在领取时就已扣减),i18n_complete 按 (租约, 原文 hash) CAS 落库 —— 原文在翻译途中被改,结果自动作废。
//
// drain() 每轮领取 ≤ concurrency 个实体并行处理,每个实体(截止 min(deadlineAt, now + 45 s)):
//   1. 审核(needs_moderation,带上领取时的 mod_hash):执行模式下被拦 → 不翻译;审核失败 → 全部语种 retry(不扣 attempts);
//      与内容无关的失败(限流、key 失效、余额不足、审核预算用完…)不记 strike,并像翻译调用一样暂停领取 / 停机;
//      作者本小时送审次数已满(throttled)只把这一条推迟到下一个整点
//   2. 语言检测(本版本还没检测过,或只有本地猜测 provisional):lib/i18n/detect;拉丁文判不准的字段先用审核顺带给出的
//      语言,否则问一次模型(只接受 en/es/fr/de/pt/vi),回复用不上时记本地的最佳猜测;模型因与内容无关的原因(限流、
//      超时、网络、上游故障…)没给出答案 → 本轮不翻译,各语种按原因 retry / failed,不把猜测写成定论
//   3. 每个语种只翻原文语言 ∉ {该语种, und} 的字段;没有要翻的 → skipped
//   4. 顺序 en(中转源)→ zh → 其余并行(每实体同时 ≤ 3 个模型调用);各语种要翻的字数合计 ≤ 1200 且 ≥ 2 个语种时
//      合并为一次多目标调用;长字段按段落 / 行 / 句切块(2500 / 2^(attempts−1),最少 600),逐块把关后按原分隔符拼回
//   5. 逐字段校验(validate.ts;话题占位符后面黏着字时先补一个空格);失败且剩余 ≥ 10 s 时内联重试一次:有校验过的
//      英文译文且原文不是英文 → 以英文为源重译(pivot = 'en'),否则带上被拒回复和原因纠错重问;仍失败 → failed
//      (数据库按 1 m、4 m、16 m… 退避)。只剩车型名这类短字段被原样照抄时省掉这些字段(读侧显示原文),其余照常上线
//   6. 不可信内容的译文再过一次输出审核(meta.moderate_outputs && !meta.trusted):违规 → rejected(unsafe_output),
//      数据库据此写一条 ai_moderation(target_type = 'translation')供管理员复核;审核没做成 → failed(不上线未审核的
//      译文,扣一次 attempts)。别的实体触发的限流暂停不丢弃已付费的译文:来得及就等暂停结束,否则照样发这一次审核
//   7. i18n_complete(各语种结果 + 检测结果 + 用量)
// 不限定实体的 drain 在第 1 轮和翻译队列为空时给审核队列(i18n_moderation_queue)一个 20 s 时间片:没有翻译工作的内容
// (没写描述的车、只改了配置 / 车型 / 标签)和绕过 /api/moderate 的直接写入也会被审。一批里有作者送审次数已满的条目
// 时接着领下一批(每片最多看 100 条),别的作者的内容不被它们挡住。
// 每第 3 轮、以及领取为空时(剩余 ≥ 20 s)给话题 / 配置词表(resolveTerms)一个 20 s 时间片:词表调用遇到 400 / 401 / 402 / 404 /
// 未配置同样让整个 run 停机;租到了组却一条都没落定(限流、上游故障…)→ 本次不再给词表时间片。领取为空且审核队列、
// 词表这两片都没有进展、也没有停机 / 限流暂停 → empty。
// 剩余 < 15 s 不再领取。429 → 受影响语种按 Retry-After 推迟并暂停领取;401 / 402(key 失效、余额不足)、400 / 404
// (模型 ID 无效或下线、参数不被接受、数据策略下没有供应商)→ 立即停止,未完成的语种退回 retry(不扣 attempts)。数据库死锁 / 拿不到锁(40P01 / 55P03)重试一次。
//
// drainEntity():单实体快速通道(/api/moderate、API v1 的 after())。detectPass():批量语言检测;noLlm 时只用本地规则、
// 不花钱(/api/i18n/drain 每次先跑一小批),判不准的记本地猜测并标 provisional,之后由 LLM 检测 / 翻译管线改正。
// 未配置 OPENROUTER_API_KEY 时 drain / drainEntity 立即返回(not_configured),不领取任何任务。

import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_MODEL, callModelJson, isAiConfigured, maxTokensFor, type AiResult } from "@/lib/ai/openrouter";
import type { DbLocale as Locale } from "@/lib/i18n";
import { isDbLocale as isSiteLocale } from "@/lib/i18n/content-langs";
import { ENTITY_FIELDS, type ContentEntity } from "@/lib/i18n/content/types";
import { detectFields, detectLang } from "@/lib/i18n/detect";
import { extractHashtags } from "@/lib/i18n/hashtags";
import {
  moderateEntityWithCalls,
  pipelineRpc,
  type ModerateEntityResult,
  type ModerationFailureInfo,
  type ModerationRunCache,
} from "@/lib/i18n-pipeline/moderation";
import {
  PROMPT_VERSION,
  detectionMessages,
  entityContext,
  translationMessages,
  type ModelMessages,
  type TranslationRetry,
} from "@/lib/i18n-pipeline/prompts";
import { PLACEHOLDER_RE, protectTokens, type Protected } from "@/lib/i18n-pipeline/protect";
import { resolveTerms } from "@/lib/i18n-pipeline/terms";
import { chunkEcho, inTargetLanguage, isNameLike, validateField, type Reject } from "@/lib/i18n-pipeline/validate";
import { isModerationFailure, MODERATION_MODEL, moderateTranslationOutputDetailed } from "@/lib/moderate";
import { createServiceClient } from "@/lib/sources/service-client";
import { isMissingFunctionError } from "@/lib/supabase-compat";

// ---------- 对外接口(spec 3.2) ----------

export type DrainStop = "deadline" | "empty" | "budget" | "rate_limited" | "max_calls" | "not_configured";

export interface DrainOptions {
  deadlineAt: number;
  concurrency?: number;
  entity?: ContentEntity;
  entityIds?: string[];
  locales?: Locale[];
  terms?: boolean;
  maxCalls?: number;
  log?: (m: string) => void;
}

export interface DrainResult {
  entities: number;
  ok: number;
  skipped: number;
  failed: number;
  rejected: number;
  stale: number;
  hidden: number;
  /** 词表时间片里解析成功的写法数 */
  terms: number;
  /** 本次新落库的审核结论数(审核队列时间片 + 翻译前的审核;命中缓存的不算) */
  moderated: number;
  calls: number;
  stoppedBy: DrainStop;
}

// ---------- 参数 ----------

const DEFAULT_CONCURRENCY = 6;
const MAX_CONCURRENCY = 50; // i18n_claim 内同样封顶
const LEASE_SECONDS = 120;
const STOP_CLAIMING_MS = 15_000; // 剩余 < 15 s 不再领取
const ENTITY_BUDGET_MS = 45_000; // 单个实体最多处理 45 s
const CALLS_PER_ENTITY = 3; // 每个实体同时在途的模型调用
const MULTI_TARGET_MAX_CHARS = 1200; // 各语种要翻的字数合计不超过它才合并成一次多目标调用
const CHUNK_CHARS = 2500; // 首次尝试的切块长度,之后每次减半
const MIN_CHUNK_CHARS = 600;
const MIN_CALL_MS = 10_000; // 剩余不足 10 s 不再开新的模型调用(也是内联重试的门槛)
const OUTPUT_MODERATION_MS = 10_000; // 给译文审核预留的时间
const CHUNK_CHECK_MIN_CHARS = 40; // 切块后逐块查语言:原块(不算占位符和空白)不足 40 字的不单独查,由整字段校验把关
const AUDIT_TEXT_MAX = 4000; // 被拒译文写进 ai_moderation.content 的上限
const DETECT_MAX_TOKENS = 64;
const DETECT_BATCH = 200;
const DETECT_PARALLEL = 4;
const TERMS_EVERY = 3;
const TERMS_MIN_LEFT_MS = 20_000;
const TERMS_SLICE_MS = 20_000;
const TERMS_MAX_GROUPS = 2;
const MOD_QUEUE_LIMIT = 10; // 审核队列每批领取的条数
const MOD_QUEUE_SCAN_MAX = 100; // 一片审核队列最多看的条数(跳过送审次数已满的作者时接着领下一批)
const MOD_QUEUE_PARALLEL = 4; // 审核队列同时在途的审核
const MOD_QUEUE_LEASE_S = 90; // 审核队列租约:没来得及审的条目到期后由下一次 drain 再领
const MOD_SLICE_MS = 20_000; // 一片审核队列最多占用的时间
const MIN_MODERATION_MS = 6_000; // 剩余不足 6 s 时模型层不会发请求:不再开始新的审核
const DEFAULT_PAUSE_MS = 60_000; // 429 没带 Retry-After 时暂停 1 分钟
const SYSTEMIC_RETRY_S = 900; // key 失效 / 余额不足 / 模型配置错误 / 未配置:15 分钟后再试(不扣 attempts)
const TRANSLATE_TITLE = "CLCAuto Translation";
const DETECT_TITLE = "CLCAuto Language Detection";

/** 拉丁字母语言里认可的检测结果(审核的语言提示、检测调用都只接受这些) */
const LATIN_LANGS: ReadonlySet<string> = new Set(["en", "es", "fr", "de", "pt", "vi"]);
const CJK_LANGS: ReadonlySet<string> = new Set(["zh", "ja", "ko"]);

// ---------- 内部类型 ----------

/** i18n_claim 的一行 */
interface ClaimRow {
  entity: ContentEntity;
  entity_id: string;
  src_hash: string;
  payload: Record<string, unknown> | null;
  /** 本版本已检测时为 {字段: 语言},否则 null */
  field_langs: Record<string, string> | null;
  needs_moderation: boolean;
  locales: string[];
  lease_token: string;
  attempts: number;
  /** 本版本已校验的英文译文(中转源) */
  en_fields: Record<string, unknown> | null;
  /** car: year/make/model/trim;post: make/model/type;另有 trusted、moderate_outputs */
  meta: Record<string, unknown> | null;
  /** 新版 SQL:领取时的审核 hash(翻译前送审时带上;旧版没有这一列) */
  mod_hash?: string | null;
}

/** i18n_moderation_queue 的一行 */
interface ModerationQueueRow {
  entity: ContentEntity;
  entity_id: string;
  mod_hash: string;
}

/** i18n_detection_queue 的一行 */
interface DetectionRow {
  entity: ContentEntity;
  entity_id: string;
  src_hash: string;
  payload: Record<string, unknown> | null;
}

/** i18n_complete 的一项结果(spec 2.6) */
interface ResultItem {
  locale: Locale;
  outcome: "ok" | "skipped" | "failed" | "rejected" | "retry";
  fields?: Record<string, string>;
  source_lang?: string;
  pivot?: "en" | null;
  model?: string;
  prompt_version?: number;
  error?: string;
  retry_after_s?: number;
  // rejected + unsafe_output:数据库写进 ai_moderation 供复核
  text?: string;
  categories?: string[];
  reason?: string | null;
}

interface CompleteResponse {
  stale?: boolean;
  hidden?: boolean;
  applied?: string[];
}

interface DetectRecord {
  field_langs: Record<string, string>;
  primary_lang: string;
}

/** i18n_record_detection 的一项;provisional = 本地猜测(拉丁文判不准),之后由 LLM 检测 / 翻译管线改正 */
interface DetectionItem extends DetectRecord {
  entity: ContentEntity;
  entity_id: string;
  src_hash: string;
  provisional?: true;
}

interface Usage {
  calls: number;
  in: number;
  out: number;
}

type ModelFailure = Extract<AiResult<unknown>, { ok: false }>;

/** 一次 drain / detectPass 的共享状态 */
interface Run {
  svc: SupabaseClient;
  log: (m: string) => void;
  /** 本次所有模型调用(含审核、检测、词表) */
  calls: number;
  /** 429 后暂停到此时刻(ms) */
  pausedUntil: number;
  /** key 失效 / 余额不足 / 未配置:停止一切新调用 */
  halt: { stop: "budget" | "not_configured"; failure: ModelFailure } | null;
  /** 审核预算只查一次(lib/i18n-pipeline/moderation) */
  moderation: ModerationRunCache;
  /** 本次新落库的审核结论数 */
  moderated: number;
}

/** 一个语种的失败结局:retry 不扣 attempts(限流、截止、系统性错误),failed 按退避重试、累计 6 次后 dead */
interface Failure {
  outcome: "failed" | "retry";
  error: string;
  retry_after_s?: number;
}

/** 一个字段的翻译源:原文(或中转用的英文译文)保护占位符后的文本 + 源语言 */
interface FieldSource {
  field: string;
  lang: string;
  prot: Protected;
}

/** 翻译回复 {"source_lang": …, "t": {…}} */
interface Reply {
  source_lang?: unknown;
  t: Record<string, unknown>;
}

/** 一个语种一次尝试的结果 */
interface Attempt {
  /** 通过校验、已还原占位符的译文 */
  texts: Map<string, string>;
  /** 没通过校验的字段 → 原因 */
  rejects: Map<string, Reject>;
  /** 每次调用的回复(纠错重问时回放给模型) */
  replies: (Reply | null)[];
  /** 模型调用失败(不做内联重试) */
  failure: ModelFailure | null;
  /** 这个语种是否真的消耗过模型调用 */
  spent: boolean;
}

/** 纠错重问:回放上一次的回复 + 拒绝原因 */
interface Correction {
  previous: Attempt;
  reason: Reject;
}

/** 一个实体的翻译上下文 */
interface Job {
  run: Run;
  usage: Usage;
  payload: Record<string, string>;
  langs: Record<string, string>;
  sources: Record<string, FieldSource>;
  enFields: Record<string, unknown> | null;
  context: string;
  chunkChars: number;
  /** 翻译调用的截止(实体截止减去译文审核的预留) */
  translateBy: number;
  gate: <T>(task: () => Promise<T>) => Promise<T>;
  done: Map<Locale, { texts: Map<string, string>; pivot: boolean }>;
  failures: Map<Locale, Failure>;
  /** 要翻的字段全是原样照抄的名字类短字段:没有可存的译文(skipped,读侧显示原文) */
  skipped: Set<Locale>;
}

interface Counts {
  ok: number;
  skipped: number;
  failed: number;
  rejected: number;
}

interface EntityReport {
  state: "done" | "stale" | "hidden" | "error";
  counts: Counts;
}

// ---------- 小工具 ----------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const isCjk = (lang: string) => CJK_LANGS.has(lang);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const tag = (row: { entity: string; entity_id: string }) => `${row.entity} ${row.entity_id.slice(0, 8)}`;
const noCounts = (): Counts => ({ ok: 0, skipped: 0, failed: 0, rejected: 0 });
const firstReject = (rejects: Map<string, Reject>): Reject => rejects.values().next().value ?? "schema";

/** 并发闸门:同一时刻最多 n 个任务在跑 */
function limiter(n: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    while (active >= n) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

/** payload 里该实体的原文字段(ENTITY_FIELDS 顺序,只留非空字符串) */
function payloadFields(entity: ContentEntity, payload: Record<string, unknown> | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of ENTITY_FIELDS[entity] ?? []) {
    const value = payload?.[field];
    if (typeof value === "string" && value.trim()) out[field] = value;
  }
  return out;
}

/** 主语言 = 最长的非 und 字段的语言(与 detectFields 的规则一致) */
function primaryOf(payload: Record<string, string>, langs: Record<string, string>): string {
  let primary = "und";
  let longest = -1;
  for (const [field, text] of Object.entries(payload)) {
    const lang = langs[field];
    if (lang && lang !== "und" && text.length > longest) {
      longest = text.length;
      primary = lang;
    }
  }
  return primary;
}

/** 译文来源语言(「已从 X 翻译」):所译字段同一语言时取它,否则取主语言 */
function sourceLangOf(fields: string[], langs: Record<string, string>, primary: string): string {
  const distinct = new Set(fields.map((f) => langs[f]));
  return distinct.size === 1 ? [...distinct][0] : primary;
}

// ---------- 切块 ----------

/** 原文 = pieces[0] + seps[0] + pieces[1] + …(seps 是块之间的原分隔符) */
interface Split {
  pieces: string[];
  seps: string[];
}

interface Atom {
  text: string;
  sep: string;
}

// 边界由粗到细:空行(段落)→ 换行 → 句末 → 空白;都没有就硬切。占位符 ⟦n⟧ 里只有数字,不会被这些边界切开
const SPLITTERS: readonly RegExp[] = [/\n{2,}/g, /\n/g, /(?<=[。！？!?])\s*|(?<=[.;；])\s+/g, /\s+/g];

function atomsOf(text: string, limit: number, level: number): Atom[] {
  if (text.length <= limit) return [{ text, sep: "" }];
  const re = SPLITTERS[level];
  if (!re) return hardSplit(text, limit);
  const atoms: Atom[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    atoms.push({ text: text.slice(last, at), sep: m[0] });
    last = at + m[0].length;
  }
  if (atoms.length === 0) return atomsOf(text, limit, level + 1);
  atoms.push({ text: text.slice(last), sep: "" });
  return atoms.flatMap((atom) => {
    if (atom.text.length <= limit) return [atom];
    const sub = atomsOf(atom.text, limit, level + 1);
    sub[sub.length - 1].sep = atom.sep;
    return sub;
  });
}

/** 没有任何边界时按长度硬切:不切开占位符 ⟦n⟧,不劈开代理对 */
function hardSplit(text: string, limit: number): Atom[] {
  const out: Atom[] = [];
  for (let i = 0; i < text.length; ) {
    let end = Math.min(text.length, i + limit);
    if (end < text.length) {
      const open = text.lastIndexOf("⟦", end - 1);
      if (open > i && text.indexOf("⟧", open) >= end) end = open;
      const code = text.charCodeAt(end - 1);
      if (code >= 0xd800 && code <= 0xdbff) end -= 1;
    }
    out.push({ text: text.slice(i, end), sep: "" });
    i = end;
  }
  return out;
}

/** 把(已保护占位符的)文本切成 ≤ limit 的块,块之间保留原分隔符 */
function chunkText(text: string, limit: number): Split {
  if (text.length <= limit) return { pieces: [text], seps: [] };
  const chunks: Atom[] = [];
  for (const atom of atomsOf(text, limit, 0)) {
    const current = chunks[chunks.length - 1];
    if (current && current.text.length + current.sep.length + atom.text.length <= limit) {
      current.text += current.sep + atom.text;
      current.sep = atom.sep;
    } else {
      chunks.push({ ...atom });
    }
  }
  return { pieces: chunks.map((c) => c.text), seps: chunks.slice(0, -1).map((c) => c.sep) };
}

function joinPieces(parts: string[], seps: string[]): string {
  return parts.reduce((acc, part, i) => (i === 0 ? part : acc + seps[i - 1] + part), "");
}

/** 切块长度:2500 / 2^(attempts−1),最少 600(上一次失败可能是截断或超时,块越切越小) */
const chunkLimit = (attempts: number) =>
  Math.max(MIN_CHUNK_CHARS, Math.floor(CHUNK_CHARS / 2 ** Math.max(0, attempts - 1)));

// ---------- 模型调用与失败归类 ----------

/**
 * 停机类 http 状态:401 key 失效、402 余额不足;400(翻译块 ≤ 2500 字、检测文本有上限,400 只会是模型 ID / 参数不被接受)
 * 和 404(模型下线、数据策略下没有可用的供应商)对每条内容都一样失败 —— 不停机的话每个实体每次 drain 都要白发一次调用。
 * 都不计费
 */
const HALT_HTTP: ReadonlySet<number> = new Set([400, 401, 402, 404]);
const isHaltHttp = (r: ModelFailure) => r.error === "http" && HALT_HTTP.has(r.status ?? 0);

/** 这次调用是否真的消耗了模型(限流、截止、未配置、停机类 http 都没有产出) */
function consumed(r: AiResult<unknown>): boolean {
  if (r.ok) return true;
  if (r.error === "rate_limited" || r.error === "deadline" || r.error === "config") return false;
  return !isHaltHttp(r);
}

/**
 * 模型调用失败 → 语种结局。spent = 这个语种本轮已经真的花过调用:此时截止也记 failed(扣 attempts),
 * 否则一个总在截止前做不完的语种会无限 retry。
 */
function failureOf(r: ModelFailure, spent: boolean): Failure {
  switch (r.error) {
    case "rate_limited":
      return {
        outcome: "retry",
        error: "rate_limited",
        retry_after_s: Math.ceil((r.retryAfterMs || DEFAULT_PAUSE_MS) / 1000),
      };
    case "config":
      return { outcome: "retry", error: "not_configured", retry_after_s: SYSTEMIC_RETRY_S };
    case "deadline":
      return { outcome: spent ? "failed" : "retry", error: "deadline" };
    case "http": {
      const error = `http_${r.status ?? 0}`;
      if (isHaltHttp(r)) return { outcome: "retry", error, retry_after_s: SYSTEMIC_RETRY_S };
      return r.retryAfterMs
        ? { outcome: "failed", error, retry_after_s: Math.ceil(r.retryAfterMs / 1000) }
        : { outcome: "failed", error };
    }
    default:
      return { outcome: "failed", error: r.error };
  }
}

/** 停机 / 限流暂停中(不该再发模型调用)时返回语种结局,否则 null */
function blockedBy(run: Run): Failure | null {
  if (run.halt) return failureOf(run.halt.failure, false);
  const pause = run.pausedUntil - Date.now();
  return pause > 0 ? { outcome: "retry", error: "rate_limited", retry_after_s: Math.ceil(pause / 1000) } : null;
}

/** 停机类失败(未配置、key 失效、余额不足、模型配置错误):停机期间任何调用都发不出去,不会反复付费 */
const isHaltFailure = (r: ModelFailure) => r.error === "config" || isHaltHttp(r);

/**
 * 失败对整个 run 的影响:429 → 暂停领取到 Retry-After;402 → 停机(budget);未配置、401 / 400 / 404 → 停机(not_configured)
 */
function noteFailure(run: Run, r: ModelFailure): void {
  if (r.error === "rate_limited") {
    run.pausedUntil = Math.max(run.pausedUntil, Date.now() + (r.retryAfterMs || DEFAULT_PAUSE_MS));
  } else if (r.error === "http" && r.status === 402) {
    run.halt ??= { stop: "budget", failure: r };
  } else if (isHaltFailure(r)) {
    run.halt ??= { stop: "not_configured", failure: r };
  }
}

/**
 * 与内容无关的失败(与 lib/moderate 的划分一致):未配置、截止、限流、超时、网络、http 400/401/402/403/404/408/429/5xx、
 * 带 status 的 parse(200 但响应体不是 JSON)。其余(模型回复解析不了、被截断、其他 4xx)算这条内容本身的问题
 */
const isSystemicFailure = (r: ModelFailure) => {
  if (r.error === "http") {
    return r.status === undefined || r.status < 400 || r.status >= 500 || [403, 408, 429].includes(r.status) || isHaltHttp(r);
  }
  if (r.error === "parse") return r.status !== undefined;
  return r.error !== "truncated";
};

/** 发一次模型调用(停机、暂停、时间不足时不发)并记账:调用数、token、429 暂停、停机类失败停机 */
async function modelCall(
  run: Run,
  usage: Usage,
  msgs: ModelMessages,
  maxTokens: number,
  deadlineAt: number,
  title: string,
): Promise<AiResult<unknown>> {
  if (run.halt) return run.halt.failure;
  const pause = run.pausedUntil - Date.now();
  if (pause > 0) return { ok: false, error: "rate_limited", status: 429, retryAfterMs: pause };
  if (deadlineAt - Date.now() < MIN_CALL_MS) return { ok: false, error: "deadline" };

  const r = await callModelJson({ ...msgs, maxTokens, deadlineAt, title });
  // config / deadline 时 callModelJson 没有发出请求
  if (r.ok || (r.error !== "config" && r.error !== "deadline")) {
    run.calls++;
    usage.calls++;
  }
  if (r.ok) {
    usage.in += r.usage.in;
    usage.out += r.usage.out;
  } else {
    noteFailure(run, r);
  }
  return r;
}

// ---------- 审核失败 ----------

/** 新落库的审核结论 */
const SETTLED: ReadonlySet<string> = new Set(["pass", "flagged", "blocked", "skipped"]);

/** 模型层的失败(限流、超时、网络、key 失效…)转成 AiResult 的失败形状;预算用完 / 作者送审次数已满 / 数据库 / 结论无效返回 null */
function asModelFailure(f: Pick<ModerationFailureInfo, "error" | "status" | "retryAfterMs">): ModelFailure | null {
  if (f.error === "verdict" || f.error === "budget" || f.error === "throttled" || f.error === "rpc") return null;
  const r: ModelFailure = { ok: false, error: f.error };
  if (f.status !== undefined) r.status = f.status;
  if (f.retryAfterMs !== undefined) r.retryAfterMs = f.retryAfterMs;
  return r;
}

/** 到下一个 UTC 零点(每日预算重置)的秒数;i18n_complete 会再封顶 1 h */
function untilUtcMidnightS(now = Date.now()): number {
  const d = new Date(now);
  return Math.max(1, Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now) / 1000));
}

/** 记一次送审:新落库的结论计数;与内容无关的失败像翻译调用一样影响整个 run(429 暂停、401 / 402 / 未配置停机) */
function noteModeration(run: Run, result: ModerateEntityResult): void {
  if (!result.cached && SETTLED.has(result.verdict)) run.moderated++;
  const failure = result.failure?.systemic ? asModelFailure(result.failure) : null;
  if (failure) noteFailure(run, failure);
}

/**
 * 送审失败 → 各语种结局:一律 retry(不扣 attempts)。内容相关的失败数据库已记一次 strike(同一版本累计 3 次放行),
 * 30 s 后再试;与内容无关的不记 strike,按原因推迟(Retry-After、停机 15 分钟、审核预算到 UTC 零点、
 * 作者送审次数到下一个整点)。
 */
export function moderationRetry(f: ModerationFailureInfo | undefined, now = Date.now()): Failure {
  if (!f?.systemic) return { outcome: "retry", error: "moderation_error" };
  if (f.error === "budget") {
    return { outcome: "retry", error: "moderation_budget", retry_after_s: untilUtcMidnightS(now) };
  }
  if (f.error === "throttled") {
    // retryAfterMs = 到下一个 UTC 整点(作者送审计数换桶)
    const retry_after_s = Math.max(1, Math.ceil((f.retryAfterMs ?? 3_600_000 - (now % 3_600_000)) / 1000));
    return { outcome: "retry", error: "moderation_throttled", retry_after_s };
  }
  const model = asModelFailure(f);
  if (!model) return { outcome: "retry", error: `moderation_${f.error}` };
  const base = failureOf(model, false);
  const error = `moderation_${base.error}`;
  return base.retry_after_s === undefined
    ? { outcome: "retry", error }
    : { outcome: "retry", error, retry_after_s: base.retry_after_s };
}

// ---------- 语言检测 ----------

/**
 * 本地 detectFields;拉丁文判不准的字段先用审核给的语言提示,再问一次模型(只接受 LATIN_LANGS);模型的回复用不上
 * (解析不了、被截断、给的语言不认识…)时留本地的最佳猜测(detectFields 给的语言)。
 * 检测调用因与内容无关的原因没给出答案(限流、停机、截止、超时、网络、上游故障)时返回 failure:这次不记检测结果
 * (provisional 的行仍是 provisional),下次重来 —— 服务商出故障不能把本地猜测变成定论。
 */
async function detectPayload(
  run: Run,
  usage: Usage,
  payload: Record<string, string>,
  langHint: string | null,
  deadlineAt: number,
): Promise<{ fieldLangs: Record<string, string>; primary: string; failure: Failure | null }> {
  const detected = detectFields(payload);
  const fieldLangs: Record<string, string> = { ...detected.fieldLangs };
  const hint = langHint && LATIN_LANGS.has(langHint) ? langHint : null;
  for (const field of detected.ambiguous) {
    let lang = hint;
    if (!lang) {
      const r = await modelCall(run, usage, detectionMessages(payload[field]), DETECT_MAX_TOKENS, deadlineAt, DETECT_TITLE);
      if (r.ok) {
        const json = r.json;
        const code = isRecord(json) && typeof json.lang === "string" ? json.lang.trim().toLowerCase() : "";
        if (LATIN_LANGS.has(code)) lang = code;
      } else if (isSystemicFailure(r)) {
        return { fieldLangs, primary: "und", failure: failureOf(r, consumed(r)) };
      }
    }
    if (lang) fieldLangs[field] = lang;
  }
  return { fieldLangs, primary: primaryOf(payload, fieldLangs), failure: null };
}

/**
 * 纯本地检测(不花钱):各字段取 detectFields 的结论;有拉丁文字段判不准时 provisional = true —— 记下的是本地的
 * 最佳猜测,sitemap 等读侧照常当作已检测,之后由 LLM 检测 / 翻译管线改正。
 * 判不准的字段(多半是「Porsche 911 GT3 RS」这类车型名)猜的语言不在判得准的字段的语言里时先记 und:否则英文标题 +
 * 中文正文这种混合内容在译文落库前哪个语种都不算原文语言,付费管线暂停期间不进任何 sitemap 分片。
 */
export function localDetection(payload: Record<string, string>): DetectRecord & { provisional: boolean } {
  const detected = detectFields(payload);
  const fieldLangs: Record<string, string> = { ...detected.fieldLangs };
  const definite = new Set<string>(
    Object.entries(detected.fieldLangs)
      .filter(([field, lang]) => lang !== "und" && !detected.ambiguous.includes(field))
      .map(([, lang]) => lang),
  );
  if (definite.size > 0) {
    for (const field of detected.ambiguous) if (!definite.has(fieldLangs[field])) fieldLangs[field] = "und";
  }
  return {
    field_langs: fieldLangs,
    primary_lang: primaryOf(payload, fieldLangs),
    provisional: detected.ambiguous.length > 0,
  };
}

// ---------- 翻译 ----------

function replyOf(json: unknown): Reply {
  const o = isRecord(json) ? json : {};
  return { source_lang: o.source_lang, t: isRecord(o.t) ? o.t : {} };
}

/**
 * 模型常把话题占位符和后面的字连写(ko「⟦0⟧를」、ja「⟦0⟧は」、zh「⟦0⟧在」):还原后 #话题 会把后面的字吞进去,
 * 前端 / SQL 按同一条规则(lib/i18n/hashtags)切出来的话题就对不上、点开也搜不到。这种占位符后面补一个空格
 * (后面紧跟另一个占位符时看它还原后的第一个字)。
 */
export function spaceGluedHashtags(masked: string, tokens: readonly string[]): string {
  return masked.replace(PLACEHOLDER_RE, (placeholder: string, index: string, offset: number) => {
    const token = tokens[Number(index)];
    if (!token || !/^[#＃]/u.test(token)) return placeholder;
    const rest = masked.slice(offset + placeholder.length);
    const next = /^⟦(\d+)⟧/u.exec(rest);
    const cp = (next ? (tokens[Number(next[1])] ?? "") : rest).codePointAt(0);
    if (cp === undefined) return placeholder;
    const tag = extractHashtags(token)[0] ?? "";
    const glued = extractHashtags(token + String.fromCodePoint(cp))[0] ?? "";
    return glued.length > tag.length ? `${placeholder} ` : placeholder;
  });
}

/** 逐字段校验(validate.ts);话题占位符后面黏着的字先隔开 */
function checkField(source: FieldSource, outMasked: string, target: Locale): ReturnType<typeof validateField> {
  return validateField(source.prot, spaceGluedHashtags(outMasked, source.prot.tokens), source.lang, target);
}

/**
 * 多块字段逐块把关(拼起来后按整字段算比例,会把一块原样照抄 / 没翻的稀释掉):照抄原块 → echo;
 * 原块(不算占位符和空白)≥ 40 字而译文不是目标语言 → wrong_language。只有车型名 / 型号的块(isNameLike)照写
 * 才是对的(提示词要求车型名照写),两项都不查,留给整字段校验。
 */
export function chunkReject(out: string, piece: string, target: Locale): Reject | null {
  if (chunkEcho(out, piece)) return "echo";
  const chars = piece.replace(PLACEHOLDER_RE, "").replace(/\s/g, "").length;
  if (chars < CHUNK_CHECK_MIN_CHARS || inTargetLanguage(out, target) || isNameLike(piece)) return null;
  return "wrong_language";
}

/** 一次翻译调用(单目标或多目标);输出 token 上限按源 / 目标文字系统估算,多目标取最坏系数 */
function callTranslation(
  job: Job,
  targets: Locale[],
  fields: Record<string, string>,
  langOf: (field: string) => string,
  retry?: TranslationRetry,
): Promise<AiResult<unknown>> {
  let chars = 0;
  let cjkChars = 0;
  for (const [field, text] of Object.entries(fields)) {
    chars += text.length;
    if (isCjk(langOf(field))) cjkChars += text.length;
  }
  const srcCjk = cjkChars * 2 >= chars;
  const targetCjk = srcCjk ? targets.every(isCjk) : targets.some(isCjk);
  const msgs = translationMessages({ targets, fields, context: job.context, retry });
  const maxTokens = maxTokensFor(chars, srcCjk, targetCjk, targets.length);
  return job.gate(() => modelCall(job.run, job.usage, msgs, maxTokens, job.translateBy, TRANSLATE_TITLE));
}

function retryFor(
  retry: Correction | "pivot" | undefined,
  index: number,
  fields: Record<string, string>,
): TranslationRetry | undefined {
  if (!retry) return undefined;
  if (retry === "pivot") return { pivotFromEnglish: true };
  const previous = retry.previous.replies[index];
  const rejectedAnswer = previous
    ? JSON.stringify({
        source_lang: previous.source_lang,
        t: Object.fromEntries(Object.keys(fields).map((f) => [f, previous.t[f] ?? null])),
      })
    : null;
  return { reason: retry.reason, rejectedAnswer };
}

/** 把若干字段翻成一个语种:长字段切块(第 i 次调用带各字段的第 i 块),拼回后逐字段校验 */
async function translateLocale(
  job: Job,
  target: Locale,
  sources: FieldSource[],
  retry?: Correction | "pivot",
): Promise<Attempt> {
  const attempt: Attempt = { texts: new Map(), rejects: new Map(), replies: [], failure: null, spent: false };
  const langOf = (field: string) => sources.find((s) => s.field === field)?.lang ?? "und";
  const splits = sources.map((source) => ({ source, split: chunkText(source.prot.masked, job.chunkChars) }));
  const units = Array.from({ length: Math.max(1, ...splits.map((x) => x.split.pieces.length)) }, (_, i) => {
    const fields: Record<string, string> = {};
    for (const { source, split } of splits) {
      const piece = split.pieces[i];
      if (piece !== undefined && piece.trim()) fields[source.field] = piece;
    }
    return fields;
  });

  const results = await Promise.all(
    units.map((fields, i) =>
      Object.keys(fields).length === 0 ? null : callTranslation(job, [target], fields, langOf, retryFor(retry, i, fields)),
    ),
  );
  results.forEach((r, i) => {
    attempt.replies[i] = r?.ok ? replyOf(r.json) : null;
    if (!r) return;
    if (consumed(r)) attempt.spent = true;
    if (!r.ok && !attempt.failure) attempt.failure = r;
  });
  if (attempt.failure) return attempt;

  for (const { source, split } of splits) {
    const parts: string[] = [];
    let reject: Reject | null = null;
    for (const [i, piece] of split.pieces.entries()) {
      // 纯空白的块原样保留,不送模型
      const out = piece.trim() ? attempt.replies[i]?.t[source.field] : piece;
      if (typeof out !== "string") {
        reject = "schema";
        break;
      }
      if (split.pieces.length > 1 && piece.trim()) reject = chunkReject(out, piece, target);
      if (reject) break;
      parts.push(out);
    }
    if (reject) {
      attempt.rejects.set(source.field, reject);
      continue;
    }
    const checked = checkField(source, joinPieces(parts, split.seps), target);
    if (checked.ok) attempt.texts.set(source.field, checked.text);
    else attempt.rejects.set(source.field, checked.reason);
  }
  return attempt;
}

/** 多目标:一次调用产出所有语种(字段取各语种所需的并集,某语种用不上的输出丢弃) */
async function translateMulti(
  job: Job,
  needed: Map<Locale, string[]>,
): Promise<{ attempts: Map<Locale, Attempt> } | { failure: ModelFailure; spent: boolean }> {
  const targets = [...needed.keys()];
  const union = Object.keys(job.sources).filter((f) => targets.some((l) => needed.get(l)?.includes(f)));
  const fields = Object.fromEntries(union.map((f) => [f, job.sources[f].prot.masked]));
  const r = await callTranslation(job, targets, fields, (f) => job.langs[f] ?? "und");
  if (!r.ok) return { failure: r, spent: consumed(r) };

  const reply = replyOf(r.json);
  const attempts = new Map<Locale, Attempt>();
  for (const [locale, wanted] of needed) {
    const raw = reply.t[locale];
    const t = isRecord(raw) ? raw : {};
    const attempt: Attempt = {
      texts: new Map(),
      rejects: new Map(),
      replies: [{ source_lang: reply.source_lang, t }],
      failure: null,
      spent: true,
    };
    for (const field of wanted) {
      const source = job.sources[field];
      const out = t[field];
      if (typeof out !== "string") {
        attempt.rejects.set(field, "schema");
        continue;
      }
      const checked = checkField(source, out, locale);
      if (checked.ok) attempt.texts.set(field, checked.text);
      else attempt.rejects.set(field, checked.reason);
    }
    attempts.set(locale, attempt);
  }
  return { attempts };
}

/** 内联重试的中转源:目标不是英文、失败字段的原文都不是英文、且都有校验过的英文译文(本轮或库里) */
function pivotSources(job: Job, target: Locale, fields: string[]): FieldSource[] | null {
  if (target === "en") return null;
  const out: FieldSource[] = [];
  for (const field of fields) {
    if (job.langs[field] === "en") return null;
    const stored = job.enFields?.[field];
    const en = job.done.get("en")?.texts.get(field) ?? (typeof stored === "string" ? stored : null);
    if (!en?.trim()) return null;
    out.push({ field, lang: "en", prot: protectTokens(en) });
  }
  return out;
}

/**
 * 首次尝试之后:校验失败且时间够 → 内联重试一次(英文中转或纠错重问),再记成功 / 失败。
 * 剩下的失败全是名字类短字段(车型名、品牌…)被原样照抄时,那就是正确译法(提示词要求车型名照写):省掉这些字段
 * (读侧显示原文),其余字段照常上线;一个字段都没剩 → skipped。
 */
async function finishLocale(job: Job, target: Locale, first: Attempt, spentBefore = false): Promise<void> {
  if (first.failure) {
    job.failures.set(target, failureOf(first.failure, first.spent || spentBefore));
    return;
  }
  const texts = new Map(first.texts);
  let rejects = first.rejects;
  let pivot = false;
  if (rejects.size > 0 && job.translateBy - Date.now() >= MIN_CALL_MS) {
    const failed = [...rejects.keys()];
    const viaEnglish = pivotSources(job, target, failed);
    const second = viaEnglish
      ? await translateLocale(job, target, viaEnglish, "pivot")
      : await translateLocale(
          job,
          target,
          failed.map((f) => job.sources[f]),
          { previous: first, reason: firstReject(rejects) },
        );
    if (second.failure) {
      job.failures.set(target, failureOf(second.failure, true));
      return;
    }
    for (const [field, text] of second.texts) texts.set(field, text);
    rejects = second.rejects;
    pivot = viaEnglish !== null && second.texts.size > 0;
  }
  const nameEcho = (field: string) =>
    (first.rejects.get(field) === "echo" || rejects.get(field) === "echo") && isNameLike(job.payload[field]);
  if (rejects.size > 0 && ![...rejects.keys()].every(nameEcho)) {
    job.failures.set(target, { outcome: "failed", error: firstReject(rejects) });
    return;
  }
  if (texts.size === 0) job.skipped.add(target);
  else job.done.set(target, { texts, pivot });
}

/** 合并成多目标调用的条件:≥ 2 个语种、要翻的字数合计 ≤ 1200、且没有字段需要切块 */
function fitsMultiTarget(job: Job, needed: Map<Locale, string[]>): boolean {
  if (needed.size < 2) return false;
  let chars = 0;
  const union = new Set<string>();
  for (const fields of needed.values()) {
    for (const field of fields) {
      chars += job.payload[field].length;
      union.add(field);
    }
  }
  return chars <= MULTI_TARGET_MAX_CHARS && [...union].every((f) => job.sources[f].prot.masked.length <= job.chunkChars);
}

/** 翻所有需要翻的语种:能合并就一次多目标调用,否则 en → zh → 其余并行 */
async function translateTargets(job: Job, needed: Map<Locale, string[]>): Promise<void> {
  let spentBefore = false;
  if (fitsMultiTarget(job, needed)) {
    const multi = await translateMulti(job, needed);
    if ("attempts" in multi) {
      // en 先收尾:它的译文是其他语种重试时的中转源
      const en = multi.attempts.get("en");
      if (en) await finishLocale(job, "en", en);
      await Promise.all(
        [...multi.attempts].filter(([locale]) => locale !== "en").map(([locale, a]) => finishLocale(job, locale, a)),
      );
      return;
    }
    const failure = failureOf(multi.failure, multi.spent);
    if (failure.outcome === "retry") {
      for (const locale of needed.keys()) job.failures.set(locale, failure);
      return;
    }
    // 多目标调用本身出错(解析失败、截断…):改为逐语种翻译;本轮做不完的语种记 failed,不退 attempts
    spentBefore = true;
  }
  const entries = [...needed];
  const phases = [
    entries.filter(([locale]) => locale === "en"),
    entries.filter(([locale]) => locale === "zh"),
    entries.filter(([locale]) => locale !== "en" && locale !== "zh"),
  ];
  for (const phase of phases) {
    await Promise.all(
      phase.map(async ([locale, fields]) => {
        const first = await translateLocale(job, locale, fields.map((f) => job.sources[f]));
        await finishLocale(job, locale, first, spentBefore);
      }),
    );
  }
}

/**
 * 不可信内容的译文过一次输出审核:违规 → 全部 rejected(unsafe_output)。译文已经花了钱:
 *   - 停机(key 失效 / 余额不足 / 未配置)→ 退回 retry:停机期间翻译调用也发不出去,不会反复付费;
 *   - 别的实体触发的 429 暂停不丢弃译文:暂停能在留给审核的时间之前结束就等,否则照样发这一次审核调用;
 *   - 审核没做成(被限流、超时、上游故障、结论无效…)→ failed(扣一次 attempts,重付的次数有上限)。
 */
async function moderateOutputs(job: Job, deadlineAt: number): Promise<ResultItem[]> {
  const run = job.run;
  const locales = [...job.done.keys()];
  const giveUp = (failure: Failure): ResultItem[] => {
    for (const locale of locales) job.failures.set(locale, failure);
    job.done.clear();
    return [];
  };
  if (run.halt) return giveUp(failureOf(run.halt.failure, false));
  if (run.pausedUntil > Date.now() && run.pausedUntil <= deadlineAt - OUTPUT_MODERATION_MS) {
    await sleep(run.pausedUntil - Date.now());
  }
  const texts = [...job.done].map(([locale, d]) => ({ locale, text: [...d.texts.values()].join("\n\n") }));
  const verdict = await moderateTranslationOutputDetailed(texts, { deadlineAt });
  run.calls += verdict.calls;
  job.usage.calls += verdict.calls;
  if (isModerationFailure(verdict)) {
    // 只有与内容无关的失败影响整个 run:超大块(长译文合并送审)的 400 是内容相关的,不能当成模型配置错误让 run 停机
    const model = verdict.systemic ? asModelFailure(verdict) : null;
    if (!model) return giveUp({ outcome: "failed", error: "output_moderation" });
    noteFailure(run, model);
    if (isHaltFailure(model)) return giveUp(failureOf(model, false));
    const base = failureOf(model, true);
    const error = model.error === "rate_limited" ? "output_moderation_paused" : `output_moderation_${base.error}`;
    return giveUp(
      base.retry_after_s === undefined
        ? { outcome: "failed", error }
        : { outcome: "failed", error, retry_after_s: base.retry_after_s },
    );
  }
  if (!verdict.violation) return [];

  job.done.clear();
  const text = texts
    .map((x) => `[${x.locale}] ${x.text}`)
    .join("\n\n")
    .slice(0, AUDIT_TEXT_MAX);
  return locales.map(
    (locale): ResultItem => ({
      locale,
      outcome: "rejected",
      error: "unsafe_output",
      text,
      categories: verdict.categories,
      reason: verdict.reason,
      model: MODERATION_MODEL,
    }),
  );
}

// ---------- 单个实体 ----------

function summarize(results: ResultItem[]): string {
  const groups = new Map<string, string[]>();
  for (const r of results) {
    const list = groups.get(r.outcome) ?? [];
    list.push(r.error ? `${r.locale}(${r.error})` : r.locale);
    groups.set(r.outcome, list);
  }
  return [...groups].map(([outcome, list]) => `${outcome}=${list.join(",")}`).join(" ") || "released";
}

async function complete(
  run: Run,
  row: ClaimRow,
  detect: DetectRecord | null,
  results: ResultItem[],
  usage: Usage,
): Promise<EntityReport> {
  const counts = noCounts();
  const { data, error } = await pipelineRpc<CompleteResponse>(run.svc, "i18n_complete", {
    p_entity: row.entity,
    p_entity_id: row.entity_id,
    p_lease: row.lease_token,
    p_src_hash: row.src_hash,
    p_detect: detect,
    p_results: results,
    p_usage: usage,
  });
  if (error || !data) {
    run.log(`[i18n:drain] ${tag(row)} complete failed: ${error ? `${error.code} ${error.message}` : "empty response"}`);
    return { state: "error", counts };
  }
  if (data.stale) {
    run.log(`[i18n:drain] ${tag(row)} stale (source changed meanwhile)`);
    return { state: "stale", counts };
  }
  if (data.hidden) {
    run.log(`[i18n:drain] ${tag(row)} hidden (no longer public)`);
    return { state: "hidden", counts };
  }
  const applied = new Set(data.applied ?? []);
  for (const r of results) if (r.outcome !== "retry" && applied.has(r.locale)) counts[r.outcome]++;
  run.log(`[i18n:drain] ${tag(row)} ${summarize(results)}`);
  return { state: "done", counts };
}

async function processEntity(run: Run, row: ClaimRow, deadlineAt: number): Promise<EntityReport> {
  const entityDeadline = Math.min(deadlineAt, Date.now() + ENTITY_BUDGET_MS);
  const usage: Usage = { calls: 0, in: 0, out: 0 };
  const locales = row.locales.filter(isSiteLocale);
  const everyLocale = (failure: Failure): ResultItem[] => locales.map((locale) => ({ locale, ...failure }));

  // 1. 审核(带上领取时的 mod_hash:领取之后又被改过就不审旧版本)
  let langHint: string | null = null;
  if (row.needs_moderation) {
    const blocked = blockedBy(run);
    if (blocked) return complete(run, row, null, everyLocale(blocked), usage);
    const { result, calls } = await moderateEntityWithCalls(row.entity, row.entity_id, entityDeadline, {
      expectedModHash: row.mod_hash ?? null,
      cache: run.moderation,
    });
    run.calls += calls;
    noteModeration(run, result);
    // 审核失败:内容相关的已记一次 strike;与内容无关的不记(并已暂停 / 停机)→ 全部语种 retry
    if (result.verdict === "error") {
      return complete(run, row, null, everyLocale(moderationRetry(result.failure)), usage);
    }
    // 执行模式被拦(数据库已屏蔽)/ 原文已变 / 已删或不再公开:不翻译,i18n_complete 释放租约
    if (result.verdict === "blocked" || result.verdict === "stale" || result.verdict === "missing") {
      return complete(run, row, null, [], usage);
    }
    langHint = result.langHint ?? null;
  }

  const payload = payloadFields(row.entity, row.payload);
  const meta = row.meta ?? {};
  const outputModeration = meta.moderate_outputs !== false && meta.trusted !== true;
  const translateBy = entityDeadline - (outputModeration ? OUTPUT_MODERATION_MS : 0);

  // 2. 语言检测(本版本还没检测过时)
  let langs: Record<string, string>;
  let detect: DetectRecord | null = null;
  if (row.field_langs && typeof row.field_langs === "object") {
    langs = { ...row.field_langs };
  } else {
    const detected = await detectPayload(run, usage, payload, langHint, translateBy);
    if (detected.failure) return complete(run, row, null, everyLocale(detected.failure), usage);
    langs = detected.fieldLangs;
    detect = { field_langs: detected.fieldLangs, primary_lang: detected.primary };
  }
  for (const [field, text] of Object.entries(payload)) {
    if (typeof langs[field] !== "string") langs[field] = detectLang(text).lang;
  }

  // 3. 每个语种要翻的字段(原文语言 ∉ {该语种, und})
  const results: ResultItem[] = [];
  const needed = new Map<Locale, string[]>();
  for (const locale of locales) {
    const fields = Object.keys(payload).filter((f) => langs[f] !== locale && langs[f] !== "und");
    if (fields.length > 0) needed.set(locale, fields);
    else results.push({ locale, outcome: "skipped" });
  }

  // 4–6. 翻译 → 校验 → 译文审核
  if (needed.size > 0) {
    const job: Job = {
      run,
      usage,
      payload,
      langs,
      sources: Object.fromEntries(
        Object.entries(payload).map(([field, text]) => [field, { field, lang: langs[field], prot: protectTokens(text) }]),
      ),
      enFields: row.en_fields,
      context: entityContext(row.entity, meta),
      chunkChars: chunkLimit(row.attempts),
      translateBy,
      gate: limiter(CALLS_PER_ENTITY),
      done: new Map(),
      failures: new Map(),
      skipped: new Set(),
    };
    const blocked = blockedBy(run);
    if (blocked) for (const locale of needed.keys()) job.failures.set(locale, blocked);
    else await translateTargets(job, needed);
    if (outputModeration && job.done.size > 0) results.push(...(await moderateOutputs(job, entityDeadline)));

    const primary = detect?.primary_lang ?? primaryOf(payload, langs);
    for (const [locale, d] of job.done) {
      results.push({
        locale,
        outcome: "ok",
        fields: Object.fromEntries(d.texts),
        source_lang: sourceLangOf([...d.texts.keys()], langs, primary),
        pivot: d.pivot ? "en" : null,
        model: AI_MODEL,
        prompt_version: PROMPT_VERSION,
      });
    }
    for (const locale of job.skipped) results.push({ locale, outcome: "skipped" });
    for (const [locale, failure] of job.failures) results.push({ locale, ...failure });
  }

  // 7. 落库(CAS)
  return complete(run, row, detect, results, usage);
}

// ---------- 入口 ----------

function tally(result: DrainResult, report: EntityReport): void {
  result.entities++;
  if (report.state === "stale") result.stale++;
  if (report.state === "hidden") result.hidden++;
  result.ok += report.counts.ok;
  result.skipped += report.counts.skipped;
  result.failed += report.counts.failed;
  result.rejected += report.counts.rejected;
}

const newRun = (svc: SupabaseClient, log: (m: string) => void): Run => ({
  svc,
  log,
  calls: 0,
  pausedUntil: 0,
  halt: null,
  moderation: {},
  moderated: 0,
});

/** 消化翻译队列(及审核队列)直到截止 / 队列为空 / 预算或调用上限 / 限流(spec 3.2) */
export async function drain(o: DrainOptions): Promise<DrainResult> {
  const result: DrainResult = {
    entities: 0,
    ok: 0,
    skipped: 0,
    failed: 0,
    rejected: 0,
    stale: 0,
    hidden: 0,
    terms: 0,
    moderated: 0,
    calls: 0,
    stoppedBy: "empty",
  };
  const log = o.log ?? ((m: string) => console.log(m));
  if (!isAiConfigured()) return { ...result, stoppedBy: "not_configured" };
  let svc: SupabaseClient;
  try {
    svc = createServiceClient();
  } catch (err) {
    log(`[i18n:drain] ${errText(err)}`);
    return { ...result, stoppedBy: "not_configured" };
  }
  const run = newRun(svc, log);
  const wanted = Math.floor(o.concurrency ?? DEFAULT_CONCURRENCY);
  const concurrency = Number.isFinite(wanted) ? Math.min(MAX_CONCURRENCY, Math.max(1, wanted)) : DEFAULT_CONCURRENCY;
  const left = () => o.deadlineAt - Date.now();
  const underCap = () => o.maxCalls === undefined || run.calls < o.maxCalls;

  // 词表时间片:返回这一片是否有进展(有写法解析成 ok 或判为 rejected)。resolveTerms 自己调模型:
  // 词表调用没有产出(未配置、时间不够、429、400 / 401 / 402 / 404)→ 写法记 retry(退还 attempts,按 Retry-After 或 1 / 15 分钟后再领),
  // 其中 400 / 401 / 402 / 404 / 未配置经 r.halt 让本次 run 停机;词表调用付了费、之后的标签审核失败 → failed(按退避重试)。
  // 租到了组却一条都没落定(限流、上游故障…)→ 本次 drain 不再给词表时间片(下次 cron 再试),免得翻译队列为空时
  // 每一片都再租 2 组、再撞上同一个故障
  let termsStalled = false;
  const termsSlice = async (): Promise<boolean> => {
    if (o.terms === false || termsStalled || left() < TERMS_MIN_LEFT_MS || !underCap() || blockedBy(run)) return false;
    try {
      const r = await resolveTerms({
        deadlineAt: Math.min(o.deadlineAt, Date.now() + TERMS_SLICE_MS),
        maxGroups: TERMS_MAX_GROUPS,
        log,
      });
      run.calls += r.calls;
      run.halt ??= r.halt;
      result.terms += r.resolved;
      const settled = r.resolved + r.rejected;
      if (r.groups > 0 && settled === 0) {
        termsStalled = true;
        log(
          `[i18n:drain] glossary slice settled no alias (${r.failed} failed, ${r.retried} retried); ` +
            "no more glossary slices this run",
        );
      }
      return settled > 0;
    } catch (err) {
      termsStalled = true;
      log(`[i18n:drain] glossary slice failed: ${errText(err)}`);
      return false;
    }
  };

  // 审核队列时间片(i18n_moderation_queue):没有翻译工作的内容(没写描述的车、只改了配置 / 车型 / 标签)和绕过
  // /api/moderate 的直接写入也要审。只在不限定实体的 drain 里做(drainEntity、API v1 只处理自己那几条)。
  // 返回本片新落库的结论数。SQL 还没升级(函数不存在)或出错时本次不再做,照旧只在翻译领取时审核。
  // 一批里有作者本小时送审次数已满(throttled)的条目时接着领下一批:领过的条目租约 90 s 内不会再被领到,
  // 排在它们后面的别的作者的内容不被挡住;每片最多看 MOD_QUEUE_SCAN_MAX 条
  let moderationQueue = !o.entity && !o.entityIds;
  const moderationSlice = async (): Promise<number> => {
    if (!moderationQueue || left() < STOP_CLAIMING_MS || !underCap() || blockedBy(run)) return 0;
    const sliceEnd = Math.min(o.deadlineAt, Date.now() + MOD_SLICE_MS);
    const before = run.moderated;
    const gate = limiter(MOD_QUEUE_PARALLEL);
    let scanned = 0;
    while (scanned < MOD_QUEUE_SCAN_MAX && sliceEnd - Date.now() >= MIN_MODERATION_MS && underCap() && !blockedBy(run)) {
      const queue = await pipelineRpc<ModerationQueueRow[]>(svc, "i18n_moderation_queue", {
        p_limit: MOD_QUEUE_LIMIT,
        p_lease_seconds: MOD_QUEUE_LEASE_S,
      });
      if (queue.error) {
        moderationQueue = false;
        if (!isMissingFunctionError(queue.error)) {
          log(`[i18n:drain] moderation queue failed: ${queue.error.code} ${queue.error.message}`);
        }
        break;
      }
      const rows = queue.data ?? [];
      if (rows.length === 0) break;
      scanned += rows.length;
      let unavailable = false;
      let throttled = 0;
      await Promise.all(
        rows.map((row) =>
          gate(async () => {
            // 停机 / 暂停 / 调用数或时间用完 / 审核暂时做不了(预算、限流、上游…):剩下的不审,租约到期后下一次 drain 再领
            if (unavailable || blockedBy(run) || !underCap() || sliceEnd - Date.now() < MIN_MODERATION_MS) return;
            const { result: moderation, calls } = await moderateEntityWithCalls(row.entity, row.entity_id, sliceEnd, {
              expectedModHash: row.mod_hash,
              cache: run.moderation,
            });
            run.calls += calls;
            noteModeration(run, moderation);
            // 作者送审次数已满只影响这位作者的条目,其余照审
            if (moderation.failure?.error === "throttled") throttled++;
            else if (moderation.failure?.systemic) unavailable = true;
          }),
        ),
      );
      if (unavailable || throttled === 0) break;
    }
    const moderated = run.moderated - before;
    if (scanned > 0) log(`[i18n:drain] moderation queue: ${moderated} of ${scanned} settled`);
    return moderated;
  };

  // 第一片审核队列在第 1 次领取之前:它碰到的限流 / 停机由下面的检查接手
  await moderationSlice();
  for (let round = 1; ; round++) {
    if (run.halt) {
      result.stoppedBy = run.halt.stop;
      break;
    }
    if (left() < STOP_CLAIMING_MS) {
      result.stoppedBy = "deadline";
      break;
    }
    if (!underCap()) {
      result.stoppedBy = "max_calls";
      break;
    }
    const pause = run.pausedUntil - Date.now();
    if (pause > 0) {
      if (left() - pause < STOP_CLAIMING_MS) {
        result.stoppedBy = "rate_limited";
        break;
      }
      await sleep(pause);
    }

    const claim = await pipelineRpc<ClaimRow[]>(svc, "i18n_claim", {
      p_max_entities: concurrency,
      p_lease_seconds: LEASE_SECONDS,
      p_entity: o.entity ?? null,
      p_entity_ids: o.entityIds ?? null,
      p_locales: o.locales ?? null,
    });
    if (claim.error) {
      log(`[i18n:drain] claim failed: ${claim.error.code} ${claim.error.message}`);
      // SQL 还没执行(函数不存在)视同未配置;其余错误本轮先停,下一次 cron 再来
      result.stoppedBy = isMissingFunctionError(claim.error) ? "not_configured" : "empty";
      break;
    }
    const rows = claim.data ?? [];
    if (rows.length === 0) {
      // 审核队列 / 词表这一片有进展就再来一轮(先领翻译,仍为空再各给一片);碰上停机 / 限流暂停也回到循环开头,
      // 由那里报 budget / not_configured,或等暂停结束 / 报 rate_limited(还有活没做完,不算 empty);都没有 → 收工
      const moderated = await moderationSlice();
      if ((await termsSlice()) || moderated > 0 || blockedBy(run)) continue;
      result.stoppedBy = "empty";
      break;
    }

    const reports = await Promise.all(
      rows.map((row) =>
        processEntity(run, row, o.deadlineAt).catch((err): EntityReport => {
          log(`[i18n:drain] ${tag(row)} crashed: ${errText(err)}`);
          return { state: "error", counts: noCounts() };
        }),
      ),
    );
    for (const report of reports) tally(result, report);
    if (round % TERMS_EVERY === 0) await termsSlice();
  }
  result.moderated = run.moderated;
  result.calls = run.calls;
  return result;
}

/** 单实体快速通道:只处理这一条、不做词表(/api/moderate、API v1 的 after()) */
export function drainEntity(entity: ContentEntity, id: string, deadlineAt: number): Promise<DrainResult> {
  return drain({ deadlineAt, entity, entityIds: [id], concurrency: 1, terms: false });
}

/**
 * 批量语言检测:i18n_detection_queue(每批 200)→ 检测 → i18n_record_detection(按原文 hash CAS)。
 * noLlm:只用本地规则、不花钱(/api/i18n/drain 每次先跑一小批,sitemap 不必等付费管线),只取还没检测过的行;
 * 判不准的拉丁文记本地猜测并标 provisional。否则连 provisional 的行一起取,判不准的字段问模型(只接受 LATIN_LANGS);
 * 模型因与内容无关的原因(限流、超时、网络、上游故障…)没给出答案的行这次不记,仍是 provisional / 未检测。
 * 记上的条数可以少于提交的:原文已变,或本地猜测碰上同一版本已确定的检测结果(数据库不让猜测覆盖它),都不算出错。
 * SQL 还没升级(队列只有 p_limit、记不了 provisional)时:本地这一遍跳过判不准的行(留给 LLM,免得猜测成了定论)。
 * limit = 最多检查的条数(默认直到队列清空);deadlineAt = 到点不再开始新的一批(默认不限)。
 */
export async function detectPass(o: {
  limit?: number;
  noLlm?: boolean;
  deadlineAt?: number;
  log?: (m: string) => void;
}): Promise<{ detected: number; calls: number }> {
  const log = o.log ?? ((m: string) => console.log(m));
  const noLlm = o.noLlm === true;
  const deadlineAt = o.deadlineAt ?? Number.POSITIVE_INFINITY;
  // 判不准的拉丁文要靠模型;没有 key 时直接返回(只做本地检测请传 noLlm)
  if (!noLlm && !isAiConfigured()) {
    log("[i18n:detect] OPENROUTER_API_KEY is not set (pass noLlm for local-only detection)");
    return { detected: 0, calls: 0 };
  }
  let svc: SupabaseClient;
  try {
    svc = createServiceClient();
  } catch (err) {
    log(`[i18n:detect] ${errText(err)}`);
    return { detected: 0, calls: 0 };
  }
  const run = newRun(svc, log);
  let detected = 0;
  let remaining = o.limit ?? Number.POSITIVE_INFINITY;
  let provisional = true;

  while (remaining > 0 && !run.halt && Date.now() < deadlineAt) {
    const batch = Math.min(DETECT_BATCH, remaining);
    let queue = provisional
      ? await pipelineRpc<DetectionRow[]>(svc, "i18n_detection_queue", {
          p_limit: batch,
          p_include_provisional: !noLlm,
        })
      : null;
    if (!queue || (queue.error && isMissingFunctionError(queue.error))) {
      provisional = false;
      queue = await pipelineRpc<DetectionRow[]>(svc, "i18n_detection_queue", { p_limit: batch });
    }
    if (queue.error) {
      log(`[i18n:detect] queue failed: ${queue.error.code} ${queue.error.message}`);
      break;
    }
    const rows = queue.data ?? [];
    if (rows.length === 0) break;

    const usage: Usage = { calls: 0, in: 0, out: 0 };
    const gate = limiter(DETECT_PARALLEL);
    const items = await Promise.all(
      rows.map((row) =>
        gate(async (): Promise<DetectionItem | null> => {
          const payload = payloadFields(row.entity, row.payload);
          const key = { entity: row.entity, entity_id: row.entity_id, src_hash: row.src_hash };
          if (noLlm) {
            const local = localDetection(payload);
            const record = { ...key, field_langs: local.field_langs, primary_lang: local.primary_lang };
            if (!local.provisional) return record;
            return provisional ? { ...record, provisional: true } : null;
          }
          // 每次调用受 deadlineAt 与 callModelJson 自身 25 s 超时约束
          const d = await detectPayload(run, usage, payload, null, deadlineAt);
          return d.failure ? null : { ...key, field_langs: d.fieldLangs, primary_lang: d.primary };
        }),
      ),
    );
    if (usage.calls > 0) {
      const added = await pipelineRpc<null>(svc, "i18n_add_usage", { p_calls: usage.calls, p_in: usage.in, p_out: usage.out });
      if (added.error) log(`[i18n:detect] usage accounting failed: ${added.error.message}`);
    }
    const ready = items.filter((item): item is DetectionItem => item !== null);
    let recorded = 0;
    if (ready.length > 0) {
      const res = await pipelineRpc<number>(svc, "i18n_record_detection", { p_items: ready });
      if (res.error) {
        log(`[i18n:detect] record failed: ${res.error.code} ${res.error.message}`);
        break;
      }
      recorded = Number(res.data ?? 0);
    }
    detected += recorded;
    remaining -= rows.length;
    log(`[i18n:detect] +${recorded} (total ${detected})`);

    const pause = run.pausedUntil - Date.now();
    if (pause > 0) {
      if (Date.now() + pause >= deadlineAt) break;
      await sleep(pause); // 被限流挡下的条目还在队列里,暂停结束后重来
    } else if (recorded === 0) {
      break; // 一条也没记上(都被并发改动、模型这会儿给不出答案,或只剩留给 LLM 的行):停,避免空转
    }
  }
  return { detected, calls: run.calls };
}
