// zh-hant 运行时缺词转换:生成词典(lib/i18n/zh-hant.ts)之后才新增的中文 key,
// 在繁體界面下用 opencc-js 现场转换,而不是回退英文或直接显示简体。
//
// opencc-js 的 cn2t 词典很大(约 1.1MB / gzip 450KB),只在 zh-hant 下按需动态 import,
// 其他语言的包里没有它。加载完成前 convertZhHant 返回 null(调用方先显示简体 key),
// 完成后通知订阅者(I18nProvider)重渲染一次。服务端不加载:SSR 输出与水合首帧一致(都是简体 key),
// 生成词典覆盖了生成时的全部 key,缺的只是之后新增的少量文案。

import { withOverrides, type ConvertFn } from "./zh-hant-convert";

let converter: ConvertFn | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const cache = new Map<string, string>();

/** 已加载时返回转换结果,未加载返回 null */
export function convertZhHant(text: string): string | null {
  if (!converter) return null;
  let out = cache.get(text);
  if (out === undefined) {
    out = converter(text);
    cache.set(text, out);
  }
  return out;
}

export function zhHantConverterReady(): boolean {
  return converter !== null;
}

/** 按需加载转换器(只在浏览器、只在 zh-hant 下调用);失败就继续显示简体 key,下次再试 */
export function loadZhHantConverter(): Promise<void> {
  if (converter) return Promise.resolve();
  if (!loading) {
    loading = import("opencc-js/cn2t")
      .then((mod) => {
        converter = withOverrides(mod.Converter({ from: "cn", to: "t" }));
        listeners.forEach((fn) => fn());
      })
      .catch(() => {
        loading = null;
      });
  }
  return loading;
}

/** 转换器加载完成时回调;返回取消订阅函数(useSyncExternalStore 用) */
export function subscribeZhHantConverter(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
