import type { DbCar } from "./types";
import { carCurrency, carMileageMi, carPriceUsd, fromUsd } from "./currency";

export type DealLevel = "great" | "good" | "fair" | "high";

export interface PriceInsight {
  level: DealLevel;
  label: string;
  className: string;
  /** 正数 = 低于市场价（相对里程/年份修正后的同类中位价）;按这台车自己的币种 */
  delta: number;
  /** 里程/年份修正后的同类市场参考价（中位数）;按这台车自己的币种 */
  marketAvg: number;
  /** 参与对比的同类车源数量 */
  sampleSize: number;
  /** true = 对比样本为同品牌同车型；false = 仅同品牌 */
  sameModel: boolean;
}

// 同车型最少样本数;仅同品牌(跨车型)噪音大,门槛更高
const MIN_COMPARABLES = 3;
const MIN_BRAND_COMPARABLES = 5;

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// 评级 → 徽标文案/样式(前端展示用;存库的评级只存 level 和数值,见 StoredDeal)
const LEVEL_STYLE: Record<DealLevel, { label: string; className: string }> = {
  great: { label: "超值好价", className: "bg-green-600 text-white" },
  good: { label: "好价", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  fair: { label: "价格合理", className: "bg-foreground/10 text-foreground" },
  high: { label: "偏高", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
};

/** 预算好存进 car_browse_meta.deal 的评级(/browse 服务端分页用,见 lib/browse-meta);金额是该车自己的币种 */
export type StoredDeal = Omit<PriceInsight, "label" | "className">;

export function toStoredDeal(insight: PriceInsight | null): StoredDeal | null {
  if (!insight) return null;
  const { level, delta, marketAvg, sampleSize, sameModel } = insight;
  return { level, delta, marketAvg, sampleSize, sameModel };
}

export function fromStoredDeal(deal: StoredDeal | null | undefined): PriceInsight | null {
  if (!deal || !LEVEL_STYLE[deal.level]) return null;
  return { ...deal, ...LEVEL_STYLE[deal.level] };
}

/** 明显是乱标/占位的挂牌不进比价池(按折合美元 / 英里判断) */
function isSanePrice(c: DbCar): boolean {
  const usd = carPriceUsd(c);
  const mi = carMileageMi(c);
  return usd >= 500 && usd <= 500_000 && mi >= 0 && mi <= 400_000;
}

/** 转载车源可能同车多帖:按 VIN 去重(无 VIN 的保留) */
function dedupeByVin(cars: DbCar[]): DbCar[] {
  const seen = new Set<string>();
  return cars.filter((c) => {
    const vin = c.vin?.trim().toUpperCase();
    if (!vin) return true;
    if (seen.has(vin)) return false;
    seen.add(vin);
    return true;
  });
}

/**
 * 找同类车源：优先同品牌同车型（±2 年），不足 3 台时退回同品牌（±2 年，需 ≥5 台）。
 */
export function findComparables(
  car: DbCar,
  allCars: DbCar[]
): { cars: DbCar[]; sameModel: boolean } {
  const targetVin = car.vin?.trim().toUpperCase();
  const base = dedupeByVin(
    allCars.filter(
      (c) =>
        c.id !== car.id &&
        isSanePrice(c) &&
        c.make === car.make &&
        Math.abs(c.year - car.year) <= 2 &&
        // 同一台车的转载帖不和自己比价
        (!targetVin || c.vin?.trim().toUpperCase() !== targetVin)
    )
  );

  const model = car.model?.toLowerCase().trim();
  if (model) {
    const sameModel = base.filter(
      (c) => c.model?.toLowerCase().trim() === model
    );
    if (sameModel.length >= MIN_COMPARABLES) {
      return { cars: sameModel, sameModel: true };
    }
  }

  if (base.length >= MIN_BRAND_COMPARABLES) {
    return { cars: base, sameModel: false };
  }
  return { cars: [], sameModel: false };
}

/**
 * cars.com 式价格评级。币种 / 里程单位:加元与美元、公里与英里不直接比 —— 目标车和同类车源一律先折成
 * 美元 / 英里(lib/currency.ts 固定近似换算)再算,输出的 delta / marketAvg 换回这台车自己的币种。
 * 改进点：
 * 1. 中位数替代算术平均 —— 单台乱标价不再能拉偏市场参考价
 * 2. 逐台修正后再聚合 —— 每台同类车先按「它的里程/年份换算到这台车的条件下值多少」
 *    调整,再取中位数,而不是拿全池平均里程做一次总修正
 * 3. 每英里价值随车价档位缩放(≈15万英里折完),年份差按 7%/年折旧 ——
 *    贵车和便宜车不再共用固定的 $0.05/mile
 * 4. IQR 剔除离群样本;单台修正幅度封顶 ±30% 防止极端值
 */
export function getPriceInsight(
  car: DbCar,
  allCars: DbCar[]
): PriceInsight | null {
  if (!car.price || car.price <= 0) return null;

  const { cars: comps, sameModel } = findComparables(car, allCars);
  if (comps.length < MIN_COMPARABLES) return null;

  // 统一口径:美元 / 英里
  const carUsd = carPriceUsd(car);
  const carMi = carMileageMi(car);
  const norm = comps.map((c) => ({ price: carPriceUsd(c), mileage: carMileageMi(c), year: c.year }));

  // IQR 过滤:去掉价格离群的样本(样本足够时才做,避免过滤后不够数)
  let pool = norm;
  if (norm.length >= 5) {
    const prices = norm.map((c) => c.price).sort((a, b) => a - b);
    const q1 = prices[Math.floor(prices.length * 0.25)];
    const q3 = prices[Math.floor(prices.length * 0.75)];
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    const filtered = norm.filter((c) => c.price >= lo && c.price <= hi);
    if (filtered.length >= MIN_COMPARABLES) pool = filtered;
  }

  // 修正系数基于池子中位价:里程按 15 万英里折完,年份按 7%/年,
  // 下限兜底避免超低价车修正归零
  const basePrice = median(pool.map((c) => c.price));
  const perMile = Math.max(0.02, basePrice / 150_000);
  const perYear = basePrice * 0.07;

  // 每台同类车换算到「与这台车同里程同年份」时的等效价,单台修正封顶 ±30%
  const adjusted = pool.map((c) => {
    const adj =
      (c.mileage - carMi) * perMile + (car.year - c.year) * perYear;
    const cap = c.price * 0.3;
    return c.price + Math.max(-cap, Math.min(cap, adj));
  });

  const marketAvg = median(adjusted);
  if (marketAvg <= 0) return null;

  const ratio = carUsd / marketAvg;
  // 展示金额换回这台车的币种(美元车源原样)
  const currency = carCurrency(car);
  const marketLocal = fromUsd(marketAvg, currency);
  const delta = Math.round(marketLocal - car.price);
  const shared = { delta, marketAvg: Math.round(marketLocal), sampleSize: pool.length, sameModel };

  const level: DealLevel =
    ratio < 0.87 ? "great" : ratio < 0.95 ? "good" : ratio <= 1.15 ? "fair" : "high";
  return { level, ...LEVEL_STYLE[level], ...shared };
}
