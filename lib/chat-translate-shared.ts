// 私信消息翻译 —— 客户端与 /api/translate-message 共用的接口契约与错误分类(纯模块,server / client 通用)。

import type { Locale } from "@/lib/i18n";

export interface TranslateMessageRequest {
  messageId: string;
  target: Locale;
}

/** 200 响应:same = 原文已是目标语言(或无可译文字),text 即原文,不落缓存 */
export interface TranslateMessageResponse {
  ok: true;
  text: string;
  sourceLang: string | null;
  cached: boolean;
  same: boolean;
}

export type TranslateMessageErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "too_long"
  | "rate_limited"
  | "unavailable"
  | "failed";

/** 缺表:42P01 undefined_table、PGRST205(表不在 schema cache) */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (typeof message === "string" && /relation .* does not exist|could not find the table/i.test(message))
  );
}
