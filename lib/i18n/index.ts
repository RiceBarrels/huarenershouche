// i18n 核心(纯函数,无 React 依赖,server/client 都可 import)。
//
// 方案:中文原文即翻译 key。t("发布车辆") 在 zh 下原样返回,在 en 下查
// lib/i18n/en.ts 词典;查不到时回退中文原文,漏翻不会炸页面。
// 带变量的文案用 {name} 占位:t("共 {n} 辆", { n })。
//
// 路由:网页端为路径级 i18n(/zh/... 与 /en/...),内部链接经
// localizePath() 自动补当前语言前缀;Capacitor 原生端切换语言不跳转,
// 由 I18nProvider 的原生分支直接替换文案。

export type Locale = "zh" | "en" | "ko";

export const LOCALES: Locale[] = ["zh", "en", "ko"];
export const LOCALE_STORAGE_KEY = "clc_locale";

// 内容惰性翻译语言:首次有人用该语言浏览时经 /api/translate-listing
// 翻译并缓存进 cars.other_i18n。zh/en 是兜底——正常车源有双列,
// 只有对应列缺失或语言不对(历史翻译管线故障的脏数据)才会触发。
export const LAZY_CONTENT_LOCALES: Locale[] = ["zh", "en", "ko"];

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
    if (/^zh\b/i.test(lang)) return "zh";
    if (/^en\b/i.test(lang)) return "en";
    if (/^ko\b/i.test(lang)) return "ko";
  }
  return "zh";
}

const LOCALE_PREFIX_RE = /^\/(zh|en|ko)(?=\/|$|\?|#)/;

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

// ---- 数据层双语字段(cars.title / cars.title_zh 等)按语言取值 ----

/**
 * 用户生成内容(帖子/评论)是否需要为当前语言做 AI 翻译:
 * zh 界面不翻;en 界面只翻含中日韩汉字的;其他语言(ko)只要原文不是该语言就翻。
 */
export function needsContentTranslation(text: string, locale: Locale): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // 先检测源语言,再决定是否翻到界面语言:
  // zh 界面看英文/韩文帖也要翻(原文无汉字且确有字母/谚文才翻,纯数字表情不翻)
  if (locale === "zh") return !/[一-鿿]/.test(trimmed) && /[A-Za-z가-힣]/.test(trimmed);
  if (locale === "en") return /[一-鿿]/.test(trimmed);
  if (locale === "ko") return !/[가-힣]/.test(trimmed);
  // 未来新增语言:默认都翻(无法检测目标语言时宁可多翻,结果有缓存)
  return true;
}

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
  if (locale !== "zh" && /[一-鿿]/.test(localized)) return make;
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
  if (locale !== "zh" && /[一-鿿]/.test(localized)) return make;
  return localized;
}

/** 品牌 logo 图片按语言切换:zh 中文字样、en「CLC」、ko「또와카」(public/ 下同风格生成) */
export function brandLogoSrc(locale: Locale): string {
  if (locale === "en") return "/logo-en.png";
  if (locale === "ko") return "/logo-ko.png";
  return "/logo.png";
}

/** cars.other_i18n 列的形状:{ ko: { title, description }, ... } 按需翻译缓存 */
export type CarOtherI18n = Record<
  string,
  { title?: string | null; description?: string | null } | undefined
> | null;

interface BilingualCarText {
  title?: string | null;
  title_zh?: string | null;
  description?: string | null;
  description_zh?: string | null;
  other_i18n?: CarOtherI18n;
}

/** 车辆标题:zh 用 title_zh,en 用 title,小语种查 other_i18n 缓存;缺失时逐级回退。
 *  en 也先查 other_i18n.en——只有英文双列实际是中文(脏数据)时才会有这份兜底翻译 */
export function carTitle(car: BilingualCarText, locale: Locale): string {
  if (locale === "zh") return car.other_i18n?.zh?.title || car.title_zh || car.title || "";
  if (locale === "en") return car.other_i18n?.en?.title || car.title || car.title_zh || "";
  return car.other_i18n?.[locale]?.title || car.title || car.title_zh || "";
}

/** 车辆描述:同 carTitle 的回退规则 */
export function carDescription(car: BilingualCarText, locale: Locale): string {
  if (locale === "zh")
    return car.other_i18n?.zh?.description || car.description_zh || car.description || "";
  if (locale === "en")
    return car.other_i18n?.en?.description || car.description || car.description_zh || "";
  return car.other_i18n?.[locale]?.description || car.description || car.description_zh || "";
}

/** 车辆位置:zh 用 location_zh(法拉盛, NY),其他语言用英文 location(Flushing, NY) */
export function carLocation(
  car: { location?: string | null; location_zh?: string | null },
  locale: Locale
): string {
  return (locale === "zh" ? car.location_zh || car.location : car.location || car.location_zh) || "";
}
