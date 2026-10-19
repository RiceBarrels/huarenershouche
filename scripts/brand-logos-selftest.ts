#!/usr/bin/env bun
/**
 * brand-logos-selftest — lib/brand-logos.ts 品牌 logo 查表 + 字母占位回归。纯函数,不联网。
 *
 * Usage:
 *   bun scripts/brand-logos-selftest.ts
 *   全部通过退出码 0,否则 1。顺带打印 MAKES 中没有 logo 的品牌(应只剩 Other)。
 */

import { MAKES } from "@/lib/mock-data";
import { brandMonogram, getBrandLogoUrl } from "@/lib/brand-logos";

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  if (got !== want) {
    fail++;
    console.error(`✗ ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

const base = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/thumb/";
eq("Toyota", getBrandLogoUrl("Toyota"), `${base}toyota.png`);
eq("Mercedes-Benz", getBrandLogoUrl("Mercedes-Benz"), `${base}mercedes-benz.png`);
eq("大小写/空格不敏感", getBrandLogoUrl("mercedes benz"), `${base}mercedes-benz.png`);
eq("MINI", getBrandLogoUrl("MINI"), `${base}mini.png`);
eq("Land Rover", getBrandLogoUrl("Land Rover"), `${base}land-rover.png`);
eq("转载源停产品牌 Scion", getBrandLogoUrl("Scion"), `${base}scion.png`);
eq("Other 无 logo", getBrandLogoUrl("Other"), null);
eq("空", getBrandLogoUrl(""), null);
eq("null", getBrandLogoUrl(null), null);

eq("单词", brandMonogram("Tesla"), "T");
eq("两词", brandMonogram("Land Rover"), "LR");
eq("连字符", brandMonogram("Mercedes-Benz"), "MB");
eq("max=1", brandMonogram("Rolls-Royce", 1), "R");
eq("空串", brandMonogram(""), "?");

const missing = MAKES.filter((m) => !getBrandLogoUrl(m));
console.log(`MAKES 无 logo:${missing.join(", ") || "(无)"}`);
eq("MAKES 只有 Other 无 logo", missing.join(","), "Other");

if (fail) {
  console.error(`${fail} 个用例失败`);
  process.exit(1);
}
console.log("brand-logos-selftest: all passed");

// 深色模式处理(2026-10-19 对比度计算结果)
{
  const { brandLogoDarkTreatment } = await import("../lib/brand-logos");
  const cases: [string, string][] = [["Toyota", "invert"], ["audi", "invert"], ["Ford", "plate"], ["Mercedes Benz", "plate"], ["Genesis", "plate"], ["Honda", "none"], ["Ferrari", "none"], ["Other", "none"], ["", "none"]];
  for (const [make, want] of cases) {
    const got = brandLogoDarkTreatment(make);
    if (got !== want) { console.error(`FAIL dark treatment ${make}: ${got} != ${want}`); process.exit(1); }
  }
  console.log("dark treatment: all passed");
}
