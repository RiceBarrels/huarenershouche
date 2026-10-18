// 内容语言工具(纯函数,server / client / Bun 通用):「已从 X 翻译」标签、<html lang>、og:locale、
// 内容块的 lang 属性。语言代码来自 lib/i18n/detect.ts(DetectedLang)或翻译管线记录的 source_lang。

import { LOCALES, type Locale } from "@/lib/i18n";

const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);

/** "zh-Hans" / "EN" → "zh" / "en" */
const primarySubtag = (lang: string) => lang.trim().toLowerCase().split(/[-_]/)[0];

const TRANSLATED_FROM: Readonly<Record<string, string>> = {
  zh: "已从中文翻译",
  en: "已从英文翻译",
  ko: "已从韩文翻译",
  ja: "已从日文翻译",
  es: "已从西班牙文翻译",
  fr: "已从法文翻译",
  vi: "已从越南文翻译",
  ru: "已从俄文翻译",
  de: "已从德文翻译",
  pt: "已从葡萄牙文翻译",
};

/**
 * 译文来源标签的词典 key(中文原文,交给 t()):
 * 已知语言 →「已从 X 翻译」;other / mixed / 其他语言 →「已翻译」;und / 空 → null(不显示标签)。
 */
export function translatedFromKey(lang: string | null | undefined): string | null {
  if (!lang) return null;
  const code = primarySubtag(lang);
  if (!code || code === "und") return null;
  return own(TRANSLATED_FROM, code) ? TRANSLATED_FROM[code] : "已翻译";
}

/** 页面 <html lang> / 译文块的 lang:zh 标成 zh-CN(站点中文为简体),其余语言即代码本身 */
export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale;
}

const OG_LOCALES: Readonly<Record<Locale, string>> = {
  zh: "zh_CN",
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
  es: "es_US",
  fr: "fr_CA",
};

/** Open Graph og:locale(下划线格式) */
export function ogLocale(locale: Locale): string {
  return OG_LOCALES[locale];
}

/**
 * 原文块的 lang 属性:检测出的具体语言 → ISO 代码(中文原文可能是繁体,只标 zh);
 * other / und / mixed / 空 → undefined(不标,继承页面语言)。
 */
export function contentLangAttr(lang: string | null | undefined): string | undefined {
  if (!lang) return undefined;
  const code = primarySubtag(lang);
  return /^[a-z]{2,3}$/.test(code) && code !== "und" ? code : undefined;
}

export function isSiteLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** 语言代码 → 英文名(JSON-LD、API 文档、日志等面向机器/英文读者的场景) */
export const LANG_ENGLISH_NAMES: Readonly<Record<string, string>> = {
  zh: "Chinese",
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  es: "Spanish",
  fr: "French",
  vi: "Vietnamese",
  ru: "Russian",
  de: "German",
  pt: "Portuguese",
};
