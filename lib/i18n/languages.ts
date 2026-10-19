// 卖家沟通语言(profiles.languages)—— 纯函数,server/client 都可 import。
//
// 代码表与 supabase/seller-languages.sql 的 CHECK 约束保持一致;label 用各语言
// 自称(endonym),对会说该语言的人天然可读,不经 t() 翻译。
// 列表按代码 a-z 排列;排序/推荐用 sellerSpeaksLocale():把「会说当前界面语言」的卖家排在前面。

import { isZhLocale, type Locale } from "./index";

export type SellerLanguage =
  | "zh" | "yue" | "en" | "ko" | "ja" | "es" | "fr"
  | "vi" | "tl" | "pt" | "ru" | "hi" | "ar" | "de";

// 按语言代码 a-z 排列(选择器与只读列表都按此顺序展示)
export const SELLER_LANGUAGES: { code: SellerLanguage; label: string }[] = [
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "tl", label: "Tagalog" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "yue", label: "粤语" },
  { code: "zh", label: "中文(普通话)" },
];

const LABELS: Record<string, string> = Object.fromEntries(
  SELLER_LANGUAGES.map((l) => [l.code, l.label]),
);

/** 语言代码 → 自称;未知代码原样返回 */
export function languageLabel(code: string): string {
  return LABELS[code] ?? code;
}

/** 界面语言 → 视为「同一语言」的卖家语言代码(zh 界面下粤语也算能沟通) */
export function localeLanguageCodes(locale: Locale): SellerLanguage[] {
  return isZhLocale(locale) ? ["zh", "yue"] : [locale];
}

/**
 * 卖家是否会说当前界面语言。
 * 未声明(空数组/null)的卖家:中文站默认按「会中文」处理 —— 本站面向华人社区,
 * 绝大多数老用户没填过语言,若按不匹配处理会把他们全部压到最后;其他语言不做假设。
 */
export function sellerSpeaksLocale(languages: string[] | null | undefined, locale: Locale): boolean {
  if (!languages || languages.length === 0) return isZhLocale(locale);
  const codes: string[] = localeLanguageCodes(locale);
  return languages.some((l) => codes.includes(l));
}

/** 规范化:去重、去未知代码、按 SELLER_LANGUAGES 顺序排列(写库前用) */
export function normalizeLanguages(input: readonly string[]): SellerLanguage[] {
  const set = new Set(input);
  return SELLER_LANGUAGES.map((l) => l.code).filter((c) => set.has(c));
}
