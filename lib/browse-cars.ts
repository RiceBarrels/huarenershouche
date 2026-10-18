// /browse 车源列表:服务端分页。筛选/排序/分页都在数据库函数 browse_cars 里做
// (supabase/browse-cars.sql,规则与 lib/car-filters.ts 一一对应),前端每次只拿
// 「总数 + 一页」,滑到底再要下一页;筛选面板的车型/配置统计走 browse_facets。
// 返回的车源不含整组图片和描述(卡片用不到);点开详情时 CarDetail 会按 id 重新拉整行。

import { supabase } from "@/lib/supabase";
import { isMissingFunctionError } from "@/lib/supabase-compat";
import { MAKES_ZH } from "@/lib/mock-data";
import { paymentToPrice } from "@/lib/format";
import { localeLanguageCodes } from "@/lib/i18n/languages";
import type { Filters, SortKey } from "@/lib/car-filters";
import type { StoredDeal } from "@/lib/price-insight";
import type { Locale } from "@/lib/i18n";
import type { DbCar } from "@/lib/types";

export const BROWSE_PAGE_SIZE = 24;

/** 列表里的车源:裁剪过的 DbCar + 服务端算好的距离(英里)和好价评级 */
export type BrowseCar = DbCar & { distance?: number | null; deal?: StoredDeal | null };

export interface BrowsePage {
  total: number;
  /** 城市名筛不出车、已退回「不按城市」并强制按距离排 */
  forcedDistanceSort: boolean;
  items: BrowseCar[];
}

export interface BrowseQueryInput {
  filters: Filters;
  sort: SortKey;
  locale: Locale;
  coords: { lat: number; lng: number } | null;
}

/**
 * 组装 browse_cars 的参数。关键词按 carMatchesKeyword 同样的规则拆词;
 * 中文品牌名(MAKES_ZH)不在车源字段里,前端先把命中的品牌换成 make 传过去。
 * 月供预算在前端换算成价格上限(换算参数只在 lib/format 里维护)。
 */
function buildQuery({ filters, sort, locale, coords }: BrowseQueryInput) {
  const tokens = [...new Set(filters.keyword.toLowerCase().split(/\s+/).filter(Boolean))].map((t) => ({
    t,
    makes: Object.keys(MAKES_ZH).filter((make) => MAKES_ZH[make].toLowerCase().includes(t)),
  }));
  return {
    filters,
    sort,
    tokens,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    paymentPriceCap: filters.maxPayment ? paymentToPrice(Number(filters.maxPayment)) : null,
    // 默认排序「卖家会说当前界面语言的优先」:未填语言的卖家只在中文站算会说
    langs: localeLanguageCodes(locale),
    emptyLangsMatch: locale === "zh",
  };
}

/** 同一组条件的缓存/去重用 key(不含分页) */
export function browseQueryKey(input: BrowseQueryInput): string {
  return JSON.stringify(buildQuery(input));
}

/** 拉一页,失败返回 null */
export async function fetchBrowsePage(
  input: BrowseQueryInput,
  offset: number,
  limit = BROWSE_PAGE_SIZE,
): Promise<BrowsePage | null> {
  const { data, error } = await supabase.rpc("browse_cars", {
    p: { ...buildQuery(input), offset, limit },
  });
  if (error || !data) return null;
  return data as BrowsePage;
}

export interface FacetOption {
  /** 筛选值(配置:已归并词条为英文标签,未归并为原始标签) */
  name: string;
  count: number;
  /** 当前界面语言的展示文案(配置按 i18n 词表归并后给出;车型没有),缺省时界面显示 t(name) */
  label?: string;
}

/**
 * 筛选面板选项统计:选中单一品牌时的车型列表 + 最常见的 12 个配置(按词条归并语言孪生词,
 * label 为 locale 文案)。数据库还没升级到带 p_locale 的版本时退回旧签名(无 label)。
 */
export async function fetchBrowseFacets(
  make: string | null,
  locale: Locale,
): Promise<{ models: FacetOption[]; features: FacetOption[] } | null> {
  let { data, error } = await supabase.rpc("browse_facets", { p_make: make, p_locale: locale });
  if (error && isMissingFunctionError(error)) {
    ({ data, error } = await supabase.rpc("browse_facets", { p_make: make }));
  }
  if (error || !data) return null;
  return data as { models: FacetOption[]; features: FacetOption[] };
}

/** 「最近浏览」:按 id 取仍在售的车源,保持传入顺序 */
export async function fetchCarsByIds(ids: string[]): Promise<DbCar[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("cars")
    .select(
      "id, seller_id, source_id, created_at, title, title_zh, make, model, trim, year, " +
        "price, original_price, mileage, fuel_type, location, location_zh, lat, lng, image_url, " +
        "seller_name, phone, views_count, favorites_count, profiles!seller_id(account_type, avatar_url, languages)",
    )
    .in("id", ids)
    .eq("status", "active")
    .eq("owner_hidden", false);
  const byId = new Map(((data as unknown as DbCar[]) || []).map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is DbCar => !!c);
}
