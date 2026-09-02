// /api/v1/keys/usage — 开发者门户:近 N 天(默认 30,最多 90)用量,按天汇总本人所有 key。
// 天按 UTC 切(与 api_usage_add 一致);区间内没记录的天补 0,方便直接画柱状图。

import type { NextRequest } from "next/server";
import { authenticateUser, buildOwnerContext } from "@/lib/api/auth";
import { getQuota } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions, intParam } from "@/lib/api/response";
import type { ApiContext } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

interface UsageRow {
  day: string;
  requests: number;
  errors: number;
  inserts: number;
  updates: number;
}

function utcDayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateUser(req);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  const days = intParam(req.nextUrl.searchParams, "days", DEFAULT_DAYS, { min: 1, max: MAX_DAYS }) ?? DEFAULT_DAYS;

  try {
    const ownerCtx = await buildOwnerContext(supabase, userId);
    if (!ownerCtx) return apiError(401, "unauthorized", "Profile not found.");

    const { data: keyRows, error: keyErr } = await supabase.from("api_keys").select("id").eq("owner_id", userId);
    if (keyErr) throw new Error(keyErr.message);
    const keyIds = (keyRows ?? []).map((r: { id: string }) => r.id);

    // 区间 [today - days + 1, today](UTC)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
    const byDay = new Map<string, UsageRow>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const day = utcDayString(d);
      byDay.set(day, { day, requests: 0, errors: 0, inserts: 0, updates: 0 });
    }

    if (keyIds.length > 0) {
      const { data: rows, error: usageErr } = await supabase
        .from("api_usage_daily")
        .select("day, requests, errors, inserts, updates")
        .in("api_key_id", keyIds)
        .gte("day", utcDayString(start))
        .order("day", { ascending: true });
      if (usageErr) throw new Error(usageErr.message);
      for (const r of (rows ?? []) as UsageRow[]) {
        const acc = byDay.get(r.day);
        if (!acc) continue;
        acc.requests += r.requests ?? 0;
        acc.errors += r.errors ?? 0;
        acc.inserts += r.inserts ?? 0;
        acc.updates += r.updates ?? 0;
      }
    }

    const ctx: ApiContext = {
      supabase,
      key: null,
      owner: ownerCtx.owner,
      tier: ownerCtx.tier,
      stores: ownerCtx.stores,
      ip: null,
      lang: "zh",
    };
    const quota = await getQuota(ctx);

    return apiJson({ days: Array.from(byDay.values()), tier: ownerCtx.tier, quota });
  } catch (err) {
    return apiInternalError(err, "keys.usage.GET");
  }
}
