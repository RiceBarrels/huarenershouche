"use client";

// 静态导出(build:static)的根入口 /:build-static.ts 构建时把它换成 app/page.tsx,
// 按「已存偏好 → 浏览器语言」跳到 /zh 或其他语言树。
// - Capacitor 端这是 App 入口(静态导出无服务端重定向),
//   在客户端决定进哪棵语言树 —— 这就是原生端的"另一种逻辑"。
// - 网页端没有 app/page.tsx:/ 由 next.config 的 redirects()(及 vercel.json)跳到 /zh。

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_STORAGE_KEY, LOCALES, detectLocale, type Locale } from "@/lib/i18n";
import { isNative } from "@/lib/capacitor";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 原生壳:静态导出只有 zh 一棵树,显示语言由 Provider 按系统语言纯客户端切换
    if (isNative()) {
      router.replace("/zh");
      return;
    }
    let locale: string | null = null;
    try {
      locale = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      // 读不到就按浏览器语言
    }
    if (!LOCALES.includes(locale as Locale)) {
      locale = detectLocale(navigator.languages ?? [navigator.language]);
    }
    router.replace(`/${locale}`);
  }, [router]);

  // 一闪而过的空白页,给个背景色即可(内容由目标页渲染)
  return <div className="min-h-dvh bg-background" />;
}
