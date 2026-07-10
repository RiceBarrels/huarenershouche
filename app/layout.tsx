import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { NotchUI } from "@/components/notch-ui";
import "./globals.css";
import { InitHaptic } from "@/components/init-haptic";
import { RealtimeNotifications } from "@/components/realtime-notifications";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "常来车网 - 北美华人二手车交易平台",
    template: "%s | 常来车网",
  },
  description:
    "北美华人最信赖的二手车交易平台。覆盖洛杉矶、旧金山、纽约等主要华人社区，提供中文服务，让买卖车更简单。",
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
    "常来车网",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "常来车网",
    title: "常来车网 - 北美华人二手车交易平台",
    description:
      "北美华人最信赖的二手车交易平台。覆盖洛杉矶、旧金山、纽约等主要华人社区，提供中文服务，让买卖车更简单。",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <div
            vaul-drawer-wrapper=""
            className="min-h-dvh bg-background"
            style={{
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            <CapacitorProvider>
              <div
                className="pointer-events-none z-50 fixed top-0 left-0 right-0 bg-linear-to-b from-background from-20% to-transparent flex justify-center items-center safe-area-pill-container"
                style={{
                  height: "env(safe-area-inset-top, 0px)",
                }}
              >
                <NotchUI />
              </div>
              {children}
              <InitHaptic/>
              <RealtimeNotifications />
              <Analytics />
            </CapacitorProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
