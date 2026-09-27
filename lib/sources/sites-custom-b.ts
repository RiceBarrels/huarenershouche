// 由同名适配器族填充(见 index.ts)
// 平台型 / 难抓站点:CAC 自研 API;DealerCenter DWS 模板站复用 dealercenter-dws.ts(经 ScrapingAnt)
import type { SourceAdapter } from "./types";
import { createAutoCacAdapter } from "./autocac";
import { createDealerCenterDwsAdapter } from "./dealercenter-dws";

export const SITES: SourceAdapter[] = [
  // 友车哒 / CAC Auto Group —— 多门店,按车辆 ownStore 定位
  createAutoCacAdapter(),

  // Ideal Motor Group(圣盖博)—— DealerCenter DWS + Cloudflare
  createDealerCenterDwsAdapter({
    key: "idealmotorgroup",
    baseUrl: "https://idealmotorgroup.com",
    dcid: "1007157",
    location: "San Gabriel, CA",
    location_zh: "加州圣盖博",
    lat: 34.1037,
    lng: -118.0955,
    seller_name: "Ideal Motor Group",
    phone: "(626) 285-6628",
    languages: ["zh", "en"],
  }),

  // 速达车行 / Lansdale Speed Motor —— 旧域名 lansdalespeedmotor.com 已失效,现为 lansdalespeed.com
  createDealerCenterDwsAdapter({
    key: "lansdale",
    baseUrl: "https://www.lansdalespeed.com",
    dcid: "19003083",
    location: "Lansdale, PA",
    location_zh: "宾州兰斯代尔",
    lat: 40.253,
    lng: -75.294,
    seller_name: "Lansdale Speed Motor 速达车行",
    phone: "(267) 222-8391",
    languages: ["zh", "en"],
  }),
];
