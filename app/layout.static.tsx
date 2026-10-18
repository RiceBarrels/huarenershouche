// 静态导出(build:static / Capacitor)的唯一根 layout:build-static.ts 构建时把它换成 app/layout.tsx,
// 语言树 layout 同时换成嵌套版(app/[locale]/layout.static.tsx)。原生壳只出 zh 一棵树,
// <html lang> 由 I18nProvider 原生分支按显示语言修正。
// web 端没有 app/layout.tsx:根 layout 是 app/[locale]/layout.tsx(<html lang> 按语言树)。

import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { fontVariables } from "./fonts";
import { localeMetadata, localeViewport } from "./[locale]/locale-metadata";

export const viewport: Viewport = localeViewport;

// zh 站点默认(与 web 端 zh 树同一份),入口页 / 与 404 用;语言树内由嵌套 layout 覆盖
export const metadata: Metadata = localeMetadata("zh");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3873099216150179"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${fontVariables} antialiased`}>
        {/* 语言树([locale]/layout)自带其余 Provider;ThemeProvider 留在根上,
            让入口重定向页也有正确的暗色背景,避免 App 启动白闪 */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
