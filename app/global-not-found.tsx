// web 端全局 404(next.config 的 experimental.globalNotFound):匹配不到任何路由,
// 或 [locale] 根 layout 遇到非法语言调用 notFound() 时渲染。它绕过所有 layout,
// 必须自带 <html>/<body>、全局样式与字体。静态导出经 ignoreInStatic.json 隐藏本文件,
// 改用 not-found.static.tsx 换入的 app/not-found.tsx。

import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ThemeProvider } from "@/components/theme-provider";
import NotFoundView from "@/components/not-found-view";

export const metadata: Metadata = {
  title: "页面不存在 | 常來車網",
};

export default function GlobalNotFound() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${fontVariables} antialiased`}>
        {/* 与站内页面一致按主题出背景(next-themes 改 <html> class,故 suppressHydrationWarning) */}
        <ThemeProvider>
          <NotFoundView />
        </ThemeProvider>
      </body>
    </html>
  );
}
