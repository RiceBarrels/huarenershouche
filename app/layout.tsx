import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { NotchUI } from "@/components/notch-ui";
import "./globals.css";

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
  title: "车来车网 - 北美华人二手车交易平台",
  description:
    "北美华人最信赖的二手车交易平台。覆盖洛杉矶、旧金山、纽约等主要华人社区，提供中文服务，让买卖车更简单。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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
            </CapacitorProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
