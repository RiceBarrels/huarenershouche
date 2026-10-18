// 全站唯一的 OpenRouter 调用层(纯模块,服务端 + Bun 脚本;OPENROUTER_API_KEY 只在服务端存在,不要在客户端 import)。
//
// callModelJson() 只发一次 HTTP 请求,绝不在这里重试:重试、退避与限流暂停由数据库队列
// (i18n.translations 的 attempts / next_attempt_at)和 worker 决定。超时受调用方 deadlineAt 约束,
// 并且覆盖读取响应体的全过程;剩余时间不足 6 s 直接返回 deadline,不再发请求。

/** 2026-09 起全站统一用 DeepSeek V4 Flash(纯文本,便宜且多语言强) */
export const AI_MODEL = "deepseek/deepseek-v4-flash-0731";

// 该模型默认先「思考」再作答:一句话都要近千 reasoning token、几十秒,长文本还会被 max_tokens 截断成半截 JSON。
// 翻译/审核/检测都不需要推理 → 关闭 reasoning,并让 OpenRouter 路由到吞吐最高的供应商。
export const AI_ROUTING = { reasoning: { enabled: false }, provider: { sort: "throughput" } } as const;

export type AiError = "config" | "deadline" | "timeout" | "rate_limited" | "http" | "parse" | "truncated" | "network";

export type AiResult<T> =
  | { ok: true; json: T; usage: { in: number; out: number } }
  | { ok: false; error: AiError; status?: number; retryAfterMs?: number };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TIMEOUT_MS = 25_000;
// 超时 = min(25 s, deadlineAt − now − 2 s);剩余 < 6 s 时不发请求
const DEADLINE_MARGIN_MS = 2_000;
const MIN_LEFT_MS = 6_000;
// Retry-After 上限 1 h(与 i18n_complete 对 retry_after_s 的封顶一致,防止异常值溢出 int)
const RETRY_AFTER_CAP_MS = 3_600_000;

export function isAiConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null } | null; finish_reason?: string | null }[] | null;
  usage?: { prompt_tokens?: number | null; completion_tokens?: number | null } | null;
  error?: { code?: number | string | null; message?: string | null } | null;
}

const tokens = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

/** Retry-After:秒数或 HTTP 日期 → 毫秒(0 ~ 1 h);缺失或无法解析为 undefined */
function parseRetryAfter(header: string | null): number | undefined {
  const v = header?.trim();
  if (!v) return undefined;
  const ms = /^\d+(?:\.\d+)?$/.test(v) ? Number(v) * 1000 : Date.parse(v) - Date.now();
  if (!Number.isFinite(ms)) return undefined;
  return Math.min(RETRY_AFTER_CAP_MS, Math.max(0, Math.round(ms)));
}

function statusError<T>(error: "rate_limited" | "http", status: number, retryAfterMs?: number): AiResult<T> {
  return retryAfterMs === undefined ? { ok: false, error, status } : { ok: false, error, status, retryAfterMs };
}

/** X-Title 头只能是可打印 ASCII(非法字符会让 fetch 直接抛错) */
const headerTitle = (title: string) => title.replace(/[^\x20-\x7e]/g, "").trim() || "CLCAuto";

/**
 * 调一次模型并取回一个 JSON 对象(response_format json_object,temperature 0)。
 * 失败不抛错:config(未配 key)、deadline(剩余 < 6 s,未发请求)、timeout、rate_limited(429)、
 * http(其他非 2xx,或 200 但缺 choice / finish_reason = error 时记为 502;429 / 5xx 带 Retry-After 时附 retryAfterMs)、parse、truncated(finish_reason = length)、network。
 */
export async function callModelJson<T = unknown>(o: {
  system: string;
  user: string;
  maxTokens: number;
  deadlineAt: number;
  title: string;
  extraTurns?: { role: "assistant" | "user"; content: string }[];
}): Promise<AiResult<T>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, error: "config" };
  const left = o.deadlineAt - Date.now();
  if (!(left >= MIN_LEFT_MS)) return { ok: false, error: "deadline" };

  const title = headerTitle(o.title);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(MAX_TIMEOUT_MS, left - DEADLINE_MARGIN_MS));
  const failed = (): AiResult<T> => ({ ok: false, error: controller.signal.aborted ? "timeout" : "network" });
  try {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clcauto.com",
          "X-Title": title,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          ...AI_ROUTING,
          temperature: 0,
          max_tokens: o.maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: o.system },
            { role: "user", content: o.user },
            ...(o.extraTurns ?? []),
          ],
        }),
      });
    } catch {
      return failed();
    }

    if (!res.ok) {
      const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
      if (res.status === 429 || res.status >= 500) {
        res.body?.cancel().catch(() => {});
        return statusError(res.status === 429 ? "rate_limited" : "http", res.status, retryAfterMs);
      }
      // 其余 4xx(参数错误、余额不足、key 失效…)需要人处理:记一条日志(只含响应摘要,不含请求内容)
      const detail = await res.text().catch(() => "");
      console.warn(`[ai] ${title}: http ${res.status} ${detail.slice(0, 300)}`);
      return statusError("http", res.status);
    }

    // 响应体在同一个超时内读完(AbortSignal 一直挂着)
    let body: ChatCompletion | null;
    try {
      const raw = await res.text();
      try {
        body = JSON.parse(raw) as ChatCompletion | null;
      } catch {
        return { ok: false, error: "parse", status: res.status };
      }
    } catch {
      return failed();
    }
    if (!body || typeof body !== "object") return { ok: false, error: "parse", status: res.status };

    const choice = Array.isArray(body.choices) ? body.choices[0] : undefined;
    if (!choice && body.error) {
      // 上游供应商错误偶尔以 200 + {error} 返回
      const code = Number(body.error.code);
      if (code === 429) return statusError("rate_limited", 429);
      return statusError("http", Number.isInteger(code) && code >= 400 ? code : res.status);
    }
    // 200 但没有 choice,或 choice 报告供应商失败(finish_reason = error):按上游 5xx 处理(系统性故障,不算内容问题)
    if (!choice || choice.finish_reason === "error") return statusError("http", 502);
    if (choice.finish_reason === "length") return { ok: false, error: "truncated" };
    const content = choice?.message?.content;
    const json = extractJsonObject(typeof content === "string" ? content : null);
    if (json === null) return { ok: false, error: "parse" };
    return {
      ok: true,
      json: json as T,
      usage: { in: tokens(body.usage?.prompt_tokens), out: tokens(body.usage?.completion_tokens) },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 输出 token 上限:clamp(ceil(源字符数 · k · 目标语言数) + 256, 512, 8000)。
 * k:拉丁 → 中日韩 1.6,中日韩 → 拉丁 2.2,其余 1.3。
 */
export function maxTokensFor(srcChars: number, srcCjk: boolean, targetCjk: boolean, targets = 1): number {
  const k = !srcCjk && targetCjk ? 1.6 : srcCjk && !targetCjk ? 2.2 : 1.3;
  const chars = Number.isFinite(srcChars) && srcChars > 0 ? srcChars : 0;
  const n = Number.isFinite(targets) && targets > 1 ? targets : 1;
  return Math.min(8000, Math.max(512, Math.ceil(chars * k * n) + 256));
}

/** 从模型回复里取出 JSON 对象(容忍 ```json 代码块或前后多余文字);不是对象(数组、标量、解析失败)返回 null */
export function extractJsonObject(text: string | null | undefined): unknown | null {
  if (typeof text !== "string" || !text) return null;
  const parse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  let value = parse(text.trim());
  if (value === undefined) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    value = parse(text.slice(start, end + 1));
  }
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
