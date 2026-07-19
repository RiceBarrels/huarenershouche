// 车辆推荐算法 —— 基于内容的个性化推荐(content-based filtering)。
//
// 核心信号(按重要性):
//   1. 用户「喜欢/收藏」的车辆   —— 最强信号(权重最高)
//   2. 用户「浏览过」的车辆       —— 次强,按浏览新近度衰减
//   3. 搜索关键词历史             —— 文本匹配加成
// 距离只作为很小的加成项(tiebreaker),绝不主导排序。
//
// 从上述信号构建「口味画像」(TasteProfile):偏好的品牌 / 车型 / 车身类型 /
// 价位 / 年份 / 里程 / 能源 / 变速箱 / 驱动方式,再对候选车打分排序。

import { getRecentlyViewed } from "./recently-viewed";
import { getSearchHistory } from "./search-history";
import { classifyBodyStyle } from "./body-style";
import type { DbCar } from "./types";

const FAVORITES_KEY = "huaren_favorites";

// ── 信号权重 ────────────────────────────────────────────────────────────────
const FAVORITE_WEIGHT = 5; // 收藏是明确的强偏好
const VIEWED_BASE_WEIGHT = 3; // 最近浏览的一台
const VIEWED_MIN_WEIGHT = 0.8; // 越早浏览的权重越低,但仍保留一点

// ── 各特征在总分里的最大贡献(体现「口味 > 距离」)────────────────────────────
const W_MAKE = 22;
const W_MODEL = 28; // 同车型是最强的相似信号
const W_BODY = 18;
const W_PRICE = 20;
const W_YEAR = 10;
const W_MILEAGE = 8;
const W_FUEL = 10;
const W_TRANSMISSION = 5;
const W_DRIVETRAIN = 5;
const W_SEARCH = 8; // 命中搜索历史关键词
const W_RECENCY = 5; // 新上架轻微加成
const W_USER_POSTED = 12; // 个人/车行直发优先于系统检索转载车源
const W_DISTANCE_DEFAULT = 6; // 距离加成上限(默认很小)

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

// 有足够信号才值得做个性化推荐(收藏≥2 或 浏览≥3)。
export function hasUserHistory(): boolean {
  if (typeof window === "undefined") return false;
  return getFavoriteIds().length >= 2 || getRecentlyViewed().length >= 3;
}

// ── 口味画像 ────────────────────────────────────────────────────────────────
interface WeightedCar {
  car: DbCar;
  weight: number;
}

export interface TasteProfile {
  makes: Record<string, number>;
  models: Record<string, number>;
  bodyStyles: Record<string, number>;
  fuels: Record<string, number>;
  transmissions: Record<string, number>;
  drivetrains: Record<string, number>;
  priceCenter: number;
  priceSpread: number;
  yearCenter: number;
  yearSpread: number;
  mileageCenter: number;
  mileageSpread: number;
  totalWeight: number;
  searchTerms: string[];
  isEmpty: boolean;
}

function modelKey(car: Pick<DbCar, "make" | "model">): string {
  return `${car.make}||${(car.model || "").toLowerCase().trim()}`;
}

function weightedStd(values: { v: number; w: number }[], center: number, totalW: number): number {
  if (totalW <= 0) return 0;
  const variance = values.reduce((s, { v, w }) => s + w * (v - center) * (v - center), 0) / totalW;
  return Math.sqrt(Math.max(0, variance));
}

// 从收藏 + 浏览车辆构建画像。
//   favorites: 收藏的车(顺序无所谓,统一高权重)
//   viewed:    浏览过的车,按新近度排列(最新在前),权重递减
export function buildProfile(favorites: DbCar[], viewed: DbCar[]): TasteProfile {
  const signals: WeightedCar[] = [];
  for (const car of favorites) {
    if (car) signals.push({ car, weight: FAVORITE_WEIGHT });
  }
  const favIds = new Set(favorites.map((c) => c?.id));
  viewed.forEach((car, i) => {
    if (!car || favIds.has(car.id)) return; // 已收藏的不再叠加浏览权重
    const w = Math.max(VIEWED_MIN_WEIGHT, VIEWED_BASE_WEIGHT * Math.pow(0.85, i));
    signals.push({ car, weight: w });
  });

  const profile: TasteProfile = {
    makes: {}, models: {}, bodyStyles: {}, fuels: {}, transmissions: {}, drivetrains: {},
    priceCenter: 0, priceSpread: 0, yearCenter: 0, yearSpread: 0, mileageCenter: 0, mileageSpread: 0,
    totalWeight: 0, searchTerms: getSearchHistory().map((t) => t.toLowerCase()).filter(Boolean),
    isEmpty: signals.length === 0,
  };

  if (signals.length === 0) return profile;

  let totalW = 0;
  const prices: { v: number; w: number }[] = [];
  const years: { v: number; w: number }[] = [];
  const mileages: { v: number; w: number }[] = [];

  for (const { car, weight } of signals) {
    totalW += weight;
    if (car.make) profile.makes[car.make] = (profile.makes[car.make] || 0) + weight;
    profile.models[modelKey(car)] = (profile.models[modelKey(car)] || 0) + weight;
    const body = classifyBodyStyle(car);
    if (body) profile.bodyStyles[body] = (profile.bodyStyles[body] || 0) + weight;
    if (car.fuel_type) profile.fuels[car.fuel_type] = (profile.fuels[car.fuel_type] || 0) + weight;
    if (car.transmission) profile.transmissions[car.transmission] = (profile.transmissions[car.transmission] || 0) + weight;
    if (car.drivetrain) profile.drivetrains[car.drivetrain] = (profile.drivetrains[car.drivetrain] || 0) + weight;

    if (car.price > 0) prices.push({ v: car.price, w: weight });
    if (car.year > 0) years.push({ v: car.year, w: weight });
    if (car.mileage >= 0) mileages.push({ v: car.mileage, w: weight });
  }

  profile.totalWeight = totalW;

  const wAvg = (arr: { v: number; w: number }[]) => {
    const tw = arr.reduce((s, x) => s + x.w, 0);
    return tw > 0 ? arr.reduce((s, x) => s + x.v * x.w, 0) / tw : 0;
  };

  const priceW = prices.reduce((s, x) => s + x.w, 0);
  profile.priceCenter = wAvg(prices);
  profile.priceSpread = Math.max(weightedStd(prices, profile.priceCenter, priceW), profile.priceCenter * 0.22, 3000);

  const yearW = years.reduce((s, x) => s + x.w, 0);
  profile.yearCenter = wAvg(years);
  profile.yearSpread = Math.max(weightedStd(years, profile.yearCenter, yearW), 2.5);

  const mileageW = mileages.reduce((s, x) => s + x.w, 0);
  profile.mileageCenter = wAvg(mileages);
  profile.mileageSpread = Math.max(weightedStd(mileages, profile.mileageCenter, mileageW), 25000);

  return profile;
}

// 高斯相似度:x 越接近 center 越接近 1,越远越接近 0。
function gaussian(x: number, center: number, spread: number): number {
  if (spread <= 0) return 0;
  const z = (x - center) / spread;
  return Math.exp(-0.5 * z * z);
}

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface RankOpts {
  excludeIds?: Set<string>;
  userCoords?: { lat: number; lng: number } | null;
  distanceWeight?: number; // 距离加成上限,默认 6(很小)
  distanceHalfMi?: number; // 加成衰减半径,默认 40 英里
  limit?: number;
}

// 对单台候选车打分(0 起,越高越推荐)。
export function scoreCar(car: DbCar, profile: TasteProfile, opts?: RankOpts): number {
  let score = 0;
  const W = profile.totalWeight || 1;

  if (!profile.isEmpty) {
    // 类别特征:命中权重占总口味权重的比例 × 该特征满分
    score += ((profile.makes[car.make] || 0) / W) * W_MAKE;
    score += ((profile.models[modelKey(car)] || 0) / W) * W_MODEL;
    const body = classifyBodyStyle(car);
    if (body) score += ((profile.bodyStyles[body] || 0) / W) * W_BODY;
    score += ((profile.fuels[car.fuel_type] || 0) / W) * W_FUEL;
    if (car.transmission) score += ((profile.transmissions[car.transmission] || 0) / W) * W_TRANSMISSION;
    if (car.drivetrain) score += ((profile.drivetrains[car.drivetrain] || 0) / W) * W_DRIVETRAIN;

    // 数值特征:与偏好中心的高斯接近度
    if (profile.priceCenter > 0 && car.price > 0) score += gaussian(car.price, profile.priceCenter, profile.priceSpread) * W_PRICE;
    if (profile.yearCenter > 0 && car.year > 0) score += gaussian(car.year, profile.yearCenter, profile.yearSpread) * W_YEAR;
    if (profile.mileageCenter > 0 && car.mileage >= 0) score += gaussian(car.mileage, profile.mileageCenter, profile.mileageSpread) * W_MILEAGE;
  }

  // 搜索历史关键词命中
  if (profile.searchTerms.length > 0) {
    const text = `${car.make} ${car.model} ${car.title_zh} ${car.title}`.toLowerCase();
    if (profile.searchTerms.some((t) => text.includes(t))) score += W_SEARCH;
  }

  // 个人/车行直发优先于系统检索转载
  if (!car.source_id) score += W_USER_POSTED;

  // 新近度:新上架轻微加成
  const daysOld = (Date.now() - new Date(car.created_at).getTime()) / 86400000;
  if (daysOld < 3) score += W_RECENCY;
  else if (daysOld < 7) score += W_RECENCY * 0.5;

  // 距离:仅作小幅加成(不主导)
  if (opts?.userCoords && car.lat != null && car.lng != null) {
    const dw = opts.distanceWeight ?? W_DISTANCE_DEFAULT;
    const half = opts.distanceHalfMi ?? 40;
    const d = haversineMi(opts.userCoords.lat, opts.userCoords.lng, car.lat, car.lng);
    score += dw * Math.exp(-d / half);
  }

  return score;
}

// 主入口:对候选车列表按个性化画像排序。
//   candidates: 候选车池(建议传较大的一批,如 100~200 台)
//   signals:    { favorites, viewed } —— 用户喜欢/浏览过的车辆
export function rankCars(
  candidates: DbCar[],
  signals: { favorites: DbCar[]; viewed: DbCar[] },
  opts?: RankOpts,
): DbCar[] {
  const profile = buildProfile(signals.favorites, signals.viewed);
  const exclude = opts?.excludeIds ?? new Set<string>();

  const ranked = candidates
    .filter((c) => !exclude.has(c.id))
    .map((car) => ({ car, score: scoreCar(car, profile, opts) }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.car);

  return typeof opts?.limit === "number" ? ranked.slice(0, opts.limit) : ranked;
}
