import type { DbCar } from "./types";
import { classifyBodyStyle, bodyStyleLabel, type BodyStyle } from "./body-style";
import { paymentToPrice } from "./format";
import { CLEAN_TITLE } from "./title-status";

const STORAGE_KEY = "huaren_saved_searches";
const MAX_ITEMS = 20;
export const SAVED_SEARCHES_EVENT = "saved-searches-change";

export interface SavedSearch {
  id: string;
  /** 用户可读的搜索摘要 */
  name: string;
  /** browse 页的筛选参数（与 URL query 同构） */
  params: Record<string, string>;
  createdAt: string;
  /** 上次检查新车源的时间，用于新上架提醒 */
  lastCheckedAt: string;
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SAVED_SEARCHES_EVENT));
  }
}

export function getSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(searches: SavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches.slice(0, MAX_ITEMS)));
  emitChange();
}

/** 保存当前筛选条件。相同条件已存在时返回已有项（不重复保存）。 */
export function saveSearch(params: Record<string, string>): SavedSearch {
  const cleaned = cleanParams(params);
  const existing = getSavedSearches();
  const key = JSON.stringify(sortedEntries(cleaned));
  const dup = existing.find((s) => JSON.stringify(sortedEntries(s.params)) === key);
  if (dup) return dup;

  const now = new Date().toISOString();
  const item: SavedSearch = {
    id: `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: describeSearch(cleaned),
    params: cleaned,
    createdAt: now,
    lastCheckedAt: now,
  };
  persist([item, ...existing]);
  return item;
}

export function removeSavedSearch(id: string) {
  persist(getSavedSearches().filter((s) => s.id !== id));
}

export function markSearchChecked(id: string, checkedAt: string) {
  persist(
    getSavedSearches().map((s) =>
      s.id === id ? { ...s, lastCheckedAt: checkedAt } : s
    )
  );
}

export function isSearchSaved(params: Record<string, string>): boolean {
  const key = JSON.stringify(sortedEntries(cleanParams(params)));
  return getSavedSearches().some(
    (s) => JSON.stringify(sortedEntries(s.params)) === key
  );
}

/** 去掉与筛选无关/空的参数 */
function cleanParams(params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!v || k === "showResult" || k === "sort") continue;
    out[k] = v;
  }
  return out;
}

function sortedEntries(params: Record<string, string>) {
  return Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
}

export function buildSearchUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(cleanParams(params));
  return `/browse?${qs.toString()}`;
}

/** 把筛选参数转成中文摘要，如 "Toyota · SUV · $2万以下 · 月供≤$400" */
export function describeSearch(params: Record<string, string>): string {
  const parts: string[] = [];
  if (params.make) parts.push(params.make.split(",").join("/"));
  if (params.keyword) parts.push(`"${params.keyword}"`);
  if (params.bodyStyle) {
    parts.push(
      params.bodyStyle
        .split(",")
        .map((s) => bodyStyleLabel(s as BodyStyle))
        .join("/")
    );
  }
  const fmtWan = (n: number) =>
    n >= 10000 ? `$${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万` : `$${n.toLocaleString()}`;
  if (params.minPrice && params.maxPrice) {
    parts.push(`${fmtWan(+params.minPrice)}-${fmtWan(+params.maxPrice)}`);
  } else if (params.maxPrice) {
    parts.push(`${fmtWan(+params.maxPrice)}以下`);
  } else if (params.minPrice) {
    parts.push(`${fmtWan(+params.minPrice)}以上`);
  }
  if (params.maxPayment) parts.push(`月供≤$${params.maxPayment}`);
  if (params.minYear && params.maxYear) {
    parts.push(`${params.minYear}-${params.maxYear}年`);
  } else if (params.minYear) {
    parts.push(`${params.minYear}年以后`);
  } else if (params.maxYear) {
    parts.push(`${params.maxYear}年以前`);
  }
  if (params.maxMileage) parts.push(`≤${(+params.maxMileage / 10000).toFixed(+params.maxMileage % 10000 === 0 ? 0 : 1)}万英里`);
  if (params.model) parts.push(params.model.split(",").join("/"));
  if (params.fuelType) parts.push(params.fuelType.split(",").join("/"));
  if (params.transmission) parts.push(params.transmission.split(",").join("/"));
  if (params.drivetrain) parts.push(params.drivetrain.split(",").join("/"));
  if (params.sellerType) parts.push(params.sellerType === "dealer" ? "车行" : "个人");
  if (params.dealRating) parts.push("只看好价");
  if (params.priceDropped) parts.push("已降价");
  if (params.noAccident) parts.push("无事故");
  if (params.oneOwner) parts.push("一手车主");
  if (params.hasCarfax) parts.push("有Carfax");
  if (params.cleanTitle) parts.push("仅清白产权");
  if (params.hasVideo) parts.push("带视频");
  if (params.hasPrice) parts.push("排除电议");
  if (params.features) parts.push(params.features.split(",").join("/"));
  if (params.location) parts.push(params.location);
  return parts.length > 0 ? parts.join(" · ") : "全部车源";
}

const VIDEO_EXT_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

export function carHasVideo(car: Pick<DbCar, "image_url" | "images">): boolean {
  return [car.image_url, ...(car.images || [])].some(
    (url) => url && VIDEO_EXT_RE.test(url)
  );
}

/**
 * 新车源提醒用的匹配器。覆盖除 地区/距离/好价评级 以外的全部筛选维度
 * （这三项依赖上下文数据，点进列表页仍会完整过滤）。
 * 注意：realtime-notifications 里的 select 列清单必须覆盖这里用到的字段。
 */
export function carMatchesParams(
  car: DbCar,
  params: Record<string, string>
): boolean {
  if (params.make) {
    const makes = params.make.split(",").map((m) => m.toLowerCase());
    if (!makes.includes(car.make.toLowerCase())) return false;
  }
  if (params.model) {
    const models = params.model.split(",").map((m) => m.toLowerCase().trim());
    if (!car.model || !models.includes(car.model.toLowerCase().trim())) return false;
  }
  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    const text = `${car.make} ${car.model} ${car.title} ${car.title_zh}`.toLowerCase();
    if (!text.includes(kw)) return false;
  }
  if (params.minPrice && car.price < +params.minPrice) return false;
  if (params.maxPrice && car.price > +params.maxPrice) return false;
  if (params.maxPayment) {
    const maxPrice = paymentToPrice(+params.maxPayment);
    if (car.price > maxPrice || car.price <= 0) return false;
  }
  if (params.minYear && car.year < +params.minYear) return false;
  if (params.maxYear && car.year > +params.maxYear) return false;
  if (params.maxMileage && car.mileage > +params.maxMileage) return false;
  if (params.fuelType) {
    const fuels = params.fuelType.split(",");
    if (!fuels.includes(car.fuel_type)) return false;
  }
  if (params.transmission) {
    const trans = params.transmission.split(",");
    if (!car.transmission || !trans.includes(car.transmission)) return false;
  }
  if (params.drivetrain) {
    const drives = params.drivetrain.split(",");
    if (!car.drivetrain || !drives.includes(car.drivetrain)) return false;
  }
  if (params.exteriorColor) {
    const colors = params.exteriorColor.split(",");
    if (!car.exterior_color || !colors.some((c) => car.exterior_color!.includes(c))) return false;
  }
  if (params.interiorColor) {
    const colors = params.interiorColor.split(",");
    if (!car.interior_color || !colors.some((c) => car.interior_color!.includes(c))) return false;
  }
  if (params.sellerType) {
    if (car.profiles?.account_type !== params.sellerType) return false;
  }
  if (params.bodyStyle) {
    const styles = params.bodyStyle.split(",");
    const style = classifyBodyStyle(car);
    if (!style || !styles.includes(style)) return false;
  }
  if (params.priceDropped === "true") {
    if (!car.original_price || car.original_price <= car.price) return false;
  }
  if (params.hasPrice === "true" && car.price <= 0) return false;
  if (params.noAccident === "true") {
    if (!car.carfax_summary?.includes("无事故")) return false;
  }
  if (params.oneOwner === "true") {
    if (!car.carfax_summary || !/(?:^|\D)1 任车主/.test(car.carfax_summary)) return false;
  }
  if (params.hasCarfax === "true" && !car.carfax_url) return false;
  // 只认明确的清白产权(未填 / 列不存在都不命中,与 lib/car-filters.ts 一致)
  if (params.cleanTitle === "true" && car.title_status !== CLEAN_TITLE) return false;
  if (params.hasVideo === "true" && !carHasVideo(car)) return false;
  if (params.features) {
    const wanted = params.features.split(",");
    const has = car.features || [];
    if (!wanted.every((f) => has.includes(f))) return false;
  }
  return true;
}
