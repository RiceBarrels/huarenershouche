import { interpolate } from "@/lib/i18n";
import {
  carCurrency,
  carMileageUnit,
  normalizeCurrency,
  normalizeMileageUnit,
  toMiles,
  toUsd,
  type CarUnits,
  type Currency,
  type MileageUnit,
} from "@/lib/currency";

// 相对时间。传入 useI18n() 的 t 才会翻译;不传时按中文原文输出(兼容旧调用)
type TranslateFn = (text: string, vars?: Record<string, string | number>) => string;

export function timeAgo(date: string, t: TranslateFn = interpolate): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return t("刚刚");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("{n} 分钟前", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("{n} 小时前", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("{n} 天前", { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t("{n} 个月前", { n: months });
  return t("{n} 年前", { n: Math.floor(months / 12) });
}

// 价格 / 里程按车源自己的币种 / 单位显示(cars.currency / cars.mileage_unit,见 lib/currency.ts);
// 不传或列不存在时按 USD / mi。固定 en-US 格式(SSR 与客户端一致):USD →「$12,345」,CAD →「CA$12,345」。
// explicit:美元也写成「US$」,用在和加元并排的「≈」换算里,避免两个「$」分不清。
export function formatPrice(
  price: number,
  currency?: Currency | string | null,
  opts: { explicit?: boolean } = {}
): string {
  const cur = normalizeCurrency(currency);
  const text = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(price);
  return opts.explicit && cur === "USD" ? text.replace("$", "US$") : text;
}

/** 里程数字 + 单位:「12,345 mi」/「20,000 km」 */
export function formatMileage(value: number, unit?: MileageUnit | string | null): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value)) + " " + normalizeMileageUnit(unit);
}

/** 车源的价格(默认 car.price,也可传同币种的其他金额,如原价、降价幅度、比价差额) */
export function formatCarPrice(car: CarUnits, amount: number): string {
  return formatPrice(amount, carCurrency(car));
}

/** 车源的里程(带它自己的单位) */
export function formatCarMileage(car: { mileage: number } & CarUnits): string {
  return formatMileage(car.mileage, carMileageUnit(car));
}

/**
 * 详情页「≈」换算:加元车源给出折合美元(按 lib/currency.ts 的固定近似汇率),美元车源返回 null。
 * 只是参考,不带「≈」符号,由调用方加。
 */
export function approxPriceUsd(car: { price: number } & CarUnits): string | null {
  if (carCurrency(car) === "USD" || !(car.price > 0)) return null;
  return formatPrice(Math.round(toUsd(car.price, carCurrency(car)) / 10) * 10, "USD", { explicit: true });
}

/** 详情页「≈」换算:公里车源给出折合英里,英里车源返回 null */
export function approxMileageMi(car: { mileage: number } & CarUnits): string | null {
  if (carMileageUnit(car) === "mi" || !(car.mileage >= 0)) return null;
  return formatMileage(toMiles(car.mileage, "km"), "mi");
}

// 全站统一的月供估算口径：0 首付 / 6.5% APR / 60 期
export const LOAN_ASSUMPTION = { downRatio: 0, apr: 0.065, months: 60 };

export function estimateMonthlyPayment(
  price: number,
  opts: { downRatio?: number; apr?: number; months?: number } = {}
): number {
  const { downRatio = LOAN_ASSUMPTION.downRatio, apr = LOAN_ASSUMPTION.apr, months = LOAN_ASSUMPTION.months } = opts;
  const principal = price * (1 - downRatio);
  if (principal <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return Math.round(principal / months);
  return Math.round(
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  );
}

/** estimateMonthlyPayment 的反函数：月供预算 → 可承受车价上限 */
export function paymentToPrice(
  monthly: number,
  opts: { downRatio?: number; apr?: number; months?: number } = {}
): number {
  const { downRatio = LOAN_ASSUMPTION.downRatio, apr = LOAN_ASSUMPTION.apr, months = LOAN_ASSUMPTION.months } = opts;
  const r = apr / 12;
  const principal =
    r === 0
      ? monthly * months
      : (monthly * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
  return Math.round(principal / (1 - downRatio || 1));
}
