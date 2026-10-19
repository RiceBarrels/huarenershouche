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
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  type Locale,
  LOCALE_STORAGE_KEY,
  interpolate,
  localizePath,
  stripLocale,
  detectLocale,
  rememberLocaleCookie,
} from "@/lib/i18n";
import { translate } from "@/lib/i18n/translate";
import { syncAccountLocale } from "@/lib/i18n/account-locale";
import { htmlLang } from "@/lib/i18n/content-langs";
import { isNative } from "@/lib/capacitor";

type TranslateFn = (text: string, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  /** 站内链接用的路径语言:原生端固定为导出的单棵树(zh),网页端等于 locale */
  pathLocale: Locale;
  /**
   * 显示语言是否已定:网页端恒为 true;原生端在水合后读到系统语言、切换到它之前为 false。
   * 按显示语言取数的请求(内容翻译 bundle、列表)等它为 true 再发,免得先按 zh 拉一遍再按系统语言重拉
   */
  localeReady: boolean;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  pathLocale: "zh",
  localeReady: true,
  setLocale: () => {},
  t: (text, vars) => interpolate(text, vars),
});

// 原生端:显示语言跟随系统(WKWebView 的 navigator.language 即系统语言),
// 不读本地偏好——改语言只能去系统设置(iOS 设置里的 App 语言)。
// isNative 依赖 window,只能在浏览器读:服务端与水合首帧取 undefined(未知,与静态 HTML 一致),
// 水合后 React 换成客户端值自动重渲染一次;网页端为 null
const subscribeNever = () => () => {};
const readNativeLocale = (): Locale | null | undefined =>
  isNative() ? detectLocale(navigator.languages ?? [navigator.language]) : null;
const readNativeLocaleOnServer = (): Locale | null | undefined => undefined;

export function I18nProvider({
  initialLocale = "zh",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // 原生端运行中的显示语言(不跳转,直接替换整棵树的文案)
  const nativeLocale = useSyncExternalStore(subscribeNever, readNativeLocale, readNativeLocaleOnServer);
  const native = nativeLocale != null;
  const locale = nativeLocale ?? initialLocale;
  // 网页端首帧即定;静态导出(原生壳)等水合后读到系统语言、与 locale 同一次渲染生效才放行
  const localeReady = nativeLocale !== undefined || process.env.NEXT_PUBLIC_OUTPUT !== "static";

  // <html lang> 跟随显示语言:网页端由 [locale] 根 layout 在服务端输出(这里结果相同);
  // 原生端静态导出的根 layout 写死 zh-CN,显示语言又跟随系统,靠这里修正
  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // Safari 隐私模式等存不了就算了,本次会话内仍生效
      }
      if (native) {
        // 原生端语言跟随系统,应用内不可改(设置页只提供"去系统设置"入口)
        return;
      }
      rememberLocaleCookie(next);
      syncAccountLocale(next);
      // 网页端:跳到另一语言前缀下的同一路径(保留 query)
      if (next === locale) return;
      const rest = stripLocale(pathname ?? "/");
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.push(localizePath(rest === "/" ? "/" : rest, next) + search);
    },
    [native, locale, pathname, router]
  );

  // zh-hant 缺词走同步逐字表(lib/i18n/translate.ts zhHantText),不再懒加载 opencc;
  // 逐字表晚于首帧到位的场景(无 SSR)由 ZhHantContentProvider 整树重挂载
  const t = useCallback<TranslateFn>((text, vars) => translate(locale, text, vars), [locale]);

  // 原生端 URL 永远指向静态导出的那棵树(initialLocale=zh),显示语言另走 nativeLocale
  const pathLocale = native ? initialLocale : locale;
  const value = useMemo(
    () => ({ locale, pathLocale, localeReady, setLocale, t }),
    [locale, pathLocale, localeReady, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** 取当前语言与翻译函数:const { t, locale } = useI18n() */
export function useI18n() {
  return useContext(I18nContext);
}
