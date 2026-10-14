// 管理后台访问统计:RPC 封装(supabase/analytics.sql)+ 时间范围预设。
// 所有 RPC 在库内校验 is_admin(),非管理员直接报错。

import { supabase } from "@/lib/supabase";
import type { DbUserIpGeo } from "@/lib/types";
import type {
  AnalyticsBreakdown,
  AnalyticsBucket,
  AnalyticsCarViewers,
  AnalyticsDimension,
  AnalyticsFilters,
  AnalyticsLive,
  AnalyticsOverview,
  AnalyticsTimeline,
  AnalyticsVisitors,
} from "@/lib/analytics/types";

export type RangePreset = "24h" | "7d" | "30d" | "90d";

export const RANGE_PRESETS: RangePreset[] = ["24h", "7d", "30d", "90d"];

export interface ResolvedRange {
  from: Date;
  to: Date;
  bucket: AnalyticsBucket;
}

/**
 * 预设 → 具体区间:24h 为滚动 24 小时、按小时分桶;
 * 7/30/90 天从 N-1 天前的本地零点到现在、按天分桶(今天是不完整的一桶)。
 */
export function resolveRange(preset: RangePreset, now: Date = new Date()): ResolvedRange {
  if (preset === "24h") {
    return { from: new Date(now.getTime() - 24 * 3600 * 1000), to: now, bucket: "hour" };
  }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return { from, to: now, bucket: "day" };
}

/** 浏览器所在 IANA 时区,按天分桶用(取不到回退 UTC) */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** 去掉 undefined 键(RPC 侧用 `?` 判断键是否存在) */
function cleanFilters(filters: AnalyticsFilters): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null) out[k] = v as string | boolean;
  }
  return out;
}

/** SQL 未执行(函数/表不存在)时的错误,UI 据此提示去跑 supabase/analytics.sql */
export class AnalyticsNotInstalledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsNotInstalledError";
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    // PGRST202:函数不存在;42P01:表不存在;42883:函数签名不匹配
    if (error.code === "PGRST202" || error.code === "42P01" || error.code === "42883") {
      throw new AnalyticsNotInstalledError(error.message);
    }
    throw new Error(error.message);
  }
  return data as T;
}

export function fetchOverview(
  range: ResolvedRange,
  filters: AnalyticsFilters,
  tz: string = browserTimeZone()
): Promise<AnalyticsOverview> {
  return rpc<AnalyticsOverview>("admin_analytics_overview", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_tz: tz,
    p_bucket: range.bucket,
  });
}

export function fetchBreakdown(
  range: ResolvedRange,
  filters: AnalyticsFilters,
  dimension: AnalyticsDimension,
  limit = 10,
  search: string | null = null
): Promise<AnalyticsBreakdown> {
  return rpc<AnalyticsBreakdown>("admin_analytics_breakdown", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_dimension: dimension,
    p_limit: limit,
    p_search: search && search.trim() ? search.trim() : null,
  });
}

export function fetchVisitors(
  range: ResolvedRange,
  filters: AnalyticsFilters,
  limit = 50,
  offset = 0
): Promise<AnalyticsVisitors> {
  return rpc<AnalyticsVisitors>("admin_analytics_visitors", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_limit: limit,
    p_offset: offset,
  });
}

/**
 * 事件时间线:按访客(visitorId)= 该设备全部事件;按用户(userId)= 本人登录时的事件 + 他用过的设备上
 * 未登录时的浏览(不含同一设备上别的账号登录时的事件);两者都传取并集
 */
export function fetchTimeline(opts: {
  visitorId?: string | null;
  userId?: string | null;
  before?: string | null;
  limit?: number;
}): Promise<AnalyticsTimeline> {
  return rpc<AnalyticsTimeline>("admin_analytics_timeline", {
    p_visitor_id: opts.visitorId ?? null,
    p_user_id: opts.userId ?? null,
    p_before: opts.before ?? null,
    p_limit: opts.limit ?? 100,
  });
}

export function fetchCarViewers(
  carId: string,
  range: ResolvedRange,
  filters: AnalyticsFilters,
  limit = 100
): Promise<AnalyticsCarViewers> {
  return rpc<AnalyticsCarViewers>("admin_analytics_car_viewers", {
    p_car_id: carId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_limit: limit,
  });
}

export function fetchLive(filters: AnalyticsFilters, limit = 30): Promise<AnalyticsLive> {
  return rpc<AnalyticsLive>("admin_analytics_live", {
    p_filters: cleanFilters(filters),
    p_limit: limit,
  });
}

/** 批量取用户 IP 地区(表未建/无权限时返回空对象,调用方回退到 profiles.location) */
export async function fetchUserIpGeo(userIds: string[]): Promise<Record<string, DbUserIpGeo>> {
  if (userIds.length === 0) return {};
  const out: Record<string, DbUserIpGeo> = {};
  // PostgREST 的 in() 走 URL,分批避免超长
  for (let i = 0; i < userIds.length; i += 150) {
    const { data, error } = await supabase
      .from("user_ip_geo")
      .select("*")
      .in("user_id", userIds.slice(i, i + 150));
    if (error) return out;
    for (const row of (data as DbUserIpGeo[]) || []) out[row.user_id] = row;
  }
  return out;
}
