#!/usr/bin/env bun
/**
 * preferences-selftest — lib/preferences.ts(本机偏好 clc_prefs)的解析 / 合并 / 存储容错 / 派生值 / 埋点白名单。
 * 纯函数,不连库。
 *
 * Usage:
 *   bun scripts/preferences-selftest.ts
 *   全部通过退出码 0,否则 1。
 */

import {
  DEFAULT_PREFERENCES,
  SETUP_ANSWER_TARGETS,
  isSetupAnswerTarget,
  mergePreferences,
  ownershipHorizon,
  parsePreferences,
  preferredCountry,
  preferredUnits,
  readPreferences,
  shouldShowSetupCard,
  writePreferences,
  PREFS_STORAGE_KEY,
} from "@/lib/preferences";

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failed++;
    console.error(`FAIL ${name}`);
  }
}

// 解析:坏数据一律回默认,ui 默认 detailed(= 现有界面)
check("null → default", parsePreferences(null).ui === "detailed" && !parsePreferences(null).setupDone);
check("bad json → default", parsePreferences("{oops").ui === "detailed");
check("array → default", parsePreferences("[1]").ui === "detailed");
check("bad ui → default", parsePreferences(JSON.stringify({ ui: "x" })).ui === "detailed");
const p1 = parsePreferences(JSON.stringify({ v: 1, ui: "simple", country: "AU", postal: "2000", ownership: "lt1", setupDone: "skipped", junk: 1 }));
check("valid parse", p1.ui === "simple" && p1.country === "AU" && p1.postal === "2000" && p1.ownership === "lt1" && p1.setupDone === "skipped");
check("junk dropped", !("junk" in p1));
check("postal must match country", parsePreferences(JSON.stringify({ country: "AU", postal: "90210" })).postal === undefined);
check("CA postal normalized", parsePreferences(JSON.stringify({ country: "CA", postal: "m5v3l9" })).postal === "M5V 3L9");
check("other drops postal", parsePreferences(JSON.stringify({ country: "other", postal: "2000" })).postal === undefined);
check("bad country dropped", parsePreferences(JSON.stringify({ country: "CN" })).country === undefined);

// 合并:undefined 清除;换国家时不匹配的邮编被丢弃
const m1 = mergePreferences(p1, { country: "US" }, new Date(0));
check("switch country drops postal", m1.country === "US" && m1.postal === undefined && m1.updatedAt === new Date(0).toISOString());
check("undefined clears", mergePreferences(p1, { ownership: undefined }).ownership === undefined);

// 派生值
check("country other → null", preferredCountry({ v: 1, ui: "simple", country: "other" }) === null);
check("AU units", preferredUnits(p1)?.currency === "AUD" && preferredUnits(p1)?.mileage_unit === "km");
check("no answer units null", preferredUnits(DEFAULT_PREFERENCES) === null);
check("horizon short", ownershipHorizon(p1) === "short");
check("horizon long", ownershipHorizon({ v: 1, ui: "detailed", ownership: "5plus" }) === "long");
check("horizon none", ownershipHorizon(DEFAULT_PREFERENCES) === null);
check("card shows", shouldShowSetupCard(DEFAULT_PREFERENCES));
check("card hidden after skip", !shouldShowSetupCard(p1));

// 存储容错:不可用 / 抛错都不抛出
const throwing = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } };
check("read throwing storage", readPreferences(throwing).ui === "detailed");
check("write throwing storage", writePreferences(p1, throwing) === false);
check("null storage", readPreferences(null).ui === "detailed" && writePreferences(p1, null) === false);
const mem = new Map<string, string>();
const memStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
check("roundtrip", writePreferences(p1, memStorage) && readPreferences(memStorage).postal === "2000" && mem.has(PREFS_STORAGE_KEY));

// 埋点白名单:与 click-events.sql 的 CHECK 正则一致,且 ≤ 32 字符
const sqlRe = /^(ui|country|own|setup):[A-Za-z0-9]{1,12}$/;
check("targets match SQL", SETUP_ANSWER_TARGETS.every((x) => sqlRe.test(x) && x.length <= 32));
check("target guard", isSetupAnswerTarget("own:lt1") && !isSetupAnswerTarget("postal:2000"));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("preferences-selftest: all passed");
