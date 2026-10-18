// /api/i18n/drain — 内容翻译队列的定时 worker(lib/i18n-pipeline/worker.ts)。
// GET:  Vercel Cron 每 2 分钟(vercel.json;Authorization: Bearer <CRON_SECRET> 由平台自动携带)。
// POST: 手动触发 —— CRON_SECRET 或管理员的 Supabase access token(与 /api/sync 相同);
//       可选 ?entity=post&locales=zh,en&ids=<uuid>,<uuid> 只处理指定的实体类型 / 语种 / id。
// 先做一小批本地语言检测(≤ 300 条、≤ 5 s,只用 lib/i18n/detect、不花钱):紧急开关打开、没配 key、预算用完时
// 也照做,新内容和改过的内容不必等付费管线就能回到 sitemap。
// start + 50 s 后不再领取新任务(maxDuration 60 s,留出收尾);I18N_DRAIN_DISABLED=1 时不翻译(紧急开关)。

import { NextRequest, NextResponse } from "next/server";
import { LOCALES, type Locale } from "@/lib/i18n";
import { ENTITY_FIELDS, type ContentEntity } from "@/lib/i18n/content/types";
import { detectPass, drain, type DrainOptions } from "@/lib/i18n-pipeline/worker";
import { createServiceClient } from "@/lib/sources/service-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEADLINE_MS = 50_000;
const LOCAL_DETECT_LIMIT = 300;
const LOCAL_DETECT_MS = 5_000;
const MAX_IDS = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Filters = Pick<DrainOptions, "entity" | "locales" | "entityIds">;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function isCronSecret(token: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && token && token === secret);
}

/** CRON_SECRET 或管理员(profiles.role = 'admin')的 Supabase access token;不通过时返回错误响应 */
async function authorize(token: string | null): Promise<NextResponse | null> {
  if (!token) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (isCronSecret(token)) return null;
  const supabase = createServiceClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  return null;
}

const csv = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** ?entity=&locales=&ids= → drain 的过滤条件;有非法值时返回 null */
function parseFilters(params: URLSearchParams): Filters | null {
  const filters: Filters = {};
  const entity = params.get("entity");
  if (entity) {
    if (!Object.prototype.hasOwnProperty.call(ENTITY_FIELDS, entity)) return null;
    filters.entity = entity as ContentEntity;
  }
  const locales = csv(params.get("locales"));
  if (locales.length > 0) {
    if (!locales.every((l) => (LOCALES as string[]).includes(l))) return null;
    filters.locales = [...new Set(locales)] as Locale[];
  }
  const ids = csv(params.get("ids"));
  if (ids.length > 0) {
    if (ids.length > MAX_IDS || !ids.every((id) => UUID_RE.test(id))) return null;
    filters.entityIds = [...new Set(ids.map((id) => id.toLowerCase()))];
  }
  return filters;
}

/** 本地语言检测(不花钱);出错只记日志,不影响后面的翻译 */
async function localDetect(start: number): Promise<{ detected: number } | { error: string }> {
  try {
    const r = await detectPass({ noLlm: true, limit: LOCAL_DETECT_LIMIT, deadlineAt: start + LOCAL_DETECT_MS });
    return { detected: r.detected };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[i18n:detect] ${message}`);
    return { error: message };
  }
}

async function runDrain(start: number, filters: Filters = {}): Promise<NextResponse> {
  const detect = await localDetect(start);
  if (process.env.I18N_DRAIN_DISABLED === "1") return NextResponse.json({ ok: true, disabled: true, detect });
  try {
    const result = await drain({ deadlineAt: start + DEADLINE_MS, ...filters });
    console.log(`[i18n:drain] ${JSON.stringify(result)}`);
    return NextResponse.json({ ok: true, detect, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[i18n:drain] ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  if (!isCronSecret(bearerToken(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return runDrain(start);
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const denied = await authorize(bearerToken(req));
    if (denied) return denied;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
  const filters = parseFilters(req.nextUrl.searchParams);
  if (!filters) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  return runDrain(start, filters);
}
