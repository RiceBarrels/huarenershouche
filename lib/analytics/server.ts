// 第一方访问统计:服务端工具(/api/vt 埋点入口、/api/geo 共用)——
// 边缘地理头、载荷校验(zod)、机器人过滤、UA 归类、来源规范化、限流 / token 缓存。
// 除 readEdgeGeo 读请求头外都是纯函数(可单测);有状态的限流与 token 缓存做成工厂,由路由在模块级实例化。
// 只在服务端 import。

import { z } from "zod";
import {
  MAX_PATH,
  MAX_QUERY,
  MAX_ROUTE,
  isTrackablePath,
  parseExternalReferrer,
  redactTrackedPath,
  routeOf,
  sanitizeQuery,
  truncateText,
} from "@/lib/analytics/path";
import { localeFromPath, stripLocale } from "@/lib/i18n";
import {
  SCAM_NOTICE_TARGETS,
  TRACKED_FILTER_CHIPS,
  type AnalyticsDevice,
  type AnalyticsEventType,
  type AnalyticsPlatform,
  type ClickKind,
} from "@/lib/analytics/types";
import { CONTACT_CHANNELS, type ContactChannel } from "@/lib/contact-apps";
import { FINANCING_TAGS } from "@/lib/dealer-financing";
import { isOnboardingTarget, isSetupAnswerTarget } from "@/lib/preferences";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- 文本清洗 ----------

/** 去控制字符与孤立代理项(Postgres text 不收 NUL / 非法 UTF-16),trim 后截断;空 → null */
export function cleanText(v: string | null | undefined, max: number): string | null {
  if (typeof v !== "string") return null;
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) continue;
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = v.charCodeAt(i + 1);
      if (n >= 0xdc00 && n <= 0xdfff) {
        out += v[i] + v[i + 1];
        i++;
      }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue;
    out += v[i];
  }
  out = out.trim();
  return out ? truncateText(out, max) : null;
}

// ---------- 地理 ----------

export interface EdgeGeo {
  /** ISO 国家代码,如 "US" */
  country: string | null;
  /** ISO 3166-2 州 / 省代码(不含国家前缀),如 "NY" */
  region: string | null;
  /** 英文城市名,如 "Flushing" */
  city: string | null;
}

/** 读 Vercel 边缘注入的 x-vercel-ip-* 头(不调第三方;本地开发没有这些头,全为 null) */
export function readEdgeGeo(headers: Headers): EdgeGeo {
  // 城市名是 URL 编码的("San%20Jose")
  let city = headers.get("x-vercel-ip-city");
  try {
    city = city ? decodeURIComponent(city) : null;
  } catch {
    /* 保留原值 */
  }
  return {
    country: headers.get("x-vercel-ip-country"),
    region: headers.get("x-vercel-ip-country-region"),
    city,
  };
}

/** 入库前清洗:国家只收 2 位字母(转大写),州省 ≤ 16,城市 ≤ 100 */
export function sanitizeGeo(geo: EdgeGeo): EdgeGeo {
  const country = cleanText(geo.country, 8)?.toUpperCase() ?? null;
  return {
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    region: cleanText(geo.region, 16),
    city: cleanText(geo.city, 100),
  };
}

/** 客户端 IP:x-forwarded-for 第一跳,退回 x-real-ip(只用于内存限流,不落库) */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  let ip = xff?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || null;
  if (ip?.startsWith("::ffff:")) ip = ip.slice("::ffff:".length);
  return ip || null;
}

// ---------- 载荷校验 ----------

/** 请求体上限(字节 / 字符),超出直接丢弃 */
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_TOKEN = 4096;

const optionalText = (max: number) => z.string().max(max).nullish();

/** TrackPayload(lib/analytics/types.ts)的校验;长度上限与客户端截断一致,超出视为伪造直接丢弃 */
export const trackPayloadSchema = z
  .object({
    type: z.enum(["pageview", "car_view"]),
    visitor_id: z.string().uuid(),
    session_id: z.string().uuid(),
    path: z.string().min(1).max(MAX_PATH).startsWith("/"),
    route: optionalText(MAX_ROUTE),
    query: optionalText(MAX_QUERY),
    hostname: optionalText(100),
    locale: optionalText(10),
    car_id: z.string().uuid().nullish(),
    // 客户端已裁成 origin + pathname(≤ 500),这里放宽到 1000,服务端再规范化一次
    referrer: optionalText(1000),
    utm_source: optionalText(100),
    utm_medium: optionalText(100),
    utm_campaign: optionalText(100),
    platform: z.enum(["web", "ios", "android"]),
    touch: z.boolean().optional(),
    token: z.string().max(MAX_TOKEN).nullish(),
  })
  .refine((p) => p.type !== "car_view" || !!p.car_id, {
    message: "car_view requires car_id",
    path: ["car_id"],
  });

/** 校验 + 清洗后的载荷(path 已脱敏、query 已按当前规则重洗,referrer 已规范化,referrer_host 已算出) */
export interface ParsedTrack {
  type: AnalyticsEventType;
  visitor_id: string;
  session_id: string;
  path: string;
  route: string;
  query: string | null;
  hostname: string | null;
  locale: string | null;
  car_id: string | null;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  platform: AnalyticsPlatform;
  touch: boolean;
  token: string | null;
}

function cleanLocale(v: string | null | undefined): string | null {
  const s = cleanText(v, 10);
  return s && /^[a-z]{2,3}(?:[-_][a-z0-9]{2,6})?$/i.test(s) ? s : null;
}

/** 请求体文本 → ParsedTrack;超长 / 非 JSON / 校验失败 / 不统计的路径 → null(调用方静默丢弃) */
export function parseTrackPayload(body: string): ParsedTrack | null {
  if (!body || body.length > MAX_BODY_BYTES) return null;
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }
  const result = trackPayloadSchema.safeParse(json);
  if (!result.success) return null;
  const p = result.data;

  // 与客户端 normalizeTrackedPath 同口径:去掉误带的 ?/#、反斜杠当斜杠、合并重复斜杠、去末尾斜杠(根路径保留)。
  // 否则手工构造的 "//evil.example"、"/\evil.example" 会原样入库,在后台时间线里成了站外链接;
  // "//admin" 之类的变体也会绕过 isTrackablePath。必须在 cleanText 之后做("/\t/x" 去掉控制字符才变成 "//x")
  const slashed =
    cleanText(p.path, MAX_PATH)
      ?.replace(/[?#].*$/, "")
      .replace(/\\/g, "/")
      .replace(/\/{2,}/g, "/")
      .replace(/(.)\/+$/, "$1") ?? null;
  // 客户端已去掉语言前缀;带着 /zh 等前缀的请求(手工构造 / 将来的客户端)这里再去一次,
  // 否则路由识别(/car/[id])与私信脱敏(/messages/[userId])都会被前缀绕过
  const rawPath = slashed ? stripLocale(slashed) : null;
  if (!rawPath || !rawPath.startsWith("/") || !isTrackablePath(rawPath)) return null;
  // 隐私规则以服务端为准再收一次(私信对话页只记路由;query 去掉追踪 / 敏感参数):
  // 旧版 App 包里的规则过时、或手工构造的请求,也绕不过去
  const path = redactTrackedPath(rawPath);
  const hostname = cleanText(p.hostname, 100)?.toLowerCase() ?? null;
  // 只留站外来源的 origin + pathname;本站 / 与页面同站点的 referrer 视为站内 → 都为 null
  const ref = parseExternalReferrer(cleanText(p.referrer, 1000), hostname);

  return {
    type: p.type,
    visitor_id: p.visitor_id.toLowerCase(),
    session_id: p.session_id.toLowerCase(),
    path,
    // 路由模式以服务端按 path 重算为准:旧版 App 包里的规则过时也能统一口径
    route: truncateText(routeOf(path), MAX_ROUTE),
    query: sanitizeQuery(new URLSearchParams(cleanText(p.query, MAX_QUERY) ?? "")),
    hostname,
    locale: cleanLocale(p.locale) ?? (slashed ? localeFromPath(slashed) : null),
    // pageview 不带车辆
    car_id: p.type === "car_view" && p.car_id ? p.car_id.toLowerCase() : null,
    referrer: ref?.referrer ?? null,
    referrer_host: ref?.host ?? null,
    utm_source: cleanText(p.utm_source, 100),
    utm_medium: cleanText(p.utm_medium, 100),
    utm_campaign: cleanText(p.utm_campaign, 100),
    platform: p.platform,
    touch: p.touch === true,
    token: p.token?.trim() || null,
  };
}

// ---------- 点击统计(click:联系按钮 / 车行贷款标签 / 筛选开关) ----------

const clickBase = {
  visitor_id: z.string().uuid(),
  session_id: z.string().uuid(),
  locale: optionalText(10),
  platform: z.enum(["web", "ios", "android"]),
  token: z.string().max(MAX_TOKEN).nullish(),
};

/**
 * ClickEventPayload(lib/analytics/types.ts)的校验:按 kind 区分必填字段,与 click_events 的
 * click_events_kind_fields 约束一一对应(contact 带 app + car_id;financing_tag 带标签 + car_id;
 * filter_chip 只带白名单里的筛选键;scam_notice 只带 impression / report;onboarding 只带 view:N / skip:N / done)
 */
export const clickEventSchema = z.discriminatedUnion("kind", [
  z.object({
    type: z.literal("click"),
    kind: z.literal("contact"),
    car_id: z.string().uuid(),
    app: z.enum(CONTACT_CHANNELS),
    ...clickBase,
  }),
  z.object({
    type: z.literal("click"),
    kind: z.literal("financing_tag"),
    car_id: z.string().uuid(),
    target: z.enum(FINANCING_TAGS),
    ...clickBase,
  }),
  z.object({
    type: z.literal("click"),
    kind: z.literal("filter_chip"),
    target: z.enum(TRACKED_FILTER_CHIPS),
    ...clickBase,
  }),
  z.object({
    type: z.literal("click"),
    kind: z.literal("setup_answer"),
    target: z.string().max(32).refine(isSetupAnswerTarget),
    ...clickBase,
  }),
  z.object({
    type: z.literal("click"),
    kind: z.literal("scam_notice"),
    target: z.enum(SCAM_NOTICE_TARGETS),
    ...clickBase,
  }),
  z.object({
    type: z.literal("click"),
    kind: z.literal("onboarding"),
    target: z.string().max(32).refine(isOnboardingTarget),
    ...clickBase,
  }),
]);

/** batch 1 的旧载荷(type = contact_click):已装旧版 App 包的设备仍会发,按 kind = contact 收 */
const legacyContactClickSchema = z.object({
  type: z.literal("contact_click"),
  car_id: z.string().uuid(),
  app: z.enum(CONTACT_CHANNELS),
  ...clickBase,
});

export interface ParsedClickEvent {
  kind: ClickKind;
  visitor_id: string;
  session_id: string;
  car_id: string | null;
  app: ContactChannel | null;
  target: string | null;
  locale: string | null;
  platform: AnalyticsPlatform;
  token: string | null;
}

/** 请求体文本 → ParsedClickEvent;不是点击载荷 / 校验失败 → null(调用方再按 pageview / car_view 解析) */
export function parseClickPayload(body: string): ParsedClickEvent | null {
  if (!body || body.length > MAX_BODY_BYTES) return null;
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const type = (json as { type?: unknown }).type;
  if (type !== "click" && type !== "contact_click") return null;
  const result =
    type === "click" ? clickEventSchema.safeParse(json) : legacyContactClickSchema.safeParse(json);
  if (!result.success) return null;
  const p = result.data;
  const kind: ClickKind = p.type === "contact_click" ? "contact" : p.kind;
  return {
    kind,
    visitor_id: p.visitor_id.toLowerCase(),
    session_id: p.session_id.toLowerCase(),
    car_id: "car_id" in p ? p.car_id.toLowerCase() : null,
    app: "app" in p ? p.app : null,
    target: "target" in p ? p.target : null,
    locale: cleanLocale(p.locale),
    platform: p.platform,
    token: p.token?.trim() || null,
  };
}

// ---------- 机器人过滤 ----------

// 爬虫 / 链接预览 / 监控测速 / 无头浏览器 / 非浏览器 HTTP 客户端。
// telegram 不单列:TelegramBot 已被 bot 命中,而 Telegram 安卓内置浏览器的 UA 带 Telegram-Android,是真人
const BOT_UA_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|preview|facebookexternalhit|embedly|whatsapp|discord|slack|vercel|externalagent|curl|wget|python|go-http-client|okhttp|axios|node-fetch|undici|java\/|libwww|scrapy|httpclient|postman/i;

// next 的 isBot 正则含裸 "sogou",会把搜狗手机浏览器 / 搜狗搜索 App 的真人访问也判成机器人;
// 搜狗爬虫 UA 都带 "spider",仍由 BOT_UA_RE 拦下
const SOGOU_BROWSER_RE = /SogouMobileBrowser|SogouMSE|SogouSearch/i;

/** parserIsBot:next/server userAgent().isBot(搜狗浏览器除外);UA 为空也按机器人处理 */
export function isBotUserAgent(ua: string | null | undefined, parserIsBot = false): boolean {
  if (!ua || !ua.trim()) return true;
  if (parserIsBot && !SOGOU_BROWSER_RE.test(ua)) return true;
  return BOT_UA_RE.test(ua);
}

// ---------- UA 归类 ----------

/** next/server userAgent() / userAgentFromString() 结果里用到的字段 */
export interface ParsedUserAgent {
  browser: { name?: string };
  device: { type?: string };
  os: { name?: string };
}

export interface UaInfo {
  device: AnalyticsDevice;
  browser: string | null;
  os: string | null;
}

/**
 * device:mobile / wearable → mobile,tablet → tablet,其余 → desktop;
 * browser 去掉 "Mobile " 前缀("Mobile Safari" → "Safari");os "Mac OS" → "macOS"。
 */
export function classifyUserAgent(ua: ParsedUserAgent, touch: boolean): UaInfo {
  const type = ua.device?.type;
  let device: AnalyticsDevice =
    type === "mobile" || type === "wearable" ? "mobile" : type === "tablet" ? "tablet" : "desktop";
  let os = ua.os?.name?.trim() || null;
  // iPadOS 13+ 的 Safari 默认发桌面版 UA(Macintosh),Mac 没有触屏 → 多点触控即 iPad;
  // 系统记为 iOS,与发移动版 UA 的 iPad 口径一致
  if (device === "desktop" && os === "Mac OS" && touch) {
    device = "tablet";
    os = "iOS";
  }
  if (os === "Mac OS") os = "macOS";
  let browser = ua.browser?.name?.trim() || null;
  if (browser) {
    browser = browser.replace(/^Mobile\s+/i, "") || null;
    // iOS App 内嵌 WKWebView(含本站 App)的 UA 不带 Safari,解析出来是 "WebKit"
    if (browser === "WebKit" && os === "iOS") browser = "WebView";
  }
  return {
    device,
    browser: browser ? truncateText(browser, 50) : null,
    os: os ? truncateText(os, 50) : null,
  };
}

// ---------- 登录 token ----------

/** getClaims() 的 claims → user_id:sub 必须是 uuid 且 exp 未过期,否则 null */
export function userIdFromClaims(
  claims: { sub?: unknown; exp?: unknown } | null | undefined,
  nowSec: number
): string | null {
  if (!claims) return null;
  const sub = typeof claims.sub === "string" ? claims.sub : null;
  const exp = typeof claims.exp === "number" ? claims.exp : null;
  if (!sub || !UUID_RE.test(sub) || exp === null || exp <= nowSec) return null;
  return sub.toLowerCase();
}

/**
 * token → user_id 的内存缓存(同一 token 不重复验签)。
 * get:未命中返回 undefined;命中但已过期返回 null(并删除)。超上限时删最旧一条(Map 保持插入顺序)。
 */
export function createTokenCache(max = 500) {
  const map = new Map<string, { sub: string; exp: number }>();
  return {
    get(token: string, nowSec: number): string | null | undefined {
      const hit = map.get(token);
      if (!hit) return undefined;
      if (hit.exp <= nowSec) {
        map.delete(token);
        return null;
      }
      return hit.sub;
    },
    set(token: string, sub: string, exp: number): void {
      if (!map.has(token) && map.size >= max) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      map.set(token, { sub, exp });
    },
    get size(): number {
      return map.size;
    },
  };
}

// ---------- 限流 ----------

/**
 * 固定窗口计数限流(进程内,不落库):hit 返回 true 表示放行。
 * key 数超过 maxKeys 时整表清空(防内存无限增长,代价是偶尔放过一个窗口)。
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys: number }) {
  const map = new Map<string, { count: number; start: number }>();
  return {
    hit(key: string, now: number): boolean {
      if (map.size > opts.maxKeys) map.clear();
      const entry = map.get(key);
      if (!entry || now - entry.start >= opts.windowMs || now < entry.start) {
        map.set(key, { count: 1, start: now });
        return true;
      }
      entry.count += 1;
      return entry.count <= opts.limit;
    },
    get size(): number {
      return map.size;
    },
  };
}

// ---------- 入库行 ----------

/** public.analytics_events 的一行(id / created_at 由库生成) */
export interface AnalyticsEventInsert {
  type: AnalyticsEventType;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  path: string;
  route: string;
  query: string | null;
  hostname: string | null;
  locale: string | null;
  car_id: string | null;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: AnalyticsDevice;
  browser: string | null;
  os: string | null;
  platform: AnalyticsPlatform;
}

export function buildEventRow(
  p: ParsedTrack,
  ctx: { userId: string | null; ua: UaInfo; geo: EdgeGeo }
): AnalyticsEventInsert {
  return {
    type: p.type,
    visitor_id: p.visitor_id,
    session_id: p.session_id,
    user_id: ctx.userId,
    path: p.path,
    route: p.route,
    query: p.query,
    hostname: p.hostname,
    locale: p.locale,
    car_id: p.car_id,
    referrer: p.referrer,
    referrer_host: p.referrer_host,
    utm_source: p.utm_source,
    utm_medium: p.utm_medium,
    utm_campaign: p.utm_campaign,
    country: ctx.geo.country,
    region: ctx.geo.region,
    city: ctx.geo.city,
    device: ctx.ua.device,
    browser: ctx.ua.browser,
    os: ctx.ua.os,
    platform: p.platform,
  };
}
