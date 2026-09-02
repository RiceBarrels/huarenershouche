// Public API(/api/v1/*)共享类型与常量。设计见 docs/public-api-v0.md。
// 这里只放类型和纯常量,不 import 任何运行时依赖(client/server 都可引用)。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbDealerStore } from "@/lib/types";

export const API_SCOPES = ["read:cars", "read:dealers", "write:inventory", "write:images"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

/** key 明文前缀;沙盒 clc_test_ 是 P2,v0 只签发 live */
export const API_KEY_PREFIX_LIVE = "clc_live_";
/** 明文总长 40(含前缀);库里 prefix 列存前 12 位用于展示定位 */
export const API_KEY_DISPLAY_PREFIX_LEN = 12;
export const MAX_KEYS_PER_OWNER = 5;

/** 无 key 请求按 IP 限流(次/分钟) */
export const ANON_RATE_LIMIT_PER_MIN = 20;
export const DEFAULT_KEY_RATE_LIMIT_PER_MIN = 60;

/** 配额档位:owner 维度(不按 key);判定见 docs/public-api-v0.md §2/§5 */
export type QuotaTier = "anonymous" | "personal" | "dealer";

export const QUOTA_LIMITS: Record<
  Exclude<QuotaTier, "anonymous">,
  { inserts: number; updates: number; combined: boolean; active: number | null }
> = {
  // 个人:每天新上传 ≤10、更改 ≤30,分开计
  personal: { inserts: 10, updates: 30, combined: false, active: null },
  // 车行:每天 ≤2000 次写(insert+update 合计),在售 ≤500
  dealer: { inserts: 2000, updates: 2000, combined: true, active: 500 },
};

export interface QuotaInfo {
  tier: QuotaTier;
  inserts_used: number;
  inserts_limit: number;
  updates_used: number;
  updates_limit: number;
  /** 车行档 insert+update 合计上限;个人档为 null */
  writes_limit: number | null;
  active_used: number;
  active_limit: number | null;
  /** UTC 次日 0 点 ISO */
  resets_at: string;
}

/** 鉴权后挂在请求上的 key 摘要(不含 hash) */
export interface ApiKeyContext {
  id: string;
  owner_id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  rate_limit_per_min: number;
}

export interface ApiOwner {
  id: string;
  username: string;
  account_type: "private" | "dealer";
  role: "user" | "admin";
  phone: string | null;
  location: string | null;
  languages: string[];
}

/** 每个 /api/v1 handler 拿到的上下文 */
export interface ApiContext {
  /** service-role client(绕过 RLS;所有写入都经服务端校验) */
  supabase: SupabaseClient;
  /** null = 匿名(只读、脱敏、按 IP 限流) */
  key: ApiKeyContext | null;
  owner: ApiOwner | null;
  tier: QuotaTier;
  /** owner 名下 verification_status='verified' 的门店(按 created_at 升序;空数组 = 无) */
  stores: DbDealerStore[];
  ip: string | null;
  /** 请求偏好语言(?lang= 或 Accept-Language),用于 *_label */
  lang: ApiLang;
}

export const API_LANGS = ["zh", "en", "ko", "ja", "es", "fr"] as const;
export type ApiLang = (typeof API_LANGS)[number];

/** 统一错误码(响应体 error.code) */
export type ApiErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "key_revoked"
  | "key_expired"
  | "ip_not_allowed"
  | "insufficient_scope"
  | "forbidden"
  | "account_banned"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "quota_exceeded"
  | "internal_error";

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

/** 列表分页游标:base64url(JSON.stringify({ t: created_at, id })) */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const BATCH_MAX_ITEMS = 100;
/** 每条 listing 最多图片数(与 lib/sources/images.ts MAX_IMAGES_PER_CAR 对齐的上限之上再收紧) */
export const LISTING_MAX_IMAGES = 30;
/** API 写入的车与转载一致:30 天过期,每次 PUT 刷新 */
export const LISTING_EXPIRY_DAYS = 30;
