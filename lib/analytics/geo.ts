// IP 粗定位的展示工具(国家旗帜 / 本地化国家名 / "城市, 州" 标签)。
// 数据来源:Vercel 边缘 x-vercel-ip-* 头(国家 ISO 代码、ISO 3166-2 州省代码、英文城市名)。

import { dateLocale, type Locale } from "@/lib/i18n";

export interface GeoParts {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

/** "US" → 🇺🇸;非法代码返回空串 */
export function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => base + c.charCodeAt(0) - 65)
  );
}

const nameCache = new Map<string, Intl.DisplayNames | null>();

/** "US" → 「美国」/「United States」;取不到本地化名时返回代码本身 */
export function countryName(code: string | null | undefined, locale: Locale): string {
  if (!code) return "";
  let dn = nameCache.get(locale);
  if (dn === undefined) {
    try {
      dn = new Intl.DisplayNames([dateLocale(locale)], { type: "region" });
    } catch {
      dn = null;
    }
    nameCache.set(locale, dn);
  }
  try {
    return dn?.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/**
 * 地区标签:有城市/州时 "Flushing, NY",否则退回本地化国家名;全空返回 ""。
 * withCountry:在城市/州后面再补国家名("Flushing, NY · 美国")。
 */
export function formatGeo(
  geo: GeoParts | null | undefined,
  locale: Locale,
  opts: { withCountry?: boolean } = {}
): string {
  if (!geo) return "";
  const local = [geo.city, geo.region].filter(Boolean).join(", ");
  const country = countryName(geo.country, locale);
  if (!local) return country;
  return opts.withCountry && country ? `${local} · ${country}` : local;
}

/** 带旗帜的完整标签:"🇺🇸 Flushing, NY" */
export function formatGeoWithFlag(geo: GeoParts | null | undefined, locale: Locale): string {
  const label = formatGeo(geo, locale);
  const flag = countryFlag(geo?.country);
  return [flag, label].filter(Boolean).join(" ");
}
