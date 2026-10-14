"use client";

// 第一方访问统计:路由路径变化时上报 pageview(lib/analytics/client.ts → /api/vt)。
// 仅 query 变化(如列表筛选)不算新的浏览(与 Vercel Analytics 一致),但上报时带当前 query;
// 静态导出的 /car?id=X 这类路由按还原后的动态路径判断变化;
// 私信对话页只记路由(redactTrackedPath),在两个对话之间切换不算新的浏览。
// 挂在 [locale]/layout,外包 <Suspense>(useSearchParams 需要,否则静态预渲染报错);不渲染任何东西。

import { useEffect, useEffectEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { trackPageview } from "@/lib/analytics/client";
import { normalizeTrackedPath } from "@/lib/analytics/path";

export function AnalyticsTracker() {
  // 原始 pathname(带语言前缀),不用 localized-navigation 的去前缀版本:语言由 path 解析 + 界面语言共同决定
  const rawPathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const search = searchParams?.toString() ?? "";
  const path = normalizeTrackedPath(rawPathname, search).path;

  // 取最新的 query / 语言,但只由 path 变化触发
  const reportPageview = useEffectEvent(() => {
    trackPageview({ rawPathname, search, locale });
  });

  useEffect(() => {
    reportPageview();
  }, [path]);

  return null;
}
