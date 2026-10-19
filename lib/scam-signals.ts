// 私信里的交易风险信号(定金 / 转账 / 礼品卡 / 本票 / 外部链接)——纯客户端常量 + 纯函数,不连库、不调 AI、不上报内容。
// 命中时 chat-thread 只给收信人显示一行中性提示(components/chat-thread.tsx ScamNotice),
// 宁可多提示也不漏,所以措辞必须中性、从不指责对方。回归用例:scripts/scam-signals-selftest.ts。

/**
 * 拉丁字母关键词(en / es / fr,含常见变体):两侧要求词边界,避免 "wired" 以外的 "wire" 误伤(如 "wireless")。
 * 写成正则片段,统一小写匹配;重音字母按原样写(NFC)。
 */
const LATIN_PATTERNS: string[] = [
  // English
  "deposits?",
  "down ?payments?",
  "holding fee",
  "wire(?:d|s)?(?: transfer)?",
  "bank transfer",
  "gift ?cards?",
  "zelle",
  "venmo",
  "cash ?app",
  "paypal friends",
  "cashier'?s? ?checks?",
  "certified checks?",
  "money ?orders?",
  "western union",
  "moneygram",
  "e-?transfer",
  "interac",
  "bitcoin",
  "crypto",
  "usdt",
  // Español
  "dep[oó]sitos?",
  "anticipos?",
  "se[nñ]al(?:es)?",
  "transferencias?",
  "tarjetas? de regalo",
  "cheques? de caja",
  "giro postal",
  // Français
  "d[ée]p[oô]ts?",
  "acomptes?",
  "arrhes",
  "virements?",
  "cartes?[- ]cadeaux?",
  "ch[eè]ques? de banque",
  "mandats?",
];

/** CJK / 韩文关键词:没有空格分词,按子串匹配(zh / ja / ko) */
const CJK_KEYWORDS: string[] = [
  // 中文
  "定金",
  "订金",
  "转账", // 已覆盖「先转账」「微信转账」
  "转帐",
  "打款",
  "先付款",
  "保证金",
  "押金",
  "礼品卡",
  "本票",
  "电汇",
  "汇款",
  // 日本語
  "手付金",
  "内金",
  "前金",
  "保証金",
  "振込",
  "振り込",
  "送金",
  "ギフトカード",
  "預り金",
  // 한국어
  "계약금",
  "선금",
  "보증금",
  "가계약",
  "송금",
  "계좌이체",
  "입금",
  "기프트카드",
  "상품권",
];

// \b 只认 ASCII 单词字符,带重音的西 / 法语词要自己写边界:前后不是字母数字
const LATIN_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${LATIN_PATTERNS.join("|")})(?![\\p{L}\\p{N}])`, "iu");

// 外部链接:http(s):// 或 www. 开头,或「裸域名」(xxx.com / xxx.co/path,常见 TLD)
const URL_RE =
  /(?:https?:\/\/|www\.)\S+|(?<![\p{L}\p{N}@.])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|me|info|biz|xyz|top|shop|site|online|link|ly|app|cn|ca|us|au|nz|kr|jp)(?:\/\S*)?(?![\p{L}\p{N}])/iu;

export type ScamSignal = "keyword" | "link";

/** 文本 → 命中的信号种类(无命中返回 null)。只看文字消息;媒体消息(本站存储桶 URL)由调用方排除 */
export function detectScamSignal(text: string | null | undefined): ScamSignal | null {
  if (!text) return null;
  const s = text.normalize("NFC");
  if (LATIN_RE.test(s)) return "keyword";
  for (const k of CJK_KEYWORDS) if (s.includes(k)) return "keyword";
  if (URL_RE.test(s)) return "link";
  return null;
}

export function hasScamSignal(text: string | null | undefined): boolean {
  return detectScamSignal(text) !== null;
}

/** 本会话已关掉提示的 localStorage key(按会话记,一次关掉整段对话都不再显示) */
export function scamNoticeDismissKey(conversationId: string): string {
  return `scam-notice-dismissed:${conversationId}`;
}
