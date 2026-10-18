// AI 内容审核 —— 服务端专用(经 lib/ai/openrouter.ts 调用 DeepSeek,纯文本)。
// 绝不要在客户端组件里 import:OPENROUTER_API_KEY 必须留在服务端。
//
// moderateContentDetailed() 审核一条用户内容;moderateTranslationOutputDetailed() 审核机器译文与话题/配置标签
// (防止被注入的诈骗链接等经翻译混进其他语言)。两者都把文本按段落切成 ≤ 6000 字的块(最多 4 块)
// 并行送审:任一块违规即违规(类别取并集、理由取第一个);有块失败且没有块违规时返回 ModerationFailure。
// 只在明确违规时返回 violation=true,拿不准一律放行(误杀比漏杀伤害大)。
// 失败分两类:systemic = 与内容无关的故障(未配置 key、剩余时间不足、限流、超时、网络、HTTP 401/402/403/404/408/429/5xx、
// 常规大小块的 400、200 但响应体不是 JSON),调用方不给这条内容记失败次数,按限流暂停 / 停机处理;其余(模型回复解析不了、
// 被截断、判定格式不对、超大块的 400、其他 4xx)算内容相关失败,由调用方(lib/i18n-pipeline)记为 error,同一版本累计 3 次后放行。
// 旧接口 moderateContent() / moderateTranslationOutput() 不区分失败类型,失败时返回 null。

import { AI_MODEL, callModelJson, type AiError, type AiResult } from "@/lib/ai/openrouter";

export const MODERATION_MODEL = AI_MODEL;

export type ModerationKind =
  | "car"
  | "post"
  | "car_comment"
  | "post_comment"
  | "qa_question"
  | "qa_answer"
  | "dealer_review";

/** 可送审的内容类型:翻译管线的实体 + 卖家资料里的即时通讯联系方式(/api/contact-apps,不经翻译管线) */
export type ModerationContentKind = ModerationKind | "contact_apps";

export interface ModerationVerdict {
  violation: boolean;
  categories: string[];
  reason: string | null;
  /** 内容主要语言(ISO 639-1),判断不了为 "und";翻译管线用作拉丁语种检测的提示 */
  lang: string;
  /** 实际发出的模型调用次数(长文分块时 > 1;空文本为 0) */
  calls: number;
}

/** 审核没能得出结论(没有块违规、至少一块失败) */
export interface ModerationFailure {
  failed: true;
  /**
   * 与内容无关的故障:config、deadline、rate_limited、timeout、network、http 401/402/403/404/408/429/5xx、常规大小块的
   * http 400、带 status 的 parse(200 但响应体不是 JSON)(调用方不记失败次数)。
   * 内容相关:模型回复 parse 不了、truncated、判定格式不对("verdict")、超大块的 http 400、其他 http 4xx。
   * 多块失败时报告最该处理的一个:停机类(config、401、402、400、404)> 限流(Retry-After 取最长)> 其他系统性故障 > 内容相关失败
   */
  systemic: boolean;
  error: AiError | "verdict";
  status?: number;
  retryAfterMs?: number;
  /** 实际发出的请求数 */
  calls: number;
}

export type ModerationOutcome = ModerationVerdict | ModerationFailure;

export function isModerationFailure(x: ModerationOutcome): x is ModerationFailure {
  return "failed" in x && x.failed === true;
}

export function isModerationConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

const CHUNK_CHARS = 6000;
const MAX_CHUNKS = 4;
// 每块一次调用,超时 20 s:callModelJson 的超时 = min(25 s, deadlineAt − now − 2 s)
const CALL_TIMEOUT_MS = 20_000;
const MAX_TOKENS = 500;
const MAX_CATEGORIES = 7;

const KIND_LABELS: Record<ModerationContentKind, string> = {
  car: "二手车车辆列表(卖家发布)",
  post: "社区帖子",
  car_comment: "车辆页评论",
  post_comment: "社区帖子评论",
  qa_question: "问答提问",
  qa_answer: "问答回答",
  dealer_review: "车行评价",
  contact_apps:
    "卖家资料里的即时通讯联系方式(微信号 / KakaoTalk ID / LINE ID / WhatsApp 号码;正常的个人或车行账号不算违规,只拦截明显的推广、引流、诈骗账号)",
};
const TRANSLATION_LABEL = "平台机器翻译生成的译文或话题标签(可能含多种语言)";

const SYSTEM_PROMPT = `你是北美华人二手车平台「常來車網」的内容审核员。根据以下社区规范判定用户提交的内容是否违规:

1. illegal — 违法内容:毒品、武器、赃车或无合法手续的车辆、伪造证件/里程表、其他违法交易
2. scam — 诈骗:钓鱼链接、假冒官方、明显的定金/转账诈骗套路、传销或资金盘
3. sexual — 色情或露骨性暗示内容
4. violence — 暴力、血腥、恐吓、鼓励自残
5. hate — 仇恨言论、种族/地域歧视、对他人的骚扰或严重人身攻击
6. privacy — 未经同意曝光他人隐私(住址、证件、电话等人肉信息)
7. spam — 与二手车/汽车生活完全无关的垃圾广告、刷屏、恶意导流

判定原则:只拦截明确违规的内容。正常的买卖车、议价、吐槽、批评、争论、留联系方式卖自己的车都不算违规。拿不准时一律 violation=false。

只输出一个原始 JSON 对象,无 markdown、无代码块、无多余文字:
{"violation": true|false, "categories": ["scam"], "reason": "一句简体中文说明", "lang": "<ISO 639-1 of the main language or und>"}
violation=false 时 categories 为空数组、reason 为 null。lang 为内容主要语言的 ISO 639-1 代码(如 zh、en、ko),无法判断时为 und。`;

/** 在窗口后半段找最靠后的边界:空行(段落)> 换行 > 句末 > 空白;都没有则硬切 */
const BOUNDARIES = [/\n[^\S\n]*\n/g, /\n/g, /[.!?](?=\s)|[。！？]/g, /\s/g];

function cutPoint(window: string): number {
  const min = Math.floor(window.length / 2);
  for (const re of BOUNDARIES) {
    let best = -1;
    for (const m of window.matchAll(re)) {
      const end = (m.index ?? 0) + m[0].length;
      if (end >= min) best = end;
    }
    if (best > 0) return best;
  }
  // 硬切时不要把 emoji 等代理对劈开
  const code = window.charCodeAt(window.length - 1);
  return code >= 0xd800 && code <= 0xdbff ? window.length - 1 : window.length;
}

function cutChunks(text: string, size: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > size) {
    const cut = cutPoint(rest.slice(0, size));
    const head = rest.slice(0, cut).trim();
    if (head) out.push(head);
    rest = rest.slice(cut).trimStart();
  }
  if (rest.trim()) out.push(rest.trim());
  return out;
}

/** 按段落切成 ≤ 6000 字的块;超过 4 块(多语言译文合并送审时可能出现)就放大块尺寸,保证全文都被审到 */
function chunkText(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  let size = Math.max(CHUNK_CHARS, Math.ceil(t.length / MAX_CHUNKS));
  for (;;) {
    const chunks = cutChunks(t, size);
    if (chunks.length <= MAX_CHUNKS) return chunks;
    size = Math.ceil(size * 1.25);
  }
}

interface ChunkVerdict {
  violation: boolean;
  categories: string[];
  reason: string | null;
  lang: string;
}

/** 模型偶尔把语言写成 "EN" / "zh-Hans":归一成两位小写代码,其余记 und */
function normLang(value: unknown): string {
  if (typeof value !== "string") return "und";
  const code = value.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2}$/.test(code) ? code : "und";
}

function parseVerdict(json: unknown): ChunkVerdict | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const violation = o.violation === true || o.violation === "true" ? true : o.violation === false || o.violation === "false" ? false : null;
  if (violation === null) return null;
  const lang = normLang(o.lang);
  if (!violation) return { violation, categories: [], reason: null, lang };
  const categories = Array.isArray(o.categories)
    ? o.categories
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim().slice(0, 40))
        .filter(Boolean)
    : [];
  const reason = typeof o.reason === "string" && o.reason.trim() ? o.reason.trim().slice(0, 500) : null;
  return { violation, categories, reason, lang };
}

type ChunkFailure = Omit<ModerationFailure, "failed" | "calls">;

/**
 * 与内容无关的故障?
 * - http:5xx、200 + 上游错误、401/402/403/408/429 是服务 / 账号故障;404(模型下线、数据策略下没有可用的供应商)和
 *   常规大小(≤ 6000 字)块的 400(模型 ID 无效、参数不被接受)对每条内容都一样失败,也算系统性,否则一次配置故障
 *   会让这段时间发布的内容各记满 3 次失败、永久放行。超大块(长译文合并送审)的 400 可能是超出上下文,和 413 等
 *   其余 4xx 一样算这条内容本身的问题
 * - parse:带 status 是 200 的响应体本身不是 JSON(网关错误页),与内容无关;不带 status 是模型回复解析不了,算内容相关
 */
function isSystemic(error: AiError | "verdict", status: number | undefined, chunkChars: number): boolean {
  switch (error) {
    case "config":
    case "deadline":
    case "rate_limited":
    case "timeout":
    case "network":
      return true;
    case "http":
      if (status === undefined || status < 400 || status >= 500) return true;
      if (status === 400) return chunkChars <= CHUNK_CHARS;
      return [401, 402, 403, 404, 408, 429].includes(status);
    case "parse":
      return status !== undefined;
    default:
      return false;
  }
}

function chunkFailure(r: AiResult<unknown>, chunkChars: number): ChunkFailure {
  if (r.ok) return { systemic: false, error: "verdict" };
  const f: ChunkFailure = { systemic: isSystemic(r.error, r.status, chunkChars), error: r.error };
  if (r.status !== undefined) f.status = r.status;
  if (r.retryAfterMs !== undefined) f.retryAfterMs = r.retryAfterMs;
  return f;
}

/** 多块失败时先报停机类(config、401、402,以及配置类的 400、404),再报限流、其他系统性故障,最后才是内容相关失败 */
function failureRank(f: ChunkFailure): number {
  if (!f.systemic) return 3;
  if (f.error === "config" || (f.error === "http" && [400, 401, 402, 404].includes(f.status ?? 0))) return 0;
  if (f.error === "rate_limited" || (f.error === "http" && f.status === 429)) return 1;
  return 2;
}

async function moderateChunks(label: string, text: string, deadlineAt: number | undefined): Promise<ModerationOutcome> {
  if (!isModerationConfigured()) return { failed: true, systemic: true, error: "config", calls: 0 };
  const chunks = chunkText(text);
  if (chunks.length === 0) return { violation: false, categories: [], reason: null, lang: "und", calls: 0 };

  const callDeadline = Math.min(deadlineAt ?? Number.POSITIVE_INFINITY, Date.now() + CALL_TIMEOUT_MS + 2_000);
  const results = await Promise.all(
    chunks.map((chunk, i) =>
      callModelJson({
        system: SYSTEM_PROMPT,
        user:
          chunks.length > 1
            ? `内容类型:${label}(长文分 ${chunks.length} 段送审,这是第 ${i + 1} 段)\n\n内容:\n${chunk}`
            : `内容类型:${label}\n\n内容:\n${chunk}`,
        maxTokens: MAX_TOKENS,
        deadlineAt: callDeadline,
        title: "CLCAuto Moderation",
      }),
    ),
  );

  let calls = 0;
  const failures: ChunkFailure[] = [];
  const verdicts: { verdict: ChunkVerdict; size: number }[] = [];
  results.forEach((r, i) => {
    // config / deadline 时没有发出请求,不计调用次数
    if (r.ok || (r.error !== "config" && r.error !== "deadline")) calls++;
    const verdict = r.ok ? parseVerdict(r.json) : null;
    if (verdict) verdicts.push({ verdict, size: chunks[i].length });
    else failures.push(chunkFailure(r, chunks[i].length));
  });

  // 主要语言取最长的、判断出语言的块
  const lang =
    verdicts
      .filter((v) => v.verdict.lang !== "und")
      .sort((a, b) => b.size - a.size)[0]?.verdict.lang ?? "und";
  const violating = verdicts.map((v) => v.verdict).filter((v) => v.violation);
  if (violating.length > 0) {
    return {
      violation: true,
      categories: [...new Set(violating.flatMap((v) => v.categories))].slice(0, MAX_CATEGORIES),
      reason: violating.find((v) => v.reason)?.reason ?? null,
      lang,
      calls,
    };
  }
  if (failures.length > 0) {
    const shown = failures.map((f) => (f.status === undefined ? f.error : `${f.error} ${f.status}`));
    console.warn(`[moderate] ${failures.length}/${chunks.length} chunk(s) failed: ${shown.join(", ")}`);
    // 同一档里 Retry-After 最长的优先:调用方按它暂停
    const worst = failures.sort(
      (a, b) => failureRank(a) - failureRank(b) || (b.retryAfterMs ?? 0) - (a.retryAfterMs ?? 0),
    )[0];
    return { failed: true, ...worst, calls };
  }
  return { violation: false, categories: [], reason: null, lang, calls };
}

/** 审核一条用户内容(调用方负责拼好标题 / 正文 / 标签等全部文本);失败时区分系统性 / 内容相关 */
export async function moderateContentDetailed(
  kind: ModerationContentKind,
  text: string,
  opts?: { deadlineAt?: number }
): Promise<ModerationOutcome> {
  return moderateChunks(KIND_LABELS[kind], text, opts?.deadlineAt);
}

/** 审核机器译文 / 标签(各语言合并送审,任一块违规即整体违规);失败时区分系统性 / 内容相关 */
export async function moderateTranslationOutputDetailed(
  texts: readonly { locale: string; text: string }[],
  opts: { deadlineAt: number }
): Promise<ModerationOutcome> {
  const joined = texts
    .filter((x) => x.text.trim())
    .map((x) => `[${x.locale}]\n${x.text.trim()}`)
    .join("\n\n");
  return moderateChunks(TRANSLATION_LABEL, joined, opts.deadlineAt);
}

/** moderateContentDetailed,失败时返回 null */
export async function moderateContent(
  kind: ModerationContentKind,
  text: string,
  opts?: { deadlineAt?: number }
): Promise<ModerationVerdict | null> {
  const outcome = await moderateContentDetailed(kind, text, opts);
  return isModerationFailure(outcome) ? null : outcome;
}

/** moderateTranslationOutputDetailed,失败时返回 null */
export async function moderateTranslationOutput(
  texts: readonly { locale: string; text: string }[],
  opts: { deadlineAt: number }
): Promise<ModerationVerdict | null> {
  const outcome = await moderateTranslationOutputDetailed(texts, opts);
  return isModerationFailure(outcome) ? null : outcome;
}
