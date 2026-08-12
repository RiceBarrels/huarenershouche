import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { IdentityProvider } from "@/components/identity-provider";
import { CarOverlayProvider } from "@/components/car-overlay-provider";
import "./globals.css";
import { InitHaptic } from "@/components/init-haptic";
import { CornerShapePolyfill } from "@/components/corner-shape-polyfill";
import { CommunityPrefetch } from "@/components/community-prefetch";
import { SplashAd } from "@/components/splash-ad";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import { CompareBar } from "@/components/compare-bar";
import { StatusBarMask } from "@/components/status-bar-mask";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/seo-pages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 品牌字体:logo 同款 ZCOOL QingKe HuangYou,本地自托管,仅 400 单字重
// 全量 CJK 字体较大(2.4MB),不 preload,交给 swap 渐进加载
const zcoolQingKe = localFont({
  src: "./fonts/ZCOOLQingKeHuangYou-Regular.woff2",
  variable: "--font-zcool",
  weight: "400",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // 状态栏/浏览器框颜色跟随主题(与 --background 对应)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0f" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "常來車網 CLCAuto - 北美华人二手车交易平台 | 买车卖车·免费发布·中文服务",
    template: "%s | 常來車網",
  },
  description:
    "常來車網是北美华人最信赖的二手车买卖平台：覆盖洛杉矶、旧金山、纽约、西雅图、达拉斯等华人社区，个人与华人车行直售二手车，支持按品牌、价格、里程、距离筛选，免费发布卖车信息，提供 VIN 召回查询、Carfax 报告和全中文服务，让买车卖车更简单放心。",
  keywords: [
    "北美华人二手车",
    "美国二手车",
    "华人买车",
    "华人卖车",
    "中文二手车平台",
    "华人车行",
    "留学生买车",
    "used car chinese",
    "chinese used car marketplace",
    "常來車網",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "常來車網",
    title: "常來車網 CLCAuto - 北美华人二手车交易平台",
    description:
      "北美华人二手车买卖平台：覆盖洛杉矶、旧金山、纽约等华人社区，个人与车行直售，免费发布，VIN 召回查询，全中文服务。",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Organization + WebSite 结构化数据（identity schema，站点级一次输出）
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "常來車網",
      alternateName: "CLCAuto",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "北美华人二手车交易平台，覆盖全美华人社区，提供中文买车卖车服务。",
      email: "contact@clcauto.com",
      areaServed: "US",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "常來車網",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "zh-CN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/browse?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${zcoolQingKe.variable} antialiased`}
      >
        <ThemeProvider>
          <MotionProvider>
          <div
            vaul-drawer-wrapper=""
            className="min-h-dvh bg-background"
            style={{
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            <CapacitorProvider>
              <IdentityProvider>
                <CarOverlayProvider>
                {/* 状态栏遮罩:仅刘海机型 + 滚动越过安全区后淡入 */}
                <StatusBarMask />
                {children}
                <CommunityPrefetch />
                <SplashAd />
                <InitHaptic/>
                <CornerShapePolyfill />
                <RealtimeNotifications />
                <CompareBar />
                <Analytics />
                </CarOverlayProvider>
              </IdentityProvider>
            </CapacitorProvider>
          </div>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
