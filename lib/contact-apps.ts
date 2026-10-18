// 卖家即时通讯联系方式(public.profile_contact_apps:微信 / KakaoTalk / LINE / WhatsApp)—— 纯函数,server / client / API 共用。
//
// 只由卖家本人(或认领人)主动填写:默认空,绝不从电话等字段推导或自动填充,没填就不展示。
// 与电话同等敏感:不进 PUBLIC_CAR_COLUMNS / SSR / 公开主页载荷 / JSON-LD,只给已登录访客在客户端单独取;
// Public API 对匿名请求给 null。短信(sms:)复用已有的车源 / 资料电话,这里没有 sms 键。
// 校验规则(含拒绝像网址 / 域名的值)与 supabase/contact-apps.sql 的 CHECK(public.contact_apps_valid)保持一致,
// 改一边必须同步另一边;写入只经 /api/contact-apps,服务端用同一份规则再校验一次。

import type { Locale } from "@/lib/i18n";

export const CONTACT_APPS = ["wechat", "kakao", "line", "whatsapp"] as const;
export type ContactApp = (typeof CONTACT_APPS)[number];
/** 库内形状:只含已填写的键,值已规范化(WhatsApp 为 + 加数字) */
export type ContactApps = Partial<Record<ContactApp, string>>;
/** 详情页的联系按钮:即时通讯 + 短信(短信用电话,不在 contact_apps 里) */
export type ContactChannel = ContactApp | "sms";
export const CONTACT_CHANNELS = [...CONTACT_APPS, "sms"] as const satisfies readonly ContactChannel[];

/**
 * 各界面语言下的展示 / 填写顺序:第一个在发布与资料页直接显示,其余收进「更多联系方式」;
 * 详情页按钮也按这个顺序排(只显示卖家填了的)。
 * 顺序是推断:es → WhatsApp 只有单一厂商来源;ko → KakaoTalk、ja → LINE 按母国习惯推断,没有北美侨民数据;
 * zh → 微信;en / fr → WhatsApp。上线后按 contact_clicks(supabase/analytics-contact-click.sql)的点击数据调整。
 */
export const CONTACT_APP_ORDER: Record<Locale, ContactApp[]> = {
  zh: ["wechat", "whatsapp", "line", "kakao"],
  en: ["whatsapp", "wechat", "line", "kakao"],
  fr: ["whatsapp", "wechat", "line", "kakao"],
  es: ["whatsapp", "wechat", "line", "kakao"],
  ko: ["kakao", "whatsapp", "line", "wechat"],
  ja: ["line", "whatsapp", "kakao", "wechat"],
};

/** 应用名:微信走 t()(词典 key),其余是品牌名,各语言通用 */
export const CONTACT_APP_LABEL: Record<ContactApp, string> = {
  wechat: "微信",
  kakao: "KakaoTalk",
  line: "LINE",
  whatsapp: "WhatsApp",
};
/** 需要经 t() 翻译的应用名 */
export const CONTACT_APP_LABEL_TRANSLATED: ReadonlySet<ContactApp> = new Set(["wechat"]);

/** E.164:+ 国家码开头,共 7–15 位数字 */
export const WHATSAPP_RE = /^\+[1-9]\d{6,14}$/;
/** 微信号 / KakaoTalk ID / LINE ID */
export const MESSENGER_ID_RE = /^[A-Za-z0-9._-]{1,32}$/;
// 网址 / 域名:www. 开头,或带常见顶级域(如 wa.me、line.me、xxx.com);带协议的(含 : /)字符集校验已经拒绝。
// 与 SQL contact_apps_valid 里的 !~* 正则逐字对应
const URL_LIKE_RE =
  /^www\.|\.(?:com|net|org|me|io|co|cn|ly|link|xyz|app|kr|jp|tw|hk|us|ca|info|biz|site|top|shop|vip)(?:\.|$)/i;

export type ContactAppError = "invalid_whatsapp" | "invalid_id";

export const CONTACT_APP_ERROR_MESSAGE: Record<ContactAppError, string> = {
  invalid_whatsapp: "请填写带国家区号的 WhatsApp 号码,如 +1 626 555 0123",
  invalid_id: "只能包含字母、数字和 . _ -,最多 32 位,不能是链接",
};

/**
 * 规范化 + 校验单个值:空白 → value = null(清除);WhatsApp 去掉空格 / 横线 / 括号 / 点后须为 E.164;
 * 其余去首尾空白后须满足 MESSENGER_ID_RE 且不像网址。不合规返回 error,value 为 null。
 */
export function normalizeContactApp(
  app: ContactApp,
  raw: string | null | undefined,
): { value: string | null; error?: ContactAppError } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { value: null };
  if (app === "whatsapp") {
    const compact = trimmed.replace(/[\s\-().]/g, "");
    return WHATSAPP_RE.test(compact) ? { value: compact } : { value: null, error: "invalid_whatsapp" };
  }
  if (!MESSENGER_ID_RE.test(trimmed) || URL_LIKE_RE.test(trimmed)) return { value: null, error: "invalid_id" };
  return { value: trimmed };
}

/** 表单输入(每个应用一个字符串)→ 规范化后的 ContactApps + 各字段错误 */
export function normalizeContactApps(input: Partial<Record<ContactApp, string>>): {
  apps: ContactApps;
  errors: Partial<Record<ContactApp, ContactAppError>>;
} {
  const apps: ContactApps = {};
  const errors: Partial<Record<ContactApp, ContactAppError>> = {};
  for (const app of CONTACT_APPS) {
    const { value, error } = normalizeContactApp(app, input[app]);
    if (error) errors[app] = error;
    else if (value) apps[app] = value;
  }
  return { apps, errors };
}

/** 库里读出的 jsonb(或 API / 旧数据里的任意值)→ ContactApps:只留已知键与合规值 */
export function parseContactApps(raw: unknown): ContactApps {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const apps: ContactApps = {};
  for (const app of CONTACT_APPS) {
    const v = o[app];
    if (typeof v !== "string") continue;
    const { value } = normalizeContactApp(app, v);
    if (value) apps[app] = value;
  }
  return apps;
}

export function hasContactApps(apps: ContactApps | null | undefined): boolean {
  return !!apps && CONTACT_APPS.some((a) => !!apps[a]);
}

export function sameContactApps(a: ContactApps, b: ContactApps): boolean {
  return CONTACT_APPS.every((app) => (a[app] ?? "") === (b[app] ?? ""));
}

/** ContactApps → 表单输入初值(未填为空串) */
export function contactAppsToInput(apps: ContactApps): Record<ContactApp, string> {
  return { wechat: apps.wechat ?? "", kakao: apps.kakao ?? "", line: apps.line ?? "", whatsapp: apps.whatsapp ?? "" };
}

/** 详情页按钮顺序:按界面语言的 CONTACT_APP_ORDER 取卖家填了的,有电话时短信排最后 */
export function orderedContactChannels(apps: ContactApps, locale: Locale, hasPhone: boolean): ContactChannel[] {
  const channels: ContactChannel[] = CONTACT_APP_ORDER[locale].filter((app) => !!apps[app]);
  if (hasPhone) channels.push("sms");
  return channels;
}

/** wa.me 链接:号码只留数字;text 为预填消息(访客的界面语言) */
export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** LINE 个人 ID 加好友链接 */
export function lineUrl(id: string): string {
  return `https://line.me/ti/p/~${encodeURIComponent(id)}`;
}

/** 短信链接:号码只留数字与开头的 +;「?&body=」写法 iOS 与 Android 都认 */
export function smsUrl(phone: string, text: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return `sms:${trimmed.startsWith("+") ? "+" : ""}${digits}?&body=${encodeURIComponent(text)}`;
}

/** 电话能否用来发短信(至少 10 位数字,与发布页的电话校验一致) */
export function canSms(phone: string | null | undefined): phone is string {
  return !!phone && phone.replace(/\D/g, "").length >= 10;
}

/** 送审文本(lib/moderate.ts):每个应用一行 */
export function contactAppsModerationText(apps: ContactApps): string {
  return CONTACT_APPS.filter((app) => apps[app])
    .map((app) => `${CONTACT_APP_LABEL[app]}: ${apps[app]}`)
    .join("\n");
}
