#!/usr/bin/env bun
/**
 * title-status-selftest — 转载源产权状态提取(lib/title-status.ts extractTitleStatus)回归用例,
 * 以及按国家分两套的产权选项(美 / 加 vs 澳 / 新)、清白口径、PPSR 链接、Public API slug 双向表。纯函数,不连库。
 *
 * Usage:
 *   bun scripts/title-status-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 重点是否定词作用范围:「no flood/salvage」「No rebuilt or salvage title」这类免责写法绝不能判成残值 / 重建
 * (同步每次都会重写 cars.title_status,误判手改也留不住);拿不准一律 null。
 */

import { readFileSync } from "node:fs";
import {
  ANZ_TITLE_STATUSES,
  TITLE_STATUSES,
  TITLE_STATUS_EXPLAIN,
  US_TITLE_STATUSES,
  extractTitleStatus,
  isBrandedTitle,
  isCleanTitle,
  isTitleStatus,
  isTitleStatusFor,
  ppsrLinkFor,
  titleStatusesFor,
  type TitleStatus,
} from "@/lib/title-status";
import { enumSlugs, enumToDb, enumToSlug } from "@/lib/api/enums";

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
let total = 0;
for (const [text, expected] of cases) {
  total++;
  const got = extractTitleStatus(text);
  if (got !== expected) {
    fail++;
    console.log(`FAIL ${JSON.stringify(text)} → ${got} (expected ${expected})`);
  }
}

function check(name: string, ok: boolean, detail?: unknown) {
  total++;
  if (!ok) {
    fail++;
    console.log(`FAIL ${name}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
  }
}
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// ===== 按国家分两套 =====
check("US / CA list the US title brands", same(titleStatusesFor("US"), US_TITLE_STATUSES) && same(titleStatusesFor("CA"), US_TITLE_STATUSES));
check("AU / NZ list the PPSR options", same(titleStatusesFor("AU"), ANZ_TITLE_STATUSES) && same(titleStatusesFor("NZ"), ANZ_TITLE_STATUSES));
check("country is case-insensitive", same(titleStatusesFor(" au "), ANZ_TITLE_STATUSES));
check("unknown / missing country falls back to the US brands",
  same(titleStatusesFor(null), US_TITLE_STATUSES) && same(titleStatusesFor("GB"), US_TITLE_STATUSES));
check("the two sets are disjoint and together are TITLE_STATUSES",
  !US_TITLE_STATUSES.some((v) => (ANZ_TITLE_STATUSES as readonly string[]).includes(v)) &&
    same([...US_TITLE_STATUSES, ...ANZ_TITLE_STATUSES], TITLE_STATUSES));
check("isTitleStatusFor: AU value only in AU / NZ",
  isTitleStatusFor("无欠款(PPSR 已查)", "AU") && isTitleStatusFor("曾报废(written-off)", "NZ") &&
    !isTitleStatusFor("无欠款(PPSR 已查)", "US") && !isTitleStatusFor("曾报废(written-off)", "CA"));
check("isTitleStatusFor: US value not in AU", isTitleStatusFor("清白产权", "US") && !isTitleStatusFor("清白产权", "AU"));
check("isTitleStatusFor rejects '' / unknown", !isTitleStatusFor("", "AU") && !isTitleStatusFor("clean", "US"));
check("every status is a TitleStatus with an explanation", TITLE_STATUSES.every((v) => isTitleStatus(v) && !!TITLE_STATUS_EXPLAIN[v]));

// ===== 清白口径(「仅清白产权」筛选)/ 警示样式 =====
check("isCleanTitle: clean + PPSR clear", isCleanTitle("清白产权") && isCleanTitle("无欠款(PPSR 已查)"));
check("isCleanTitle: branded / written-off / null are not clean",
  !isCleanTitle("重建产权") && !isCleanTitle("曾报废(written-off)") && !isCleanTitle(null) && !isCleanTitle(undefined));
check("isBrandedTitle: written-off is branded, PPSR clear is not",
  isBrandedTitle("曾报废(written-off)") && !isBrandedTitle("无欠款(PPSR 已查)") && !isBrandedTitle(null));

// ===== PPSR 官网链接 =====
check("PPSR links: AU → ppsr.gov.au, NZ → ppsr.govt.nz",
  ppsrLinkFor("AU") === "https://www.ppsr.gov.au/" && ppsrLinkFor("NZ") === "https://www.ppsr.govt.nz/");
check("no PPSR link for US / CA / unknown", ppsrLinkFor("US") === null && ppsrLinkFor("CA") === null && ppsrLinkFor(null) === null);

// ===== 转载源提取只产出美式四项(源站都在美国,澳新两项只能卖家手选)=====
check("extractTitleStatus never yields an AU / NZ value",
  ["PPSR clear, no money owing", "Written-off vehicle", "无欠款", "曾报废"].every((t) => {
    const v = extractTitleStatus(t);
    return v === null || (US_TITLE_STATUSES as readonly string[]).includes(v);
  }));

// ===== Public API slug 双向表覆盖全部值 =====
check("every TITLE_STATUSES value has an API slug that round-trips",
  enumSlugs("title_status").length === TITLE_STATUSES.length &&
    TITLE_STATUSES.every((v) => enumToDb("title_status", enumToSlug("title_status", v)) === v),
  enumSlugs("title_status"));
check("AU / NZ slugs", enumToDb("title_status", "ppsr_clear") === "无欠款(PPSR 已查)" && enumToDb("title_status", "written-off") === "曾报废(written-off)");

// ===== supabase/title-status.sql 的 CHECK 列表与 TITLE_STATUSES 一致 =====
const sql = readFileSync(new URL("../supabase/title-status.sql", import.meta.url), "utf8");
const checkList = /CHECK \(title_status IS NULL OR title_status IN \(([^)]*(?:\([^)]*\)[^)]*)*)\)\)/.exec(sql)?.[1] ?? "";
const sqlValues = [...checkList.matchAll(/'([^']+)'/g)].map((m) => m[1]);
check("title-status.sql CHECK lists exactly TITLE_STATUSES", same(sqlValues, TITLE_STATUSES), sqlValues);
const browseSql = readFileSync(new URL("../supabase/browse-cars.sql", import.meta.url), "utf8");
check("browse-cars.sql cleanTitle filter uses the same clean set",
  browseSql.includes("s.title_status in ('清白产权', '无欠款(PPSR 已查)')"));

console.log(fail ? `${fail}/${total} failed` : `all ${total} passed`);
process.exit(fail ? 1 : 0);
