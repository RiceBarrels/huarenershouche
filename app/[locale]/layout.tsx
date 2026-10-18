import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVariables } from "@/app/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd } from "@/lib/seo/jsonld";
import { siteGraphJsonLd } from "@/lib/seo/structured-data";
import { htmlLang } from "@/lib/i18n/content-langs";
import { LOCALES, BUILD_LOCALES, type Locale } from "@/lib/i18n";
import { LocaleProviders } from "./locale-providers";
import { localeMetadata, localeViewport } from "./locale-metadata";

// web 端的根 layout:路径级 i18n,/zh/... /en/... 等各自预渲染一份 HTML(SEO 关键),
// <html lang> 按语言树输出(zh → zh-CN),站点 JSON-LD 每种语言一份。
// 静态导出(Capacitor)由 build-static.ts 换成 layout.static.tsx(只挂 Provider 的嵌套 layout),
// 根 layout 仍是 app/layout.static.tsx——原生壳跨根 layout 跳转会整页刷新,
// 而 Capacitor 对无扩展名路径一律回 index.html,两个根 layout 会无限重载。
export function generateStaticParams() {
  return BUILD_LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = localeViewport;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localeMetadata(locale);
}

export default async function LocaleRootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const loc = locale as Locale;

  return (
    <html lang={htmlLang(loc)} suppressHydrationWarning>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3873099216150179"
          crossOrigin="anonymous"
        />
        <JsonLd data={siteGraphJsonLd(loc)} />
      </head>
      <body className={`${fontVariables} antialiased`}>
        {/* ThemeProvider 包在最外层,首帧即按主题出背景,避免暗色模式白闪 */}
        <ThemeProvider>
          <LocaleProviders locale={loc}>{children}</LocaleProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
