// 与 React 无关的 t():server component 的 generateMetadata 等处用,
// 客户端 I18nProvider 也复用同一套词典与回退链。
// 单独成文件:lib/i18n/index.ts 被大量客户端模块 import,不能让它拉进全部词典。

import { interpolate, isZhLocale, type Locale } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { ko } from "@/lib/i18n/ko";
import { ja } from "@/lib/i18n/ja";
import { es } from "@/lib/i18n/es";
import { fr } from "@/lib/i18n/fr";
import { zhHant } from "@/lib/i18n/zh-hant";
import { convertZhHant } from "@/lib/i18n/zh-hant-runtime";

// 非中文语言的 UI 词典(key 均为中文原文;缺失先回退英文,再回退中文)
export const DICTS: Partial<Record<Locale, Record<string, string>>> = { en, ko, ja, es, fr };

/** zh-hant 取词:生成词典("" = 与 key 相同)→ 运行时 opencc 转换(已加载时)→ 简体 key 本身 */
export function zhHantText(text: string): string {
  const v = zhHant[text];
  if (v !== undefined) return v || text;
  return convertZhHant(text) ?? text;
}

/** 缺词回退链:目标语言 → 英文 → 中文原文(zh 及未知语言直接原样返回)。
 *  zh-hant:繁体词典 → 运行时转换 → 中文 key 本身(绝不回退英文) */
export function translate(
  locale: string,
  text: string,
  vars?: Record<string, string | number>
): string {
  const translated =
    locale === "zh-hant"
      ? zhHantText(text)
      : isZhLocale(locale)
        ? text
        : DICTS[locale as Locale]?.[text] ?? en[text] ?? text;
  return interpolate(translated, vars);
}

/** 绑定语言的 t,用法同 useI18n().t */
export function serverT(locale: string) {
  return (text: string, vars?: Record<string, string | number>) => translate(locale, text, vars);
}
