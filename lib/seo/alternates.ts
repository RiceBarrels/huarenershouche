// 内容页(车源、帖子、问答……)的 canonical / hreflang / og:locale:alternate。
// 与 sitemap 分片同一口径(spec I12):只有内容已完整本地化的语言(available)才声明 hreflang;
// 当前语言未本地化时 canonical 指向 x-default(原文语言)页面,不 noindex,避免收录状态来回翻转。
// 全站固定页面仍用 lib/seo-pages.ts 的 localeAlternates。

import type { Locale } from "@/lib/i18n";
import { ogLocale } from "@/lib/i18n/content-langs";
import { SITE_URL } from "@/lib/seo-pages";

/** hreflang 代码:中文按现有站点与 sitemap 约定标 zh-CN,其余即语言代码 */
const hreflang = (locale: Locale) => (locale === "zh" ? "zh-CN" : locale);

/** path 不带语言前缀,如 "/car/<id>";"/" 表示语言首页 */
export function contentAlternates(
  locale: Locale,
  path: string,
  available: readonly Locale[],
  xDefault: Locale,
): { canonical: string; languages: Record<string, string> } {
  const href = (l: Locale) => `${SITE_URL}/${l}${path === "/" ? "" : path}`;
  const languages: Record<string, string> = {};
  for (const l of available) languages[hreflang(l)] = href(l);
  if (available.length > 0) languages["x-default"] = href(xDefault);
  return {
    canonical: available.includes(locale) ? href(locale) : href(xDefault),
    languages,
  };
}

/** openGraph.alternateLocale:其他已本地化语言的 og:locale */
export function ogAlternates(locale: Locale, available: readonly Locale[]): string[] {
  return available.filter((l) => l !== locale).map((l) => ogLocale(l));
}
