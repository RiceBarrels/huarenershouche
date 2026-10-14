// 卖家访问统计(车行与个人卖家通用):RPC 封装(supabase/analytics.sql 的 seller_analytics_*)。
// sellerId 传「当前操作身份」(useIdentity().actingId):本人账号或已认领的系统车行账号;
// 库内校验调用者有权查看该卖家,无权直接报错 forbidden。只统计该卖家名下车辆的浏览。

import { supabase } from "@/lib/supabase";
import { AnalyticsNotInstalledError, browserTimeZone, type ResolvedRange } from "@/lib/analytics/admin";
import type {
  AnalyticsBreakdown,
  SellerAnalyticsDimension,
  SellerAnalyticsFilters,
  SellerCarViewers,
  SellerOverview,
  SellerViewerTimeline,
  SellerViewers,
} from "@/lib/analytics/types";

function cleanFilters(filters: SellerAnalyticsFilters): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null) out[k] = v as string;
  }
  return out;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === "PGRST202" || error.code === "42P01" || error.code === "42883") {
      throw new AnalyticsNotInstalledError(error.message);
    }
    throw new Error(error.message);
  }
  return data as T;
}

export function fetchSellerOverview(
  sellerId: string,
  range: ResolvedRange,
  filters: SellerAnalyticsFilters,
  tz: string = browserTimeZone()
): Promise<SellerOverview> {
  return rpc<SellerOverview>("seller_analytics_overview", {
    p_seller_id: sellerId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_tz: tz,
    p_bucket: range.bucket,
  });
}

export function fetchSellerBreakdown(
  sellerId: string,
  range: ResolvedRange,
  filters: SellerAnalyticsFilters,
  dimension: SellerAnalyticsDimension,
  limit = 10,
  search: string | null = null
): Promise<AnalyticsBreakdown> {
  return rpc<AnalyticsBreakdown>("seller_analytics_breakdown", {
    p_seller_id: sellerId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_dimension: dimension,
    p_limit: limit,
    p_search: search && search.trim() ? search.trim() : null,
  });
}

export function fetchSellerViewers(
  sellerId: string,
  range: ResolvedRange,
  filters: SellerAnalyticsFilters,
  limit = 50,
  offset = 0
): Promise<SellerViewers> {
  return rpc<SellerViewers>("seller_analytics_viewers", {
    p_seller_id: sellerId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_limit: limit,
    p_offset: offset,
  });
}

export function fetchSellerCarViewers(
  sellerId: string,
  carId: string,
  range: ResolvedRange,
  filters: SellerAnalyticsFilters,
  limit = 100
): Promise<SellerCarViewers> {
  return rpc<SellerCarViewers>("seller_analytics_car_viewers", {
    p_seller_id: sellerId,
    p_car_id: carId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: cleanFilters(filters),
    p_limit: limit,
  });
}

/** 某浏览者(viewer_key)在该卖家车辆上的浏览记录,按时间倒序 */
export function fetchSellerViewerTimeline(
  sellerId: string,
  viewerKey: string,
  limit = 100
): Promise<SellerViewerTimeline> {
  return rpc<SellerViewerTimeline>("seller_analytics_viewer_timeline", {
    p_seller_id: sellerId,
    p_viewer_key: viewerKey,
    p_limit: limit,
  });
}
