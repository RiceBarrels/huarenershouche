// 私信消息翻译 —— 服务端(只给 app/api/translate-message 用;会 import OpenRouter 层,不要在客户端 import)。
//
// 复用翻译管线的纯模块:protectTokens(链接、邮箱、@、VIN、电话号码原样保留)、translationMessages(提示词与
// 注入防护)、validateField(占位符 / 语言 / 照抄 / 数字 / 新增标识符校验)。但私信绝不写入 i18n schema,
// 也不进 i18n_bundle:结果只缓存在 message_translations(由路由负责)。
// 每条消息最多两次模型调用(第二次带上被拒原因纠错重问),都在调用方给的 deadlineAt 之内。

import type { SupabaseClient } from "@supabase/supabase-js";
import { callModelJson, isAiConfigured, maxTokensFor } from "@/lib/ai/openrouter";
import { detectLang, type SiteLang } from "@/lib/i18n/detect";
import { protectTokens } from "@/lib/i18n-pipeline/protect";
import { translationMessages, type TranslationRetry } from "@/lib/i18n-pipeline/prompts";
import { validateField } from "@/lib/i18n-pipeline/validate";
import { isMissingTableError } from "@/lib/chat-translate-shared";

/** 单条消息可译的最大字符数(私信几乎都很短;超长的直接拒绝,不花额度) */
export const CHAT_TRANSLATE_MAX_CHARS = 3000;
/** 每人每小时的模型调用上限(手动 + 自动共用;命中缓存 / 同语言不计) */
export const CHAT_TRANSLATE_LIMIT_PER_HOUR = 60;
/** usage 表不可用时的单实例内存上限(更保守:多实例下总量仍可控) */
const MEMORY_LIMIT_PER_HOUR = 20;

const CONTEXT = "A private chat message between a buyer and a seller on a used-car marketplace";
const CJK = new Set(["zh", "ja", "ko"]);

/** 翻译与紧急开关:没配 OPENROUTER_API_KEY 或 I18N_DRAIN_DISABLED=1(与 /api/i18n/drain 共用)时不可用 */
export function chatTranslateEnabled(): boolean {
  return isAiConfigured() && process.env.I18N_DRAIN_DISABLED !== "1";
}

export type ChatTranslateOutcome =
  | { ok: true; text: string; sourceLang: string | null; same: boolean }
  | { ok: false; error: "unavailable" | "failed" };

/** 模型回复 {"source_lang": "...", "t": {"content": "..."}} */
interface ModelReply {
  source_lang?: unknown;
  t?: unknown;
}

const primary = (lang: unknown): string | null =>
  typeof lang === "string" && lang.trim() ? lang.trim().toLowerCase().split(/[-_]/)[0] : null;

/**
 * 把一条私信译成 target。same = 模型确认原文就是目标语言(照抄回来),返回原文。
 * 不可用(config)→ unavailable;其余失败(超时、上游错误、两次都没通过校验)→ failed。
 */
export async function translateChatText(
  content: string,
  target: SiteLang,
  deadlineAt: number,
): Promise<ChatTranslateOutcome> {
  const src = protectTokens(content);
  const detected = detectLang(content).lang;
  const srcCjk = CJK.has(detected);
  const maxTokens = maxTokensFor(content.length, srcCjk, CJK.has(target));

  let retry: TranslationRetry | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msgs = translationMessages({ targets: [target], fields: { content: src.masked }, context: CONTEXT, retry });
    const res = await callModelJson<ModelReply>({
      system: msgs.system,
      user: msgs.user,
      extraTurns: msgs.extraTurns,
      maxTokens,
      deadlineAt,
      title: "CLCAuto chat translate",
    });
    if (!res.ok) return { ok: false, error: res.error === "config" ? "unavailable" : "failed" };

    const t = res.json.t;
    const out = t && typeof t === "object" ? (t as Record<string, unknown>).content : undefined;
    const modelLang = primary(res.json.source_lang);
    // 长度比等规则按原文语言取:本地检测出的站点语言优先,判不出来再信模型
    const srcLang = detected !== "und" && detected !== "other" ? detected : (modelLang ?? "other");
    const v = validateField(src, typeof out === "string" ? out : "", srcLang, target);
    if (v.ok) return { ok: true, text: v.text, sourceLang: modelLang ?? (detected === "und" ? null : detected), same: false };
    // 原样照抄且模型认为原文就是目标语言:不是失败,是不需要翻译
    if (v.reason === "echo" && modelLang === target) return { ok: true, text: content, sourceLang: target, same: true };
    retry = { rejectedAnswer: JSON.stringify(res.json), reason: v.reason };
  }
  return { ok: false, error: "failed" };
}

// ---------- 限流 ----------

const memoryHits = new Map<string, { window: number; hits: number }>();
let warnedUsage = false;

function memoryHit(userId: string, window: number): number {
  if (memoryHits.size > 5000) {
    for (const [k, v] of memoryHits) if (v.window !== window) memoryHits.delete(k);
  }
  const cur = memoryHits.get(userId);
  const hits = cur && cur.window === window ? cur.hits + 1 : 1;
  memoryHits.set(userId, { window, hits });
  return hits;
}

/**
 * 记一次模型调用并判断是否超限(整点小时窗口)。usage 表 / RPC 不可用(SQL 未执行、数据库故障)时
 * 退回单实例内存计数,上限更低 —— 不是放行。
 */
export async function hitChatTranslateLimit(
  service: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const window = Math.floor(now / 3_600_000) * 3_600_000;
  const retryAfterSec = Math.max(1, Math.ceil((window + 3_600_000 - now) / 1000));
  let hits: number;
  let limit = CHAT_TRANSLATE_LIMIT_PER_HOUR;
  try {
    const { data, error } = await service.rpc("message_translation_hit", {
      p_user: userId,
      p_window: new Date(window).toISOString(),
    });
    if (error) throw error;
    hits = Number(data ?? 0);
    if (!Number.isFinite(hits) || hits <= 0) throw new Error("bad count");
  } catch (err) {
    if (!warnedUsage) {
      warnedUsage = true;
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
      console.warn(`[translate-message] usage counter unavailable, using in-memory limit: ${msg}`);
    }
    hits = memoryHit(userId, window);
    limit = MEMORY_LIMIT_PER_HOUR;
  }
  return hits <= limit ? { allowed: true, retryAfterSec: 0 } : { allowed: false, retryAfterSec };
}

// ---------- 缓存 ----------

/** 读缓存;表不存在 / 出错 → null(跳过缓存) */
export async function readCachedTranslation(
  service: SupabaseClient,
  messageId: string,
  locale: SiteLang,
): Promise<{ text: string; sourceLang: string | null } | null> {
  const { data, error } = await service
    .from("message_translations")
    .select("text, source_lang")
    .eq("message_id", messageId)
    .eq("locale", locale)
    .maybeSingle();
  if (error) {
    if (!isMissingTableError(error)) console.warn(`[translate-message] cache read: ${error.message}`);
    return null;
  }
  const row = data as { text: string | null; source_lang: string | null } | null;
  return row?.text ? { text: row.text, sourceLang: row.source_lang } : null;
}

/** 写缓存;失败(含表不存在)静默 */
export async function writeCachedTranslation(
  service: SupabaseClient,
  messageId: string,
  locale: SiteLang,
  text: string,
  sourceLang: string | null,
): Promise<void> {
  const { error } = await service
    .from("message_translations")
    .upsert({ message_id: messageId, locale, text, source_lang: sourceLang }, { onConflict: "message_id,locale" });
  if (error && !isMissingTableError(error)) console.warn(`[translate-message] cache write: ${error.message}`);
}
