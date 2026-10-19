#!/usr/bin/env bun
/**
 * gen-zh-hant — 生成繁體中文 UI 词典 lib/i18n/zh-hant.ts(提交进仓库)。
 *
 * Usage:
 *   bun scripts/gen-zh-hant.ts
 *
 * 取 lib/i18n/en.ts 的全部 key(界面中文原文),用 opencc-js cn→t(逐字 + 词组)转换,
 * 再套 lib/i18n/zh-hant-overrides.ts 的港台中性用词。转换结果与 key 相同的写成 ""(= 原样显示),
 * 让运行时能区分「词典里有、无需转换」和「生成后新增的缺词」(后者才去懒加载 opencc-js)。
 * 新增文案后重跑即可;不跑也不会坏,缺词在繁體界面下由运行时转换。
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as OpenCC from "opencc-js/cn2t";
import { en } from "@/lib/i18n/en";
import { withOverrides } from "@/lib/i18n/zh-hant-convert";

const convert = withOverrides(OpenCC.Converter({ from: "cn", to: "t" }));

const keys = Object.keys(en).sort();
let changed = 0;
const lines = keys.map((key) => {
  const value = convert(key);
  if (value !== key) changed++;
  return `  ${JSON.stringify(key)}: ${JSON.stringify(value === key ? "" : value)},`;
});

const out = `// 繁體中文 UI 词典 —— 由 scripts/gen-zh-hant.ts 生成,请勿手改(改用词请改 lib/i18n/zh-hant-overrides.ts 后重跑)。
// key 为界面简体中文原文;value 为繁体写法,"" 表示与 key 相同(原样显示)。
// 不在本表里的 key(生成后新增)在繁體界面下由 lib/i18n/zh-hant-runtime.ts 运行时转换。

export const zhHant: Record<string, string> = {
${lines.join("\n")}
};
`;

writeFileSync(join(import.meta.dir, "..", "lib", "i18n", "zh-hant.ts"), out);
console.log(`zh-hant: ${keys.length} keys, ${changed} converted`);

// ---------- 名称用的同步字表:车辆标题(title_zh)/ 地点(location_zh)在繁體界面下逐字转换 ----------
// 这两类文本由 carTitle / carLocation 在任何地方同步调用(服务端、客户端、列表卡片),不能等懒加载的 opencc;
// 品牌 / 车型 / 城市名基本没有一简多繁的歧义,逐字转换足够(整句正文仍走 lib/i18n/content/hant.ts 的完整转换)。
// 只收「单字 → 单字」且结果不同的字,打成交替排列的字符串(简繁简繁…),约 15KB。

let pairs = "";
let charCount = 0;
for (let cp = 0x4e00; cp <= 0x9fff; cp++) {
  const s = String.fromCodePoint(cp);
  const value = convert(s);
  if (value !== s && [...value].length === 1) {
    pairs += s + value;
    charCount++;
  }
}

const charsOut = `// 繁體中文逐字表 —— 由 scripts/gen-zh-hant.ts 生成,请勿手改。
// 交替排列:简, 繁, 简, 繁 …(只含单字转换结果与原字不同的 ${charCount} 个字);用法见 lib/i18n/zh-hant-names.ts。

export const ZH_HANT_CHAR_PAIRS = ${JSON.stringify(pairs)};
`;

writeFileSync(join(import.meta.dir, "..", "lib", "i18n", "zh-hant-chars.ts"), charsOut);
console.log(`zh-hant-chars: ${charCount} chars`);
