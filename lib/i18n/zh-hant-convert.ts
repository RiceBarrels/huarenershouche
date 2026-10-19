// 简体 → 繁體中文转换的纯逻辑(不 import opencc-js,由调用方注入转换函数):
// 生成脚本 scripts/gen-zh-hant.ts 与运行时缺词转换 lib/i18n/zh-hant-runtime.ts 共用,保证两边结果一致。

import { ZH_HANT_OVERRIDES } from "./zh-hant-overrides";

export type ConvertFn = (text: string) => string;

/**
 * 包一层用词覆盖:先整句 OpenCC 转换,再把「覆盖表简体词经 OpenCC 转出的写法」替换成覆盖写法。
 * 在转换结果上替换(而不是先改简体原文)可以让覆盖词与前后文一起参与 OpenCC 的词组匹配;
 * 长词优先,免得「应用程序」先被「程序」截走。
 */
export function withOverrides(convert: ConvertFn, overrides: Record<string, string> = ZH_HANT_OVERRIDES): ConvertFn {
  const pairs = Object.entries(overrides)
    .map(([simp, trad]) => [convert(simp), trad] as const)
    .filter(([from, to]) => from && from !== to)
    .sort((a, b) => b[0].length - a[0].length);
  return (text) => {
    let out = convert(text);
    for (const [from, to] of pairs) {
      if (out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  };
}
