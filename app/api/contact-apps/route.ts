// /api/contact-apps — 卖家即时通讯联系方式(public.profile_contact_apps)的唯一写入口。
// 客户端(发布页联系方式一步、设置 · 个人资料)带 Supabase access token 提交 { profileId, apps };
// 服务端依次:用 lib/contact-apps.ts 校验 / 规范化 → 校验调用者是该账号本人或认领人 → 限流 → AI 审核(lib/moderate.ts,
// kind = contact_apps)→ 用 service role 写入。表对 anon / authenticated 没有任何写权限,审核绕不过去。
// - 违规:清空该账号的联系方式,返回 blocked,由前端提示;
// - 审核服务不可用(没配 key、超时、上游故障):与站内其他审核一致放行写入(fail-open),记 moderated = false;
// - 限流:每个操作人每小时最多 HOURLY_MODERATION_CAP 次送审(contact_apps_moderation_hit,与表同在 contact-apps.sql);
//   计数器出错时拒绝保存(fail-closed),不会在没有上限的情况下调用模型;
// - 清空({})、与库里已审核过的值相同、同一实例内审过放行的同一份内容:不送审、不计数。
// 表还不存在(SQL 未执行)→ 503 not_ready,前端当作功能未上线静默跳过。

import { NextRequest, NextResponse } from "next/server";
import {
  CONTACT_APPS,
  contactAppsModerationText,
  hasContactApps,
  normalizeContactApp,
  parseContactApps,
  sameContactApps,
  type ContactApp,
  type ContactAppError,
  type ContactApps,
} from "@/lib/contact-apps";
import { isModerationFailure, moderateContentDetailed } from "@/lib/moderate";
import { createServiceClient } from "@/lib/sources/service-client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Capacitor 原生壳与站点不同源,放开 CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABLE = "profile_contact_apps";
/** 每个操作人每小时最多送审次数(正常填写一两次足够;防止循环改值刷模型额度) */
const HOURLY_MODERATION_CAP = 20;
const MODERATION_BUDGET_MS = 20_000;
// 放行过的「账号 + 内容」(进程内,冷启动即清空):逐个字段失焦保存、改回原值时不重复花钱
const PASSED_MAX = 500;
const passed = new Set<string>();

function rememberPassed(key: string) {
  if (passed.size >= PASSED_MAX) {
    const oldest = passed.values().next().value;
    if (oldest !== undefined) passed.delete(oldest);
  }
  passed.add(key);
}

const json = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...CORS_HEADERS, ...headers } });

/** 缺表:42P01 undefined_table、PGRST205(表不在 schema cache) */
function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (typeof message === "string" && /relation .* does not exist|could not find the table/i.test(message))
  );
}

/**
 * 请求体里的 apps → 规范化后的 ContactApps。必须是对象、只含已知键、值为字符串(空串 = 不填);
 * 任何一项不合规整体拒绝(不做部分写入),fields 给出各字段错误。
 */
function parseInput(
  raw: unknown,
): { ok: true; apps: ContactApps } | { ok: false; fields: Partial<Record<ContactApp, ContactAppError>> | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, fields: null };
  const o = raw as Record<string, unknown>;
  const known = new Set<string>(CONTACT_APPS);
  if (Object.keys(o).some((k) => !known.has(k))) return { ok: false, fields: null };
  const apps: ContactApps = {};
  const fields: Partial<Record<ContactApp, ContactAppError>> = {};
  for (const app of CONTACT_APPS) {
    const v = o[app];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") return { ok: false, fields: null };
    const { value, error } = normalizeContactApp(app, v);
    if (error) fields[app] = error;
    else if (value) apps[app] = value;
  }
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, apps };
}

/** 调用者能否以 profileId 的身份操作:本人,或该账号已被本人认领(同 SQL can_act_as) */
async function canActAs(svc: SupabaseClient, userId: string, profileId: string): Promise<boolean> {
  if (userId === profileId) return true;
  const { data } = await svc
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("claimed_by", userId)
    .maybeSingle();
  return !!data;
}

async function writeApps(
  svc: SupabaseClient,
  profileId: string,
  apps: ContactApps,
  moderated: boolean,
): Promise<string | null> {
  // 清空 = 删行(没有行即没填)
  const { error } = hasContactApps(apps)
    ? await svc
        .from(TABLE)
        .upsert(
          { profile_id: profileId, apps, moderated, updated_at: new Date().toISOString() },
          { onConflict: "profile_id" },
        )
    : await svc.from(TABLE).delete().eq("profile_id", profileId);
  return error ? error.message : null;
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || null;
  if (!token) return json({ ok: false, error: "unauthorized" }, 401);

  let body: { profileId?: unknown; apps?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* 下面按缺参处理 */
  }
  const profileId = typeof body.profileId === "string" && UUID_RE.test(body.profileId) ? body.profileId.toLowerCase() : null;
  if (!profileId) return json({ ok: false, error: "bad_request" }, 400);
  const input = parseInput(body.apps);
  if (!input.ok) return json({ ok: false, error: "invalid", fields: input.fields ?? {} }, 400);
  const apps = input.apps;

  let svc: SupabaseClient;
  try {
    svc = createServiceClient();
  } catch {
    return json({ ok: false, error: "server_unavailable" }, 503);
  }

  const { data: userData, error: userErr } = await svc.auth.getUser(token);
  const userId = userData?.user?.id?.toLowerCase();
  if (userErr || !userId) return json({ ok: false, error: "unauthorized" }, 401);
  if (!(await canActAs(svc, userId, profileId))) return json({ ok: false, error: "forbidden" }, 403);

  const { data: row, error: rowErr } = await svc
    .from(TABLE)
    .select("apps, moderated")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (rowErr) {
    // supabase/contact-apps.sql 还没执行:功能未上线
    if (isMissingTableError(rowErr)) return json({ ok: false, error: "not_ready" }, 503);
    console.warn(`[contact-apps] load ${profileId} failed: ${rowErr.message}`);
    return json({ ok: false, error: "failed" }, 500);
  }
  const current = row as { apps?: unknown; moderated?: boolean } | null;

  // 清空不需要审核
  if (!hasContactApps(apps)) {
    const err = await writeApps(svc, profileId, {}, true);
    if (err) {
      console.warn(`[contact-apps] clear ${profileId} failed: ${err}`);
      return json({ ok: false, error: "failed" }, 500);
    }
    return json({ ok: true, status: "saved" });
  }

  // 与库里已审核通过的值相同:什么都不用做
  if (current?.moderated && sameContactApps(apps, parseContactApps(current.apps))) {
    return json({ ok: true, status: "saved" });
  }

  const text = contactAppsModerationText(apps);
  const cacheKey = `${profileId}\n${text}`;
  let moderated: boolean;
  if (passed.has(cacheKey)) {
    moderated = true;
  } else {
    // 限流先于模型调用;计数器不可用时拒绝保存(fail-closed),不在没有上限的情况下花模型额度
    const { data: hits, error: hitErr } = await svc.rpc("contact_apps_moderation_hit", { p_user: userId });
    if (hitErr) {
      console.warn(`[contact-apps] rate counter unavailable: ${hitErr.message}`);
      return json({ ok: false, error: "failed" }, 503);
    }
    if (Number(hits ?? 0) > HOURLY_MODERATION_CAP) {
      const now = new Date();
      const nextHour = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1);
      const retryAfter = Math.max(1, Math.ceil((nextHour - now.getTime()) / 1000));
      return json({ ok: false, error: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });
    }

    const outcome = await moderateContentDetailed("contact_apps", text, { deadlineAt: start + MODERATION_BUDGET_MS });
    if (isModerationFailure(outcome)) {
      // 审核服务故障:与全站一致放行(fail-open),标记未审核以便日后补审
      console.warn(`[contact-apps] moderation unavailable for ${profileId}: ${outcome.error}${outcome.status ? ` ${outcome.status}` : ""}`);
      moderated = false;
    } else if (outcome.violation) {
      // 违规:不写入新值,并清空该账号已有的联系方式
      const err = await writeApps(svc, profileId, {}, true);
      if (err) console.error(`[contact-apps] clear ${profileId} after violation failed: ${err}`);
      console.warn(`[contact-apps] blocked ${profileId}: ${outcome.categories.join(",")} ${outcome.reason ?? ""}`);
      return json({ ok: true, status: "blocked", reason: outcome.reason, categories: outcome.categories });
    } else {
      rememberPassed(cacheKey);
      moderated = true;
    }
  }

  const err = await writeApps(svc, profileId, apps, moderated);
  if (err) {
    console.warn(`[contact-apps] write ${profileId} failed: ${err}`);
    return json({ ok: false, error: "failed" }, 500);
  }
  return json({ ok: true, status: "saved" });
}
