// Adapter registry — one entry per whitelisted source site.

import type { SourceAdapter } from "./types";
import { createDealerCenterAdapter } from "./dealercenter-wp";
import { createOneNeAutoAdapter } from "./onenauto";
import { createDealerSyncAdapter } from "./dealersync";

// 同一套 DealerCenter WordPress 模板的站点：加一家 = 加一份配置。
// location/联系字段是兜底值 —— 系统账号有门店记录时同步引擎会以门店地址覆盖。
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
  }),
];

export const adapters: Record<string, SourceAdapter> = Object.fromEntries(
  SITES.map((a) => [a.key, a])
);

export function getAdapter(key: string): SourceAdapter | null {
  return adapters[key] ?? null;
}
