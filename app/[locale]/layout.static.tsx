// 静态导出(build:static / Capacitor)版的语言树 layout:build-static.ts 构建时把它换成
// app/[locale]/layout.tsx。这里是嵌套 layout,不输出 <html>/<body>——静态导出只能有一个根 layout
// (app/layout.static.tsx):原生壳跨根 layout 跳转会整页刷新,而 Capacitor 对无扩展名路径
// 一律回 index.html,入口页 router.replace("/zh") 就会无限重载。<html lang> 由 I18nProvider 原生分支修正。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, BUILD_LOCALES, type Locale } from "@/lib/i18n";
import { LocaleProviders } from "./locale-providers";
import { localeMetadata } from "./locale-metadata";

export function generateStaticParams() {
  return BUILD_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localeMetadata(locale);
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  return <LocaleProviders locale={locale as Locale}>{children}</LocaleProviders>;
}
