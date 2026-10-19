// /browse 车源列表:服务端分页。筛选/排序/分页都在数据库函数 browse_cars 里做
// (supabase/browse-cars.sql,规则与 lib/car-filters.ts 一一对应),前端每次只拿
// 「总数 + 一页」,滑到底再要下一页;筛选面板的车型/配置统计走 browse_facets。
// 返回的车源不含整组图片和描述(卡片用不到);点开详情时 CarDetail 会按 id 重新拉整行。

import { supabase } from "@/lib/supabase";
import { isMissingFunctionError, queryWithColumnFallback } from "@/lib/supabase-compat";
import { MAKES_ZH } from "@/lib/mock-data";
import { paymentToPrice } from "@/lib/format";
import { localeLanguageCodes } from "@/lib/i18n/languages";
import { isCleanTitle } from "@/lib/title-status";
import { fetchLoanFinancingSellerIds } from "@/lib/dealer-financing-client";
import type { Filters, SortKey } from "@/lib/car-filters";
import { carCountry, postalFromFilter, type Country } from "@/lib/postal";
import type { StoredDeal } from "@/lib/price-insight";
import { dbLocale, isZhLocale, type Locale } from "@/lib/i18n";
import type { DbCar } from "@/lib/types";

export const BROWSE_PAGE_SIZE = 24;

/** 列表里的车源:裁剪过的 DbCar + 服务端算好的距离(英里)和好价评级 */
export type BrowseCar = DbCar & { distance?: number | null; deal?: StoredDeal | null };

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
 * 位置是邮编时(美 / 加 / 澳 / 新,lib/postal.ts postalFromFilter,与 car-filters postalFilter 同一口径):国家单独作为 country 参数传(先筛国家、再按距离),
 * filters.location 置空 —— 旧版 browse_cars 只认 5 位 zip,别的邮编会被当成城市名去做子串匹配;
 * 置空后旧版只按距离筛(坐标由前端按国家地理编码),国家再由 keepHonored 在前端兜底。
 */
function buildQuery({ filters, sort, locale, coords }: BrowseQueryInput) {
  const postal = postalFromFilter(filters.location, filters.country);
  const tokens = [...new Set(filters.keyword.toLowerCase().split(/\s+/).filter(Boolean))].map((t) => ({
    t,
    makes: Object.keys(MAKES_ZH).filter((make) => MAKES_ZH[make].toLowerCase().includes(t)),
  }));
  return {
    filters: postal ? { ...filters, location: "" } : filters,
    country: postal?.country ?? null,
    sort,
    tokens,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    paymentPriceCap: filters.maxPayment ? paymentToPrice(Number(filters.maxPayment)) : null,
    // 默认排序「卖家会说当前界面语言的优先」:未填语言的卖家只在中文站算会说
    langs: localeLanguageCodes(locale),
    emptyLangsMatch: isZhLocale(locale),
  };
}

/** 同一组条件的缓存/去重用 key(不含分页) */
export function browseQueryKey(input: BrowseQueryInput): string {
  return JSON.stringify(buildQuery(input));
}

/** RPC 单次返回的行数上限(browse-cars.sql 里 v_limit 封顶 100) */
const RPC_MAX_LIMIT = 100;
/** 前端兜底过滤时,一次 fetchBrowsePage 最多连续向服务端要几页(凑不满一页也先返回,剩下的交给下一次触底) */
const FALLBACK_MAX_ROUNDS = 6;
/**
 * 旧版 browse_cars + 澳 / 新邮编 + 距离不限时补的隐含半径(英里):以邮编为圆心 3000 英里覆盖本国全境
 * (澳洲本土最远两点约 2500 英里),而离美 / 加最近的夏威夷也在 4300 英里以外 —— 服务端先把美加车源挡掉,
 * 前端再按国家精确过滤。没有坐标的车源会被挡掉(新版 RPC 不受影响)。
 */
const ANZ_LEGACY_RADIUS_MI = 3000;

/**
 * 翻页游标:offset 是「服务端」已经扫过的行数(不是列表里已有的条数 —— 前端兜底过滤丢掉的行也算),
 * dropped 是其中被前端兜底丢掉的行数,radius 是旧版 RPC 上补的隐含半径(同一组条件翻页时必须保持一致)。
 */
export interface BrowseCursor {
  offset: number;
  dropped: number;
  radius?: number | null;
}

export const FIRST_BROWSE_CURSOR: BrowseCursor = { offset: 0, dropped: 0 };

/** browse_cars 原始返回 */
interface RpcPage {
  total: number;
  forcedDistanceSort: boolean;
  /** 新版 browse_cars 恒为 true(已按 financing 筛选);旧版没有该键 */
  financingApplied?: boolean;
  /** 新版 browse_cars 恒为 true(已按 country 参数筛国家);旧版没有该键 */
  countryApplied?: boolean;
  items: BrowseCar[];
}

export interface BrowsePage {
  /**
   * 总数。新版 RPC 就是服务端总数;旧版需要前端兜底过滤时是「服务端总数 − 已丢掉的行」这个上限估计,
   * 扫到底(hasMore = false)后收成实际条数。
   */
  total: number;
  /** 城市名筛不出车、已退回「不按城市」并强制按距离排 */
  forcedDistanceSort: boolean;
  items: BrowseCar[];
  /** 下一页从哪里接着要 */
  next: BrowseCursor;
  /** 服务端还有没扫到的行(兜底过滤时本页可能凑不满甚至为空,但仍要继续翻) */
  hasMore: boolean;
}

// 本会话里探测到的 browse_cars 是否旧版(没有 countryApplied 键);null = 还没探测过
let legacyRpc: boolean | null = null;

/** 旧版 RPC 上要不要补隐含半径(只在澳 / 新邮编、距离不限、已有圆心坐标时) */
function legacyRadius(input: BrowseQueryInput, country: Country | null): number | null {
  if (country !== "AU" && country !== "NZ") return null;
  if (!input.coords || Number(input.filters.maxDistance) > 0) return null;
  return ANZ_LEGACY_RADIUS_MI;
}

/**
 * 从游标处拉一页,失败返回 null。
 *
 * 新版 browse_cars 一次就是一页。旧版(browse-cars.sql 未重跑)会忽略 country / cleanTitle / financing,
 * 这时前端按同一规则过滤(keepHonored),丢掉的行照样推进服务端 offset;过滤后凑不满一页就接着要下一页
 * (后几轮按 RPC 上限一次多拿),最多 FALLBACK_MAX_ROUNDS 轮。总数不再收成「已拿到的条数」
 * (那样列表会在第一页就停止翻页),而是服务端总数减去已丢掉的行,扫到底再收成实际条数。
 */
export async function fetchBrowsePage(
  input: BrowseQueryInput,
  cursor: BrowseCursor = FIRST_BROWSE_CURSOR,
  limit = BROWSE_PAGE_SIZE,
): Promise<BrowsePage | null> {
  const country = postalFromFilter(input.filters.location, input.filters.country)?.country ?? null;
  const query = buildQuery(input);
  // 首页且已知是旧版 → 直接带上隐含半径;翻页沿用游标里的(同一组条件前后一致)
  let radius = cursor.offset === 0 && legacyRpc ? legacyRadius(input, country) : (cursor.radius ?? null);
  let offset = cursor.offset;
  let dropped = cursor.dropped;
  let request = limit;
  let last: RpcPage | null = null;
  let exhausted = false;
  let items: BrowseCar[] = [];

  for (let round = 0; round < FALLBACK_MAX_ROUNDS; round++) {
    const filters = radius ? { ...query.filters, maxDistance: String(radius) } : query.filters;
    const { data, error } = await supabase.rpc("browse_cars", {
      p: { ...query, filters, offset, limit: request },
    });
    // 中途某一轮失败:已拿到的先返回,游标停在失败处,下次触底重试
    if (error || !data) {
      if (!last) return null;
      break;
    }
    const page = data as RpcPage;
    legacyRpc = page.countryApplied !== true;
    // 第一次探测到旧版、且本该补半径:这一轮作废,带上半径从头要(offset 必须对应同一组条件)
    if (round === 0 && cursor.offset === 0 && !radius && legacyRpc && legacyRadius(input, country)) {
      radius = legacyRadius(input, country);
      continue;
    }
    last = page;
    const kept = await keepHonored(page, input.filters, country);
    items = items.concat(kept);
    offset += page.items.length;
    dropped += page.items.length - kept.length;
    exhausted = page.items.length === 0 || offset >= page.total;
    if (exhausted || items.length >= limit) break;
    // 走到这里说明前端兜底丢了行:后面几轮一次多拿,少跑几趟
    request = RPC_MAX_LIMIT;
  }
  if (!last) return null;

  const loaded = offset - dropped;
  return {
    total: exhausted ? loaded : Math.max(last.total - dropped, loaded),
    forcedDistanceSort: last.forcedDistanceSort,
    items,
    next: { offset, dropped, radius },
    hasMore: !exhausted,
  };
}

/**
 * 旧版 RPC 忽略的筛选在前端补上(新版各自带 xxxApplied 或本身已筛过,原样通过):
 * - 邮编国家:旧版没有 country 参数,只按距离筛,距离不限时会混进别国车源 → 按 lib/postal.ts carCountry
 *   (与 SQL browse_car_country 同一规则)过滤;新版带 countryApplied = true。
 * - 仅清白产权:旧版忽略 cleanTitle,混着非清白 / 未填的车(列不存在时连 title_status 字段都没有)→ 按
 *   lib/car-filters.ts 同一规则(isCleanTitle,含澳新「无欠款(PPSR 已查)」)过滤;新版返回的本来就全是清白产权。
 * - 可贷款(无信用/ITIN):旧版忽略 financing → 卖家名下门店带 LOAN_FILTER_TAGS 之一才留;新版带
 *   financingApplied = true。卖家集合取不到(网络错误)时不过滤;dealer-financing.sql 未执行(列不存在)
 *   时集合为空 → 一辆也不命中,与 SQL 侧一致。
 */
async function keepHonored(page: RpcPage, filters: Filters, country: Country | null): Promise<BrowseCar[]> {
  let items = page.items;
  if (country && !page.countryApplied) items = items.filter((c) => carCountry(c) === country);
  if (filters.cleanTitle === "true") items = items.filter((c) => isCleanTitle(c.title_status));
  if (filters.financing === "true" && !page.financingApplied && items.length > 0) {
    const sellers = await fetchLoanFinancingSellerIds();
    if (sellers) items = items.filter((c) => sellers.has(c.seller_id));
  }
  return items;
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
  let { data, error } = await supabase.rpc("browse_facets", { p_make: make, p_locale: dbLocale(locale) });
  if (error && isMissingFunctionError(error)) {
    ({ data, error } = await supabase.rpc("browse_facets", { p_make: make }));
  }
  if (error || !data) return null;
  return data as { models: FacetOption[]; features: FacetOption[] };
}

/** 「最近浏览」:按 id 取仍在售的车源,保持传入顺序 */
export async function fetchCarsByIds(ids: string[]): Promise<DbCar[]> {
  if (ids.length === 0) return [];
  const base =
    "id, seller_id, source_id, created_at, title, title_zh, make, model, trim, year, " +
    "price, original_price, mileage, fuel_type, location, location_zh, lat, lng, image_url, " +
    "seller_name, phone, views_count, favorites_count";
  const embed = "profiles!seller_id(account_type, avatar_url, languages)";
  // 币种 / 里程单位(car-currency.sql)未建时退回旧列集,按 USD / mi 显示
  const { data } = await queryWithColumnFallback(
    (cols) =>
      supabase
        .from("cars")
        .select(`${cols}, ${embed}`)
        .in("id", ids)
        .eq("status", "active")
        .eq("owner_hidden", false),
    [`${base}, currency, mileage_unit`, base],
  );
  const byId = new Map(((data as unknown as DbCar[]) || []).map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is DbCar => !!c);
}
