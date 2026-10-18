// /api/vt — 第一方访问统计的埋点入口(visit track)。
// 路径不叫 track / analytics / collect:广告拦截规则常按这些关键词通配拦截。
// 客户端 lib/analytics/client.ts 用 sendBeacon / fetch(keepalive) 发 text/plain JSON(免 CORS 预检),
// 这里过滤机器人、校验载荷、解析 UA 与 Vercel 边缘地理头、校验登录 token,再用 service role 写 analytics_events。
// 永远回 204(客户端不读结果)。隐私:不存 IP(只用于内存限流),referrer 只留 origin + pathname。
// 车辆详情页的联系按钮点击(type = contact_click)也走这里,写 contact_clicks 表(supabase/analytics-contact-click.sql),
// 表还没建时静默丢弃。

import { NextRequest, NextResponse, userAgent } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/sources/service-client";
import {
  MAX_BODY_BYTES,
  buildEventRow,
  classifyUserAgent,
  clientIp,
  createRateLimiter,
  createTokenCache,
  isBotUserAgent,
  parseContactClickPayload,
  parseTrackPayload,
  readEdgeGeo,
  type ParsedContactClick,
  sanitizeGeo,
  userIdFromClaims,
  type AnalyticsEventInsert,
} from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

// Capacitor 原生壳与站点不同源,放开 CORS
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "private, no-store",
};

function noContent() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export async function OPTIONS() {
  return noContent();
}

// 模块级状态:同一函数实例内的请求共享(Fluid compute 下实例复用),冷启动即清零,只求挡住刷量
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000, maxKeys: 5000 });
const tokenCache = createTokenCache(500);
let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;
let warnedNoClient = false;
let warnedNotInstalled = false;
let warnedClicksNotInstalled = false;

// 验 token 用 anon key 客户端:本项目 JWT 为 ES256,getClaims 用缓存的 JWKS 本地验签,无网络往返
function getAnonClient(): SupabaseClient | null {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return anonClient;
}

function getServiceClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (e) {
    if (!warnedNoClient) {
      warnedNoClient = true;
      console.warn("[api/vt] service client unavailable:", e instanceof Error ? e.message : e);
    }
    return null;
  }
  return serviceClient;
}

/** 登录 token → user_id;无效 / 过期 / 验签失败 → null(事件照记,只是不关联用户) */
async function resolveUserId(token: string | null): Promise<string | null> {
  if (!token) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(token, nowSec);
  if (cached !== undefined) return cached;
  const client = getAnonClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data) return null;
    const userId = userIdFromClaims(data.claims, nowSec);
    if (userId) tokenCache.set(token, userId, data.claims.exp);
    return userId;
  } catch {
    // 过期 / 缺 exp 时 getClaims 直接抛普通 Error(不是 AuthError)
    return null;
  }
}

async function insertEvent(row: AnalyticsEventInsert): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  let { error } = await db.from("analytics_events").insert(row);
  if (error?.code === "23503") {
    // 外键失败:车辆不存在(已删除或伪造 id)→ car_view 没有意义,直接丢弃;
    // 否则是 user_id(token 仍有效但账号刚被删)→ 去掉用户重试一次
    if (/car_id/.test(`${error.message} ${error.details ?? ""}`)) return;
    ({ error } = await db.from("analytics_events").insert({ ...row, user_id: null }));
    if (error?.code === "23503") return;
  }
  if (!error) return;
  // 42P01 / PGRST205:表不存在;PGRST204:列对不上 —— supabase/analytics.sql 还没执行或版本不一致
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204") {
    if (!warnedNotInstalled) {
      warnedNotInstalled = true;
      console.warn(`[api/vt] analytics_events not ready (run supabase/analytics.sql): ${error.message}`);
    }
    return;
  }
  console.error(`[api/vt] insert failed: ${error.code} ${error.message}`);
}

async function insertContactClick(click: ParsedContactClick, userId: string | null): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  const row = {
    app: click.app,
    car_id: click.car_id,
    locale: click.locale,
    platform: click.platform,
    visitor_id: click.visitor_id,
    session_id: click.session_id,
    user_id: userId,
  };
  let { error } = await db.from("contact_clicks").insert(row);
  if (error?.code === "23503") {
    // 外键失败:车辆不存在 → 丢弃;否则是 user_id(账号刚被删)→ 去掉用户重试一次
    if (/car_id/.test(`${error.message} ${error.details ?? ""}`)) return;
    ({ error } = await db.from("contact_clicks").insert({ ...row, user_id: null }));
    if (error?.code === "23503") return;
  }
  if (!error) return;
  // 表 / 列不存在,或 app 取值不在 CHECK 里(SQL 版本旧):supabase/analytics-contact-click.sql 还没执行
  if (["42P01", "PGRST205", "PGRST204", "23514"].includes(error.code)) {
    if (!warnedClicksNotInstalled) {
      warnedClicksNotInstalled = true;
      console.warn(`[api/vt] contact_clicks not ready (run supabase/analytics-contact-click.sql): ${error.message}`);
    }
    return;
  }
  console.error(`[api/vt] contact click insert failed: ${error.code} ${error.message}`);
}

export async function POST(req: NextRequest) {
  try {
    // 预览部署与生产共用数据库,不收
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return noContent();

    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) return noContent();

    const ua = userAgent(req);
    if (isBotUserAgent(ua.ua, ua.isBot)) return noContent();

    if (!limiter.hit(clientIp(req.headers) ?? "unknown", Date.now())) return noContent();

    const body = await req.text();
    const click = parseContactClickPayload(body);
    if (click) {
      await insertContactClick(click, await resolveUserId(click.token));
      return noContent();
    }

    const payload = parseTrackPayload(body);
    if (!payload) return noContent();

    const userId = await resolveUserId(payload.token);
    await insertEvent(
      buildEventRow(payload, {
        userId,
        ua: classifyUserAgent(ua, payload.touch),
        geo: sanitizeGeo(readEdgeGeo(req.headers)),
      })
    );
  } catch (e) {
    console.error("[api/vt]", e instanceof Error ? e.message : e);
  }
  return noContent();
}
