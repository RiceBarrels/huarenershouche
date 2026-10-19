// 第一方访问统计:浏览器端埋点(pageview / car_view / 点击 → POST /api/vt,见 app/api/vt/route.ts)。
// 只在浏览器里(effect / 事件回调中)调用;storage / crypto / 网络访问全部 try/catch,埋点绝不影响页面。
// 访客 id 存 localStorage(clc_vid);会话(clc_session)30 分钟无活动或换了外部来源即换新,
// 会话来源(站外 referrer + utm)只在会话开始时确定,会话内每条事件都带上。
// 浏览器预渲染(document.prerendering)中的页面等激活后才上报。

import { apiOrigin, getPlatform, isNative } from "@/lib/capacitor";
import { detectLocale } from "@/lib/i18n";
import {
  MAX_REFERRER,
  MAX_REFERRER_HOST,
  isTrackablePath,
  normalizeTrackedPath,
  parseExternalReferrer,
  truncateText,
  type TrackedPath,
} from "@/lib/analytics/path";
import type {
  AnalyticsEventType,
  AnalyticsPlatform,
  ClickEventPayload,
  ScamNoticeTarget,
  TrackedFilterChip,
  TrackPayload,
} from "@/lib/analytics/types";
import type { ContactChannel } from "@/lib/contact-apps";
import type { FinancingTag } from "@/lib/dealer-financing";
import type { OnboardingTarget, SetupAnswerTarget } from "@/lib/preferences";

const VISITOR_KEY = "clc_vid";
const SESSION_KEY = "clc_session";
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const PAGEVIEW_DEDUP_MS = 1000;
// 同一辆车、同一页面地址 30 秒内只算一次:页面切换动画结束时 PageTransition 会把整页重新挂载一次
// (car-detail 的 load 跑两遍,第二遍在慢网络下可能晚好几秒),StrictMode 双调用同理。
// 换了页面(记了新的 pageview)即重新计数,离开再回来是新的一次浏览
const CAR_VIEW_DEDUP_MS = 30_000;
// 取登录 token 最多等这么久(session 过期时 getSession 会先刷新),超时按未登录上报
const TOKEN_TIMEOUT_MS = 1500;
const MAX_TOKEN = 4096;
const MAX_UTM = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- 纯函数(可单测) ----------

/** 本地 / 局域网主机名:localhost、回环、私网 IPv4、*.local */
export function isLocalHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "0.0.0.0" || h === "::1") return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/**
 * 是否上报:自动化浏览器(navigator.webdriver)恒关;NEXT_PUBLIC_ANALYTICS_DEV=1 强制开(本地调试);
 * 原生壳恒开(页面跑在 localhost 自定义 scheme 下);网页端仅生产构建且非本地域名。
 */
export function shouldTrack(env: {
  native: boolean;
  nodeEnv: string | undefined;
  devFlag: string | undefined;
  hostname: string;
  webdriver: boolean;
}): boolean {
  if (env.webdriver) return false;
  if (env.devFlag === "1") return true;
  if (env.native) return true;
  return env.nodeEnv === "production" && !isLocalHostname(env.hostname);
}

export interface SessionSource {
  /** 站外 referrer(origin + pathname),直接访问 / 站内为 null */
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

export interface StoredSession extends SessionSource {
  id: string;
  /** 最近一次上报时间(ms) */
  last: number;
}

const NO_SOURCE: SessionSource = {
  referrer: null,
  referrer_host: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
};

function param(params: URLSearchParams, key: string): string | null {
  const v = params.get(key)?.trim();
  return v ? truncateText(v, MAX_UTM) : null;
}

/**
 * 识别外部来源(只在整页加载后第一次上报时调用):站外 referrer + 当前 URL 的 utm_*;
 * 没有 utm_source 时按点击 id 推断(gclid/gbraid/wbraid → google/cpc,fbclid → facebook,
 * msclkid → bing/cpc,ttclid → tiktok),再没有就把 ref 参数当 utm_source。
 * 一样都没有 → null(直接访问 / 站内跳转)。
 */
export function inferSource(input: {
  referrer: string | null | undefined;
  /** 当前页面主机名(同站点的 referrer 不算来源) */
  hostname: string | null | undefined;
  search: string | URLSearchParams;
}): SessionSource | null {
  const ext = parseExternalReferrer(input.referrer, input.hostname);
  const params =
    typeof input.search === "string" ? new URLSearchParams(input.search) : input.search;
  let utmSource = param(params, "utm_source");
  let utmMedium = param(params, "utm_medium");
  const utmCampaign = param(params, "utm_campaign");
  if (!utmSource) {
    if (param(params, "gclid") || param(params, "gbraid") || param(params, "wbraid")) {
      utmSource = "google";
      utmMedium = utmMedium ?? "cpc";
    } else if (param(params, "fbclid")) {
      utmSource = "facebook";
    } else if (param(params, "msclkid")) {
      utmSource = "bing";
      utmMedium = utmMedium ?? "cpc";
    } else if (param(params, "ttclid")) {
      utmSource = "tiktok";
    } else {
      utmSource = param(params, "ref");
    }
  }
  if (!ext && !utmSource && !utmMedium && !utmCampaign) return null;
  return {
    referrer: ext?.referrer ?? null,
    referrer_host: ext?.host ?? null,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
  };
}

/** 来源是否相同:比较来源站点 + utm 三元组(referrer 具体路径不同不算换来源) */
export function isSameSource(a: SessionSource, b: SessionSource): boolean {
  return (
    (a.referrer_host ?? null) === (b.referrer_host ?? null) &&
    (a.utm_source ?? null) === (b.utm_source ?? null) &&
    (a.utm_medium ?? null) === (b.utm_medium ?? null) &&
    (a.utm_campaign ?? null) === (b.utm_campaign ?? null)
  );
}

/**
 * 会话续期 / 换新:
 * - 没有会话,或距上次上报超过 30 分钟 → 新会话(来源 = incoming,没有即直接访问);
 * - incoming 非空(整页加载后第一次上报且带外部来源)且与会话来源不同 → 新会话;
 * - 否则沿用会话与其来源,只刷新 last。
 */
export function resolveSession(
  stored: StoredSession | null,
  now: number,
  incoming: SessionSource | null,
  newId: () => string
): { session: StoredSession; isNew: boolean } {
  // 用绝对值:用户把系统时间往回调时也按超时处理,不会让旧会话一直续命
  const alive = !!stored && Math.abs(now - stored.last) <= SESSION_TIMEOUT_MS;
  if (stored && alive && (!incoming || isSameSource(stored, incoming))) {
    return { session: { ...stored, last: now }, isNew: false };
  }
  return { session: { id: newId(), last: now, ...(incoming ?? NO_SOURCE) }, isNew: true };
}

/** localStorage 里的会话 JSON → StoredSession(格式不对返回 null,当作没有会话) */
export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown> | null;
    if (!o || typeof o !== "object") return null;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) return null;
    if (typeof o.last !== "number" || !Number.isFinite(o.last)) return null;
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim() ? truncateText(v.trim(), max) : null;
    const referrer = str(o.referrer, MAX_REFERRER);
    return {
      id: o.id,
      last: o.last,
      referrer,
      // 旧格式没存 referrer_host 时从 referrer 补出来(比较来源要用)
      referrer_host:
        str(o.referrer_host, MAX_REFERRER_HOST) ??
        (referrer ? parseExternalReferrer(referrer, null)?.host ?? null : null),
      utm_source: str(o.utm_source, MAX_UTM),
      utm_medium: str(o.utm_medium, MAX_UTM),
      utm_campaign: str(o.utm_campaign, MAX_UTM),
    };
  } catch {
    return null;
  }
}

function formatUuid(b: Uint8Array): string {
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** v4 uuid:优先 crypto.randomUUID(只在安全上下文存在),否则 getRandomValues 拼 */
export function uuidv4(): string {
  try {
    if (typeof crypto !== "undefined") {
      if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
      if (typeof crypto.getRandomValues === "function") {
        return formatUuid(crypto.getRandomValues(new Uint8Array(16)));
      }
    }
  } catch {
    /* 落到下面的兜底 */
  }
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return formatUuid(b);
}

// ---------- 浏览器状态 ----------

// storage 不可用(隐私模式 / 被禁)时退回进程内变量,本次打开期间仍是同一访客 / 会话
let memVisitor: string | null = null;
let memSession: StoredSession | null = null;
// 整页加载后是否已识别过来源(模块级:SPA 内跳转不再读 document.referrer)
let sourceChecked = false;
let lastPageview: { path: string; at: number } | null = null;
let lastCarView: { carId: string; href: string; at: number } | null = null;
let enabled: boolean | null = null;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 存不下就只用进程内变量 */
  }
}

function nativeShell(): boolean {
  try {
    return isNative();
  } catch {
    return false;
  }
}

function trackingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (enabled === null) {
    enabled = shouldTrack({
      native: nativeShell(),
      nodeEnv: process.env.NODE_ENV,
      devFlag: process.env.NEXT_PUBLIC_ANALYTICS_DEV,
      hostname: window.location.hostname,
      webdriver: navigator.webdriver === true,
    });
  }
  return enabled;
}

function visitorId(): string {
  const stored = storageGet(VISITOR_KEY);
  if (stored && UUID_RE.test(stored)) {
    memVisitor = stored;
    return stored;
  }
  if (!memVisitor) memVisitor = uuidv4();
  storageSet(VISITOR_KEY, memVisitor);
  return memVisitor;
}

function readSession(): StoredSession | null {
  return parseStoredSession(storageGet(SESSION_KEY)) ?? memSession;
}

function writeSession(session: StoredSession): void {
  memSession = session;
  storageSet(SESSION_KEY, JSON.stringify(session));
}

/**
 * 原生壳的界面语言恒跟随系统(同 I18nProvider 的原生分支)。Provider 在自己的 effect 里才切换,
 * 晚于 tracker 的首个 effect,所以这里直接按系统语言算,避免每次启动的首个浏览记成 zh。
 */
function nativeUiLocale(fallback: string | null): string | null {
  try {
    return detectLocale(navigator.languages ?? [navigator.language]);
  } catch {
    return fallback;
  }
}

function currentPlatform(): AnalyticsPlatform {
  if (!nativeShell()) return "web";
  try {
    const p = getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

/** 登录态 access token(getSession 本地读取;取不到 / 超时 / 过长 → null,按未登录上报) */
async function accessToken(): Promise<string | null> {
  try {
    // 动态 import(同 lib/capacitor):模块加载时不创建 Supabase 客户端,纯函数部分可脱离环境变量单测
    const { supabase } = await import("@/lib/supabase");
    const res = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS)),
    ]);
    const token = res?.data.session?.access_token ?? null;
    return token && token.length <= MAX_TOKEN ? token : null;
  } catch {
    return null;
  }
}

function send(payload: TrackPayload | ClickEventPayload): void {
  const url = `${apiOrigin()}/api/vt`;
  const body = JSON.stringify(payload);
  // 网页端优先 sendBeacon(页面跳走也能发出;text/plain 免 CORS 预检)。
  // 原生壳页面不会被卸载,且跑在自定义 scheme 下,跨域 beacon 各平台表现不一,直接 fetch
  if (!nativeShell() && typeof navigator.sendBeacon === "function") {
    try {
      if (navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
    } catch {
      /* 退回 fetch */
    }
  }
  try {
    fetch(url, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "text/plain" },
      credentials: "omit",
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function report(
  type: AnalyticsEventType,
  where: TrackedPath,
  locale: string | null,
  carId: string | null,
  now: number
): void {
  // Chrome 预渲染(地址栏预测 / 书签栏悬停)时页面脚本照跑,但用户未必真的打开:
  // 等激活(prerenderingchange)再上报,时间按激活时刻;一直没激活就不记(同 Google Analytics 的默认做法)。
  // 来源识别 / 会话续期也推迟到激活后,预渲染期间不碰 storage
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener(
      "prerenderingchange",
      () => {
        try {
          report(type, where, locale, carId, Date.now());
        } catch {
          /* 埋点失败不影响页面 */
        }
      },
      { once: true }
    );
    return;
  }
  const firstReport = !sourceChecked;
  sourceChecked = true;
  const incoming = firstReport
    ? inferSource({
        referrer: document.referrer,
        hostname: window.location.hostname,
        search: window.location.search,
      })
    : null;
  const { session } = resolveSession(readSession(), now, incoming, uuidv4);
  writeSession(session);
  const native = nativeShell();
  const uiLocale = native ? nativeUiLocale(locale) : locale;

  const base: Omit<TrackPayload, "token"> = {
    type,
    visitor_id: visitorId(),
    session_id: session.id,
    path: where.path,
    route: where.route,
    query: where.query,
    hostname: native ? null : truncateText(window.location.hostname, 100) || null,
    locale: uiLocale ? truncateText(uiLocale, 10) : null,
    car_id: carId,
    referrer: session.referrer,
    utm_source: session.utm_source,
    utm_medium: session.utm_medium,
    utm_campaign: session.utm_campaign,
    platform: currentPlatform(),
    touch: (navigator.maxTouchPoints || 0) > 1,
  };
  // token 异步取,不阻塞调用方
  void accessToken()
    .then((token) => send({ ...base, token }))
    .catch(() => {});
}

// ---------- 对外 API ----------

/**
 * 页面浏览:由 components/analytics-tracker.tsx 在路径变化时调用。
 * rawPathname 为 next/navigation 的原始 pathname(带语言前缀),search 为当前查询串;
 * locale 为界面语言(网页端即路径语言;原生壳路径固定 /zh,上报时按系统语言另算)。
 */
export function trackPageview(input: {
  rawPathname: string;
  search: string;
  locale: string | null;
}): void {
  try {
    if (!trackingEnabled()) return;
    const where = normalizeTrackedPath(input.rawPathname, input.search);
    if (!isTrackablePath(where.path)) return;
    const now = Date.now();
    // StrictMode 双调用 / 重复 effect:同一路径 1 秒内只记一次
    if (lastPageview && lastPageview.path === where.path && now - lastPageview.at < PAGEVIEW_DEDUP_MS) {
      return;
    }
    lastPageview = { path: where.path, at: now };
    // 换了页面:之后同一辆车的浏览算新的一次
    lastCarView = null;
    report("pageview", where, input.locale ?? where.locale, null, now);
  } catch {
    /* 埋点失败不影响页面 */
  }
}

/**
 * 车辆浏览:车辆详情加载到数据时调用(手机浮层打开车辆不改 URL,只能单独打点)。
 * path / route 取当前地址,所以浮层里的浏览记录为「在哪个页面上打开的」。
 * 去重按「同一辆车 + 同一页面地址(含 query,区分原生壳的 /car?id=)+ 30 秒内」,见 CAR_VIEW_DEDUP_MS。
 */
export function trackCarView(carId: string, locale?: string | null): void {
  try {
    if (!carId || !UUID_RE.test(carId) || !trackingEnabled()) return;
    const where = normalizeTrackedPath(window.location.pathname, window.location.search);
    if (!isTrackablePath(where.path)) return;
    const now = Date.now();
    const id = carId.toLowerCase();
    const href = window.location.pathname + window.location.search;
    if (
      lastCarView &&
      lastCarView.carId === id &&
      lastCarView.href === href &&
      now - lastCarView.at < CAR_VIEW_DEDUP_MS
    ) {
      return;
    }
    lastCarView = { carId: id, href, at: now };
    report("car_view", where, locale ?? where.locale, id, now);
  } catch {
    /* 埋点失败不影响页面 */
  }
}

/**
 * 点击统计(写 click_events 表,supabase/click-events.sql)。沿用当前访客 / 会话,不识别来源、不去重(每次点击都算)。
 * 表还没建时服务端静默丢弃。
 */
function trackClick(
  input: Pick<ClickEventPayload, "kind" | "car_id" | "app" | "target">,
  locale: string | null | undefined
): void {
  try {
    if (!trackingEnabled()) return;
    if (input.car_id !== null && !UUID_RE.test(input.car_id)) return;
    const { session } = resolveSession(readSession(), Date.now(), null, uuidv4);
    writeSession(session);
    const uiLocale = nativeShell() ? nativeUiLocale(locale ?? null) : (locale ?? null);
    const base: Omit<ClickEventPayload, "token"> = {
      type: "click",
      kind: input.kind,
      visitor_id: visitorId(),
      session_id: session.id,
      car_id: input.car_id ? input.car_id.toLowerCase() : null,
      app: input.app,
      target: input.target,
      locale: uiLocale ? truncateText(uiLocale, 10) : null,
      platform: currentPlatform(),
    };
    void accessToken()
      .then((token) => send({ ...base, token }))
      .catch(() => {});
  } catch {
    /* 埋点失败不影响页面 */
  }
}

/** 车辆详情页联系按钮点击(微信 / KakaoTalk / LINE / WhatsApp / 短信),用来按界面语言调整 CONTACT_APP_ORDER */
export function trackContactClick(carId: string, app: ContactChannel, locale?: string | null): void {
  if (!carId) return;
  trackClick({ kind: "contact", car_id: carId, app, target: null }, locale);
}

/** 详情页卖家卡片的车行贷款标签被点开(看解释) */
export function trackFinancingTagClick(carId: string, tag: FinancingTag, locale?: string | null): void {
  if (!carId) return;
  trackClick({ kind: "financing_tag", car_id: carId, app: null, target: tag }, locale);
}

/** 列表筛选开关被打开(只记打开,关掉不记) */
export function trackFilterChipClick(chip: TrackedFilterChip, locale?: string | null): void {
  trackClick({ kind: "filter_chip", car_id: null, app: null, target: chip }, locale);
}

/** 偏好设置页(/account/setup)的回答,验证「三问各自的选择分布」假设;邮编从不上报 */
export function trackSetupAnswer(target: SetupAnswerTarget, locale?: string | null): void {
  trackClick({ kind: "setup_answer", car_id: null, app: null, target }, locale);
}

/** 私信交易提示:显示(每条消息每个会话期只记一次,由调用方去重)/ 点了提示里的「举报」;不上报消息内容 */
export function trackScamNotice(target: ScamNoticeTarget, locale?: string | null): void {
  trackClick({ kind: "scam_notice", car_id: null, app: null, target }, locale);
}

/** 注册后 onboarding:看到第 N 页 / 在第 N 页跳过 / 走完;不带任何个人信息 */
export function trackOnboarding(target: OnboardingTarget, locale?: string | null): void {
  trackClick({ kind: "onboarding", car_id: null, app: null, target }, locale);
}
