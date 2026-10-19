#!/usr/bin/env bun
/**
 * postal-selftest — 市场国家 / 邮编(lib/postal.ts)与依赖它的纯逻辑回归用例。不连库。
 *
 * Usage:
 *   bun scripts/postal-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 覆盖:四国邮编格式(美国 5 位 / ZIP+4、加拿大 A1A 1A1、澳新 4 位)与国家判定(4 位靠显式国家)、
 * 读时推断车源国家(坐标外接框 → location 文本 → 邮编格式 → 美国)、location 补国名、编辑页取邮编、
 * 国家 → 默认币种 / 里程单位(lib/currency.ts,发布页邮编提问)、/browse 客户端「先国家再距离」(lib/car-filters.ts)。
 * SQL 侧(browse-cars.sql 的 browse_*_countries / browse_car_country)与本模块的逐样本对照见 i18n-db-test 的 browse 套件。
 */

import {
  ANZ_DEFAULT_COUNTRY,
  carCountry,
  countriesFromCoords,
  countriesFromText,
  deriveCountry,
  extractPostalCode,
  isAmbiguousPostalCode,
  isPostalCode,
  isPostalCodeFor,
  normalizeCountry,
  normalizePostalCode,
  normalizeRegionInput,
  postalCountries,
  postalFromFilter,
  postalInputMaxLength,
  postalQuery,
  regionInputMaxLength,
  resolvePostalCountry,
  sanitizePostalInput,
  withCountrySuffix,
} from "@/lib/postal";
import { postalUnitsDecision, unitsForCountry, unitsForPostalCode, isCurrency } from "@/lib/currency";
import { applyCarFilters, buildDistances, filtersFromParams, filtersToQuery, INITIAL_FILTERS, postalFilter } from "@/lib/car-filters";
import type { DbCar } from "@/lib/types";

let fail = 0;
let total = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) return;
  fail++;
  console.log(`FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail));
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---------- 邮编格式 ----------
const formats: [string, string[]][] = [
  ["90210", ["US"]], ["90210-1234", ["US"]], [" 10001 ", ["US"]],
  ["M5V 3L9", ["CA"]], ["m5v3l9", ["CA"]], ["M5V-3L9", ["CA"]],
  ["2000", ["AU", "NZ"]], ["0800", ["AU", "NZ"]], ["1010", ["AU", "NZ"]],
  ["200", []], ["123456", []], ["M5V", []], ["Sydney", []], ["", []], ["9021O", []],
];
for (const [v, want] of formats) check(`postalCountries(${JSON.stringify(v)})`, eq(postalCountries(v), want), postalCountries(v));
check("isPostalCode / ambiguity", isPostalCode("2000") && isAmbiguousPostalCode("2000") && !isAmbiguousPostalCode("90210") && !isPostalCode("200"));
check("isPostalCodeFor: 4 digits valid only for AU / NZ",
  isPostalCodeFor("2000", "AU") && isPostalCodeFor("2000", "nz") && !isPostalCodeFor("2000", "US") && !isPostalCodeFor("90210", "AU"));
check("normalizePostalCode", normalizePostalCode("m5v3l9") === "M5V 3L9" && normalizePostalCode("90210-1234") === "90210" && normalizePostalCode(" 2000 ") === "2000");
check("normalizeCountry is lenient", normalizeCountry(" au ") === "AU" && normalizeCountry("UK") === null && normalizeCountry(null) === null);

// ---------- 国家判定(4 位靠显式国家)----------
check("unique format wins over preference", resolvePostalCountry("90210", "AU") === "US" && resolvePostalCountry("M5V 3L9", "US") === "CA");
check("4 digits follow the first matching preference", resolvePostalCountry("1010", "US", "NZ", "AU") === "NZ");
check("4 digits without AU / NZ preference → null", resolvePostalCountry("2000", "US") === null && resolvePostalCountry("2000") === null);
check("incomplete code → null", resolvePostalCountry("200", "AU") === null);
check("postalQuery: 4 digits default to AU", eq(postalQuery("2000"), { code: "2000", country: ANZ_DEFAULT_COUNTRY }) && ANZ_DEFAULT_COUNTRY === "AU");
check("postalQuery: explicit NZ", eq(postalQuery("1010", "NZ"), { code: "1010", country: "NZ" }));
check("postalQuery: CA normalized", eq(postalQuery("m5v-3l9"), { code: "M5V 3L9", country: "CA" }));
check("postalQuery: not a postcode → null", postalQuery("Irvine") === null && postalQuery("") === null);
check("postalFromFilter: city name → null; 4 digits + country", postalFromFilter("Irvine", "") === null && eq(postalFromFilter("1010", "NZ"), { code: "1010", country: "NZ" }));

// ---------- 坐标外接框 ----------
const coords: [string, number | null, number | null, string[]][] = [
  ["Los Angeles", 34.05, -118.24, ["US"]],
  ["Seattle", 47.61, -122.33, ["US"]],
  ["Vancouver (49th parallel band)", 49.28, -123.12, ["CA"]],
  ["Calgary", 51.05, -114.07, ["CA"]],
  ["Toronto (border overlap)", 43.65, -79.38, ["US", "CA"]],
  ["Detroit (border overlap)", 42.33, -83.05, ["US", "CA"]],
  ["Halifax", 44.65, -63.57, ["CA"]],
  ["Anchorage", 61.22, -149.9, ["US"]],
  ["Honolulu", 21.31, -157.86, ["US"]],
  ["Sydney", -33.87, 151.21, ["AU"]],
  ["Perth", -31.95, 115.86, ["AU"]],
  ["Hobart", -42.88, 147.33, ["AU"]],
  ["Auckland", -36.85, 174.76, ["NZ"]],
  ["Dunedin", -45.87, 170.5, ["NZ"]],
  ["Tokyo", 35.68, 139.69, []],
  ["0,0 = no coords", 0, 0, []],
  ["null", null, null, []],
];
for (const [name, lat, lng, want] of coords) check(`countriesFromCoords ${name}`, eq(countriesFromCoords(lat, lng), want), countriesFromCoords(lat, lng));

// ---------- location 文本 ----------
const texts: [string, string[]][] = [
  ["Sydney, NSW 2000, Australia", ["AU"]],
  ["Auckland, Auckland 1010, New Zealand", ["NZ"]],
  ["Wellington, NZ", ["NZ"]],
  ["Melbourne VIC 3000", ["AU"]],
  ["Toronto, ON M5V 3L9", ["CA"]],
  ["10520 Yonge St, Richmond Hill, ON L4C 3C7", ["CA"]],
  ["Vancouver, BC", ["CA"]],
  ["Ontario, CA 91761", ["US"]], // 加州的 Ontario 市,不是安大略省
  ["12345 Main St, Irvine, CA 92618", ["US"]],
  ["1234 Main St, Austin, TX", ["US"]], // 4 位门牌号不当澳新邮编
  ["Christchurch 8011", ["AU", "NZ"]],
  ["悉尼", []],
  ["新西兰奥克兰", ["NZ"]],
  ["加拿大多伦多", ["CA"]],
  ["a", []],
  ["", []],
];
for (const [v, want] of texts) check(`countriesFromText(${JSON.stringify(v)})`, eq(countriesFromText(v), want), countriesFromText(v));

// ---------- 组合推断 ----------
check("coords decide AU vs NZ even with ambiguous text", deriveCountry({ lat: -36.85, lng: 174.76, location: "Auckland 1010" }) === "NZ");
check("coords beat a contradicting text outside the overlap", deriveCountry({ lat: -33.87, lng: 151.21, location: "Los Angeles, CA 90012" }) === "AU");
check("border overlap: text picks CA", deriveCountry({ lat: 43.65, lng: -79.38, location: "Toronto, ON M5V 3L9" }) === "CA");
check("border overlap: no text → first candidate (US)", deriveCountry({ lat: 42.31, lng: -83.04, location: "a" }) === "US");
check("no coords: text, then location_zh", deriveCountry({ location: "a", location_zh: "新西兰" }) === "NZ");
check("no coords, ambiguous 4-digit text → AU", deriveCountry({ location: "Christchurch 8011" }) === "AU");
check("nothing → deriveCountry null, carCountry US", deriveCountry({ location: "a", location_zh: "b" }) === null && carCountry({ location: "a" }) === "US" && carCountry(null) === "US");

// ---------- location 补国名 / 编辑页取邮编 ----------
// ===== 输入框清洗 =====
check("sanitizePostalInput: digits capped at 5 (AU / NZ mode must not truncate a pasted zip to 4)",
  eq(sanitizePostalInput("90210"), { value: "90210", letters: false }) && eq(sanitizePostalInput("902101"), { value: "90210", letters: false })
  && postalCountries(sanitizePostalInput("90210").value)[0] === "US");
check("sanitizePostalInput: 4 digits stay ambiguous; junk stripped", eq(sanitizePostalInput(" 20a00"), { value: "2000", letters: false }));
check("sanitizePostalInput: letters → CA mode, uppercased, max 7", eq(sanitizePostalInput("m5v 3l9x"), { value: "M5V 3L9", letters: true }));
check("postalInputMaxLength: 5 for US / AU / NZ, 7 for CA or letters",
  postalInputMaxLength("AU", "") === 5 && postalInputMaxLength("NZ", "1010") === 5 && postalInputMaxLength("US", "") === 5
  && postalInputMaxLength("CA", "") === 7 && postalInputMaxLength("AU", "M5V") === 7);
check("region input: NZ keeps full region names as typed", normalizeRegionInput("Canterbury", "NZ") === "Canterbury"
  && normalizeRegionInput("Ot", "NZ") === "Ot" && regionInputMaxLength("NZ") >= 20);
check("region input: US / CA / AU abbreviations uppercased, max 3", normalizeRegionInput("nsw", "AU") === "NSW"
  && normalizeRegionInput("on", "CA") === "ON" && regionInputMaxLength("US") === 3 && regionInputMaxLength("AU") === 3);
check("region input: long prefilled value not force-uppercased", normalizeRegionInput("Queensland", "AU") === "Queensland");

check("withCountrySuffix appends for AU / NZ only", withCountrySuffix("Sydney, NSW 2000", "AU") === "Sydney, NSW 2000, Australia"
  && withCountrySuffix("Auckland 1010", "NZ") === "Auckland 1010, New Zealand"
  && withCountrySuffix("Irvine, CA 92618", "US") === "Irvine, CA 92618"
  && withCountrySuffix("Sydney, Australia", "AU") === "Sydney, Australia");
check("suffixed AU location derives AU without coords", carCountry({ location: withCountrySuffix("Perth, WA 6000", "AU") }) === "AU");
check("suffixed NZ location derives NZ without coords", carCountry({ location: withCountrySuffix("Auckland, Auckland 1010", "NZ") }) === "NZ");
check("extractPostalCode AU: last 4-digit group", extractPostalCode("1234 George St, Sydney, NSW 2000, Australia", "AU") === "2000");
check("extractPostalCode NZ", extractPostalCode("Auckland, Auckland 1010, New Zealand", "NZ") === "1010");
check("extractPostalCode US ignores 4-digit house numbers", extractPostalCode("1234 Main St, Austin, TX") === "" && extractPostalCode("1234 Main St, Austin, TX 78701", "US") === "78701");
check("extractPostalCode CA unchanged", extractPostalCode("Toronto, ON m5v3l9") === "M5V 3L9");

// ---------- 国家 → 默认币种 / 单位 ----------
check("units by country", eq(unitsForCountry("AU"), { currency: "AUD", mileage_unit: "km" }) && eq(unitsForCountry("NZ"), { currency: "NZD", mileage_unit: "km" })
  && eq(unitsForCountry("CA"), { currency: "CAD", mileage_unit: "km" }) && eq(unitsForCountry("US"), { currency: "USD", mileage_unit: "mi" }));
check("every country default currency is a supported currency", (["US", "CA", "AU", "NZ"] as const).every((c) => isCurrency(unitsForCountry(c).currency)));
check("AU postcode + AU → AUD / km", eq(unitsForPostalCode("2000", "AU"), { currency: "AUD", mileage_unit: "km" }));
check("4 digits without country → null (keep current)", unitsForPostalCode("2000") === null && unitsForPostalCode("2000", "US") === null);
const base = { currency: "USD", mileage_unit: "mi", manual: false, hasNumbers: false };
check("AU + 2000, nothing typed → auto AUD / km",
  eq(postalUnitsDecision({ ...base, zipcode: "2000", country: "AU" }), { action: "auto", currency: "AUD", mileage_unit: "km" }));
check("NZ + 1010, numbers typed → ask NZD / km",
  eq(postalUnitsDecision({ ...base, zipcode: "1010", country: "NZ", hasNumbers: true }), { action: "ask", currency: "NZD", mileage_unit: "km" }));
check("US zip is not affected by an AU country", postalUnitsDecision({ ...base, zipcode: "90210", country: "AU", hasNumbers: true }).action === "none");

// ---------- /browse 客户端:先国家再距离(lib/car-filters.ts) ----------
function car(id: string, lat: number | null, lng: number | null, location: string): DbCar {
  return {
    id, lat, lng, location, location_zh: "", price: 10000, mileage: 1000, year: 2020, make: "Toyota", model: "Camry",
    created_at: new Date().toISOString(), seller_id: "s",
  } as unknown as DbCar;
}
const cars = [
  car("US1", 34.05, -118.24, "Los Angeles, CA 90012"),
  car("CA1", 43.65, -79.38, "Toronto, ON M5V 3L9"),
  car("AU1", -33.87, 151.21, "Sydney, NSW 2000, Australia"),
  car("AU2", -37.81, 144.96, "Melbourne, VIC 3000, Australia"),
  car("NZ1", -36.85, 174.76, "Auckland, Auckland 1010, New Zealand"),
];
const run = (filters: Partial<typeof INITIAL_FILTERS>, userCoords: { lat: number; lng: number } | null = null) =>
  applyCarFilters(cars, { ...INITIAL_FILTERS, ...filters }, { userCoords, distances: buildDistances(cars, userCoords) }).cars.map((c) => c.id);
check("AU postcode, distance unlimited → all AU", eq(run({ location: "2000", country: "AU", maxDistance: "" }), ["AU1", "AU2"]), run({ location: "2000", country: "AU", maxDistance: "" }));
check("4 digits without country → AU (default)", eq(run({ location: "2000", maxDistance: "" }), ["AU1", "AU2"]));
check("NZ postcode → NZ only", eq(run({ location: "1010", country: "NZ", maxDistance: "" }), ["NZ1"]));
check("AU postcode + 50 mi around Sydney → Sydney only", eq(run({ location: "2000", country: "AU", maxDistance: "50" }, { lat: -33.87, lng: 151.21 }), ["AU1"]));
check("country filter has no 'nothing found' fallback", eq(run({ location: "1010", country: "NZ", maxDistance: "50" }, { lat: -33.87, lng: 151.21 }), []));
check("US zip → US only", eq(run({ location: "90012", maxDistance: "" }), ["US1"]));
check("CA postal → CA only", eq(run({ location: "M5V 3L9", maxDistance: "" }), ["CA1"]));
check("city name still substring-matches", eq(run({ location: "Melbourne", maxDistance: "" }), ["AU2"]));
check("postalFilter on filters", eq(postalFilter({ location: "1010", country: "NZ" }), { code: "1010", country: "NZ" }) && postalFilter({ location: "Irvine", country: "" }) === null);
const qs = filtersToQuery({ ...INITIAL_FILTERS, location: "1010", country: "NZ" }, "newest");
check("country round-trips through the URL", qs.includes("country=NZ") && filtersFromParams(new URLSearchParams(qs)).country === "NZ", qs);

console.log(fail === 0 ? `all ${total} passed` : `${fail}/${total} failed`);
process.exit(fail === 0 ? 0 : 1);
