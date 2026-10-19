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
// 不传或列不存在时按 USD / mi。固定 en-US 格式(SSR 与客户端一致):USD →「$12,345」,CAD →「CA$12,345」,
// AUD →「A$12,345」,NZD →「NZ$12,345」(和 lib/currency.ts CURRENCY_PREFIX 一致)。
// explicit:美元也写成「US$」,用在和其他币种并排的「≈」换算里,避免两个「$」分不清。
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

/** 里程单位的界面文案 key(t("英里") / t("公里"));和数字拼接以外的地方(输入框后缀等)也用它 */
export function mileageUnitKey(unit?: MileageUnit | string | null): "英里" | "公里" {
  return normalizeMileageUnit(unit) === "km" ? "公里" : "英里";
}

/**
 * 里程数字 + 单位。界面上一律传 t(useI18n().t / 服务端 serverT(locale)),单位按界面语言显示:
 * zh「58,459 英里」、en「58,459 miles」、ko「58,459 마일」、公里各语言「20,000 km / 公里」。
 * 不传 t 时输出机器可读的代码「12,345 mi」/「20,000 km」(只给日志 / 自测这类非界面场景;API v1、JSON-LD 本来就各自输出代码)。
 */
export function formatMileage(value: number, unit?: MileageUnit | string | null, t?: TranslateFn): string {
  const n = new Intl.NumberFormat("en-US").format(Math.round(value));
  return `${n} ${t ? t(mileageUnitKey(unit)) : normalizeMileageUnit(unit)}`;
}

/**
 * 筛选里程上限(滑块刻度 / 筛选 chip / 筛选抽屉的当前值)。筛选值恒按英里比较(lib/car-filters.ts carMileageMi),
 * 所以单位固定 t("英里"),和车卡的「58,459 英里」同一套单位文案:
 * zh「5万英里」/「≤5万英里」、en「50k miles」、ko「5만 마일」;不足 1 万走 formatMileage;999999 及以上为「不限」。
 * upTo:前面加「≤」(chip / 抽屉里显示的是上限)。
 */
export function formatMileageCap(miles: number, t: TranslateFn, opts: { upTo?: boolean } = {}): string {
  if (miles >= 999999) return t("不限");
  if (miles >= 10000) {
    const n = (miles / 10000).toFixed(0);
    return opts.upTo ? t("≤{n}万英里", { n }) : t("{n}万英里", { n });
  }
  const text = formatMileage(miles, "mi", t);
  return opts.upTo ? `≤${text}` : text;
}

/** 车源的价格(默认 car.price,也可传同币种的其他金额,如原价、降价幅度、比价差额) */
export function formatCarPrice(car: CarUnits, amount: number): string {
  return formatPrice(amount, carCurrency(car));
}

/** 车源的里程(带它自己的单位;界面上传 t,见 formatMileage) */
export function formatCarMileage(car: { mileage: number } & CarUnits, t?: TranslateFn): string {
  return formatMileage(car.mileage, carMileageUnit(car), t);
}

/**
 * 详情页「≈」换算:非美元车源(加元 / 澳元 / 纽元)给出折合美元(按 lib/currency.ts 的固定近似汇率),美元车源返回 null。
 * 只是参考,不带「≈」符号,由调用方加。
 */
export function approxPriceUsd(car: { price: number } & CarUnits): string | null {
  if (carCurrency(car) === "USD" || !(car.price > 0)) return null;
  return formatPrice(Math.round(toUsd(car.price, carCurrency(car)) / 10) * 10, "USD", { explicit: true });
}

/** 详情页「≈」换算:公里车源给出折合英里,英里车源返回 null(界面上传 t,见 formatMileage) */
export function approxMileageMi(car: { mileage: number } & CarUnits, t?: TranslateFn): string | null {
  if (carMileageUnit(car) === "mi" || !(car.mileage >= 0)) return null;
  return formatMileage(toMiles(car.mileage, "km"), "mi", t);
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
