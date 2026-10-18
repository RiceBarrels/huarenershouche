// 车源筛选/排序共享逻辑(纯函数):地图找车(/browse/map)对视野内车源做客户端过滤。
// /browse 列表已改为服务端分页,同一套规则在 supabase/browse-cars.sql 的
// browse_filtered / browse_cars 里有一份 SQL 版,改规则时两边一起改。

import { match } from "pinyin-pro";
import { MAKES_ZH } from "@/lib/mock-data";
import { haversineDistance } from "@/lib/geocode";
import { classifyBodyStyle } from "@/lib/body-style";
import { paymentToPrice } from "@/lib/format";
import { carHasVideo } from "@/lib/saved-searches";
import { getPriceInsight, type PriceInsight } from "@/lib/price-insight";
import type { Filters } from "@/components/search-filters";
import type { DbCar } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { sellerSpeaksLocale } from "@/lib/i18n/languages";
import { CLEAN_TITLE } from "@/lib/title-status";
import { carMileageMi, carPriceUsd } from "@/lib/currency";

// 复用 components/search-filters 的规范定义,方便调用方单点导入
export type { Filters } from "@/components/search-filters";
export { INITIAL_FILTERS } from "@/components/search-filters";

export type SortKey = "newest" | "price-asc" | "price-desc" | "mileage" | "year" | "distance";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "最新发布" },
  { value: "price-asc", label: "价格↑" },
  { value: "price-desc", label: "价格↓" },
  { value: "mileage", label: "里程最少" },
  { value: "year", label: "年份最新" },
  { value: "distance", label: "距离最近" },
];

export function filtersFromParams(sp: URLSearchParams): Filters {
  return {
    keyword: sp.get("q") || sp.get("keyword") || "",
    make: sp.get("make") || "",
    model: sp.get("model") || "",
    minPrice: sp.get("minPrice") || "",
    maxPrice: sp.get("maxPrice") || "",
    minYear: sp.get("minYear") || "",
    maxYear: sp.get("maxYear") || "",
    // 主页搜索表单用 zip 参数传 Zipcode,统一并入 location(位置筛选只认 zip/城市名)
    location: sp.get("location") || sp.get("zip") || "",
    sellerType: sp.get("sellerType") || "",
    fuelType: sp.get("fuelType") || "",
    transmission: sp.get("transmission") || "",
    drivetrain: sp.get("drivetrain") || "",
    maxMileage: sp.get("maxMileage") || "",
    exteriorColor: sp.get("exteriorColor") || "",
    interiorColor: sp.get("interiorColor") || "",
    features: sp.get("features") || "",
    maxDistance: sp.get("maxDistance") || "50",
    bodyStyle: sp.get("bodyStyle") || "",
    maxPayment: sp.get("maxPayment") || "",
    dealRating: sp.get("dealRating") || "",
    priceDropped: sp.get("priceDropped") || "",
    listedWithin: sp.get("listedWithin") || "",
    noAccident: sp.get("noAccident") || "",
    oneOwner: sp.get("oneOwner") || "",
    hasCarfax: sp.get("hasCarfax") || "",
    cleanTitle: sp.get("cleanTitle") || "",
    financing: sp.get("financing") || "",
    hasVideo: sp.get("hasVideo") || "",
    hasPrice: sp.get("hasPrice") || "",
  };
}

// 把筛选条件 + 排序序列化成 query string(不带开头的 "?";没有任何条件时返回空串)。
// keyword 写成 q;sort 仅在非默认("newest")时写入。
export function filtersToQuery(f: Filters, sort: SortKey): string {
  const params = new URLSearchParams();
  if (f.keyword) params.set("q", f.keyword);
  if (f.make) params.set("make", f.make);
  if (f.model) params.set("model", f.model);
  if (f.minPrice) params.set("minPrice", f.minPrice);
  if (f.maxPrice) params.set("maxPrice", f.maxPrice);
  if (f.minYear) params.set("minYear", f.minYear);
  if (f.maxYear) params.set("maxYear", f.maxYear);
  if (f.location) params.set("location", f.location);
  if (f.sellerType) params.set("sellerType", f.sellerType);
  if (f.fuelType) params.set("fuelType", f.fuelType);
  if (f.transmission) params.set("transmission", f.transmission);
  if (f.drivetrain) params.set("drivetrain", f.drivetrain);
  if (f.maxMileage) params.set("maxMileage", f.maxMileage);
  if (f.exteriorColor) params.set("exteriorColor", f.exteriorColor);
  if (f.interiorColor) params.set("interiorColor", f.interiorColor);
  if (f.features) params.set("features", f.features);
  if (f.maxDistance) params.set("maxDistance", f.maxDistance);
  if (f.bodyStyle) params.set("bodyStyle", f.bodyStyle);
  if (f.maxPayment) params.set("maxPayment", f.maxPayment);
  if (f.dealRating) params.set("dealRating", f.dealRating);
  if (f.priceDropped) params.set("priceDropped", f.priceDropped);
  if (f.listedWithin) params.set("listedWithin", f.listedWithin);
  if (f.noAccident) params.set("noAccident", f.noAccident);
  if (f.oneOwner) params.set("oneOwner", f.oneOwner);
  if (f.hasCarfax) params.set("hasCarfax", f.hasCarfax);
  if (f.cleanTitle) params.set("cleanTitle", f.cleanTitle);
  if (f.financing) params.set("financing", f.financing);
  if (f.hasVideo) params.set("hasVideo", f.hasVideo);
  if (f.hasPrice) params.set("hasPrice", f.hasPrice);
  if (sort !== "newest") params.set("sort", sort);
  return params.toString();
}

// 关键词全字段检索:把该车所有可读信息(中英标题、原文描述(任何语言)与中英投影、
// 标签、配置、颜色、地区、卖家、VIN、年份等)拼成一个字符串,按空格拆词做「与」匹配
// (输入越多词结果越精确,且与词序无关)。英文/中文直接子串命中,
// 另对较短的中文字段做拼音匹配(支持 kaimeirui / byd 这类拼音/首字母输入)。
export function carMatchesKeyword(car: DbCar, rawKeyword: string): boolean {
  const tokens = rawKeyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [
    car.title, car.title_zh,
    car.make, MAKES_ZH[car.make], car.model, car.trim, String(car.year ?? ""),
    car.description_original, car.description, car.description_zh,
    (car.features || []).join(" "),
    car.fuel_type, car.transmission, car.drivetrain,
    car.exterior_color, car.interior_color,
    car.location, car.location_zh, car.seller_name, car.vin,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 拼音检索:仅保留「纯中文字符」(去掉英文车型名/配置/卖家名等,否则拼音会误配
  // 英文字母,导致 camry 命中几乎所有车),并且只对纯字母词(可能是拼音输入)启用。
  const zhOnly = [
    car.title_zh, MAKES_ZH[car.make], car.location_zh, car.seller_name,
    (car.features || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[^一-鿿]/g, "");

  // continuous: 拼音必须连续命中(默认允许跳字匹配,会让 camry 这类英文词
  // 以 c-a-m-r-y 首字母散落命中长中文串里不相邻的五个字,导致搜什么都全命中)
  return tokens.every(
    (tok) =>
      haystack.includes(tok) ||
      (/^[a-z]+$/.test(tok) && zhOnly.length > 0 && match(zhOnly, tok, { continuous: true }) !== null),
  );
}

// Helper: check if car value matches any of the comma-separated filter values
function matchesMulti(filterVal: string, carVal: string | undefined | null): boolean {
  if (!filterVal) return true;
  if (!carVal) return false;
  return filterVal.split(",").includes(carVal);
}

function matchesColorMulti(filterVal: string, carVal: string | undefined | null): boolean {
  if (!filterVal) return true;
  if (!carVal) return false;
  return filterVal.split(",").some((c) => carVal.includes(c));
}

// 距离表:userCoords -> 每辆有经纬度的车的直线距离(英里),carId -> miles
export function buildDistances(
  cars: DbCar[],
  userCoords: { lat: number; lng: number } | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!userCoords) return map;
  for (const car of cars) {
    if (car.lat && car.lng) {
      map.set(car.id, haversineDistance(userCoords.lat, userCoords.lng, car.lat, car.lng));
    }
  }
  return map;
}

export interface CarFilterContext {
  userCoords: { lat: number; lng: number } | null;
  distances: Map<string, number>;
  /** carId -> 价格评级(以完整车源列表为基准)。dealRating 筛选需要;不传则按需即时计算。 */
  insightMap?: Map<string, PriceInsight | null>;
  /** 数据拉取时间,「上架时间」筛选的基准;为 null/不传时跳过该筛选(与数据未就绪时的页面行为一致)。 */
  fetchedAt?: number | null;
  /**
   * 「可贷款(无信用/ITIN)」的卖家 id 集合(名下门店带 LOAN_FILTER_TAGS 之一,
   * lib/dealer-financing-client.ts fetchLoanFinancingSellerIds)。financing 筛选需要;
   * 不传 / null(还没拉到、列不存在)时该筛选一辆也不命中(与 SQL 侧「没有门店带标签」一致)。
   */
  loanSellerIds?: ReadonlySet<string> | null;
}

// 完整筛选管线(不含排序)。forcedDistanceSort 为 true 表示:位置筛选命中 0 结果、
// 已回退为「全部非位置筛选结果」且有用户坐标——此时调用方应强制按距离排序。
export function applyCarFilters(
  cars: DbCar[],
  filters: Filters,
  ctx: CarFilterContext,
): { cars: DbCar[]; forcedDistanceSort: boolean } {
  const { userCoords, distances, fetchedAt = null, loanSellerIds = null } = ctx;

  // 价格评级表:优先用调用方传入的(页面侧已 memo);没传且需要时才即时构建
  let insightMap = ctx.insightMap;
  if (!insightMap && filters.dealRating) {
    insightMap = new Map<string, PriceInsight | null>();
    for (const car of cars) {
      insightMap.set(car.id, getPriceInsight(car, cars));
    }
  }

  // 预计算:月供预算换算的价格上限 / 上架时间截止点(避免在循环里重复算)
  const paymentPriceCap = filters.maxPayment ? paymentToPrice(Number(filters.maxPayment)) : null;
  const listedCutoff =
    filters.listedWithin && fetchedAt
      ? fetchedAt - Number(filters.listedWithin) * 24 * 60 * 60 * 1000
      : null;

  // Filter without location first to check fallback
  function applyNonLocationFilters(car: DbCar): boolean {
    if (filters.keyword && !carMatchesKeyword(car, filters.keyword)) return false;
    if (filters.make && !matchesMulti(filters.make, car.make)) return false;
    if (filters.model) {
      const models = filters.model
        .split(",")
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);
      if (models.length > 0 && (!car.model || !models.includes(car.model.trim().toLowerCase()))) return false;
    }
    // 价格区间是美元、里程上限是英里:加元 / 公里车源先折算再比(同 browse_filtered 的 price_usd / mileage_mi)
    if (filters.minPrice && carPriceUsd(car) < Number(filters.minPrice)) return false;
    if (filters.maxPrice && carPriceUsd(car) > Number(filters.maxPrice)) return false;
    if (filters.minYear && car.year < Number(filters.minYear)) return false;
    if (filters.maxYear && car.year > Number(filters.maxYear)) return false;
    if (filters.sellerType && car.profiles?.account_type !== filters.sellerType) return false;
    if (filters.fuelType && !matchesMulti(filters.fuelType, car.fuel_type)) return false;
    if (filters.transmission && !matchesMulti(filters.transmission, car.transmission)) return false;
    if (filters.drivetrain && !matchesMulti(filters.drivetrain, car.drivetrain)) return false;
    if (filters.maxMileage && carMileageMi(car) > Number(filters.maxMileage)) return false;
    if (filters.exteriorColor && !matchesColorMulti(filters.exteriorColor, car.exterior_color)) return false;
    if (filters.interiorColor && !matchesColorMulti(filters.interiorColor, car.interior_color)) return false;
    if (filters.bodyStyle) {
      const style = classifyBodyStyle(car);
      if (!style || !filters.bodyStyle.split(",").includes(style)) return false;
    }
    if (paymentPriceCap !== null) {
      // 电议(price<=0)的车无法估算月供,排除;价格上限是美元
      if (car.price <= 0 || carPriceUsd(car) > paymentPriceCap) return false;
    }
    if (filters.dealRating) {
      const insight = insightMap?.get(car.id);
      if (!insight) return false;
      if (filters.dealRating === "great" && insight.level !== "great") return false;
      if (filters.dealRating === "good" && insight.level !== "great" && insight.level !== "good") return false;
    }
    if (filters.priceDropped === "true") {
      if (!car.original_price || car.original_price <= car.price) return false;
    }
    if (listedCutoff !== null) {
      if (new Date(car.created_at).getTime() < listedCutoff) return false;
    }
    if (filters.features) {
      // AND 语义:车辆需包含全部所选配置;去首尾空格、忽略大小写比对(同 browse_filtered)
      const wanted = filters.features
        .split(",")
        .map((f) => f.trim().toLowerCase())
        .filter(Boolean);
      if (wanted.length > 0) {
        const has = new Set((car.features || []).map((f) => f.trim().toLowerCase()));
        if (!wanted.every((f) => has.has(f))) return false;
      }
    }
    if (filters.noAccident === "true" && !car.carfax_summary?.includes("无事故")) return false;
    if (filters.oneOwner === "true") {
      if (!car.carfax_summary || !/(?:^|\D)1 任车主/.test(car.carfax_summary)) return false;
    }
    if (filters.hasCarfax === "true" && !car.carfax_url) return false;
    // 产权:只认明确的清白产权;没填(null)或列还不存在(title-status.sql 未执行,字段缺失)都不命中
    if (filters.cleanTitle === "true" && car.title_status !== CLEAN_TITLE) return false;
    // 可贷款(无信用/ITIN):卖家名下门店带「支持ITIN贷款」或「无信用记录可贷」(同 browse_filtered 的 financing)
    if (filters.financing === "true" && !loanSellerIds?.has(car.seller_id)) return false;
    if (filters.hasVideo === "true" && !carHasVideo(car)) return false;
    if (filters.hasPrice === "true" && car.price <= 0) return false;
    return true;
  }

  function applyLocationFilter(car: DbCar): boolean {
    if (!filters.location) return true;
    const loc = filters.location;
    // Zipcode:不做硬过滤,由距离筛选/排序(以该 zip 为中心)处理
    if (/^\d{5}$/.test(loc)) return true;
    // 城市名(主页「按地区找车」入口链接):子串匹配
    return (
      car.location.toLowerCase().includes(loc.toLowerCase()) ||
      car.location_zh.includes(loc)
    );
  }

  // Apply non-location filters
  const nonLocFiltered = cars.filter(applyNonLocationFilters);

  // Try applying location filter
  let result: DbCar[];
  let usingDistanceFallback = false;
  if (filters.location) {
    const locFiltered = nonLocFiltered.filter(applyLocationFilter);
    if (locFiltered.length > 0) {
      result = locFiltered;
    } else {
      // Fallback: show all results sorted by distance
      result = nonLocFiltered;
      usingDistanceFallback = true;
    }
  } else {
    result = nonLocFiltered;
  }

  // Apply distance filter(仅当有用户坐标时,maxDistance 才生效)
  if (filters.maxDistance && userCoords) {
    const maxDist = Number(filters.maxDistance);
    if (maxDist > 0) {
      result = result.filter((car) => {
        const d = distances.get(car.id);
        return d !== undefined && d <= maxDist;
      });
    }
  }

  // If location yielded no results and we have coords, caller should sort by distance
  return { cars: result, forcedDistanceSort: usingDistanceFallback && !!userCoords };
}

// 排序(纯函数,返回新数组)。locale 传入时,默认排序把「卖家会说当前界面语言」
// 的车排在最前(卖家语言见 profiles.languages / lib/i18n/languages.ts)。
export function sortCars(
  cars: DbCar[],
  sort: SortKey,
  distances: Map<string, number>,
  locale?: Locale,
): DbCar[] {
  const sorted = [...cars];
  switch (sort) {
    // 价格 / 里程排序按折合美元 / 英里(同 browse_cars 的 browse_price_usd / browse_mileage_mi)
    case "price-asc":
      sorted.sort((a, b) => carPriceUsd(a) - carPriceUsd(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => carPriceUsd(b) - carPriceUsd(a));
      break;
    case "mileage":
      sorted.sort((a, b) => carMileageMi(a) - carMileageMi(b));
      break;
    case "year":
      sorted.sort((a, b) => b.year - a.year);
      break;
    case "distance":
      sorted.sort((a, b) => {
        const da = distances.get(a.id) ?? Infinity;
        const db = distances.get(b.id) ?? Infinity;
        return da - db;
      });
      break;
    default:
      // 默认排序:① 卖家会说当前界面语言的优先(含系统检索账号声明的语言)
      // ② 个人/车行直发排在系统检索转载之前 ③ 各自组内按最新
      sorted.sort((a, b) => {
        if (locale) {
          const lang =
            Number(sellerSpeaksLocale(b.profiles?.languages, locale)) -
            Number(sellerSpeaksLocale(a.profiles?.languages, locale));
          if (lang !== 0) return lang;
        }
        const tier = Number(!!a.source_id) - Number(!!b.source_id);
        if (tier !== 0) return tier;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }
  return sorted;
}
