// 市场国家 / 邮编(纯模块,server / client / Bun 通用,不 import 任何 app 代码)。
//
// 支持四个市场:美国 US(5 位 zip,ZIP+4 只取前 5 位)、加拿大 CA(A1A 1A1)、澳大利亚 AU / 新西兰 NZ(都是 4 位数字)。
// 澳 / 新邮编格式相同,光看邮编分不出国家:发布页让卖家显式选国家,/browse 带 country 参数,地理编码按国家查。
//
// 库里没有 cars.country 列:车源国家一律「读时推断」(deriveCountry / carCountry),优先级:
//   ① 坐标(geocode 出来的 lat / lng,简单外接框;澳 / 新互不重叠,美 / 加只在边境一带重叠)
//   ② location 文本里的国家名 / 州省代码(发布页给澳 / 新车源的 location 末尾补「, Australia」/「, New Zealand」)
//   ③ 邮编格式(4 位只能说明是澳或新)
// 都推不出来时 carCountry 按美国(既有车源都是美国的)。
// supabase/browse-cars.sql 的 browse_coord_countries / browse_text_countries / browse_car_country /
// browse_postal_countries 是同一套规则的 SQL 版(/browse 服务端按国家筛选用),改规则时两边一起改;
// scripts/i18n-db-test.ts 的 browse 套件逐样本核对两边一致。

export const COUNTRIES = ["US", "CA", "AU", "NZ"] as const;
export type Country = (typeof COUNTRIES)[number];

export const DEFAULT_COUNTRY: Country = "US";

/** 4 位邮编没指明国家时按澳大利亚(两国里市场更大的一个);需要准确时调用方应传显式国家 */
export const ANZ_DEFAULT_COUNTRY: Country = "AU";

/** 国家名(中文 key,界面用 t() 翻译) */
export const COUNTRY_LABELS: Record<Country, string> = { US: "美国", CA: "加拿大", AU: "澳大利亚", NZ: "新西兰" };

/** 英文国名:澳 / 新车源写进 location 末尾,读时据此推断国家 */
export const COUNTRY_NAMES_EN: Record<Country, string> = {
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
};

export function isCountry(v: unknown): v is Country {
  return typeof v === "string" && (COUNTRIES as readonly string[]).includes(v);
}

/** 大小写 / 首尾空格宽松;不认识返回 null */
export function normalizeCountry(v: unknown): Country | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase();
  return isCountry(u) ? u : null;
}

// ===== 邮编格式 =====

/** 美国 zip:5 位,可带 ZIP+4 */
export const US_ZIP_RE = /^\d{5}(?:-\d{4})?$/;
/** 加拿大邮编(A1A 1A1,中间空格 / 连字符可省) */
export const CA_POSTAL_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
/** 澳大利亚 / 新西兰邮编:4 位数字(两国格式相同) */
export const ANZ_POSTCODE_RE = /^\d{4}$/;

export function isCanadianPostalCode(s: string | null | undefined): boolean {
  return !!s && CA_POSTAL_RE.test(s.trim());
}

/** 统一成大写「A1A 1A1」;不是加拿大邮编时原样返回(去首尾空格) */
export function normalizeCanadianPostalCode(s: string): string {
  const v = s.trim();
  if (!CA_POSTAL_RE.test(v)) return v;
  const compact = v.replace(/[ -]/g, "").toUpperCase();
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

/** 这串邮编在哪些国家的格式下成立:5 位 → [US],A1A 1A1 → [CA],4 位 → [AU, NZ],其他(没填完 / 乱填)→ [] */
export function postalCountries(code: string | null | undefined): Country[] {
  const v = (code || "").trim();
  if (US_ZIP_RE.test(v)) return ["US"];
  if (CA_POSTAL_RE.test(v)) return ["CA"];
  if (ANZ_POSTCODE_RE.test(v)) return ["AU", "NZ"];
  return [];
}

/** 是否是四国之一的完整邮编 */
export function isPostalCode(code: string | null | undefined): boolean {
  return postalCountries(code).length > 0;
}

/** 是否是该国的完整邮编(发布 / 编辑页校验:选了澳大利亚就只认 4 位) */
export function isPostalCodeFor(code: string | null | undefined, country: string | null | undefined): boolean {
  const c = normalizeCountry(country);
  return !!c && postalCountries(code).includes(c);
}

/** 格式是否本身就分不出国家(4 位:澳 / 新) */
export function isAmbiguousPostalCode(code: string | null | undefined): boolean {
  return postalCountries(code).length > 1;
}

/** 规范写法:加拿大「A1A 1A1」、ZIP+4 只留前 5 位,其他去首尾空格 */
export function normalizePostalCode(code: string): string {
  const v = code.trim();
  if (CA_POSTAL_RE.test(v)) return normalizeCanadianPostalCode(v);
  if (US_ZIP_RE.test(v)) return v.slice(0, 5);
  return v;
}

/**
 * 邮编属于哪个国家:格式唯一时就是它;4 位(澳 / 新)按 preferences 里第一个落在候选里的国家
 * (显式选择、IP 国家、兜底……依次传);都不在候选里返回 null。邮编不完整也返回 null。
 */
export function resolvePostalCountry(
  code: string | null | undefined,
  ...preferences: (string | null | undefined)[]
): Country | null {
  const cands = postalCountries(code);
  if (cands.length === 1) return cands[0];
  for (const p of preferences) {
    const c = normalizeCountry(p);
    if (c && cands.includes(c)) return c;
  }
  return null;
}

/**
 * 邮编 → 地理编码参数(规范写法 + 国家)。4 位邮编按 preferred,没给 / 不是澳新时按 ANZ_DEFAULT_COUNTRY;
 * 不是完整邮编返回 null。
 */
export function postalQuery(
  code: string | null | undefined,
  preferred?: string | null,
): { code: string; country: Country } | null {
  const country = resolvePostalCountry(code, preferred, ANZ_DEFAULT_COUNTRY);
  if (!country || !code) return null;
  return { code: normalizePostalCode(code), country };
}

/**
 * 位置筛选(/browse 的 location + country 参数)是邮编时的「邮编 + 国家」:美国 zip / 加拿大邮编按格式定国家,
 * 4 位(澳 / 新共用)按 country,没给按 ANZ_DEFAULT_COUNTRY。不是邮编(城市名 / 空)返回 null。
 */
export function postalFromFilter(
  location: string | null | undefined,
  country?: string | null,
): { code: string; country: Country } | null {
  return isPostalCode(location) ? postalQuery(location, country) : null;
}

/**
 * 从车源 location 里取邮编(编辑页回填用)。发布页拼的是「详细地址, 城市, 州 邮编[, 国家]」,邮编在最后;
 * 门牌号也常是 5 位数(加拿大 Markham / Richmond Hill 一带很多),所以取「最后一个」像邮编的片段,
 * 不能先找 5 位数字。ZIP+4 只取前 5 位;加拿大邮编统一成「A1A 1A1」。
 * country 为澳 / 新时只认 4 位数字(门牌号也可能是 4 位,同样取最后一个);其他情况不认 4 位
 * (美国地址没写 zip 时门牌号会被误认成邮编)。取不到返回 ""。
 */
export function extractPostalCode(location: string | null | undefined, country?: string | null): string {
  const c = normalizeCountry(country);
  let last = "";
  if (c === "AU" || c === "NZ") {
    for (const m of (location || "").matchAll(/(?:^|[^A-Za-z0-9])(\d{4})(?![A-Za-z0-9])/g)) last = m[1];
    return last;
  }
  const re = /\b(\d{5})(?:-\d{4})?\b|\b([A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d)\b/g;
  for (const m of (location || "").matchAll(re)) last = m[1] || normalizeCanadianPostalCode(m[2]);
  return last;
}

// ===== 输入框(发布页 / 编辑页 / 位置筛选共用) =====

/**
 * 邮编输入框逐键清洗(转大写):字母开头只可能是加拿大邮编(留字母数字 / 空格 / 连字符,最多 7 位);
 * 否则只留数字,最多 5 位 —— 选的是澳 / 新也放到 5 位,第 5 位一出现就是美国 zip(调用方据此切国家),
 * 不能先截成 4 位,否则在澳 / 新模式下粘贴「90210」会悄悄变成合法的澳 / 新邮编「9021」。
 */
export function sanitizePostalInput(raw: string): { value: string; letters: boolean } {
  const v = raw.toUpperCase();
  const letters = /^[A-Z]/.test(v);
  return { value: letters ? v.replace(/[^A-Z0-9 -]/g, "").slice(0, 7) : v.replace(/\D/g, "").slice(0, 5), letters };
}

/** 邮编输入框 maxLength:加拿大 / 已经以字母开头 → 7,其余 5(澳 / 新也是 5,见 sanitizePostalInput) */
export function postalInputMaxLength(country: string | null | undefined, value: string): number {
  return normalizeCountry(country) === "CA" || /^[A-Za-z]/.test(value) ? 7 : 5;
}

/** 州 / 省 / 地区输入框的占位符(中文 key,界面用 t() 翻译) */
export const REGION_PLACEHOLDERS: Record<Country, string> = {
  US: "State 如 CA",
  CA: "省 如 ON",
  AU: "州 如 NSW",
  NZ: "大区 如 Auckland",
};

/** 州 / 省 / 地区输入框 maxLength:美 / 加 / 澳是 2–3 位缩写;新西兰大区没有通行缩写,写全称 */
export function regionInputMaxLength(country: string | null | undefined): number {
  return normalizeCountry(country) === "NZ" ? 30 : 3;
}

/**
 * 州 / 省 / 地区输入逐键清洗:新西兰保留原样(大区全称「Canterbury」,不能转成全大写);
 * 其余国家 3 位以内的缩写转大写,更长的值(地理编码回填了没收录缩写的全称)原样保留。
 */
export function normalizeRegionInput(value: string, country: string | null | undefined): string {
  const v = value.slice(0, 30);
  if (normalizeCountry(country) === "NZ") return v;
  return v.trim().length <= 3 ? v.toUpperCase() : v;
}

/** 澳 / 新车源的 location 末尾补英文国名(已经写了就不重复),读时才推断得出国家;美 / 加原样返回 */
export function withCountrySuffix(location: string, country: Country): string {
  if (country !== "AU" && country !== "NZ") return location;
  const name = COUNTRY_NAMES_EN[country];
  if (!location.trim()) return name;
  return location.toLowerCase().includes(name.toLowerCase()) ? location : `${location}, ${name}`;
}

// ===== 读时推断车源国家 =====

function between(v: number, lo: number, hi: number): boolean {
  return v >= lo && v <= hi;
}

/**
 * 坐标落在哪些国家的外接框里(顺序 US, CA, AU, NZ)。没有坐标(null / 0,与距离计算同一口径)→ []。
 * 美国本土框和加拿大框在边境一带重叠;西经 123.3°–95.15° 之间边境就是北纬 49°,按它切开,
 * 其余重叠区(五大湖 / 魁北克 / 缅因、阿拉斯加狭长地带)返回 [US, CA],交给 location 文本判断。
 */
export function countriesFromCoords(lat: number | null | undefined, lng: number | null | undefined): Country[] {
  if (!lat || !lng || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const band49 = between(lng, -123.3, -95.15);
  const out: Country[] = [];
  if (
    (between(lat, 24.3, 49.4) && between(lng, -125, -66.9) && !(band49 && lat >= 49)) ||
    (between(lat, 51, 71.5) && between(lng, -180, -129.9)) ||
    (between(lat, 18.5, 22.5) && between(lng, -161, -154.5))
  ) {
    out.push("US");
  }
  if (between(lat, 41.6, 83.2) && between(lng, -141, -52.6) && !(band49 && lat < 49)) out.push("CA");
  if (between(lat, -44, -9) && between(lng, 112, 154)) out.push("AU");
  if (between(lat, -47.5, -34) && between(lng, 166, 179)) out.push("NZ");
  return out;
}

// 文本规则(与 browse-cars.sql 的 browse_text_countries 逐条对应;两侧都用显式的非字母数字边界,
// 不用 \b —— Postgres 在 UTF-8 下会把汉字当成单词字符,和 JS 的 \b 不一致)
const NB = "(?:^|[^A-Za-z0-9])";
const NA = "(?:[^A-Za-z0-9]|$)";
const US_STATES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";

/** 文本规则表(按顺序命中即止);导出给 selftest / db-test 做两侧对照 */
export const TEXT_COUNTRY_RULES: { countries: Country[]; re: RegExp }[] = [
  // ① 国家名(含中文)
  { countries: ["NZ"], re: /new zealand|aotearoa|新西兰|新西蘭|紐西蘭|纽西兰/i },
  { countries: ["NZ"], re: new RegExp(`${NB}NZ${NA}`) },
  { countries: ["AU"], re: /australia|澳大利亚|澳大利亞|澳洲/i },
  // ② 澳洲州 / 领地缩写里不和美 / 加撞车的几个(WA / SA / NT 有歧义,不认)
  { countries: ["AU"], re: new RegExp(`${NB}(?:NSW|VIC|QLD|TAS|ACT)${NA}`) },
  { countries: ["CA"], re: /canada|加拿大/i },
  // 逗号后的加拿大省 / 地区代码(NT 和澳洲北领地撞车,不认)
  { countries: ["CA"], re: new RegExp(`,\\s*(?:AB|BC|MB|NB|NL|NS|ON|PE|QC|SK|YT|NU)${NA}`) },
  // ③ 加拿大邮编
  { countries: ["CA"], re: new RegExp(`${NB}[A-Za-z][0-9][A-Za-z][ -]?[0-9][A-Za-z][0-9]${NA}`) },
  { countries: ["US"], re: /united states|美国|美國/i },
  { countries: ["US"], re: new RegExp(`${NB}USA${NA}`) },
  // 逗号后的美国州代码(「City, ST」)/ 5 位 zip
  { countries: ["US"], re: new RegExp(`,\\s*(?:${US_STATES})${NA}`) },
  { countries: ["US"], re: new RegExp(`${NB}[0-9]{5}${NA}`) },
  // 末尾的 4 位数字:澳 / 新邮编(只认末尾,美国地址的 4 位门牌号在前面)
  { countries: ["AU", "NZ"], re: new RegExp(`${NB}[0-9]{4}\\s*$`) },
];

/** location 文本推断出的候选国家(按规则顺序第一条命中的);推不出 → [] */
export function countriesFromText(text: string | null | undefined): Country[] {
  const v = text || "";
  if (!v.trim()) return [];
  for (const rule of TEXT_COUNTRY_RULES) {
    if (rule.re.test(v)) return [...rule.countries];
  }
  return [];
}

export interface CountrySignals {
  lat?: number | null;
  lng?: number | null;
  location?: string | null;
  location_zh?: string | null;
}

/**
 * 读时推断车源国家:坐标唯一 → 坐标;坐标在美加重叠区 → 文本里落在候选内的国家,否则候选第一个;
 * 没有坐标 → 文本(先 location,推不出再 location_zh);都推不出 → null。
 */
export function deriveCountry(car: CountrySignals | null | undefined): Country | null {
  if (!car) return null;
  const cc = countriesFromCoords(car.lat, car.lng);
  if (cc.length === 1) return cc[0];
  const fromEn = countriesFromText(car.location);
  const tc = fromEn.length > 0 ? fromEn : countriesFromText(car.location_zh);
  if (cc.length > 1) return tc.find((c) => cc.includes(c)) ?? cc[0];
  return tc[0] ?? null;
}

/** 车源国家(推不出按美国,既有车源都是美国的);/browse 国家筛选、API v1 的派生 country 字段用 */
export function carCountry(car: CountrySignals | null | undefined): Country {
  return deriveCountry(car) ?? DEFAULT_COUNTRY;
}
