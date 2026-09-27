// DealerCenter「DWS」模板站(Cloudflare 保护,经 ScrapingAnt;见 dealercenter-dws.ts)。
// dcid 取自各站 /inventory/ 页 serviceUrl 的 dcid= 参数。
// 每轮同步 ScrapingAnt 请求 ≈ 1(全量列表)+ 在售车数(每车 1 次取图库)。
import type { SourceAdapter } from "./types";
import { createDealerCenterDwsAdapter } from "./dealercenter-dws";

export const SITES: SourceAdapter[] = [
  createDealerCenterDwsAdapter({
    key: "fjmotorgroup",
    baseUrl: "https://www.fjmotorgroup.com",
    dcid: "20618830",
    location: "Rosemead, CA",
    location_zh: "洛杉矶罗斯米德",
    lat: 34.0626,
    lng: -118.0878,
    seller_name: "FJ Motor Group",
    phone: "(626) 787-6160",
    // 站点自述:English, Spanish, Arabic, Mandarin & Cantonese
    languages: ["zh", "en", "es"],
  }),
  createDealerCenterDwsAdapter({
    key: "kopautoinc",
    baseUrl: "https://www.kopautoinc.com",
    dcid: "20670405",
    location: "El Monte, CA",
    location_zh: "洛杉矶埃尔蒙特",
    lat: 34.0636,
    lng: -118.0421,
    seller_name: "KOP Auto Inc. 靠谱汽车",
    phone: "(626) 542-3861",
    languages: ["zh", "en"],
  }),
  createDealerCenterDwsAdapter({
    key: "automaxsd",
    baseUrl: "https://www.automaxsd.com",
    dcid: "27673395",
    location: "San Diego, CA",
    location_zh: "加州圣地亚哥",
    lat: 32.8253,
    lng: -117.1475,
    seller_name: "Auto Max Inc.",
    phone: "(619) 666-8383",
    // 华人背景未证实
    languages: ["en"],
  }),
  createDealerCenterDwsAdapter({
    key: "nyautodepot",
    baseUrl: "https://www.nyautodepot.com",
    dcid: "14982154",
    // 官网现址在新泽西 Union(早期在纽约 Mineola)
    location: "Union, NJ",
    location_zh: "新泽西尤宁",
    lat: 40.6962,
    lng: -74.2638,
    seller_name: "纽约百车汇 New York Auto Depot",
    phone: "(631) 888-6331",
    languages: ["zh", "en"],
  }),
  createDealerCenterDwsAdapter({
    key: "txdautogroup",
    baseUrl: "https://www.txdautogroup.com",
    dcid: "18399165",
    location: "Houston, TX",
    location_zh: "德州休斯顿",
    lat: 29.8286,
    lng: -95.5268,
    seller_name: "TXD Auto Group",
    phone: "(713) 900-9460",
    languages: ["zh", "en"],
  }),
];
