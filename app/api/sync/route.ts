// /api/sync — listing-source sync trigger.
// GET:  Vercel Cron 每小时(Authorization: Bearer <CRON_SECRET>, sent automatically);
//       每个源约两天一次(MIN_SYNC_GAP_MS),每轮只处理到期的源、按预算截止。
// POST: manual trigger — CRON_SECRET or an admin's Supabase access token.
// 同步后顺带重算 /browse 服务端分页的预计算字段(lib/browse-meta),失败不影响同步结果;
// 函数还剩 ≥ 30 s 时再跑一轮 i18n 管线收尾(新转载车源的翻译 + 标签术语,截止 start + 285 s)。

import { NextRequest, NextResponse } from "next/server";
import { syncAll } from "@/lib/sources/sync";
import { createServiceClient } from "@/lib/sources/service-client";
import { refreshBrowseMeta } from "@/lib/browse-meta";
import { drain, type DrainResult } from "@/lib/i18n-pipeline/worker";

export const maxDuration = 300;
// 超过此预算不再开始新数据源,给进行中的源留 ~150s 跑完;剩余的由下一小时的 cron 接续
const BUDGET_MS = 150_000;
export const dynamic = "force-dynamic";

/** i18n 收尾:截止 start + 285 s(给响应留 15 s);函数剩余不足 30 s 就不启动 */
const DRAIN_DEADLINE_MS = 285_000;
const DRAIN_MIN_REMAINING_MS = 30_000;
const DRAIN_CONCURRENCY = 6;

type DrainTail =
  | { ran: true; result: DrainResult }
  | { ran: false; reason: "disabled" | "no_time" }
  | { ran: false; reason: "error"; error: string };

async function refreshMetaSafely(): Promise<{ ok: boolean; rows?: number; error?: string }> {
  try {
    return { ok: true, rows: await refreshBrowseMeta(createServiceClient()) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** I18N_DRAIN_DISABLED=1 与 /api/i18n/drain 共用同一个开关;失败不影响同步结果 */
async function drainTail(start: number): Promise<DrainTail> {
  if (process.env.I18N_DRAIN_DISABLED === "1") return { ran: false, reason: "disabled" };
  if (start + maxDuration * 1000 - Date.now() < DRAIN_MIN_REMAINING_MS) return { ran: false, reason: "no_time" };
  try {
    const result = await drain({
      deadlineAt: start + DRAIN_DEADLINE_MS,
      concurrency: DRAIN_CONCURRENCY,
      log: (m) => console.log(`[sync:i18n] ${m}`),
    });
    return { ran: true, result };
  } catch (err) {
    return { ran: false, reason: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function isCronSecret(token: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && token && token === secret);
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  if (!isCronSecret(bearerToken(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const results = await syncAll({ force: false, budgetMs: BUDGET_MS });
    const browseMeta = await refreshMetaSafely();
    const drained = await drainTail(start);
    return NextResponse.json({ ok: true, results, browseMeta, drain: drained });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    if (!isCronSecret(token)) {
      // Not the cron secret — must be a Supabase access token of an admin user
      const supabase = createServiceClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    let body: { key?: string; force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    const results = await syncAll({ onlyKey: body.key, force: body.force ?? false, budgetMs: BUDGET_MS });
    const browseMeta = await refreshMetaSafely();
    const drained = await drainTail(start);
    return NextResponse.json({ ok: true, results, browseMeta, drain: drained });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
