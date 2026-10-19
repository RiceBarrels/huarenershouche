// i18n 核心(纯函数,无 React 依赖,server/client 都可 import)。
//
// 方案:中文原文即翻译 key。t("发布车辆") 在 zh 下原样返回,其他语言查
// lib/i18n/<locale>.ts 词典;查不到先回退英文,再回退中文原文,漏翻不会炸页面。
// 带变量的文案用 {name} 占位:t("共 {n} 辆", { n })。
//
// 路由:网页端为路径级 i18n(/zh/... 与 /en/...),内部链接经
// localizePath() 自动补当前语言前缀;Capacitor 原生端切换语言不跳转,
// 由 I18nProvider 的原生分支直接替换文案。

export type Locale = "zh" | "zh-hant" | "en" | "ko" | "ja" | "es" | "fr";

// zh-hant(繁體中文)只是界面语言:路径 /zh-hant/...,UI 文案走繁体词典;数据库里没有这个语言,
// 内容(译文 / 可用语言 / sitemap 计数)一律按 zh 取,见 dbLocale()。
export const LOCALES: Locale[] = ["zh", "zh-hant", "en", "ko", "ja", "es", "fr"];

/** 数据库认识的语言(i18n_bundle / sitemap_* / topic_get / browse_facets / API 的 p_locale) */
export type DbLocale = Exclude<Locale, "zh-hant">;
export const DB_LOCALES: DbLocale[] = ["zh", "en", "ko", "ja", "es", "fr"];

/** 界面语言 → 传给数据库的语言:zh-hant → zh(内容暂按简体中文版本显示),其余原样。
 *  所有把 locale 传给 RPC / 查询的地方都必须经过它 */
export function dbLocale(locale: Locale): DbLocale {
  return locale === "zh-hant" ? "zh" : locale;
}

/** 中文界面(简体或繁体):品牌中文名、title_zh、location_zh 等「中文数据列」的取舍用 */
export function isZhLocale(locale: string): locale is "zh" | "zh-hant" {
  return locale === "zh" || locale === "zh-hant";
}

/** 数据库返回的可用语言(al / sitemap locales)→ 站点语言:有 zh 就同时有 zh-hant(紧随其后) */
export function withZhHant(locales: readonly string[]): Locale[] {
  const out: Locale[] = [];
  for (const l of locales) {
    if (!(DB_LOCALES as string[]).includes(l)) continue;
    out.push(l as Locale);
    if (l === "zh") out.push("zh-hant");
  }
  return out;
}
export const LOCALE_STORAGE_KEY = "clc_locale";

/**
 * 用户主动选语言时同时写同名 cookie:/ 的服务端重定向(vercel.json / next.config)据此
 * 不再按 Accept-Language 把繁体浏览器送去 /zh-hant,选了繁体的回访用户则直接进 /zh-hant。
 * 只在浏览器里生效;写不了就算了。
 */
export function rememberLocaleCookie(locale: Locale): void {
  try {
    document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // 非浏览器环境 / cookie 被禁用
  }
}

// 构建期实际生成的语言树:静态导出(Capacitor)只出 zh 一棵树——
// 原生端显示语言跟随系统、由 t() 纯客户端切换,不需要 6 份页面(体积 1/6);
// 网页端(Vercel)仍按全部语言预渲染,保证 SEO。
export const BUILD_LOCALES: Locale[] =
  process.env.NEXT_PUBLIC_OUTPUT === "static" ? ["zh"] : LOCALES;

/** 界面语言 → Intl/toLocaleDateString 用的 BCP 47 区域标签 */
export function dateLocale(locale: Locale): string {
  return (
    { zh: "zh-CN", "zh-hant": "zh-HK", en: "en-US", ko: "ko-KR", ja: "ja-JP", es: "es-US", fr: "fr-CA" } as const
  )[locale];
}

/** {name} 占位符插值;缺失的变量原样保留,便于发现问题 */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

/** 浏览器语言 → 默认站点语言(仅首次访问、无持久化偏好时使用) */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    // 繁体:zh-TW / zh-HK / zh-MO / zh-Hant(-*);其余中文(zh-CN / zh-SG / zh-Hans / zh)→ 简体
    if (/^zh-(tw|hk|mo|hant)\b/i.test(lang)) return "zh-hant";
    if (/^zh\b/i.test(lang)) return "zh";
    if (/^en\b/i.test(lang)) return "en";
    if (/^ko\b/i.test(lang)) return "ko";
    if (/^ja\b/i.test(lang)) return "ja";
    if (/^es\b/i.test(lang)) return "es";
    if (/^fr\b/i.test(lang)) return "fr";
  }
  return "zh";
}

// zh-hant 必须排在 zh 前面(否则 "/zh-hant" 会被当成 zh 前缀 + 残留 "-hant")
const LOCALE_PREFIX_RE = /^\/(zh-hant|zh|en|ko|ja|es|fr)(?=\/|$|\?|#)/;

/** 去掉路径上的语言前缀:"/en/browse" → "/browse","/zh" → "/" */
export function stripLocale(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PREFIX_RE, "");
  return stripped === "" ? "/" : stripped;
}

/** 从路径读语言前缀,没有则返回 null(Capacitor 入口页等场景) */
export function localeFromPath(pathname: string): Locale | null {
  const m = LOCALE_PREFIX_RE.exec(pathname);
  return (m?.[1] as Locale) ?? null;
}

/**
 * 给站内路径补语言前缀:localizePath("/browse?q=x", "en") → "/en/browse?q=x"。
 * 外链/锚点/相对路径/已带前缀的路径/静态资源原样返回。
 */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/")) return path; // 外链、mailto、#锚点、相对路径
  if (LOCALE_PREFIX_RE.test(path)) return path; // 已带前缀
  if (path.startsWith("/api/") || path.startsWith("/_next/")) return path;
  // 带扩展名的静态资源(/logo.png、/sitemap.xml)不加前缀
  const firstSeg = path.split(/[?#]/)[0];
  if (/\.[a-z0-9]+$/i.test(firstSeg)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

// ---- 数据层字段(品牌名、cars.title / cars.title_zh 等)按语言取值 ----

type TranslateLikeFn = (text: string, vars?: Record<string, string | number>) => string;

/**
 * 品牌完整标签:zh「宝马 BMW」、ko「도요타 Toyota」、en「Toyota」。
 * zhName 传 MAKES_ZH[make];本地化名与英文名相同(BMW 等)或词典缺失回退中文时,只显示英文名。
 */
export function brandLabel(
  make: string,
  zhName: string | undefined,
  t: TranslateLikeFn,
  locale: Locale
): string {
  if (!zhName || locale === "en") return make;
  const localized = t(zhName);
  if (localized.toLowerCase() === make.toLowerCase()) return make;
  if (!isZhLocale(locale) && /[一-鿿]/.test(localized)) return make;
  return `${localized} ${make}`;
}

/** 品牌短标签(chip/宫格):zh 中文名、ko 韩文名、en 英文名 */
export function brandShortLabel(
  make: string,
  zhName: string | undefined,
  t: TranslateLikeFn,
  locale: Locale
): string {
  if (!zhName || locale === "en") return make;
  const localized = t(zhName);
  if (!isZhLocale(locale) && /[一-鿿]/.test(localized)) return make;
  return localized;
}

/** 品牌 logo 图片按语言切换:zh 中文字样、en「CLC」、ko「또와카」(public/ 下同风格生成);
 *  其余语言(ja/es/fr)沿用英文版 logo */
export function brandLogoSrc(locale: Locale): string {
  if (isZhLocale(locale)) return "/logo.png";
  if (locale === "ko") return "/logo-ko.png";
  return "/logo-en.png";
}

/** 车辆标题:zh 用 title_zh,其他语言用 title(都是确定性标题,见 lib/i18n/car-title.ts buildCarTitles);
 *  缺失时互相回退。描述等用户原文的译文走 lib/i18n/content(i18n_bundle),不在这里 */
export function carTitle(car: { title?: string | null; title_zh?: string | null }, locale: Locale): string {
  return isZhLocale(locale) ? car.title_zh || car.title || "" : car.title || car.title_zh || "";
}

/** 车辆位置:zh 用 location_zh(法拉盛, NY),其他语言用英文 location(Flushing, NY) */
export function carLocation(
  car: { location?: string | null; location_zh?: string | null },
  locale: Locale
): string {
  return (isZhLocale(locale) ? car.location_zh || car.location : car.location || car.location_zh) || "";
}
