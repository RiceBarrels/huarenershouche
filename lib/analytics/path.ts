// 第一方访问统计:路径 / 来源规范化(纯函数,无 DOM 依赖;客户端埋点与 /api/vt 共用,可单测)。
// - 去语言前缀与末尾 "/",静态导出(Capacitor)的 ?id= 路由还原成动态路径;
// - 归纳路由模式(/car/[id]),按页面类型聚合用;私信对话页只记路由,不存对方 id;
// - query 去掉 utm_* / 点击 id / 收件人级追踪 id / 地图精确坐标 / 登录回调等敏感参数;
// - referrer 只认站外来源,只留 origin + pathname。

import { localeFromPath, stripLocale } from "@/lib/i18n";

export interface TrackedPath {
  /** 去语言前缀、不含 query 的逻辑路径:/car/<id> */
  path: string;
  /** 路由模式:/car/[id];无动态段时等于 path */
  route: string;
  /** 清洗后的查询串(不含 "?"),空为 null */
  query: string | null;
  /** 路径上的语言前缀,没有为 null */
  locale: string | null;
}

export const MAX_PATH = 512;
export const MAX_ROUTE = 200;
export const MAX_QUERY = 500;
export const MAX_REFERRER = 500;
export const MAX_REFERRER_HOST = 200;

/** 截断但不劈开代理对(孤立代理项写库会报错) */
export function truncateText(s: string, max: number): string {
  if (s.length <= max) return s;
  let end = max;
  const c = s.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end -= 1;
  return s.slice(0, end);
}

// ---------- 路径 ----------

// 静态导出(原生壳)没有动态段,详情页走 query:/car?id=X → /car/X
const STATIC_QUERY_ROUTES = new Map<string, { param: string; to: (id: string) => string }>([
  ["/car", { param: "id", to: (id) => `/car/${id}` }],
  ["/car/edit", { param: "id", to: (id) => `/car/${id}/edit` }],
  ["/user", { param: "id", to: (id) => `/user/${id}` }],
  ["/community", { param: "id", to: (id) => `/community/${id}` }],
  ["/qa", { param: "id", to: (id) => `/qa/${id}` }],
  ["/messages", { param: "userId", to: (id) => `/messages/${id}` }],
  ["/admin/user", { param: "id", to: (id) => `/admin/user/${id}` }],
]);

// 还原用的 id 只接受 uuid / slug 形态,怪异参数留在 query 里,不污染路径维度
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** 逻辑路径 → 路由模式(按段匹配;其余路径原样返回) */
export function routeOf(path: string): string {
  const s = path.split("/").filter(Boolean);
  switch (s[0]) {
    case "car":
      // /car/edit 是静态导出的编辑页,不是 id
      if (s.length === 2 && s[1] !== "edit") return "/car/[id]";
      if (s.length === 3 && s[2] === "edit") return "/car/[id]/edit";
      break;
    case "user":
      if (s.length === 2) return "/user/[id]";
      if (s.length === 3 && (s[2] === "posts" || s[2] === "reviews")) return `/user/[id]/${s[2]}`;
      break;
    case "community":
      if (s.length === 2 && s[1] !== "new") return "/community/[id]";
      break;
    case "qa":
      if (s.length === 2 && s[1] !== "ask") return "/qa/[id]";
      break;
    case "messages":
      if (s.length === 2) return "/messages/[userId]";
      break;
    case "admin":
      if (s.length === 3 && s[1] === "user") return "/admin/user/[id]";
      break;
    case "cars":
      if (s.length >= 2) return "/cars/[...slug]";
      break;
  }
  return path;
}

// 私信对话页 /messages/<对方 id> 只记路由:对方 id 会暴露「谁在和谁私信」(会话 / 消息表连管理员都不给读),
// 统计只需要路由级计数。服务端 parseTrackPayload 会再收一次,旧版 App 包 / 手工请求同样生效
const MESSAGES_ROUTE = "/messages/[userId]";

/** 隐私脱敏:私信对话页的路径只保留路由模式,其余路径原样返回 */
export function redactTrackedPath(path: string): string {
  return routeOf(path) === MESSAGES_ROUTE ? MESSAGES_ROUTE : path;
}

// 不进统计的 query 键(按小写比较):投放参数(会话来源单独记)、广告点击 id、
// 能定位到具体收件人 / 分享者 / 单次点击的追踪 id、私信会话与对方 id、登录回调 / 个人信息等敏感参数
const DROPPED_QUERY_KEYS = new Set([
  // 投放 / 广告点击 id
  "gclid",
  "gbraid",
  "wbraid",
  "dclid",
  "gad_source",
  "gad_campaignid",
  "fbclid",
  "msclkid",
  "ttclid",
  "twclid",
  "li_fat_id",
  "rdt_cid",
  "sccid",
  "epik",
  "yclid",
  "ref",
  // 收件人 / 分享者级追踪 id:Google 商品结果、GA 跨域 linker、Instagram 分享、
  // Mailchimp / HubSpot / Marketo / Klaviyo 邮件
  "srsltid",
  "_gl",
  "igsh",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "__hstc",
  "__hssc",
  "__hsfp",
  "mkt_tok",
  "_kx",
  // 私信:会话 id、静态导出里没能还原进路径的对方 id(同 redactTrackedPath)
  "conv",
  "userid",
  // 精确位置:地图找车首次打开时按设备定位居中,把 pos=纬度,经度,缩放 写进 URL(5 位小数 ≈ 1 米);
  // 统计只按 IP 记大致地区,坐标类参数一律不存。其余几个键目前没有页面用,先一并挡住
  "pos",
  "lat",
  "lng",
  "lon",
  "latitude",
  "longitude",
  "coords",
  "center",
  "bbox",
  "bounds",
  // 登录回调 / 个人信息
  "code",
  "state",
  "token",
  "token_hash",
  "access_token",
  "refresh_token",
  "type",
  "error",
  "error_code",
  "error_description",
  "email",
  "phone",
  "password",
  "otp",
  "key",
  "api_key",
  "secret",
]);

// 可读优先:只转义会破坏结构的字符与控制字符(%00 解码出的 NUL 写库会报错),中文等原样保留(后台直接展示)。
// 输出再交给 sanitizeQuery 解析一遍结果不变(服务端会对客户端送来的 query 重跑一次)。
// 不用 \p{Cc}:默认 browserslist 里的旧 Firefox 不认,解析期报错会连带整个 chunk
function encodeQueryPart(s: string): string {
  return s.replace(/[%&=+#\s\u0000-\u001f\u007f-\u009f]/g, (c) => encodeURIComponent(c));
}

/** 去掉投放 / 追踪 / 敏感参数后按原顺序序列化(不含 "?"),空为 null */
export function sanitizeQuery(params: URLSearchParams): string | null {
  const parts: string[] = [];
  params.forEach((value, key) => {
    const k = key.trim().toLowerCase();
    if (!k || k.startsWith("utm_") || DROPPED_QUERY_KEYS.has(k)) return;
    parts.push(`${encodeQueryPart(key)}=${encodeQueryPart(value)}`);
  });
  if (parts.length === 0) return null;
  return truncateText(parts.join("&"), MAX_QUERY);
}

function safeDecodeURI(s: string): string {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

/**
 * 原始 pathname(带语言前缀)+ 查询串 → 统计用的路径 / 路由 / query。
 * "/en/car?id=X&utm_source=a" → { path: "/car/X", route: "/car/[id]", query: null, locale: "en" }
 */
export function normalizeTrackedPath(
  rawPathname: string,
  search: string | URLSearchParams
): TrackedPath {
  let raw = typeof rawPathname === "string" && rawPathname ? rawPathname : "/";
  const cut = raw.search(/[?#]/);
  if (cut >= 0) raw = raw.slice(0, cut);
  if (!raw.startsWith("/")) raw = `/${raw}`;
  const locale = localeFromPath(raw);

  let path = safeDecodeURI(stripLocale(raw))
    // decodeURI 会把 %5C 解成反斜杠:当斜杠处理再合并,免得 "/\evil.example" 在后台成了站外链接(服务端同口径)
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    // 原生壳直接加载导出文件时可能带 .html
    .replace(/(?:\/index)?\.html$/i, "")
    .replace(/\/+$/, "");
  if (!path.startsWith("/")) path = `/${path}`;

  // 复制一份,不改调用方的(useSearchParams 是只读的)
  const params = new URLSearchParams(typeof search === "string" ? search : search.toString());
  const sq = STATIC_QUERY_ROUTES.get(path);
  if (sq) {
    const id = params.get(sq.param)?.trim();
    if (id && SAFE_ID_RE.test(id)) {
      path = sq.to(id);
      params.delete(sq.param);
    }
  }

  path = truncateText(redactTrackedPath(path), MAX_PATH);
  return {
    path,
    route: truncateText(routeOf(path), MAX_ROUTE),
    query: sanitizeQuery(params),
    locale,
  };
}

/** 不进统计的路径:管理后台、OAuth 回调、API */
export function isTrackablePath(path: string): boolean {
  const p = stripLocale(path || "/");
  return !/^\/(?:admin|auth|api)(?:\/|$)/.test(p);
}

// ---------- 来源(referrer) ----------

/** 小写、去 "www." 与末尾 "." 的主机名 */
export function bareHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

/** 本站域名(clcauto.com 及其子域) */
export function isSiteHost(host: string): boolean {
  const h = bareHost(host);
  return h === "clcauto.com" || h.endsWith(".clcauto.com");
}

// 登录回跳这类「伪外链」:OAuth 授权页 / Supabase Auth 回调落地后 referrer 是它们,不算来源
export function isIgnoredReferrerHost(host: string): boolean {
  const h = bareHost(host);
  return (
    h === "accounts.google.com" ||
    h === "accounts.youtube.com" ||
    h === "appleid.apple.com" ||
    h === "supabase.co" ||
    h.endsWith(".supabase.co")
  );
}

// android-app://com.google.android.gm/ 这类 App 来源也算外链
const REFERRER_PROTOCOLS = new Set(["http:", "https:", "android-app:", "ios-app:"]);

/**
 * 站外来源:返回 origin + pathname 与去 www 的主机名;
 * 解析失败、非网页协议、本站 / 与当前页面同站点、登录回跳 → null。
 */
export function parseExternalReferrer(
  raw: string | null | undefined,
  pageHostname: string | null | undefined
): { referrer: string; host: string } | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!REFERRER_PROTOCOLS.has(u.protocol)) return null;
  const host = bareHost(u.hostname);
  if (!host) return null;
  if (isSiteHost(host) || isIgnoredReferrerHost(host)) return null;
  if (pageHostname && host === bareHost(pageHostname)) return null;
  return {
    // 不用 u.origin:非特殊协议(android-app:)的 origin 是 "null"
    referrer: truncateText(`${u.protocol}//${u.host}${u.pathname}`, MAX_REFERRER),
    host: truncateText(host, MAX_REFERRER_HOST),
  };
}
