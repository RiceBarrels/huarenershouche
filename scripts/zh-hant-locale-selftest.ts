#!/usr/bin/env bun
/**
 * zh-hant-locale-selftest — 繁體中文界面语言(zh-hant)的路由与数据库语言映射回归用例。纯函数,不连库。
 *
 * Usage:
 *   bun scripts/zh-hant-locale-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 覆盖:detectLocale(zh-TW / zh-HK / zh-MO / zh-Hant* → zh-hant,其余中文 → zh)、语言前缀正则(zh-hant 先于 zh)、
 * dbLocale / withZhHant、hreflang / og:locale、sitemap 分片命名、内容可用语言随 zh 扩展、翻译回退(不回退英文)。
 */

import {
  DB_LOCALES,
  LOCALES,
  dateLocale,
  dbLocale,
  detectLocale,
  isZhLocale,
  localeFromPath,
  localizePath,
  stripLocale,
  withZhHant,
} from "@/lib/i18n";
import { htmlLang, ogLocale } from "@/lib/i18n/content-langs";
import { translate } from "@/lib/i18n/translate";
import { localize } from "@/lib/i18n/content/resolve";
import type { BundleRow } from "@/lib/i18n/content/types";
import { parseShardName, shardFileName, renderUrlset, staticShardFiles } from "@/lib/sitemap";
import { localeAlternates } from "@/lib/seo-pages";
import { contentAlternates } from "@/lib/seo/alternates";

let failed = 0;
function eq<T>(name: string, actual: T, expected: T) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`ok   ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}\n     expected ${e}\n     actual   ${a}`);
  }
}

// ── 注册表 ──
eq("LOCALES has zh-hant after zh", LOCALES.slice(0, 2), ["zh", "zh-hant"]);
eq("DB_LOCALES has no zh-hant", (DB_LOCALES as string[]).includes("zh-hant"), false);
eq("dbLocale", LOCALES.map(dbLocale), ["zh", "zh", "en", "ko", "ja", "es", "fr"]);
eq("isZhLocale", LOCALES.filter(isZhLocale), ["zh", "zh-hant"]);
eq("dateLocale zh-hant", dateLocale("zh-hant"), "zh-HK");

// ── detectLocale ──
for (const tag of ["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-TW", "zh-hant-hk", "ZH-tw"]) {
  eq(`detect ${tag}`, detectLocale([tag]), "zh-hant");
}
for (const tag of ["zh", "zh-CN", "zh-SG", "zh-Hans", "zh-Hans-CN"]) {
  eq(`detect ${tag}`, detectLocale([tag]), "zh");
}
eq("detect first preference wins", detectLocale(["en-US", "zh-TW"]), "en");
eq("detect zh-TW before en", detectLocale(["zh-TW", "en-US"]), "zh-hant");
eq("detect zh-Thai-like tag is not hant", detectLocale(["zh-Tx"]), "zh");

// ── 路径前缀 ──
eq("localeFromPath /zh-hant", localeFromPath("/zh-hant"), "zh-hant");
eq("localeFromPath /zh-hant/browse", localeFromPath("/zh-hant/browse?x=1"), "zh-hant");
eq("localeFromPath /zh/browse", localeFromPath("/zh/browse"), "zh");
eq("localeFromPath /zh-hantx not a prefix", localeFromPath("/zh-hantx"), null);
eq("stripLocale /zh-hant/car/1", stripLocale("/zh-hant/car/1"), "/car/1");
eq("stripLocale /zh-hant", stripLocale("/zh-hant"), "/");
eq("localizePath zh-hant", localizePath("/browse?q=x", "zh-hant"), "/zh-hant/browse?q=x");
eq("localizePath already prefixed", localizePath("/zh-hant/browse", "en"), "/zh-hant/browse");

// ── hreflang / og ──
eq("htmlLang", [htmlLang("zh"), htmlLang("zh-hant"), htmlLang("en")], ["zh-CN", "zh-Hant", "en"]);
eq("ogLocale zh-hant", ogLocale("zh-hant"), "zh_TW");
const page = localeAlternates("zh-hant", "/browse");
eq("page canonical zh-hant", page.canonical, "https://www.clcauto.com/zh-hant/browse");
eq("page hreflang zh-Hant", page.languages?.["zh-Hant"], "https://www.clcauto.com/zh-hant/browse");

// ── 内容可用语言 ──
eq("withZhHant", withZhHant(["en", "zh", "bogus"]), ["en", "zh", "zh-hant"]);
eq("withZhHant without zh", withZhHant(["en", "ko"]), ["en", "ko"]);
const row = { id: "x", s: "none", f: null, sl: "zh", pl: "zh", fl: { title: "zh" }, ta: null, al: ["zh", "en"], x: null } as unknown as BundleRow;
const view = localize({ title: "车况很好" }, row, "zh-hant");
eq("localize zh-hant available", view.available, ["zh", "zh-hant", "en"]);
eq("localize zh-hant shows original, no translation", [view.text.title, view.translated], ["车况很好", false]);
const ca = contentAlternates("zh-hant", "/car/1", view.available, "zh");
eq("content canonical zh-hant", ca.canonical, "https://www.clcauto.com/zh-hant/car/1");
eq("content hreflang keys", Object.keys(ca.languages), ["zh-CN", "zh-Hant", "en", "x-default"]);
const translatedRow = { ...row, s: "ok", f: { title: "Great" }, fl: { title: "en" }, pl: "en", sl: "en" } as unknown as BundleRow;
eq("localize zh-hant translation lang = zh-CN", localize({ title: "Great" }, translatedRow, "zh-hant").textLang.title, "zh-CN");

// ── sitemap ──
eq("shard name", shardFileName("zh-hant", "car", 2), "zh-hant-car-2.xml");
eq("parse zh-hant shard", parseShardName("zh-hant-car-2.xml"), { locale: "zh-hant", kind: "car", page: 2 });
eq("parse zh-hant static", parseShardName("zh-hant-static.xml"), { locale: "zh-hant", kind: "static" });
eq("parse zh shard", parseShardName("zh-post-0.xml"), { locale: "zh", kind: "post", page: 0 });
eq("zh-hant seo shard rejected", parseShardName("zh-hant-seo.xml"), null);
eq("static index has zh-hant", staticShardFiles().includes("zh-hant-static.xml"), true);
eq(
  "urlset hreflang zh-Hant",
  renderUrlset("zh-hant", [{ path: "/browse", alternates: { locales: ["zh", "zh-hant"], xDefault: "zh" } }]).includes(
    'hreflang="zh-Hant" href="https://www.clcauto.com/zh-hant/browse"',
  ),
  true,
);

// ── 文案回退:zh-hant 不回退英文 ──
// 繁体词典接入前返回 zh key,接入后返回繁体;两种情况都必须是中文、不是英文
const zhHantText = translate("zh-hant", "发布车辆");
eq("translate zh-hant stays Chinese", /[一-鿿]/.test(zhHantText) && zhHantText !== translate("en", "发布车辆"), true);
// 缺词:接入前原样返回 key,接入后运行时转繁体;都保留插值、不回退英文
eq("translate zh-hant unknown key interpolates", translate("zh-hant", "不存在的词条 {n}", { n: 3 }).endsWith(" 3"), true);

if (failed > 0) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
