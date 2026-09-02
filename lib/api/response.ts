// Public API 统一响应工具:JSON 包装、错误格式、CORS、OPTIONS。
// 错误体固定为 { error: { code, message, details? , ...extra } }(docs/public-api-v0.md §4.3)。

import { NextResponse } from "next/server";
import type { ApiErrorCode, ApiErrorDetail } from "./types";

export const API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept-Language",
  "Access-Control-Expose-Headers":
    "X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After, X-Quota-Inserts-Remaining, X-Quota-Updates-Remaining, X-Quota-Tier",
};

export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export function apiJson<T>(
  data: T,
  init: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { ...API_CORS_HEADERS, "Cache-Control": "no-store", ...(init.headers ?? {}) },
  });
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
  extra?: Record<string, unknown>,
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details && details.length ? { details } : {}), ...(extra ?? {}) } },
    { status, headers: { ...API_CORS_HEADERS, "Cache-Control": "no-store", ...(headers ?? {}) } },
  );
}

/** 把未知异常转成 500,并在服务端日志留痕 */
export function apiInternalError(err: unknown, where: string): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[api/v1:${where}] ${message}`);
  return apiError(500, "internal_error", "Internal error");
}

/** 从 URLSearchParams 取整数,非法/缺省返回 fallback */
export function intParam(
  sp: URLSearchParams,
  name: string,
  fallback: number | null = null,
  opts: { min?: number; max?: number } = {},
): number | null {
  const raw = sp.get(name);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  let v = Math.trunc(n);
  if (opts.min != null) v = Math.max(opts.min, v);
  if (opts.max != null) v = Math.min(opts.max, v);
  return v;
}

/** 分页游标编解码(base64url JSON) */
export function encodeCursor(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

export function decodeCursor<T extends Record<string, unknown>>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}
