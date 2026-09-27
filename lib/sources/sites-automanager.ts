// 由同名适配器族填充(见 index.ts)
// AutoManager (WebManager) 平台车行站点：加一家 = 加一份配置。
import type { SourceAdapter } from "./types";
import { createAutoManagerAdapter } from "./automanager";

export const SITES: SourceAdapter[] = [
  // 一路发汽车 Topline Automotive — 840 E Garvey Ave, Monterey Park, CA 91755
  createAutoManagerAdapter({
    key: "topline168",
    baseUrl: "https://www.topline168.com",
    location: "Monterey Park, CA",
    location_zh: "加州蒙特利公园",
    lat: 34.0627,
    lng: -118.1153,
    seller_name: "Topline Automotive",
    phone: "(626) 572-8888",
    languages: ["zh", "en"],
  }),
  // Yes车行 Yes Auto Inc — 74-02 Queens Blvd, Elmhurst, NY 11373
  createAutoManagerAdapter({
    key: "yesnewyork",
    baseUrl: "https://www.yesnewyork.com",
    location: "Elmhurst, NY",
    location_zh: "纽约艾姆赫斯特",
    lat: 40.7397,
    lng: -73.8886,
    seller_name: "Yes Auto Inc",
    phone: "(718) 685-0168",
    languages: ["zh", "en"],
  }),
];
