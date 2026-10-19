#!/usr/bin/env bun
/**
 * zh-hant-content-selftest — K2 繁體内容转换的纯逻辑自测(不连库、不起服务)。
 *   bun scripts/zh-hant-content-selftest.ts
 */

import * as OpenCC from "opencc-js/cn2t";
import { carLocation, carTitle } from "@/lib/i18n";
import { withOverrides } from "@/lib/i18n/zh-hant-convert";
import { registerHantChars, toHantName } from "@/lib/i18n/zh-hant-names";
import { ZH_HANT_CHAR_PAIRS } from "@/lib/i18n/zh-hant-chars";
import { hantLangAttr, needsHant, seedScript } from "@/lib/i18n/content/hant";
import { hantRowLabels, localize } from "@/lib/i18n/content/resolve";
import { localeLanguageCodes, sellerSpeaksLocale } from "@/lib/i18n/languages";
import type { BundleRow } from "@/lib/i18n/content/types";

let failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.log(`FAIL ${name}\n     got      ${JSON.stringify(actual)}\n     expected ${JSON.stringify(expected)}`);
  }
}

eq("names before register", toHantName("丰田"), "丰田");
registerHantChars(ZH_HANT_CHAR_PAIRS);
const hant = withOverrides(OpenCC.Converter({ from: "cn", to: "t" }));

// 名称逐字表
eq("title zh-hant", carTitle({ title: "2020 Toyota Camry", title_zh: "2020 丰田 凯美瑞" }, "zh-hant"), "2020 豐田 凱美瑞");
eq("title zh unchanged", carTitle({ title: "2020 Toyota Camry", title_zh: "2020 丰田 凯美瑞" }, "zh"), "2020 丰田 凯美瑞");
eq("title en", carTitle({ title: "2020 Toyota Camry", title_zh: "2020 丰田 凯美瑞" }, "en"), "2020 Toyota Camry");
eq("location zh-hant", carLocation({ location: "New York, NY", location_zh: "纽约, NY" }, "zh-hant"), "紐約, NY");
eq("name non-cjk", toHantName("Tesla Model 3"), "Tesla Model 3");

// 整句修正
eq("postfix 覈", hant("核对产权证"), "核對產權證");
eq("postfix 只能", hant("是不是只能认宰"), "是不是只能認宰");
eq("measure word kept", hant("一只猫"), "一隻貓");

// localize:中文原文 → 繁体,不算翻译
const zhPost = localize({ title: "丰田凯美瑞怎么样", content: "后备箱很大" }, undefined, "zh-hant", hant);
eq("zh source converted", zhPost.text, { title: "豐田凱美瑞怎麼樣", content: "後備箱很大" });
eq("zh source not translated", zhPost.translated, false);
eq("zh source lang", zhPost.textLang.title, "zh-Hant");
eq("zh locale untouched", localize({ content: "后备箱很大" }, undefined, "zh", hant).text.content, "后备箱很大");
eq("hant null = no conversion", localize({ content: "后备箱" }, undefined, "zh-hant", null).text.content, "后备箱");

// 英文原文 + zh 译文:译文转繁体,原文保持英文,仍是翻译
const row: BundleRow = {
  id: "x", s: "ok", h: "h", f: { content: "这车很省油" }, sl: "en", pl: "en", fl: { content: "en" },
  ta: null, al: ["zh", "en"], x: { topics: [{ raw: "丰田", norm: "丰田", slug: "toyota", label: "丰田" }] },
};
const enPost = localize({ content: "Great on gas" }, row, "zh-hant", hant);
eq("translation converted", enPost.text.content, "這車很省油");
eq("original kept", enPost.original.content, "Great on gas");
eq("translated flag", enPost.translated, true);
eq("original lang en", enPost.originalLang.content, "en");
eq("topic labels", hantRowLabels(row)?.x?.topics?.[0], { raw: "丰田", norm: "丰田", slug: "toyota", label: "豐田" });

// 种子脚本转义
const script = seedScript({ "</script><b>": "x " });
eq("seed escapes <", script.includes("</script>"), false);
eq("seed escapes u2028", script.includes(" "), false);
eq("needsHant", [needsHant("abc"), needsHant("车"), needsHant(null)], [false, true, false]);
eq("lang attr", [hantLangAttr("zh-CN"), hantLangAttr("zh"), hantLangAttr("en"), hantLangAttr(undefined)], ["zh-Hant", "zh-Hant", "en", undefined]);

// 卖家语言:zh-hant 与 zh 相同
eq("lang codes zh-hant", localeLanguageCodes("zh-hant"), ["zh", "yue"]);
eq("empty langs zh-hant", sellerSpeaksLocale([], "zh-hant"), true);
eq("yue seller zh-hant", sellerSpeaksLocale(["yue"], "zh-hant"), true);
eq("empty langs en", sellerSpeaksLocale([], "en"), false);

if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("zh-hant-content-selftest: all passed");
