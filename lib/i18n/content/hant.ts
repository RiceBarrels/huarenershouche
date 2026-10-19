// 用户内容(车源描述、帖子、评论、问答、评价)的繁體转换 —— 纯模块,server / client 共用,不 import opencc。
//
// 数据库没有 zh-hant(见 lib/i18n/index.ts dbLocale):繁體界面取 zh 的原文 / 译文,显示前整句转繁体。
// 转换函数按运行环境注入,resolve.localize 只管调用:
// - RSC(server component 的正文、metadata、JSON-LD):lib/i18n/content/server.ts 静态加载 opencc 后
//   registerServerHant() 注册,localize 在服务端自动取用;
// - 客户端组件(含它们的 SSR):hooks/use-localized 从 ZhHantContentProvider 取函数显式传入 ——
//   SSR 时用完整转换并把「原文 → 繁体」写进页面(window.__clcHant),水合首帧查这张表,输出与 SSR 逐字一致;
//   表里没有的(挂载后才取到的内容)等懒加载的 opencc 就绪后再转。

export type HantFn = (text: string) => string;

const CJK = /[一-鿿]/;

/** 只有含汉字的文本才需要转换(英文 / 韩文等原样) */
export function needsHant(text: string | null | undefined): text is string {
  return !!text && CJK.test(text);
}

let serverHant: HantFn | null = null;

/** RSC 侧注册完整转换器(只应在 lib/i18n/content/server.ts 调用) */
export function registerServerHant(fn: HantFn): void {
  serverHant = fn;
}

/** RSC 侧已注册的转换器;客户端恒为 null(客户端组件必须显式传入,见 useZhHantContent) */
export function serverHantFn(): HantFn | null {
  return typeof window === "undefined" ? serverHant : null;
}

/** 转换后的 lang 属性:中文(zh / zh-CN 等)→ zh-Hant,其他语言不变 */
export function hantLangAttr(lang: string | undefined): string | undefined {
  return lang && /^zh(\b|-|$)/i.test(lang) ? "zh-Hant" : lang;
}

// ---------- SSR → 客户端的转换结果种子 ----------

declare global {
  interface Window {
    __clcHant?: Record<string, string>;
  }
}

export const HANT_SEED_GLOBAL = "__clcHant";

/** 服务端写进页面的转换结果(水合首帧用) */
export function seededHant(text: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const seed = window.__clcHant;
  return seed && Object.prototype.hasOwnProperty.call(seed, text) ? seed[text] : undefined;
}

/** 写进 <script> 的 JSON:转义 < / U+2028 / U+2029,防止提前闭合标签或打断脚本 */
export function seedScript(entries: Record<string, string>): string {
  const json = JSON.stringify(entries)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `Object.assign(self.${HANT_SEED_GLOBAL}||(self.${HANT_SEED_GLOBAL}={}),${json})`;
}
