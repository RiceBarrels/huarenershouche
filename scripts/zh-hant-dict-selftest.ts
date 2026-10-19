#!/usr/bin/env bun
/**
 * zh-hant-dict-selftest — 繁體中文 UI 词典与运行时缺词转换回归用例。不连库、不调模型。
 *
 * Usage:
 *   bun scripts/zh-hant-dict-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 覆盖:用词覆盖(发布→發布、平台不变臺)、词典取词("" = 原样)、缺词在转换器加载前显示简体 key、
 * 加载后转成繁体、绝不回退英文,以及生成词典是否落后于 en.ts(落后只警告,运行时会兜底)。
 */

import * as OpenCC from "opencc-js/cn2t";
import { withOverrides } from "@/lib/i18n/zh-hant-convert";
import { zhHant } from "@/lib/i18n/zh-hant";
import { en } from "@/lib/i18n/en";
import { translate } from "@/lib/i18n/translate";
import { registerHantChars } from "@/lib/i18n/zh-hant-names";
import { ZH_HANT_CHAR_PAIRS } from "@/lib/i18n/zh-hant-chars";

let failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) return;
  failed++;
  console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const convert = withOverrides(OpenCC.Converter({ from: "cn", to: "t" }));
eq("override 发布", convert("免费发布车辆"), "免費發布車輛");
eq("override 平台", convert("二手车交易平台"), "二手車交易平台");
eq("override 软件/视频", convert("软件视频"), "軟體影片");
eq("override 为", convert("专为你打造"), "專為你打造");
eq("里程 keeps 里", convert("低里程 公里"), "低里程 公里");
eq("里面 → 裡面", convert("车里面"), "車裡面");
eq("placeholder kept", convert("{n} 小时后"), "{n} 小時後");

// 词典取词
eq("dict 发布车辆", translate("zh-hant", "发布车辆"), "發布車輛");
eq("dict identical key", translate("zh-hant", "低里程"), "低里程");
eq("dict interpolate", translate("zh-hant", "{n}万英里", { n: 3 }), "3萬英里");
eq("zh unchanged", translate("zh", "发布车辆"), "发布车辆");

// 缺词:加载前原样简体,不回退英文;加载后运行时转换
const missing = "这是一条词典里没有的测试文案后台";
// K2:缺词走同步逐字表(不再懒加载 opencc);字表注册前原样显示简体
eq("missing before chars", translate("zh-hant", missing), missing);
registerHantChars(ZH_HANT_CHAR_PAIRS);
eq("missing after chars", translate("zh-hant", missing), "這是一條詞典裡沒有的測試文案後台");
eq("dict still wins", translate("zh-hant", "登录"), "登入");

// 生成词典是否跟上 en.ts
const stale = Object.keys(en).filter((k) => !(k in zhHant));
if (stale.length) console.warn(`WARN ${stale.length} keys missing from lib/i18n/zh-hant.ts — rerun bun scripts/gen-zh-hant.ts`);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("zh-hant-dict-selftest: all passed");
