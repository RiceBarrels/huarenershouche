"use client";

// 全站语言上下文。
//
// 网页端(路径级 i18n):locale 由 URL 段决定([locale]/layout 传入
// initialLocale),SSR/SSG 即输出对应语言的 HTML(SEO 关键);
// 切换语言 = 跳转到另一语言前缀下的同一路径。
//
// Capacitor 原生端("另一种逻辑"):入口页按已存偏好进 /zh 或 /en 树;
// 运行中切换语言不跳转,直接用 override 替换整棵树的文案(自动替换组件
// 渲染的内容),并写入 localStorage 供下次启动使用。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  type Locale,
  LOCALE_STORAGE_KEY,
  interpolate,
  localizePath,
  stripLocale,
} from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { ko } from "@/lib/i18n/ko";
import { isNative } from "@/lib/capacitor";

// 非中文语言的 UI 词典(key 均为中文原文;缺失回退中文)
const DICTS: Partial<Record<Locale, Record<string, string>>> = { en, ko };

type TranslateFn = (text: string, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: (text, vars) => interpolate(text, vars),
});

export function I18nProvider({
  initialLocale = "zh",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // 原生端运行中切换语言用的覆盖值(不跳转);网页端始终为 null
  const [override, setOverride] = useState<Locale | null>(null);
  const [native, setNative] = useState(false);

  useEffect(() => {
    // isNative 依赖 window,只能挂载后判断
    if (isNative()) setNative(true);
  }, []);

  const locale = override ?? initialLocale;

  // <html lang> 跟随当前语言(根 layout 静态写死 zh-CN,这里修正)
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // Safari 隐私模式等存不了就算了,本次会话内仍生效
      }
      if (native) {
        // 原生端:不跳转,直接替换文案
        setOverride(next);
        return;
      }
      // 网页端:跳到另一语言前缀下的同一路径(保留 query)
      if (next === locale) return;
      const rest = stripLocale(pathname ?? "/");
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.push(localizePath(rest === "/" ? "/" : rest, next) + search);
    },
    [native, locale, pathname, router]
  );

  const t = useCallback<TranslateFn>(
    (text, vars) => {
      const translated = DICTS[locale]?.[text] ?? text;
      return interpolate(translated, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** 取当前语言与翻译函数:const { t, locale } = useI18n() */
export function useI18n() {
  return useContext(I18nContext);
}
