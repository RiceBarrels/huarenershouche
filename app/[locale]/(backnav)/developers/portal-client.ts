// 开发者门户调 /api/v1/keys* 的小封装:带上 Supabase 会话 access token,
// 把 { error: { code, message } } 统一抛成 PortalError,页面按 code 出提示。

import { supabase } from "@/lib/supabase";
import type { DbApiKey } from "@/lib/types";
import type { QuotaInfo } from "@/lib/api/types";

export class PortalError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface KeysResponse {
  keys: DbApiKey[];
  tier: "personal" | "dealer";
  quota: QuotaInfo;
}

export interface CreatedKey {
  key: string;
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
}

export interface UsageDay {
  day: string;
  requests: number;
  errors: number;
  inserts: number;
  updates: number;
}

export interface UsageResponse {
  days: UsageDay[];
  quota: QuotaInfo;
}

export async function portalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new PortalError("unauthorized", "Not signed in", 401);
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new PortalError(err?.code ?? "internal_error", err?.message ?? res.statusText, res.status);
  }
  return body as T;
}

/** 把接口错误翻成给用户看的中文 key(页面再过 t()) */
export function portalErrorText(e: unknown): string {
  if (e instanceof PortalError) {
    switch (e.code) {
      case "unauthorized":
        return "登录状态已失效,请重新登录";
      case "conflict":
        return "有效 key 已达上限,请先吊销不再使用的 key";
      case "rate_limited":
        return "操作过于频繁,请稍后再试";
      case "validation_failed":
      case "bad_request":
        return "参数有误,请检查后重试";
      case "not_found":
        return "该 key 不存在或已被吊销";
      default:
        return e.message || "请求失败,请稍后再试";
    }
  }
  return "网络异常,请稍后再试";
}
