// Public API 写配额(docs/public-api-v0.md §2 / §5)。
// 按 owner(profile)汇总当天(UTC)所有 key 的 inserts/updates,不按 key;
// 档位:personal(新上传 10 / 更改 30 分开计)、dealer(合计 2000 次写,在售 ≤500)。
// 扣减前先读再判,超限不写库;成功后经 RPC api_usage_add 原子累加。

import type { NextResponse } from "next/server";
import { apiError } from "./response";
import { QUOTA_LIMITS, type ApiContext, type QuotaInfo } from "./types";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnightIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

function anonymousQuota(): QuotaInfo {
  return {
    tier: "anonymous",
    inserts_used: 0,
    inserts_limit: 0,
    updates_used: 0,
    updates_limit: 0,
    writes_limit: null,
    active_used: 0,
    active_limit: null,
    resets_at: nextUtcMidnightIso(),
  };
}

export async function getQuota(ctx: ApiContext): Promise<QuotaInfo> {
  if (!ctx.owner || ctx.tier === "anonymous") return anonymousQuota();
  const limits = QUOTA_LIMITS[ctx.tier];
  const ownerId = ctx.owner.id;

  // 1. owner 名下所有 key(含已吊销:当天已消耗的配额不因吊销而释放)
  const { data: keyRows, error: keyErr } = await ctx.supabase
    .from("api_keys")
    .select("id")
    .eq("owner_id", ownerId);
  if (keyErr) throw new Error(`api_keys lookup failed: ${keyErr.message}`);
  const keyIds = (keyRows ?? []).map((r: { id: string }) => r.id);

  // 2. 当天用量汇总
  let insertsUsed = 0;
  let updatesUsed = 0;
  if (keyIds.length > 0) {
    const { data: usage, error: usageErr } = await ctx.supabase
      .from("api_usage_daily")
      .select("inserts, updates")
      .in("api_key_id", keyIds)
      .eq("day", todayUtc());
    if (usageErr) throw new Error(`api_usage_daily lookup failed: ${usageErr.message}`);
    for (const row of (usage ?? []) as { inserts: number; updates: number }[]) {
      insertsUsed += row.inserts ?? 0;
      updatesUsed += row.updates ?? 0;
    }
  }

  // 3. 在售数(手动 + API 一起算)
  const { count: activeCount, error: activeErr } = await ctx.supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", ownerId)
    .eq("status", "active");
  if (activeErr) throw new Error(`cars count failed: ${activeErr.message}`);

  return {
    tier: ctx.tier,
    inserts_used: insertsUsed,
    inserts_limit: limits.inserts,
    updates_used: updatesUsed,
    updates_limit: limits.updates,
    writes_limit: limits.combined ? limits.inserts : null,
    active_used: activeCount ?? 0,
    active_limit: limits.active,
    resets_at: nextUtcMidnightIso(),
  };
}

/** 原子扣减;超限时不写库返回 ok=false(调用方用 quotaExceededResponse 回 429) */
export async function consumeQuota(
  ctx: ApiContext,
  kind: "insert" | "update",
  n = 1,
): Promise<{ ok: boolean; quota: QuotaInfo }> {
  const quota = await getQuota(ctx);
  if (!ctx.key || !ctx.owner || ctx.tier === "anonymous") return { ok: false, quota };
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return { ok: true, quota };

  const limits = QUOTA_LIMITS[ctx.tier];
  let allowed: boolean;
  if (limits.combined) {
    allowed = quota.inserts_used + quota.updates_used + count <= limits.inserts;
    if (allowed && kind === "insert" && limits.active != null) {
      allowed = quota.active_used + count <= limits.active;
    }
  } else if (kind === "insert") {
    allowed = quota.inserts_used + count <= limits.inserts;
  } else {
    allowed = quota.updates_used + count <= limits.updates;
  }
  if (!allowed) return { ok: false, quota };

  const { error } = await ctx.supabase.rpc("api_usage_add", {
    p_key: ctx.key.id,
    p_requests: 0,
    p_errors: 0,
    p_inserts: kind === "insert" ? count : 0,
    p_updates: kind === "update" ? count : 0,
  });
  if (error) throw new Error(`api_usage_add failed: ${error.message}`);

  const bumped: QuotaInfo =
    kind === "insert"
      ? { ...quota, inserts_used: quota.inserts_used + count }
      : { ...quota, updates_used: quota.updates_used + count };
  return { ok: true, quota: bumped };
}

export function quotaHeaders(quota: QuotaInfo): Record<string, string> {
  let insertsRemaining: number;
  let updatesRemaining: number;
  if (quota.writes_limit != null) {
    // 车行档:合计上限,两个 header 同值
    const remaining = Math.max(0, quota.writes_limit - (quota.inserts_used + quota.updates_used));
    insertsRemaining = remaining;
    updatesRemaining = remaining;
  } else {
    insertsRemaining = Math.max(0, quota.inserts_limit - quota.inserts_used);
    updatesRemaining = Math.max(0, quota.updates_limit - quota.updates_used);
  }
  return {
    "X-Quota-Tier": quota.tier,
    "X-Quota-Inserts-Remaining": String(insertsRemaining),
    "X-Quota-Updates-Remaining": String(updatesRemaining),
  };
}

export function quotaExceededResponse(quota: QuotaInfo): NextResponse {
  const message =
    quota.tier === "dealer"
      ? `Daily write quota exceeded (${quota.writes_limit} writes/day, ${quota.active_limit} active listings). Resets at ${quota.resets_at}.`
      : quota.tier === "personal"
        ? `Daily quota exceeded (personal tier: ${quota.inserts_limit} new listings / ${quota.updates_limit} updates per day). Verify a dealer store to unlock dealer quota. Resets at ${quota.resets_at}.`
        : "Write quota is not available for anonymous requests.";
  return apiError(429, "quota_exceeded", message, undefined, { quota }, quotaHeaders(quota));
}
