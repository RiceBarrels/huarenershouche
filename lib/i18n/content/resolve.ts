// 内容翻译解析器 —— 纯函数,server / client 共用(SSR 正文、metadata、JSON-LD、hreflang 与客户端
// useLocalized 走同一套规则,保证首屏 HTML 与水合结果一致)。不得 import 服务端模块。
//
// 规则(spec 4.4):
// - 字段显示译文 ⇔ row.s === "ok" 且 row.f[字段] 非空;否则显示原文(逐字),lang 取该字段检测出的语言。
// - sourceLang(「已从 X 翻译」标签)= 已翻译字段的原文语言(fl);不一致为 "mixed";取不到用 row.sl。
// - sourceLocale(x-default / canonical 依据)= row.pl(原文主语言,与 sitemap 一致);
//   只有 bundle 行缺失或尚未检测时,才用本地 detectFields 兜底。
// - available = row.al;未检测时:无正文 → 全部 6 种语言;否则 [原文主语言] ∪ {当前语言(若已有译文)}。

import { carTitle, dbLocale, LOCALES, withZhHant, type Locale } from "@/lib/i18n";
import { localizeCarfaxSummary } from "@/lib/i18n/carfax";
import { contentLangAttr, htmlLang, isSiteLocale } from "@/lib/i18n/content-langs";
import { detectFields } from "@/lib/i18n/detect";
import { extractHashtags, normTag } from "@/lib/i18n/hashtags";
import type { DbCar, PublicCar } from "@/lib/types";
import { toHantName } from "@/lib/i18n/zh-hant-names";
import { hantLangAttr, serverHantFn, type HantFn } from "./hant";
import type { BundleRow, BundleState, FeatureLabel, TFn, TopicLabel } from "./types";

// 与 SQL i18n.sync_post_tags 一致:tags[] + 标题/正文内联 #话题,每帖最多 12 个
const MAX_POST_TOPICS = 12;

export interface Localized<F extends string> {
  /** 默认显示的文本:有译文用译文,否则原文 */
  text: Record<F, string>;
  /** 原文(逐字;空字段为 "") */
  original: Record<F, string>;
  /** text 对应的 lang 属性(译文 = 页面语言;原文 = 检测语言,未知为 undefined) */
  textLang: Record<F, string | undefined>;
  originalLang: Record<F, string | undefined>;
  /** 「已从 X 翻译」标签用的语言;"mixed" = 各字段原文语言不同 */
  sourceLang: string | null;
  /** 至少一个字段显示的是译文 */
  translated: boolean;
  /** 当前语言的 bundle 状态;没有 bundle 行为 "none" */
  state: BundleState | "none";
  /** 内容完整本地化的语言(hreflang / sitemap / canonical 同一口径) */
  available: Locale[];
  /** 原文主语言(站点语言之一,否则 null) */
  sourceLocale: Locale | null;
}

const siteLocale = (lang: string | null | undefined): Locale | null =>
  isSiteLocale(lang) ? lang : null;

/**
 * zh-hant:库里只有 zh(简体)的原文 / 译文,显示前整句转繁体(原文与译文都转,lang 标 zh-Hant)。
 * 简→繁不算翻译:中文原文在繁體界面下 translated 仍为 false,不出「已从中文翻译」。
 * hant 不传时取 RSC 侧注册的转换器(客户端组件必须经 useLocalized 显式传入,保证水合一致)。
 */
export function localize<F extends string>(
  original: Record<F, string | null | undefined>,
  row: BundleRow | undefined,
  locale: Locale,
  hant?: HantFn | null,
): Localized<F> {
  const result = localizeRaw(original, row, locale);
  if (locale !== "zh-hant") return result;
  const fn = hant === undefined ? serverHantFn() : hant;
  return fn ? toHant(result, fn) : result;
}

function toHant<F extends string>(v: Localized<F>, fn: HantFn): Localized<F> {
  const text = {} as Record<F, string>;
  const original = {} as Record<F, string>;
  const textLang = {} as Record<F, string | undefined>;
  const originalLang = {} as Record<F, string | undefined>;
  for (const field of Object.keys(v.text) as F[]) {
    text[field] = fn(v.text[field]);
    original[field] = fn(v.original[field]);
    textLang[field] = text[field] !== v.text[field] ? hantLangAttr(v.textLang[field]) : v.textLang[field];
    originalLang[field] =
      original[field] !== v.original[field] ? hantLangAttr(v.originalLang[field]) : v.originalLang[field];
  }
  return { ...v, text, original, textLang, originalLang };
}

function localizeRaw<F extends string>(
  original: Record<F, string | null | undefined>,
  row: BundleRow | undefined,
  locale: Locale,
): Localized<F> {
  const fields = Object.keys(original) as F[];
  const text = {} as Record<F, string>;
  const orig = {} as Record<F, string>;
  const textLang = {} as Record<F, string | undefined>;
  const originalLang = {} as Record<F, string | undefined>;
  const translatedFrom = new Set<string>();
  let translated = false;

  // 已检测的行带各字段语言(fl)与主语言(pl);缺行 / 未检测时本地检测(与入库检测同一实现),惰性且只算一次
  let local: ReturnType<typeof detectFields> | undefined;
  const detectLocal = () => (local ??= detectFields(original));

  for (const field of fields) {
    const source = original[field] ?? "";
    const sourceAttr = contentLangAttr(row?.fl?.[field] ?? detectLocal().fieldLangs[field]);
    orig[field] = source;
    originalLang[field] = sourceAttr;
    const translation = row?.s === "ok" ? row.f?.[field] : undefined;
    if (translation && translation.trim()) {
      text[field] = translation;
      // zh-hant 拿到的是 zh(简体)译文,lang 按实际文字标 zh-CN
      textLang[field] = htmlLang(dbLocale(locale));
      translated = true;
      const from = row?.fl?.[field];
      if (from) translatedFrom.add(from);
    } else {
      text[field] = source;
      textLang[field] = sourceAttr;
    }
  }

  // 已检测(pl 非空)就以库里的主语言为准,即使它不是站点语言(如 vi)也不再本地猜
  const sourceLocale = row?.pl != null ? siteLocale(row.pl) : siteLocale(detectLocal().primary);

  let available: Locale[];
  if (row?.al) {
    // 库里没有 zh-hant:有 zh 版本即视为有 zh-hant 版本(内容同 zh)
    available = withZhHant(row.al);
  } else if (!fields.some((field) => orig[field].trim())) {
    available = [...LOCALES];
  } else {
    const primary = detectLocal().primary;
    const hasTranslation = row?.s === "ok";
    // zh-hant 与 zh 同一份内容:按数据库语言比较
    available = LOCALES.filter((l) => dbLocale(l) === primary || (hasTranslation && dbLocale(l) === dbLocale(locale)));
  }

  let sourceLang = row?.sl ?? null;
  if (translated && translatedFrom.size > 0) {
    sourceLang = translatedFrom.size === 1 ? [...translatedFrom][0] : "mixed";
  }

  return {
    text,
    original: orig,
    textLang,
    originalLang,
    sourceLang,
    translated,
    state: row?.s ?? "none",
    available,
    sourceLocale,
  };
}

/** x-default:原文语言(若可用)→ zh → en → 第一个可用语言 → zh(与 SQL i18n.sitemap_rows 相同) */
export function xDefaultLocale(sourceLocale: Locale | null, available: readonly Locale[]): Locale {
  if (sourceLocale && available.includes(sourceLocale)) return sourceLocale;
  if (available.includes("zh")) return "zh";
  if (available.includes("en")) return "en";
  return available[0] ?? "zh";
}

const nonBlank = (s: string | null | undefined): s is string => !!s && s.trim() !== "";

/**
 * 车源原文:有 description_original 列时以它为准(逐字;空白视为无);
 * 列还不存在(SQL 未执行 / 旧列集合)时按 i18n-v2-data.sql 第 2 步的迁移规则从兼容列推出:
 * 转载 / API 车源先取 description(源站原文)再 description_zh,App 发布的先取 description_zh。
 */
export function legacyOriginal(car: {
  description_original?: string | null;
  description?: string | null;
  description_zh?: string | null;
  source_id?: string | null;
  api_key_id?: string | null;
}): string | null {
  if (car.description_original !== undefined) {
    return nonBlank(car.description_original) ? car.description_original : null;
  }
  const en = nonBlank(car.description) ? car.description.trim() : null;
  const zh = nonBlank(car.description_zh) ? car.description_zh.trim() : null;
  return car.source_id || car.api_key_id ? (en ?? zh) : (zh ?? en);
}

export interface CarView {
  /** 确定性标题(zh 用中文品牌/车型) */
  title: string;
  /** 描述;没有原文时为 null */
  description: Localized<"description"> | null;
  /** 配置标签:术语表标签(按词条去重)或原文标签 */
  features: FeatureLabel[];
  /** 卖家原样标签(「显示原文」时展示) */
  featuresOriginal: string[];
  carfax: string | null;
  available: Locale[];
  sourceLocale: Locale | null;
  xDefault: Locale;
  originalUncertain: boolean;
}

/** 原文标签 → FeatureLabel:按 normTag 去重(大小写/空格/连字符不敏感,与 SQL car_features 一致) */
function rawFeatureLabels(raws: readonly string[]): FeatureLabel[] {
  const seen = new Set<string>();
  const out: FeatureLabel[] = [];
  for (const value of raws) {
    const raw = value.trim();
    const norm = normTag(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push({ raw, key: `r:${norm}`, label: raw });
  }
  return out;
}

export function resolveCarView(
  car: PublicCar | DbCar,
  row: BundleRow | undefined,
  locale: Locale,
  t: TFn,
  hant?: HantFn | null,
): CarView {
  const original = legacyOriginal(car);
  // 无描述也走 localize:available / sourceLocale 仍按 bundle 行(空原文 = 6 种语言都可用)
  const description = localize({ description: original }, row, locale, hant);
  const featuresOriginal = car.features_original ?? car.features ?? [];
  const bundled = row?.x?.features;
  return {
    title: carTitle(car, locale),
    description: original ? description : null,
    features: hantLabels(bundled && bundled.length > 0 ? bundled : rawFeatureLabels(featuresOriginal), locale),
    featuresOriginal,
    carfax: localizeCarfaxSummary(car.carfax_summary, t),
    available: description.available,
    sourceLocale: description.sourceLocale,
    xDefault: xDefaultLocale(description.sourceLocale, description.available),
    originalUncertain: car.original_uncertain === true,
  };
}

function hantLabels<T extends { label: string }>(labels: T[], locale: Locale): T[] {
  return locale === "zh-hant" ? labels.map((l) => ({ ...l, label: toHantName(l.label) })) : labels;
}

export interface PostView {
  body: Localized<"title" | "content">;
  topics: TopicLabel[];
  available: Locale[];
  sourceLocale: Locale | null;
  xDefault: Locale;
}

/** bundle 还没有话题行时的兜底:tags[] 在前、内联 #话题 在后,按 normTag 去重,最多 12 个(同 SQL) */
function rawTopics(post: { title: string; content: string; tags: string[] | null }): TopicLabel[] {
  const seen = new Set<string>();
  const out: TopicLabel[] = [];
  const raws = [...(post.tags ?? []), ...extractHashtags(`${post.title}\n${post.content}`)];
  for (const value of raws) {
    if (out.length >= MAX_POST_TOPICS) break;
    const raw = value.trim();
    const norm = normTag(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push({ raw, norm, slug: null, label: raw });
  }
  return out;
}

export function resolvePostView(
  post: { title: string; content: string; tags: string[] | null },
  row: BundleRow | undefined,
  locale: Locale,
  hant?: HantFn | null,
): PostView {
  const body = localize({ title: post.title, content: post.content }, row, locale, hant);
  const bundled = row?.x?.topics;
  return {
    body,
    topics: hantLabels(bundled && bundled.length > 0 ? bundled : rawTopics(post), locale),
    available: body.available,
    sourceLocale: body.sourceLocale,
    xDefault: xDefaultLocale(body.sourceLocale, body.available),
  };
}

/** zh-hant:bundle 行里话题 / 配置标签的显示名逐字转繁体(raw / norm / slug / key 不变);没有标签原样返回 */
export function hantRowLabels(row: BundleRow | undefined): BundleRow | undefined {
  if (!row?.x) return row;
  const { topics, features } = row.x;
  return {
    ...row,
    x: {
      ...row.x,
      ...(topics ? { topics: topics.map((tp) => ({ ...tp, label: toHantName(tp.label) })) } : {}),
      ...(features ? { features: features.map((f) => ({ ...f, label: toHantName(f.label) })) } : {}),
    },
  };
}
