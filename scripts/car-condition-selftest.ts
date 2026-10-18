#!/usr/bin/env bun
/**
 * car-condition-selftest — 车况清单(lib/car-condition.ts)与 Public API 枚举表(lib/api/enums.ts 的
 * tires_condition / known_issue)的回归用例。纯函数 + 读 SQL 文件比对,不连库。
 *
 * Usage:
 *   bun scripts/car-condition-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 另核对 supabase/car-condition.sql 的 CHECK 与 TS 常量一致(改选项时容易漏改一处):
 *   允许的键 == CONDITION_KEYS;轮胎状况 IN 列表 == TIRES_CONDITIONS;已知问题数组 == KNOWN_ISSUES;
 *   keys_count 的正则上限 == KEYS_COUNT_MAX。CHECK 本身的行为见 scripts/i18n-db-test.ts(browse 套件,PGlite)。
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  CONDITION_KEYS,
  KEYS_COUNT_MAX,
  KNOWN_ISSUES,
  TIRES_CONDITIONS,
  isConditionEmpty,
  normalizeCarCondition,
  sameCondition,
  setConditionField,
  sortKnownIssues,
  toggleKnownIssue,
  type CarCondition,
} from "@/lib/car-condition";
import { enumSlugs, enumToDb, enumToSlug } from "@/lib/api/enums";

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

// ---------- normalizeCarCondition ----------
const full: CarCondition = {
  service_records: true,
  one_owner: false,
  smoker: false,
  keys_count: 2,
  tires_condition: "良好",
  known_issues: ["发动机", "漏油"],
};
check("full valid checklist round-trips", eq(normalizeCarCondition(full), full), normalizeCarCondition(full));
for (const raw of [null, undefined, "x", 3, [], true]) {
  check(`non-object → {} (${JSON.stringify(raw)})`, eq(normalizeCarCondition(raw), {}));
}
check(
  "unknown keys dropped (no free text sneaks through)",
  eq(normalizeCarCondition({ notes: "call me", smoker: true, other: 1 }), { smoker: true }),
);
check(
  "wrong types dropped",
  eq(normalizeCarCondition({ service_records: "true", one_owner: 1, smoker: null, keys_count: "2" }), {}),
);
check("keys_count must be an integer 0..5", eq(normalizeCarCondition({ keys_count: 6 }), {}));
check("keys_count 2.5 dropped", eq(normalizeCarCondition({ keys_count: 2.5 }), {}));
check("keys_count -1 dropped", eq(normalizeCarCondition({ keys_count: -1 }), {}));
check("keys_count 0 kept", eq(normalizeCarCondition({ keys_count: 0 }), { keys_count: 0 }));
check("tires outside enum dropped", eq(normalizeCarCondition({ tires_condition: "excellent" }), {}));
check(
  "known_issues deduped + sorted in list order, invalid entries dropped",
  eq(normalizeCarCondition({ known_issues: ["悬挂", "发动机", "悬挂", "刹车", 3] }), { known_issues: ["发动机", "悬挂"] }),
);
check("known_issues [] kept (= no known issues)", eq(normalizeCarCondition({ known_issues: [] }), { known_issues: [] }));
check(
  "known_issues with only invalid entries → not filled (never turned into 'no known issues')",
  eq(normalizeCarCondition({ known_issues: ["刹车异响"] }), {}),
);
check("known_issues as string dropped", eq(normalizeCarCondition({ known_issues: "发动机" }), {}));
check("key order canonical", Object.keys(normalizeCarCondition({ known_issues: [], smoker: true })).join() === "smoker,known_issues");

// ---------- 空 / 相等 ----------
check("isConditionEmpty({})", isConditionEmpty({}));
check("isConditionEmpty(undefined) (column missing)", isConditionEmpty(undefined));
check("isConditionEmpty(junk only)", isConditionEmpty({ notes: "x" }));
check("not empty with known_issues []", !isConditionEmpty({ known_issues: [] }));
check("not empty with false", !isConditionEmpty({ smoker: false }));
check("sameCondition ignores order / dupes", sameCondition({ known_issues: ["漏油", "发动机", "漏油"] }, { known_issues: ["发动机", "漏油"] }));
check("sameCondition distinguishes [] from missing", !sameCondition({ known_issues: [] }, {}));

// ---------- setConditionField / toggleKnownIssue ----------
check("set then clear a bool", eq(setConditionField(setConditionField({}, "smoker", true), "smoker", undefined), {}));
check("set keys_count", eq(setConditionField({}, "keys_count", 3), { keys_count: 3 }));
check("set invalid keys_count is dropped", eq(setConditionField({}, "keys_count", 9), {}));
let c: CarCondition = {};
c = toggleKnownIssue(c, null);
check("none → []", eq(c, { known_issues: [] }));
c = toggleKnownIssue(c, null);
check("none again → cleared", eq(c, {}));
c = toggleKnownIssue({ known_issues: [] }, "空调");
check("picking an issue replaces 'none'", eq(c, { known_issues: ["空调"] }));
c = toggleKnownIssue(c, "发动机");
check("issues kept in list order", eq(c, { known_issues: ["发动机", "空调"] }));
c = toggleKnownIssue(toggleKnownIssue(c, "发动机"), "空调");
check("removing the last issue → not filled (not 'none')", eq(c, {}));
c = toggleKnownIssue({ known_issues: ["漏油"] }, null);
check("'none' clears picked issues", eq(c, { known_issues: [] }));
check("sortKnownIssues", eq(sortKnownIssues(["悬挂", "x", "变速箱"]), ["变速箱", "悬挂"]));

// ---------- Public API 枚举表覆盖全部取值 ----------
check(
  "tires_condition slugs ↔ TIRES_CONDITIONS (bijective)",
  eq(enumSlugs("tires_condition").map((s) => enumToDb("tires_condition", s)), [...TIRES_CONDITIONS]),
  enumSlugs("tires_condition"),
);
check(
  "known_issue slugs ↔ KNOWN_ISSUES (bijective)",
  eq(enumSlugs("known_issue").map((s) => enumToDb("known_issue", s)), [...KNOWN_ISSUES]),
  enumSlugs("known_issue"),
);
check(
  "every DB value maps back to its slug",
  [...TIRES_CONDITIONS].every((v) => enumToDb("tires_condition", enumToSlug("tires_condition", v)) === v) &&
    [...KNOWN_ISSUES].every((v) => enumToDb("known_issue", enumToSlug("known_issue", v)) === v),
);
check("slug parsing is lenient on case / hyphen", enumToDb("tires_condition", "Needs-Replacement") === "需更换");
check("unknown slug → null", enumToDb("known_issue", "brakes") === null);

// ---------- SQL CHECK 与 TS 常量一致 ----------
const sql = readFileSync(join(import.meta.dir, "..", "supabase/car-condition.sql"), "utf8");
const quoted = (s: string) => [...s.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const keysArr = /"condition"\s*-\s*ARRAY\[([^\]]+)\]/.exec(sql);
check("SQL allowed keys == CONDITION_KEYS", !!keysArr && eq(quoted(keysArr[1]), [...CONDITION_KEYS]), keysArr?.[1]);
const tiresIn = /'tires_condition'\)\s*IN\s*\(([^)]+)\)/.exec(sql);
check("SQL tires IN list == TIRES_CONDITIONS", !!tiresIn && eq(quoted(tiresIn[1]), [...TIRES_CONDITIONS]), tiresIn?.[1]);
const issuesArr = /<@\s*'(\[[^']+\])'::jsonb/.exec(sql);
check(
  "SQL known_issues array == KNOWN_ISSUES",
  !!issuesArr && eq(JSON.parse(issuesArr[1]), [...KNOWN_ISSUES]),
  issuesArr?.[1],
);
const lenCap = /jsonb_array_length\("condition" -> 'known_issues'\)\s*<=\s*(\d+)/.exec(sql);
check("SQL known_issues length cap == KNOWN_ISSUES.length", !!lenCap && Number(lenCap[1]) === KNOWN_ISSUES.length, lenCap?.[1]);
const keysRe = /'keys_count'\)\s*~\s*'\^\[0-(\d)\]\$'/.exec(sql);
check("SQL keys_count regex max == KEYS_COUNT_MAX", !!keysRe && Number(keysRe[1]) === KEYS_COUNT_MAX, keysRe?.[1]);

if (fail === 0) {
  console.log(`ALL PASS (${total})`);
} else {
  console.log(`${fail} / ${total} FAILED`);
  process.exit(1);
}
