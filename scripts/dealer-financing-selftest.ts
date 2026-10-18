#!/usr/bin/env bun
/**
 * dealer-financing-selftest — 车行贷款标签(lib/dealer-financing.ts)与点击统计载荷(lib/analytics/server.ts
 * parseClickPayload)的回归用例。纯函数 + 读 SQL 文件比对,不连库。
 *
 * Usage:
 *   bun scripts/dealer-financing-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 另核对三份 SQL 与 TS 常量一致(改标签时容易漏改一处):
 *   dealer-financing.sql 的 CHECK、click-events.sql 的 financing_tag 取值 == FINANCING_TAGS;
 *   browse-cars.sql 的 financing 筛选数组 == LOAN_FILTER_TAGS;TRACKED_FILTER_CHIPS 都满足 click_events 的筛选键格式。
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  FINANCING_TAGS,
  LOAN_FILTER_TAGS,
  hasLoanFinancing,
  mergeStoreFinancing,
  normalizeFinancing,
  sameFinancing,
  toggleFinancing,
} from "@/lib/dealer-financing";
import { parseClickPayload } from "@/lib/analytics/server";
import { TRACKED_FILTER_CHIPS } from "@/lib/analytics/types";

let fail = 0;
let total = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  total++;
  if (!ok) {
    fail++;
    console.log(`FAIL ${name}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---------- 纯函数 ----------
check("normalize: non-array → []", eq(normalizeFinancing(undefined), []) && eq(normalizeFinancing(null), []) && eq(normalizeFinancing("接受现金"), []));
check("normalize: drops unknown / duplicates, canonical order",
  eq(normalizeFinancing(["接受现金", "x", "支持ITIN贷款", "接受现金", null]), ["支持ITIN贷款", "接受现金"]));
check("toggle adds in canonical order", eq(toggleFinancing(["接受现金"], "自营分期"), ["自营分期", "接受现金"]));
check("toggle removes", eq(toggleFinancing(["自营分期", "接受现金"], "接受现金"), ["自营分期"]));
check("merge: union across stores, missing column / null ignored",
  eq(mergeStoreFinancing([{ financing: ["接受现金"] }, {}, { financing: null }, { financing: ["无信用记录可贷", "接受现金"] }]),
    ["无信用记录可贷", "接受现金"]));
check("merge: null input", eq(mergeStoreFinancing(null), []));
check("loan filter: ITIN matches", hasLoanFinancing(["支持ITIN贷款"]));
check("loan filter: no-credit matches", hasLoanFinancing(["接受现金", "无信用记录可贷"]));
check("loan filter: in-house installments / cash alone do not match", !hasLoanFinancing(["自营分期", "接受现金"]));
check("loan filter: empty / missing", !hasLoanFinancing([]) && !hasLoanFinancing(undefined));
check("same: order-insensitive", sameFinancing(["接受现金", "自营分期"], ["自营分期", "接受现金"]));
check("same: different", !sameFinancing(["接受现金"], []));

// ---------- SQL ⇄ TS 常量 ----------
const ROOT = join(import.meta.dir, "..");
const sql = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const quoted = (s: string) => [...s.matchAll(/'([^']+)'/g)].map((m) => m[1]);

const financingSql = sql("supabase/dealer-financing.sql");
const checkArr = /CHECK \(financing <@ ARRAY\[([^\]]+)\]/.exec(financingSql);
check("dealer-financing.sql CHECK == FINANCING_TAGS", !!checkArr && eq(quoted(checkArr[1]), [...FINANCING_TAGS]), checkArr?.[1]);

const clicksSql = sql("supabase/click-events.sql");
const tagIn = /kind = 'financing_tag'[\s\S]*?target in \(([^)]+)\)/.exec(clicksSql);
check("click-events.sql financing_tag targets == FINANCING_TAGS", !!tagIn && eq(quoted(tagIn[1]), [...FINANCING_TAGS]), tagIn?.[1]);
const chipRe = /target ~ '([^']+)'/.exec(clicksSql);
check("TRACKED_FILTER_CHIPS match click_events filter_chip format",
  !!chipRe && TRACKED_FILTER_CHIPS.every((c) => new RegExp(chipRe[1]).test(c)), chipRe?.[1]);

const browseSql = sql("supabase/browse-cars.sql");
const loanArr = /ds\.financing && array\[([^\]]+)\]/.exec(browseSql);
check("browse-cars.sql financing filter == LOAN_FILTER_TAGS", !!loanArr && eq(quoted(loanArr[1]), [...LOAN_FILTER_TAGS]), loanArr?.[1]);

// ---------- /api/vt 点击载荷 ----------
const V = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const CAR = "C3C3C3C3-0000-4000-8000-000000000003";
const base = { visitor_id: V, session_id: S, locale: "es", platform: "web", token: null };
const parse = (o: unknown) => parseClickPayload(JSON.stringify(o));

const contact = parse({ type: "click", kind: "contact", car_id: CAR, app: "whatsapp", ...base });
check("contact click parsed (car id lower-cased, target null)",
  contact?.kind === "contact" && contact.app === "whatsapp" && contact.car_id === CAR.toLowerCase() && contact.target === null, contact);
check("contact click without car_id rejected", parse({ type: "click", kind: "contact", app: "line", ...base }) === null);
check("contact click with unknown app rejected", parse({ type: "click", kind: "contact", car_id: CAR, app: "telegram", ...base }) === null);

const tag = parse({ type: "click", kind: "financing_tag", car_id: CAR, target: "支持ITIN贷款", app: "sms", ...base });
check("financing_tag parsed (stray app dropped)", tag?.kind === "financing_tag" && tag.target === "支持ITIN贷款" && tag.app === null, tag);
check("financing_tag with unknown tag rejected", parse({ type: "click", kind: "financing_tag", car_id: CAR, target: "零首付", ...base }) === null);

const chip = parse({ type: "click", kind: "filter_chip", target: "financing", car_id: CAR, ...base });
check("filter_chip parsed (car_id dropped)", chip?.kind === "filter_chip" && chip.target === "financing" && chip.car_id === null, chip);
check("filter_chip outside whitelist rejected", parse({ type: "click", kind: "filter_chip", target: "cleanTitle", ...base }) === null);

const legacy = parse({ type: "contact_click", car_id: CAR, app: "kakao", ...base });
check("legacy contact_click accepted as kind contact", legacy?.kind === "contact" && legacy.app === "kakao", legacy);

check("pageview payload is not a click", parse({ type: "pageview", ...base }) === null);
check("unknown kind rejected", parse({ type: "click", kind: "share", ...base }) === null);
check("bad visitor id rejected", parse({ type: "click", kind: "filter_chip", target: "financing", ...base, visitor_id: "x" }) === null);

console.log(fail ? `${fail}/${total} failed` : `all ${total} passed`);
process.exit(fail ? 1 : 0);
