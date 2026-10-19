// 车源币种 / 里程单位(cars.currency / cars.mileage_unit,supabase/car-currency.sql)—— 纯模块(server / client / Bun 通用)。
//
// 美国车源用美元 + 英里,加拿大车源用加元 + 公里,澳洲 / 新西兰车源用澳元 / 纽元 + 公里;库里存车源自己的原值,不做换算。
// 列不存在(SQL 未执行)或值缺失时一律按 USD / mi 处理(既有车源都是美国的)。
// 需要跨币种比较的地方(比价池、/browse 价格 / 里程筛选与排序、月供预算)统一先换算成 USD / 英里,
// 换算常量只在这里定义一份;supabase/browse-cars.sql 的 browse_price_usd / browse_mileage_mi 抄了同样的数,改了两边一起改。
// 库里 currency 的 CHECK 只校验 ISO 三位格式,所以所有写入路径(发布页、编辑页、API v1)都必须先用 isCurrency 校验这份列表。

import { resolvePostalCountry, type Country } from "@/lib/postal";

export const CURRENCIES = ["USD", "CAD", "AUD", "NZD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const MILEAGE_UNITS = ["mi", "km"] as const;
export type MileageUnit = (typeof MILEAGE_UNITS)[number];

export const DEFAULT_CURRENCY: Currency = "USD";
export const DEFAULT_MILEAGE_UNIT: MileageUnit = "mi";

/**
 * 1 美元 ≈ 多少加元。固定的近似汇率,不是实时汇率:只用于详情页「≈」换算展示、跨币种比价、
 * 筛选 / 排序时的归一化,不作任何报价依据。汇率长期偏离时手动改这里(和 browse-cars.sql 的 browse_price_usd)。
 */
export const CAD_PER_USD = 1.38;

/** 1 美元 ≈ 多少澳元(固定近似汇率,用途同上) */
export const AUD_PER_USD = 1.52;

/** 1 美元 ≈ 多少纽元(固定近似汇率,用途同上) */
export const NZD_PER_USD = 1.7;

/**
 * 1 美元 ≈ 多少单位该币种(固定近似汇率,同上);新增市场币种时在 CURRENCIES、这里、
 * CURRENCY_PREFIX 和 browse-cars.sql 的 browse_price_usd 各加一项。
 */
export const UNITS_PER_USD: Record<Currency, number> = { USD: 1, CAD: CAD_PER_USD, AUD: AUD_PER_USD, NZD: NZD_PER_USD };

/** 美元以外的支持币种(按原值粗筛 / PostgREST or() 串逐个币种换算阈值用) */
export const NON_USD_CURRENCIES = CURRENCIES.filter((c) => c !== "USD") as Exclude<Currency, "USD">[];

/**
 * 支持币种里「1 美元折多少单位」的最大值。服务端只能按原值筛价时(比价池、SEO 列表),
 * 美元上限 × 它 = 能覆盖所有币种车源的原值上限,拉回来再按折合美元精筛。
 */
export const MAX_UNITS_PER_USD = Math.max(...CURRENCIES.map((c) => UNITS_PER_USD[c]));

/** 同上的最小值(原值下限放宽用;目前就是 USD 的 1) */
export const MIN_UNITS_PER_USD = Math.min(...CURRENCIES.map((c) => UNITS_PER_USD[c]));

/**
 * 金额前缀(和 lib/format.ts formatPrice 用的 Intl en-US 输出一致):USD「$」、CAD「CA$」、AUD「A$」、NZD「NZ$」。
 * explicit:美元也写成「US$」(和其他币种并排时分得清)。输入框前缀、地图价格胶囊这类不走 formatPrice 的地方用。
 */
export const CURRENCY_PREFIX: Record<Currency, string> = { USD: "$", CAD: "CA$", AUD: "A$", NZD: "NZ$" };

export function currencyPrefix(currency: Currency | string | null | undefined, opts: { explicit?: boolean } = {}): string {
  const cur = normalizeCurrency(currency);
  return opts.explicit && cur === "USD" ? "US$" : CURRENCY_PREFIX[cur];
}

/** 1 英里 = 1.609344 公里(国际定义的精确值) */
export const KM_PER_MI = 1.609344;

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);
}

export function isMileageUnit(v: unknown): v is MileageUnit {
  return typeof v === "string" && (MILEAGE_UNITS as readonly string[]).includes(v);
}

/** 非法 / 缺失 → USD(列不存在时行里没有这个字段) */
export function normalizeCurrency(v: unknown): Currency {
  return isCurrency(v) ? v : DEFAULT_CURRENCY;
}

/** 非法 / 缺失 → mi */
export function normalizeMileageUnit(v: unknown): MileageUnit {
  return isMileageUnit(v) ? v : DEFAULT_MILEAGE_UNIT;
}

/** 行上的币种 / 单位字段(car-currency.sql 执行前不存在,故全可选) */
export interface CarUnits {
  currency?: string | null;
  mileage_unit?: string | null;
}

export function carCurrency(car: CarUnits | null | undefined): Currency {
  return normalizeCurrency(car?.currency);
}

export function carMileageUnit(car: CarUnits | null | undefined): MileageUnit {
  return normalizeMileageUnit(car?.mileage_unit);
}

/**
 * 去掉浮点除法的尾差(保留 6 位小数)。SQL 侧 browse_price_usd / browse_mileage_mi 用 numeric 精确除:
 * 13800 / 1.38 在库里正好是 10000,JS 却是 10000.000000000002,不抹掉的话「≤ $10,000」这类整数档位
 * 在 /browse(SQL)和地图 / 订阅提醒 / SEO 列表(TS)两边结果不一致。lib/api/filters.ts 的 unitAwareRange 同一做法。
 */
function dropFloatError(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/** 金额换算成美元(不取整,只抹浮点尾差;比较 / 排序用) */
export function toUsd(amount: number, currency: Currency | string | null | undefined): number {
  const rate = UNITS_PER_USD[normalizeCurrency(currency)];
  return rate === 1 ? amount : dropFloatError(amount / rate);
}

/** 美元金额换算成目标币种(不取整,只抹浮点尾差) */
export function fromUsd(usd: number, currency: Currency | string | null | undefined): number {
  const rate = UNITS_PER_USD[normalizeCurrency(currency)];
  return rate === 1 ? usd : dropFloatError(usd * rate);
}

export function convertCurrency(amount: number, from: Currency | string | null | undefined, to: Currency | string | null | undefined): number {
  const f = normalizeCurrency(from);
  const t = normalizeCurrency(to);
  return f === t ? amount : fromUsd(toUsd(amount, f), t);
}

/** 里程换算成英里(不取整,只抹浮点尾差) */
export function toMiles(value: number, unit: MileageUnit | string | null | undefined): number {
  return normalizeMileageUnit(unit) === "km" ? dropFloatError(value / KM_PER_MI) : value;
}

/** 英里换算成目标单位(不取整,只抹浮点尾差) */
export function fromMiles(miles: number, unit: MileageUnit | string | null | undefined): number {
  return normalizeMileageUnit(unit) === "km" ? dropFloatError(miles * KM_PER_MI) : miles;
}

export function convertMileage(value: number, from: MileageUnit | string | null | undefined, to: MileageUnit | string | null | undefined): number {
  const f = normalizeMileageUnit(from);
  const t = normalizeMileageUnit(to);
  return f === t ? value : fromMiles(toMiles(value, f), t);
}

/** 车价折合美元:筛选 / 排序 / 比价的统一口径(电议 0 仍是 0) */
export function carPriceUsd(car: { price: number } & CarUnits): number {
  return toUsd(car.price, car.currency);
}

/** 里程折合英里:筛选 / 排序 / 比价的统一口径 */
export function carMileageMi(car: { mileage: number } & CarUnits): number {
  return toMiles(car.mileage, car.mileage_unit);
}

// ===== 发布页默认值:国家 → 币种 + 里程单位 =====
// 邮编格式 / 国家判断在 lib/postal.ts;这里只管「哪个国家默认用什么币种和单位」。
// 下面几个邮编工具原先定义在这里,保留转出口兼容既有调用方。
export { CA_POSTAL_RE, isCanadianPostalCode, normalizeCanadianPostalCode, extractPostalCode } from "@/lib/postal";

/** 各国默认币种 / 里程单位:美国 USD + mi,加拿大 CAD + km,澳大利亚 AUD + km,新西兰 NZD + km */
export const COUNTRY_UNITS: Record<Country, { currency: Currency; mileage_unit: MileageUnit }> = {
  US: { currency: "USD", mileage_unit: "mi" },
  CA: { currency: "CAD", mileage_unit: "km" },
  AU: { currency: "AUD", mileage_unit: "km" },
  NZ: { currency: "NZD", mileage_unit: "km" },
};

export function unitsForCountry(country: Country): { currency: Currency; mileage_unit: MileageUnit } {
  return { ...COUNTRY_UNITS[country] };
}

/**
 * 邮编对应的默认币种 / 里程单位:格式唯一的(美国 5 位 zip / 加拿大邮编)按格式;4 位(澳 / 新共用)按 country
 * (卖家显式选的国家),country 不是澳 / 新时无法判断;其他(没填完 / 格式不对)→ null,调用方保持当前值。
 * 卖家手动切换过就不再自动改(见 postalUnitsDecision)。
 */
export function unitsForPostalCode(
  code: string | null | undefined,
  country?: string | null,
): { currency: Currency; mileage_unit: MileageUnit } | null {
  const c = resolvePostalCountry(code, country);
  return c ? unitsForCountry(c) : null;
}

/**
 * 发布页:邮编给出的默认单位和当前单位不一致时怎么处理(价格 / 里程两步在邮编之前)。
 * - none:一致 / 邮编没填完 / 列没建 / 卖家手动切换过
 * - auto:价格、里程都还没填数字,直接改成邮编的默认值(不会改变任何已填的含义)
 * - ask:已经填了数字 —— 只改单位不换算数字会让车价 / 里程差出 27% / 1.6 倍,必须让卖家确认,不能悄悄改
 */
export function postalUnitsDecision(input: {
  zipcode: string | null | undefined;
  /** 卖家选的国家(4 位邮编靠它区分澳 / 新;格式唯一的邮编以格式为准) */
  country?: string | null;
  currency: string | null | undefined;
  mileage_unit: string | null | undefined;
  /** 卖家手动切换过币种 / 单位 */
  manual: boolean;
  /** 价格或里程已填了大于 0 的数字 */
  hasNumbers: boolean;
}): { action: "none" } | { action: "auto" | "ask"; currency: Currency; mileage_unit: MileageUnit } {
  const units = unitsForPostalCode(input.zipcode, input.country);
  if (!units || input.manual) return { action: "none" };
  if (normalizeCurrency(input.currency) === units.currency && normalizeMileageUnit(input.mileage_unit) === units.mileage_unit) {
    return { action: "none" };
  }
  return { action: input.hasNumbers ? "ask" : "auto", ...units };
}
