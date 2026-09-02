// Public API 鉴权(docs/public-api-v0.md §2 / §3)。
// authenticateApi:Bearer clc_live_… → 查 hash → 吊销/过期/IP/scope → 限流 → 装 owner + 门店 + 档位。
// authenticateUser:开发者门户用,Bearer 是 Supabase 登录 session 的 access token(同 /api/sync POST)。
// 全程用 service client(绕过 RLS,key_hash 永不出服务端)。

import { after, type NextRequest, type NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbDealerStore } from "@/lib/types";
import { createServiceClient } from "@/lib/sources/service-client";
import { apiError } from "./response";
import { checkRateLimit } from "./rate-limit";
import { hashApiKey, looksLikeApiKey } from "./keys";
import {
  ANON_RATE_LIMIT_PER_MIN,
  API_LANGS,
  DEFAULT_KEY_RATE_LIMIT_PER_MIN,
  type ApiContext,
  type ApiKeyContext,
  type ApiLang,
  type ApiOwner,
  type ApiScope,
  type QuotaTier,
} from "./types";

export type AuthOk = { ok: true; ctx: ApiContext };
export type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

export interface AuthOptions {
  /** 需要的 scope;匿名请求(allowAnonymous)不检查 */
  scope?: ApiScope;
  /** 允许无 key 访问(只读端点);默认 false → 无 key 返回 401 */
  allowAnonymous?: boolean;
}

// ---------- 小工具 ----------

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/** 取客户端 IP:x-forwarded-for 第一跳,退回 x-real-ip;去掉 IPv4-mapped IPv6 前缀 */
function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  let ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || null;
  if (!ip) return null;
  if (ip.startsWith("::ffff:")) ip = ip.slice("::ffff:".length);
  return ip || null;
}

function parseIpv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

/** IPv4 CIDR 匹配。IPv6 / 解析失败一律不匹配(allowlist 非空时即拒绝) */
function ipInAllowlist(ip: string | null, allowlist: string[]): boolean {
  if (!ip) return false;
  const addr = parseIpv4(ip);
  if (addr == null) return false;
  for (const entry of allowlist) {
    const [base, bitsRaw] = entry.trim().split("/");
    const net = parseIpv4(base);
    if (net == null) continue;
    const bits = bitsRaw == null || bitsRaw === "" ? 32 : Number(bitsRaw);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if (((addr & mask) >>> 0) === ((net & mask) >>> 0)) return true;
  }
  return false;
}

function isApiLang(v: string): v is ApiLang {
  return (API_LANGS as readonly string[]).includes(v);
}

/** ?lang= 优先,其次 Accept-Language 第一个能匹配的主标签,否则 zh */
export function resolveLang(req: NextRequest): ApiLang {
  const q = req.nextUrl.searchParams.get("lang")?.trim().toLowerCase();
  if (q && isApiLang(q)) return q;
  const header = req.headers.get("accept-language");
  if (header) {
    for (const part of header.split(",")) {
      const tag = part.split(";")[0]?.trim().toLowerCase();
      if (!tag) continue;
      const primary = tag.split("-")[0];
      if (primary && isApiLang(primary)) return primary;
    }
  }
  return "zh";
}

/** 后台任务:优先用 Next 的 after()(响应后继续跑),不在请求上下文时退回 fire-and-forget */
function background(task: () => Promise<unknown>) {
  const run = () => task().catch((err) => console.warn(`[api/v1:auth] background task failed: ${String(err)}`));
  try {
    after(run);
  } catch {
    void run();
  }
}

function fail(response: NextResponse): AuthFail {
  return { ok: false, response };
}

// ---------- owner / 门店 / 档位 ----------

interface ProfileRow {
  id: string;
  username: string | null;
  account_type: "private" | "dealer" | null;
  role: "user" | "admin" | null;
  phone: string | null;
  location: string | null;
  languages: string[] | null;
  banned: boolean | null;
}

const PROFILE_COLUMNS = "id, username, account_type, role, phone, location, languages, banned";

async function loadProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw new Error(`profiles lookup failed: ${error.message}`);
  return (data as ProfileRow | null) ?? null;
}

async function loadVerifiedStores(supabase: SupabaseClient, ownerId: string): Promise<DbDealerStore[]> {
  const { data, error } = await supabase
    .from("dealer_stores")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("verification_status", "verified")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`dealer_stores lookup failed: ${error.message}`);
  return (data ?? []) as DbDealerStore[];
}

function toOwner(p: ProfileRow): ApiOwner {
  return {
    id: p.id,
    username: p.username ?? "",
    account_type: p.account_type === "dealer" ? "dealer" : "private",
    role: p.role === "admin" ? "admin" : "user",
    phone: p.phone ?? null,
    location: p.location ?? null,
    languages: p.languages ?? [],
  };
}

export interface OwnerContext {
  owner: ApiOwner;
  stores: DbDealerStore[];
  /** 有已认证门店 → dealer,否则 personal(account_type 本身不决定档位) */
  tier: Exclude<QuotaTier, "anonymous">;
  banned: boolean;
}

/**
 * 装载 owner + 已认证门店 + 档位。门户端点(/api/v1/keys)用它拼一个最小 ApiContext 去算配额。
 * profile 不存在返回 null。
 */
export async function buildOwnerContext(supabase: SupabaseClient, userId: string): Promise<OwnerContext | null> {
  const profile = await loadProfile(supabase, userId);
  if (!profile) return null;
  const stores = await loadVerifiedStores(supabase, userId);
  return {
    owner: toOwner(profile),
    stores,
    tier: stores.length > 0 ? "dealer" : "personal",
    banned: Boolean(profile.banned),
  };
}

// ---------- API key 鉴权 ----------

interface ApiKeyRow {
  id: string;
  owner_id: string;
  name: string;
  prefix: string;
  scopes: string[] | null;
  ip_allowlist: string[] | null;
  rate_limit_per_min: number | null;
  expires_at: string | null;
  revoked_at: string | null;
  request_count: number | null;
}

export async function authenticateApi(req: NextRequest, opts: AuthOptions = {}): Promise<AuthResult> {
  const lang = resolveLang(req);
  const ip = clientIp(req);
  const token = bearerToken(req);
  const supabase = createServiceClient();

  // 1. 无 key
  if (!token) {
    if (!opts.allowAnonymous) {
      return fail(apiError(401, "unauthorized", "Missing API key. Send `Authorization: Bearer clc_live_...`."));
    }
    const rl = await checkRateLimit(supabase, `ip:${ip ?? "unknown"}`, ANON_RATE_LIMIT_PER_MIN);
    if (!rl.allowed) return fail(rateLimited(rl, "Anonymous rate limit exceeded. Use an API key for a higher limit."));
    return {
      ok: true,
      ctx: { supabase, key: null, owner: null, tier: "anonymous", stores: [], ip, lang },
    };
  }

  // 2. 有 token 但不是 key(多半是误传了登录 session)
  if (!looksLikeApiKey(token)) {
    return fail(apiError(401, "unauthorized", "Invalid token. Use an API key (clc_live_...)."));
  }

  // 3. 查 hash
  const { data: keyData, error: keyErr } = await supabase
    .from("api_keys")
    .select(
      "id, owner_id, name, prefix, scopes, ip_allowlist, rate_limit_per_min, expires_at, revoked_at, request_count",
    )
    .eq("key_hash", hashApiKey(token))
    .maybeSingle();
  if (keyErr) throw new Error(`api_keys lookup failed: ${keyErr.message}`);
  const key = keyData as ApiKeyRow | null;
  if (!key) return fail(apiError(401, "unauthorized", "Unknown API key."));
  if (key.revoked_at) return fail(apiError(401, "key_revoked", "This API key has been revoked."));
  if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
    return fail(apiError(401, "key_expired", "This API key has expired."));
  }
  if (key.ip_allowlist && key.ip_allowlist.length > 0 && !ipInAllowlist(ip, key.ip_allowlist)) {
    return fail(apiError(403, "ip_not_allowed", `Request IP ${ip ?? "(unknown)"} is not in this key's IP allowlist.`));
  }
  const scopes = (key.scopes ?? []) as ApiScope[];
  if (opts.scope && !scopes.includes(opts.scope)) {
    return fail(
      apiError(403, "insufficient_scope", `This API key lacks the required scope: ${opts.scope}.`, [
        { field: "scope", issue: `requires ${opts.scope}` },
      ]),
    );
  }

  // 4. 限流(按 key)
  const rateLimit = key.rate_limit_per_min ?? DEFAULT_KEY_RATE_LIMIT_PER_MIN;
  const rl = await checkRateLimit(supabase, `key:${key.id}`, rateLimit);
  if (!rl.allowed) return fail(rateLimited(rl, `Rate limit exceeded (${rl.limit} requests/min for this key).`));

  // 5. owner + 门店 + 档位
  const ownerCtx = await buildOwnerContext(supabase, key.owner_id);
  if (!ownerCtx) return fail(apiError(401, "unauthorized", "API key owner no longer exists."));
  if (ownerCtx.banned) return fail(apiError(403, "account_banned", "This account has been banned."));

  // 6. 用量记账(不阻塞响应)
  const nextCount = (key.request_count ?? 0) + 1;
  background(async () => {
    await Promise.all([
      supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString(), request_count: nextCount })
        .eq("id", key.id),
      supabase.rpc("api_usage_add", { p_key: key.id, p_requests: 1, p_errors: 0, p_inserts: 0, p_updates: 0 }),
    ]);
  });

  const keyCtx: ApiKeyContext = {
    id: key.id,
    owner_id: key.owner_id,
    name: key.name,
    prefix: key.prefix,
    scopes,
    rate_limit_per_min: rateLimit,
  };
  return {
    ok: true,
    ctx: {
      supabase,
      key: keyCtx,
      owner: ownerCtx.owner,
      tier: ownerCtx.tier,
      stores: ownerCtx.stores,
      ip,
      lang,
    },
  };
}

function rateLimited(
  rl: { limit: number; remaining: number; retryAfterSec: number },
  message: string,
): NextResponse {
  return apiError(429, "rate_limited", message, undefined, undefined, {
    "Retry-After": String(rl.retryAfterSec),
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
  });
}

// ---------- 门户(登录 session)鉴权 ----------

export type UserAuthOk = { ok: true; userId: string; supabase: SupabaseClient };

export async function authenticateUser(req: NextRequest): Promise<UserAuthOk | AuthFail> {
  const token = bearerToken(req);
  if (!token) {
    return fail(apiError(401, "unauthorized", "Missing session token. Send `Authorization: Bearer <access_token>`."));
  }
  if (looksLikeApiKey(token)) {
    return fail(
      apiError(401, "unauthorized", "Developer portal endpoints require a login session token, not an API key."),
    );
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return fail(apiError(401, "unauthorized", "Invalid or expired session."));

  const profile = await loadProfile(supabase, data.user.id);
  if (!profile) return fail(apiError(401, "unauthorized", "Profile not found."));
  if (profile.banned) return fail(apiError(403, "account_banned", "This account has been banned."));

  return { ok: true, userId: data.user.id, supabase };
}

// ---------- 用量记账 ----------

export async function recordUsage(
  ctx: ApiContext,
  fields: Partial<{ requests: number; errors: number; inserts: number; updates: number }>,
): Promise<void> {
  if (!ctx.key) return;
  try {
    const { error } = await ctx.supabase.rpc("api_usage_add", {
      p_key: ctx.key.id,
      p_requests: fields.requests ?? 0,
      p_errors: fields.errors ?? 0,
      p_inserts: fields.inserts ?? 0,
      p_updates: fields.updates ?? 0,
    });
    if (error) console.warn(`[api/v1:auth] api_usage_add failed: ${error.message}`);
  } catch (err) {
    console.warn(`[api/v1:auth] api_usage_add threw: ${String(err)}`);
  }
}
