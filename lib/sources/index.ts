// Adapter registry — one entry per whitelisted source site.

import type { SourceAdapter } from "./types";
import { createDealerCenterAdapter } from "./dealercenter-wp";
import { createOneNeAutoAdapter } from "./onenauto";
import { createDealerSyncAdapter } from "./dealersync";
import { SITES as AUTOMANAGER_SITES } from "./sites-automanager";
import { SITES as DCS_SITES } from "./sites-dealercarsearch";
import { SITES as DC_PROXY_SITES } from "./sites-dealercenter-proxy";
import { SITES as CUSTOM_A_SITES } from "./sites-custom-a";
import { SITES as CUSTOM_B_SITES } from "./sites-custom-b";

// 同一套 DealerCenter WordPress 模板的站点：加一家 = 加一份配置。
// location/联系字段是兜底值 —— 系统账号有门店记录时同步引擎会以门店地址覆盖。
// languages：该车行能用的语言，同步时补到系统账号 profiles.languages（为空才写），
// 浏览/推荐会把会说当前界面语言的卖家排在前面。
const SITES: SourceAdapter[] = [
  createDealerCenterAdapter({
    key: "ideal-bayside",
    baseUrl: "https://idealautosalesbayside.com",
    location: "Flushing, NY",
    location_zh: "纽约法拉盛",
    lat: 40.7615,
    lng: -73.7864,
    seller_name: "iDeal Auto Sales Bayside",
    phone: "(718) 313-9239",
    languages: ["zh", "en"],
  }),
  createDealerCenterAdapter({
    key: "ideal-bensonhurst",
    baseUrl: "https://idealautosalesbensonhurst.com",
    location: "Brooklyn, NY",
    location_zh: "纽约布鲁克林",
    lat: 40.6034,
    lng: -73.9995,
    seller_name: "iDeal Auto Sales Bensonhurst",
    phone: "(718) 888-8188",
    languages: ["zh", "en"],
  }),
  createDealerCenterAdapter({
    key: "ideal-statenisland",
    baseUrl: "https://idealautosalesstatenisland.com",
    location: "Staten Island, NY",
    location_zh: "纽约史泰登岛",
    lat: 40.5797,
    lng: -74.1012,
    seller_name: "iDeal Auto Sales Staten Island",
    phone: "(718) 898-8618",
    languages: ["zh", "en"],
  }),
  createDealerCenterAdapter({
    key: "ideal-nj",
    baseUrl: "https://idealautosalesnj.com",
    location: "Kearny, NJ",
    location_zh: "新泽西卡尼",
    lat: 40.7676,
    lng: -74.1454,
    seller_name: "iDeal Auto Sales NJ",
    phone: "(201) 991-0047",
    languages: ["zh", "en"],
  }),
  createDealerCenterAdapter({
    key: "ideal-rosemead",
    baseUrl: "https://idealautosalesrosemead.com",
    location: "Rosemead, CA",
    location_zh: "洛杉矶罗斯米德",
    lat: 34.0686,
    lng: -118.0834,
    seller_name: "iDeal Auto Sales Rosemead",
    phone: "(626) 929-0008",
    languages: ["zh", "en"],
  }),
  // 1neAuto —— JSON API,经 ScrapingAnt 绕过 Cloudflare(见 onenauto.ts)
  createOneNeAutoAdapter(),
  // DealerSync 模板站(JSON 列表接口 + 详情页图库,见 dealersync.ts)
  createDealerSyncAdapter({
    key: "westcoastauto",
    baseUrl: "https://www.westcoastauto.com",
    location: "Montclair, CA",
    location_zh: "加州蒙特克莱尔",
    lat: 34.0723,
    lng: -117.6905,
    seller_name: "Westcoast Auto Sales",
    phone: "(909) 900-0000",
    languages: ["zh", "en"],
  }),
  createDealerSyncAdapter({
    key: "sdautofinders",
    baseUrl: "https://www.sandiegoautofinders.com",
    location: "San Diego, CA",
    location_zh: "加州圣地亚哥",
    lat: 32.8233,
    lng: -117.1553,
    seller_name: "San Diego Auto Finders",
    phone: "(858) 279-6862",
    languages: ["zh", "en"],
  }),
  // 2026-09 全美华人车行调研批量接入(按建站平台分文件)
  ...AUTOMANAGER_SITES,
  ...DCS_SITES,
  ...DC_PROXY_SITES,
  ...CUSTOM_A_SITES,
  ...CUSTOM_B_SITES,
];

export const adapters: Record<string, SourceAdapter> = Object.fromEntries(
  SITES.map((a) => [a.key, a])
);

export function getAdapter(key: string): SourceAdapter | null {
  return adapters[key] ?? null;
}
