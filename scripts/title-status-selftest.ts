#!/usr/bin/env bun
/**
 * title-status-selftest — 转载源产权状态提取(lib/title-status.ts extractTitleStatus)回归用例。纯函数,不连库。
 *
 * Usage:
 *   bun scripts/title-status-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 重点是否定词作用范围:「no flood/salvage」「No rebuilt or salvage title」这类免责写法绝不能判成残值 / 重建
 * (同步每次都会重写 cars.title_status,误判手改也留不住);拿不准一律 null。
 */

import { extractTitleStatus, type TitleStatus } from "@/lib/title-status";

const cases: [string, TitleStatus | null][] = [
  // 否定覆盖整个并列清单 / 中间夹动词
  ["No flood or salvage history", null],
  ["One owner, no accidents, no flood/salvage", null],
  ["No accidents, no flood/salvage title", null],
  ["No rebuilt or salvage title", null],
  ["We do not sell salvage vehicles", null],
  ["Free of any salvage or flood damage", null],
  ["Free of any salvage or flood title", null],
  ["Never had a salvage or rebuilt title", null],
  ["No accidents, flood, or salvage title", null],
  // 单独的 salvage(收车广告)不算残值
  ["We buy salvage cars! Clean title", "清白产权"],
  ["not a salvage title", null],
  ["non-salvage title", null],
  ["This car doesn't have a rebuilt title", null],
  // 明确关键词照常识别;clean 只认紧挨着的否定
  ["Clean title", "清白产权"],
  ["No accidents, clean title", "清白产权"],
  ["No accidents and clean title", "清白产权"],
  ["not a clean title", null],
  ["Rebuilt title, runs great", "重建产权"],
  ["rebuilt CA title", "重建产权"],
  ["Title: Salvage", "残值产权"],
  ["Title Status: Clean", "清白产权"],
  ["Never been in an accident. Salvage title.", "残值产权"],
  ["Clean Carfax, no accidents, salvage title", "残值产权"],
  ["Sold as is with a salvage title", "残值产权"],
  ["Title is salvage", "残值产权"],
  ["rebuilt salvage", "重建产权"],
  ["rebuilt engine, new tires", null],
  ["Lemon law buyback", "柠檬回购"],
  // 中文写法
  ["清白产权", "清白产权"],
  ["无事故清白产权", "清白产权"],
  ["非残值产权,清白产权", "清白产权"],
  ["不是重建产权", null],
  ["车况不错,重建产权", "重建产权"],
  ["无泡水、残值或重建产权记录", null],
  // 互相矛盾 → null
  ["clean title, salvage title", null],
];

let fail = 0;
for (const [text, expected] of cases) {
  const got = extractTitleStatus(text);
  if (got !== expected) {
    fail++;
    console.log(`FAIL ${JSON.stringify(text)} → ${got} (expected ${expected})`);
  }
}
console.log(fail ? `${fail}/${cases.length} failed` : `all ${cases.length} passed`);
process.exit(fail ? 1 : 0);
