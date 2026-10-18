// 私信消息翻译 —— 客户端调用层(网页与 Capacitor 原生壳通用;接口契约在 lib/chat-translate-shared.ts)。
//
// 私信是私密内容,绝不进入公开的 i18n 管线:译文由 /api/translate-message 按需生成并缓存在
// message_translations(supabase/message-translations.sql,RLS 只允许会话双方读)。
// 本会话(页面生命周期)级的两个开关放在模块状态里,跨会话窗口共享:
// - unavailable:接口返回 503(没配模型 key / 翻译紧急开关)→ 整个会话静默隐藏翻译 UI;
// - exhausted:接口返回 429(每人每小时额度用完)→ 停止自动翻译,只提示一次,不重试。

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { apiOrigin } from "@/lib/capacitor";
import { detectLang, type DetectedLang } from "@/lib/i18n/detect";
import type { Locale } from "@/lib/i18n";
import type { TranslateMessageRequest, TranslateMessageResponse } from "@/lib/chat-translate-shared";
import { isMissingTableError } from "@/lib/chat-translate-shared";

export type ChatTranslateResult =
  | { ok: true; text: string; sourceLang: string | null; cached: boolean; same: boolean }
  | { ok: false; error: "unavailable" | "rate_limited" | "failed" };

// ---------- 会话级开关 ----------

interface SessionState {
  unavailable: boolean;
  exhausted: boolean;
}

let session: SessionState = { unavailable: false, exhausted: false };
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: SessionState = { unavailable: false, exhausted: false };

function setSession(patch: Partial<SessionState>) {
  const next = { ...session, ...patch };
  if (next.unavailable === session.unavailable && next.exhausted === session.exhausted) return;
  session = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 当前会话状态(循环里随时读最新值用) */
export function chatTranslateSession(): SessionState {
  return session;
}

/** React 订阅会话状态(503 隐藏 UI / 429 停自动翻译) */
export function useChatTranslateSession(): SessionState {
  return useSyncExternalStore(subscribe, () => session, () => SERVER_SNAPSHOT);
}

// ---------- 调用接口 ----------

/** 请求翻译一条发给自己的消息;任何失败都不抛错 */
export async function translateMessage(messageId: string, target: Locale): Promise<ChatTranslateResult> {
  if (session.unavailable) return { ok: false, error: "unavailable" };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: "failed" };
    const body: TranslateMessageRequest = { messageId, target };
    const res = await fetch(`${apiOrigin()}/api/translate-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.status === 503) {
      setSession({ unavailable: true });
      return { ok: false, error: "unavailable" };
    }
    if (res.status === 429) {
      setSession({ exhausted: true });
      return { ok: false, error: "rate_limited" };
    }
    if (!res.ok) return { ok: false, error: "failed" };
    const json = (await res.json()) as Partial<TranslateMessageResponse> | null;
    if (!json?.ok || typeof json.text !== "string") return { ok: false, error: "failed" };
    return {
      ok: true,
      text: json.text,
      sourceLang: typeof json.sourceLang === "string" ? json.sourceLang : null,
      cached: json.cached === true,
      same: json.same === true,
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// message_translations 表缺失(SQL 未执行)时本会话不再查
let cacheTableMissing = false;

/**
 * 批量读已缓存的译文(RLS:只返回自己所在会话的消息)。自动翻译先用它,命中的不再调接口、不占额度。
 * 失败(含表不存在)返回空表。
 */
export async function fetchCachedTranslations(
  messageIds: string[],
  locale: Locale,
): Promise<Map<string, { text: string; sourceLang: string | null }>> {
  const out = new Map<string, { text: string; sourceLang: string | null }>();
  if (cacheTableMissing || messageIds.length === 0) return out;
  try {
    const { data, error } = await supabase
      .from("message_translations")
      .select("message_id, text, source_lang")
      .eq("locale", locale)
      .in("message_id", messageIds.slice(0, 100));
    if (error) {
      if (isMissingTableError(error)) cacheTableMissing = true;
      return out;
    }
    for (const row of (data as { message_id: string; text: string; source_lang: string | null }[] | null) ?? []) {
      if (row.text) out.set(row.message_id, { text: row.text, sourceLang: row.source_lang });
    }
  } catch {
    // 静默:当作没有缓存
  }
  return out;
}

// ---------- 自动翻译偏好(每个会话单独开,默认关) ----------

const autoKey = (conversationId: string) => `clc_chat_autotranslate:${conversationId}`;

/** 本会话是否开了自动翻译(localStorage 不可用时视为关) */
export function readAutoTranslate(conversationId: string): boolean {
  try {
    return localStorage.getItem(autoKey(conversationId)) === "1";
  } catch {
    return false;
  }
}

export function writeAutoTranslate(conversationId: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(autoKey(conversationId), "1");
    else localStorage.removeItem(autoKey(conversationId));
  } catch {
    // 无痕模式等:只在本次页面内生效
  }
}

// ---------- 是否需要翻译 ----------

/**
 * 文字消息是否值得翻译成当前界面语言:检测出的语言与界面语言不同。
 * und(表情、数字、链接等无语言信号)不翻译;判不准的短拉丁文按检测结果走(服务端还会再判一次)。
 */
export function needsTranslation(content: string, locale: Locale): boolean {
  const lang: DetectedLang = detectLang(content).lang;
  return lang !== "und" && lang !== locale;
}
