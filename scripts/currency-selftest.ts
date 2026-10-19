#!/usr/bin/env bun
/**
 * currency-selftest — 车源币种(USD / CAD / AUD / NZD)/ 里程单位(lib/currency.ts、lib/format.ts)与依赖它的纯逻辑回归用例。不连库。
 *
 * Usage:
 *   bun scripts/currency-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 覆盖:换算常量与缺列默认值(USD / mi)、加拿大邮编识别与默认单位、价格 / 里程显示、详情页「≈」换算、
 * 比价(lib/price-insight.ts)不拿加元和美元直接比、/browse 客户端筛选与排序(lib/car-filters.ts,
 * 与 supabase/browse-cars.sql 的 browse_price_usd / browse_mileage_mi 同一口径;SQL 侧见 i18n-db-test 的 browse 套件)、
 * 缺列重试跳过已知缺失列的集合(lib/supabase-compat.ts queryWithColumnFallback)、澳元 / 纽元汇率与前缀、
 * 里程单位按界面语言显示(formatMileage 传 t)、API v1 价格 / 里程阈值的 PostgREST or() 串(lib/api/filters.ts unitAwareRange)。
 */

import {
  CAD_PER_USD,
  CURRENCIES,
  CURRENCY_PREFIX,
  KM_PER_MI,
  MAX_UNITS_PER_USD,
  MIN_UNITS_PER_USD,
  NON_USD_CURRENCIES,
  UNITS_PER_USD,
  currencyPrefix,
  isCurrency,
  normalizeCurrency,
  toUsd,
  carCurrency,
  carMileageMi,
  carMileageUnit,
  carPriceUsd,
  convertCurrency,
  extractPostalCode,
  isCanadianPostalCode,
  normalizeCanadianPostalCode,
  postalUnitsDecision,
  unitsForPostalCode,
} from "@/lib/currency";
import { approxMileageMi, approxPriceUsd, formatCarMileage, formatCarPrice, formatMileage, formatMileageCap, formatPrice } from "@/lib/format";
import { getPriceInsight } from "@/lib/price-insight";
import { serverT } from "@/lib/i18n/translate";
import { unitAwareRange } from "@/lib/api/filters";
import { applyCarFilters, sortCars, INITIAL_FILTERS } from "@/lib/car-filters";
import { missingColumnName, queryWithColumnFallback } from "@/lib/supabase-compat";
import type { DbCar } from "@/lib/types";

let fail = 0;
let total = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) return;
  fail++;
  console.log(`FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail));
}

// ---------- 常量 / 默认值 ----------
check("KM_PER_MI is the exact definition", KM_PER_MI === 1.609344);
check("CAD_PER_USD is a sane fixed approximation", CAD_PER_USD > 1 && CAD_PER_USD < 2);
check("missing columns read as USD / mi", carCurrency({}) === "USD" && carMileageUnit({}) === "mi");
check("garbage values read as USD / mi", carCurrency({ currency: "EUR" }) === "USD" && carMileageUnit({ mileage_unit: "miles" }) === "mi");
check("USD price is unchanged", carPriceUsd({ price: 20000 }) === 20000);
check("CAD price converts to USD", Math.abs(carPriceUsd({ price: 13800, currency: "CAD" }) - 10000) < 1e-9);
check("km converts to miles", Math.abs(carMileageMi({ mileage: 160934.4, mileage_unit: "km" }) - 100000) < 1e-6);
check("convertCurrency round-trips", Math.abs(convertCurrency(convertCurrency(25000, "USD", "CAD"), "CAD", "USD") - 25000) < 1e-9);

// ---------- 加拿大邮编 ----------
const postal: [string, boolean][] = [
  ["M5V 3L9", true], ["m5v3l9", true], ["M5V-3L9", true], [" K1A 0B1 ", true],
  ["90210", false], ["M5V 3L", false], ["5MV 3L9", false], ["M5V  3L9", false], ["", false],
];
for (const [s, want] of postal) check(`isCanadianPostalCode(${JSON.stringify(s)}) = ${want}`, isCanadianPostalCode(s) === want);
check("normalizes to A1A 1A1", normalizeCanadianPostalCode("m5v3l9") === "M5V 3L9" && normalizeCanadianPostalCode("M5V-3L9") === "M5V 3L9");
check("US zip passes through normalize", normalizeCanadianPostalCode("90210") === "90210");
check("CA postal → CAD + km", JSON.stringify(unitsForPostalCode("M5V 3L9")) === JSON.stringify({ currency: "CAD", mileage_unit: "km" }));
check("US zip → USD + mi", JSON.stringify(unitsForPostalCode("10001")) === JSON.stringify({ currency: "USD", mileage_unit: "mi" }));
check("incomplete code → null (keep current)", unitsForPostalCode("M5V") === null && unitsForPostalCode("100") === null);

// ---------- 显示 ----------
check("formatPrice default USD", formatPrice(12345) === "$12,345", formatPrice(12345));
check("formatPrice CAD", formatPrice(12345, "CAD") === "CA$12,345", formatPrice(12345, "CAD"));
check("formatPrice explicit USD", formatPrice(9420, "USD", { explicit: true }) === "US$9,420");
check("formatPrice unknown currency → USD", formatPrice(100, "EUR") === "$100");
check("formatMileage default mi", formatMileage(30000) === "30,000 mi");
check("formatMileage km", formatMileage(50000, "km") === "50,000 km");
check("formatCarPrice uses the car's currency", formatCarPrice({ currency: "CAD" }, 26000) === "CA$26,000");
check("formatCarMileage uses the car's unit", formatCarMileage({ mileage: 50000, mileage_unit: "km" }) === "50,000 km");
check("legacy row (no columns) formats as USD / mi",
  formatCarPrice({}, 18900) === "$18,900" && formatCarMileage({ mileage: 41200 }) === "41,200 mi");
check("≈ USD only for CAD cars", approxPriceUsd({ price: 18900 }) === null && approxPriceUsd({ price: 26000, currency: "CAD" }) === "US$18,840",
  approxPriceUsd({ price: 26000, currency: "CAD" }));
check("≈ no conversion for call-for-price", approxPriceUsd({ price: 0, currency: "CAD" }) === null);
check("≈ miles only for km cars", approxMileageMi({ mileage: 30000 }) === null && approxMileageMi({ mileage: 50000, mileage_unit: "km" }) === "31,069 mi",
  approxMileageMi({ mileage: 50000, mileage_unit: "km" }));

// ---------- 比价 ----------
let seq = 0;
function car(p: Partial<DbCar>): DbCar {
  seq++;
  return {
    id: `car-${seq}`, make: "Toyota", model: "Camry", year: 2020, price: 20000, mileage: 40000, vin: null,
    created_at: "2026-01-01T00:00:00Z", status: "active",
    ...p,
  } as DbCar;
}
const usdPool = [18000, 19000, 20000, 21000, 22000].map((price) => car({ price }));
const usdTarget = car({ price: 20000 });
const usdInsight = getPriceInsight(usdTarget, usdPool);
// 同一辆车标成加元(价格按汇率换成加元原值,里程换成公里):评级和折合差额应与美元版一致
const cadTarget = car({ price: Math.round(20000 * CAD_PER_USD), currency: "CAD", mileage: Math.round(40000 * KM_PER_MI), mileage_unit: "km" });
const cadInsight = getPriceInsight(cadTarget, usdPool);
check("CAD car rated against a USD pool after conversion (same level as its USD twin)",
  !!usdInsight && !!cadInsight && usdInsight.level === cadInsight.level, { usdInsight, cadInsight });
check("insight amounts come back in the car's own currency",
  !!usdInsight && !!cadInsight && Math.abs(cadInsight.marketAvg - usdInsight.marketAvg * CAD_PER_USD) <= 2, { usdInsight, cadInsight });
// 原值直接比会把 CA$27,600 判成「偏高」;换算后应是「价格合理」
check("raw CAD number is not compared with USD (no false 'high')", cadInsight?.level === "fair", cadInsight);
// 加元同类车混进美元池:按美元算的中位数不受加元原值的大数字影响
const mixedPool = [...usdPool, car({ price: Math.round(20500 * CAD_PER_USD), currency: "CAD" })];
const mixed = getPriceInsight(usdTarget, mixedPool);
check("CAD comparables are converted before the median", !!mixed && Math.abs(mixed.marketAvg - 20000) <= 600, mixed);
check("pure-USD results are unchanged by the currency logic", usdInsight?.marketAvg === 20000 && usdInsight?.delta === 0, usdInsight);

// ---------- /browse 客户端筛选与排序(与 browse-cars.sql 同一口径) ----------
const C1 = car({ id: "C1", price: 20000, mileage: 30000 });
const C2 = car({ id: "C2", price: 26000, mileage: 50000, currency: "CAD", mileage_unit: "km" });
const C3 = car({ id: "C3", price: 19000, mileage: 40000 });
const cars = [C1, C2, C3];
const ctx = { userCoords: null, distances: new Map<string, number>() };
const ids = (list: DbCar[]) => list.map((c) => c.id).join();
check("minPrice in USD", ids(applyCarFilters(cars, { ...INITIAL_FILTERS, minPrice: "19500" }, ctx).cars) === "C1");
check("maxPrice in USD", ids(applyCarFilters(cars, { ...INITIAL_FILTERS, maxPrice: "19000" }, ctx).cars) === "C2,C3");
check("maxMileage in miles", ids(applyCarFilters(cars, { ...INITIAL_FILTERS, maxMileage: "35000" }, ctx).cars) === "C1,C2");
check("price-asc by USD", ids(sortCars(cars, "price-asc", new Map())) === "C2,C3,C1");
check("price-desc by USD", ids(sortCars(cars, "price-desc", new Map())) === "C1,C3,C2");
check("mileage by miles", ids(sortCars(cars, "mileage", new Map())) === "C1,C2,C3");

// 整数档位边界:SQL numeric 除法 13800 / 1.38 正好是 10000,TS 也必须是(不能 10000.000000000002 被「≤ 10000」排除)
let boundaryMiss = 0;
for (let usd = 1000; usd <= 200000; usd += 500) {
  const cad = Math.round(usd * CAD_PER_USD * 100) / 100;
  if (carPriceUsd({ price: cad, currency: "CAD" }) !== usd) boundaryMiss++;
}
check("CAD price at an exact USD stop converts to the stop itself", boundaryMiss === 0, boundaryMiss);
check("CA$13,800 matches maxPrice 10000", applyCarFilters([car({ id: "B1", price: 13800, currency: "CAD" })], { ...INITIAL_FILTERS, maxPrice: "10000" }, ctx).cars.length === 1);
check("CA$13,800 matches minPrice 10000", applyCarFilters([car({ id: "B1", price: 13800, currency: "CAD" })], { ...INITIAL_FILTERS, minPrice: "10000" }, ctx).cars.length === 1);
check("80,467.2 km matches maxMileage 50000", applyCarFilters([car({ id: "B2", mileage: 80467.2, mileage_unit: "km" })], { ...INITIAL_FILTERS, maxMileage: "50000" }, ctx).cars.length === 1);

// ---------- 编辑页从 location 取邮编(取最后一个,门牌号常是 5 位数) ----------
const extract: [string | null, string][] = [
  ["10520 Yonge St, Richmond Hill, ON L4C 3C7", "L4C 3C7"],
  ["12345 Main St, Irvine, CA 92618", "92618"],
  ["Irvine, CA 92618-1234", "92618"],
  ["Toronto, ON m5v3l9", "M5V 3L9"],
  ["Markham, ON L3R-0A1", "L3R 0A1"],
  ["Toronto, ON", ""],
  [null, ""],
];
for (const [loc, want] of extract) check(`extractPostalCode(${JSON.stringify(loc)}) = ${want}`, extractPostalCode(loc) === want, extractPostalCode(loc));

// ---------- 发布页:邮编默认单位(价格 / 里程已填就要问,不能悄悄改) ----------
const base = { currency: "USD", mileage_unit: "mi", manual: false, hasNumbers: false };
check("CA postal, nothing typed → auto CAD/km", JSON.stringify(postalUnitsDecision({ ...base, zipcode: "M5V 2T6" })) === JSON.stringify({ action: "auto", currency: "CAD", mileage_unit: "km" }));
check("CA postal, numbers typed → ask", postalUnitsDecision({ ...base, zipcode: "M5V 2T6", hasNumbers: true }).action === "ask");
check("CA postal, manual → none", postalUnitsDecision({ ...base, zipcode: "M5V 2T6", hasNumbers: true, manual: true }).action === "none");
check("US zip with USD/mi → none", postalUnitsDecision({ ...base, zipcode: "90210", hasNumbers: true }).action === "none");
check("US zip with CAD/km and numbers → ask USD/mi", JSON.stringify(postalUnitsDecision({ zipcode: "90210", currency: "CAD", mileage_unit: "km", manual: false, hasNumbers: true })) === JSON.stringify({ action: "ask", currency: "USD", mileage_unit: "mi" }));
check("incomplete postal → none", postalUnitsDecision({ ...base, zipcode: "M5V", hasNumbers: true }).action === "none");
check("CA postal with CAD/km already → none", postalUnitsDecision({ zipcode: "M5V 2T6", currency: "CAD", mileage_unit: "km", manual: false, hasNumbers: true }).action === "none");

// ---------- 澳元 / 纽元(多市场币种) ----------
check("every supported currency has a rate and a prefix",
  CURRENCIES.every((c) => UNITS_PER_USD[c] > 0 && !!CURRENCY_PREFIX[c]) && UNITS_PER_USD.USD === 1);
check("AUD / NZD are supported, EUR is not", isCurrency("AUD") && isCurrency("NZD") && !isCurrency("EUR") && normalizeCurrency("EUR") === "USD");
check("NON_USD_CURRENCIES = CAD, AUD, NZD", NON_USD_CURRENCIES.join() === "CAD,AUD,NZD", NON_USD_CURRENCIES);
check("AUD / NZD rates are sane fixed approximations",
  UNITS_PER_USD.AUD > 1 && UNITS_PER_USD.AUD < 2 && UNITS_PER_USD.NZD > 1 && UNITS_PER_USD.NZD < 2.2);
check("widest rate bounds cover every currency", MAX_UNITS_PER_USD === Math.max(...Object.values(UNITS_PER_USD)) && MIN_UNITS_PER_USD === 1);
check("AUD converts to USD exactly (15200 / 1.52)", toUsd(15200, "AUD") === 10000, toUsd(15200, "AUD"));
check("NZD converts to USD exactly (17000 / 1.7)", toUsd(17000, "NZD") === 10000, toUsd(17000, "NZD"));
check("formatPrice AUD → A$", formatPrice(12345, "AUD") === "A$12,345", formatPrice(12345, "AUD"));
check("formatPrice NZD → NZ$", formatPrice(12345, "NZD") === "NZ$12,345", formatPrice(12345, "NZD"));
check("currencyPrefix matches formatPrice for every currency",
  CURRENCIES.every((c) => formatPrice(1000, c) === `${currencyPrefix(c)}1,000`));
check("currencyPrefix explicit USD / unknown", currencyPrefix("USD", { explicit: true }) === "US$" && currencyPrefix("EUR") === "$" && currencyPrefix(null) === "$");
check("≈ USD for AUD cars", approxPriceUsd({ price: 30400, currency: "AUD" }) === "US$20,000", approxPriceUsd({ price: 30400, currency: "AUD" }));
check("carPriceUsd for NZD", carPriceUsd({ price: 34000, currency: "NZD" }) === 20000);

// ---------- 里程单位按界面语言(M0) ----------
const zhT = serverT("zh");
const enT = serverT("en");
const koT = serverT("ko");
check("zh: miles label is 英里", formatMileage(58459, "mi", zhT) === "58,459 英里", formatMileage(58459, "mi", zhT));
check("zh: km label is 公里", formatMileage(20000, "km", zhT) === "20,000 公里", formatMileage(20000, "km", zhT));
check("en: miles label is localized", formatMileage(58459, "mi", enT) === `58,459 ${enT("英里")}` && enT("英里") !== "英里", formatMileage(58459, "mi", enT));
check("ko: miles label is localized", formatCarMileage({ mileage: 58459 }, koT) === `58,459 ${koT("英里")}` && koT("英里") !== "英里");
check("every locale has both unit labels",
  ["en", "ko", "ja", "es", "fr"].every((l) => serverT(l)("英里") !== "英里" && serverT(l)("公里") !== "公里"));
check("≈ miles uses the UI label when t is passed",
  approxMileageMi({ mileage: 50000, mileage_unit: "km" }, zhT) === "31,069 英里", approxMileageMi({ mileage: 50000, mileage_unit: "km" }, zhT));
// 筛选里程上限(滑块 / chip / 抽屉):和车卡同一套「英里」文案,不再出现裸「mi」
check("zh: mileage cap slider label", formatMileageCap(50000, zhT) === "5万英里", formatMileageCap(50000, zhT));
check("zh: mileage cap chip label", formatMileageCap(50000, zhT, { upTo: true }) === "≤5万英里", formatMileageCap(50000, zhT, { upTo: true }));
check("zh: mileage cap below 10k / unlimited",
  formatMileageCap(0, zhT) === "0 英里" && formatMileageCap(999999, zhT) === zhT("不限"), formatMileageCap(0, zhT));
const capKeys: string[] = [];
formatMileageCap(300000, (k) => (capKeys.push(k), k));
formatMileageCap(300000, (k) => (capKeys.push(k), k), { upTo: true });
check("mileage cap uses the 英里 keys (no raw mi)", capKeys.join("|") === "{n}万英里|≤{n}万英里", capKeys);
check("no t → machine codes (unchanged)", formatMileage(58459) === "58,459 mi" && formatCarMileage({ mileage: 1, mileage_unit: "km" }) === "1 km");

// ---------- API v1 价格 / 里程阈值 or() 串 ----------
check("price gte or() covers every non-USD currency",
  unitAwareRange("price", "gte", 10000) ===
    "and(currency.not.in.(CAD,AUD,NZD),price.gte.10000),and(currency.eq.CAD,price.gte.13800),and(currency.eq.AUD,price.gte.15200),and(currency.eq.NZD,price.gte.17000)",
  unitAwareRange("price", "gte", 10000));
check("mileage lte or() rounds inward",
  unitAwareRange("mileage", "lte", 35000) === "and(mileage_unit.not.in.(km),mileage.lte.35000),and(mileage_unit.eq.km,mileage.lte.56327)",
  unitAwareRange("mileage", "lte", 35000));
// 语义对照:把 or() 串当成「按币种选阈值」求值,和 carPriceUsd 比较结果逐台一致(整数价格,阈值向内取整)
function orMatches(expr: string, cur: string, price: number): boolean {
  for (const m of expr.matchAll(/and\(currency\.(not\.in\.\(([A-Z,]+)\)|eq\.([A-Z]{3})),price\.(gte|lte)\.(\d+)\)/g)) {
    const applies = m[2] ? !m[2].split(",").includes(cur) : m[3] === cur;
    if (applies) return m[4] === "gte" ? price >= Number(m[5]) : price <= Number(m[5]);
  }
  return false;
}
let orMismatch: unknown = null;
for (const cur of [...CURRENCIES, "EUR"]) {
  for (const op of ["gte", "lte"] as const) {
    for (const x of [9999, 10000, 12345, 19500]) {
      const expr = unitAwareRange("price", op, x);
      for (let price = Math.floor(x * 0.9); price <= Math.ceil(x * 1.8); price += 7) {
        const usd = carPriceUsd({ price, currency: cur });
        const want = op === "gte" ? usd >= x : usd <= x;
        if (orMatches(expr, cur, price) !== want) orMismatch ??= { cur, op, x, price, usd };
      }
    }
  }
}
check("price or() agrees with carPriceUsd for every currency (unknown → USD)", orMismatch === null, orMismatch);

// ---------- 缺列重试 ----------
check("missingColumnName 42703", missingColumnName({ code: "42703", message: "column cars.currency does not exist" }) === "currency");
check("missingColumnName PGRST204",
  missingColumnName({ code: "PGRST204", message: "Could not find the 'mileage_unit' column of 'cars' in the schema cache" }) === "mileage_unit");
check("missingColumnName ignores other errors", missingColumnName({ code: "23505", message: "duplicate key" }) === null);
async function fallbackRun(missing: string[], sets: readonly string[]) {
  const tried: string[] = [];
  const res = await queryWithColumnFallback(async (cols) => {
    tried.push(cols);
    const miss = cols.split(", ").find((c) => missing.includes(c));
    return miss ? { error: { code: "42703", message: `column cars.${miss} does not exist` } } : { error: null };
  }, sets);
  return { tried, ok: !res.error };
}
const SETS = ["a, v2, t, currency, mileage_unit", "a, v2, t", "a, v2, currency, mileage_unit", "a, v2", "a, t, currency, mileage_unit", "a, t", "a, currency, mileage_unit", "a"];
const none = await fallbackRun(["v2", "t", "currency", "mileage_unit"], SETS);
check("all migrations missing: 4 tries (one per missing group + 1), ends on the legacy set",
  none.ok && none.tried.length === 4 && none.tried[3] === "a", none.tried);
const onlyCur = await fallbackRun(["currency", "mileage_unit"], SETS);
check("only car-currency.sql missing: 2 tries", onlyCur.ok && onlyCur.tried.length === 2 && onlyCur.tried[1] === "a, v2, t", onlyCur.tried);
const all = await fallbackRun([], SETS);
check("everything applied: 1 try", all.ok && all.tried.length === 1, all.tried);

console.log(fail ? `${fail}/${total} failed` : `all ${total} passed`);
process.exit(fail ? 1 : 0);
