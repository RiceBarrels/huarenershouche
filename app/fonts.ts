// 全站字体(next/font):web 根 layout(app/[locale]/layout.tsx)、静态导出根 layout
// (app/layout.static.tsx)与 app/global-not-found.tsx 共用,body 上挂 fontVariables 暴露 CSS 变量。

import { Geist, Geist_Mono, Bagel_Fat_One, Mochiy_Pop_One } from "next/font/google";
import localFont from "next/font/local";

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

// 韩文品牌字体 Bagel Fat One:排在 logo 字体栈 ZCOOL 之后,谚文字形(또와카)
// 自动落到它,中文/拉丁照旧走 ZCOOL,无需按语言切换
const bagelFatOne = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-korean-logo",
  display: "swap",
  preload: false,
});

// 日文品牌 / 大标题字体 Mochiy Pop One:假名和汉字同一套圆粗字形(只在 html:lang(ja) 的 .font-logo 里用,见 globals.css)。
// Google 把 CJK 字形切成按 unicode-range 的分片,浏览器只下载页面用到的分片;不 preload
const mochiyPopOne = Mochiy_Pop_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ja-logo",
  display: "swap",
  preload: false,
});

/** 五套字体的 CSS 变量 className,挂在 <body> 上 */
export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${zcoolQingKe.variable} ${bagelFatOne.variable} ${mochiyPopOne.variable}`;
