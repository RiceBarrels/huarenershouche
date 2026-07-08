import type { DbCar } from "./types";

export type DealLevel = "great" | "good" | "fair" | "high";

export interface PriceInsight {
  level: DealLevel;
  label: string;
  className: string;
  /** 正数 = 低于市场价（相对里程修正后的同类均价） */
  delta: number;
  /** 里程修正后的同类市场均价 */
  marketAvg: number;
  /** 参与对比的同类车源数量 */
  sampleSize: number;
  /** true = 对比样本为同品牌同车型；false = 仅同品牌 */
  sameModel: boolean;
}

// 每英里里程差对价值的影响（与估价页折算标准一致的保守值）
const MILEAGE_VALUE_PER_MILE = 0.05;
const MIN_COMPARABLES = 3;

/**
 * 找同类车源：优先同品牌同车型（±2 年），不足 3 台时退回同品牌（±2 年）。
 */
export function findComparables(
  car: DbCar,
  allCars: DbCar[]
): { cars: DbCar[]; sameModel: boolean } {
  const base = allCars.filter(
    (c) =>
      c.id !== car.id &&
      c.price > 0 &&
      c.make === car.make &&
      Math.abs(c.year - car.year) <= 2
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

  if (base.length >= MIN_COMPARABLES) {
    return { cars: base, sameModel: false };
  }
  return { cars: [], sameModel: false };
}

/**
 * cars.com 式价格评级：与里程修正后的同类均价对比，
 * 返回评级 + 量化差额（低于/高于市场价多少美元）。
 */
export function getPriceInsight(
  car: DbCar,
  allCars: DbCar[]
): PriceInsight | null {
  if (!car.price || car.price <= 0) return null;

  const { cars: comps, sameModel } = findComparables(car, allCars);
  if (comps.length < MIN_COMPARABLES) return null;

  const avgPrice = comps.reduce((s, c) => s + c.price, 0) / comps.length;
  const avgMileage = comps.reduce((s, c) => s + c.mileage, 0) / comps.length;

  // 里程修正：这台车里程低于均值则市场参考价上调，反之下调。
  // 修正幅度封顶在均价的 ±25%，避免极端里程差把参考价推到荒谬区间
  const rawAdj = (avgMileage - car.mileage) * MILEAGE_VALUE_PER_MILE;
  const cap = avgPrice * 0.25;
  const marketAvg = avgPrice + Math.max(-cap, Math.min(cap, rawAdj));
  if (marketAvg <= 0) return null;

  const ratio = car.price / marketAvg;
  const delta = Math.round(marketAvg - car.price);
  const shared = { delta, marketAvg: Math.round(marketAvg), sampleSize: comps.length, sameModel };

  if (ratio < 0.87) {
    return { level: "great", label: "超值好价", className: "bg-green-600 text-white", ...shared };
  }
  if (ratio < 0.95) {
    return { level: "good", label: "好价", className: "bg-green-500/10 text-green-600", ...shared };
  }
  if (ratio <= 1.15) {
    return { level: "fair", label: "价格合理", className: "bg-foreground/10 text-foreground", ...shared };
  }
  return { level: "high", label: "偏高", className: "bg-orange-500/10 text-orange-600", ...shared };
}
