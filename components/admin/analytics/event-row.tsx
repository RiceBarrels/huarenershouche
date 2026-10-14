"use client";

// 访问统计的单条事件(访客时间线 / 用户详情「浏览记录」共用)与几个小工具:
// 事件页面的站内链接、会话来源、设备摘要、时间格式、车辆详情页 pageview 去重。

import Link from "@/components/localized-navigation";
import { Car, FileText } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { carTitle, dateLocale, type Locale } from "@/lib/i18n";
import {
  adminUserLink,
  carEditLink,
  carLink,
  communityPostLink,
  qaQuestionLink,
  userLink,
} from "@/lib/static-link";
import { deviceLabel, formatNumber, platformLabel } from "@/components/analytics/format";
import type { AnalyticsCarInfo, AnalyticsEventRow } from "@/lib/analytics/types";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

// 动态路由 → 站内链接(静态导出时自动换成 ?id= 形式)
const ROUTE_LINKS: Record<string, (id: string) => string> = {
  "/car/[id]": carLink,
  "/car/[id]/edit": carEditLink,
  "/user/[id]": userLink,
  "/community/[id]": communityPostLink,
  "/qa/[id]": qaQuestionLink,
  "/admin/user/[id]": adminUserLink,
};

// 用来判断「是否仍是本站相对路径」的占位源(不发请求)
const SAME_ORIGIN_BASE = "https://same-origin.invalid";

/** 按浏览器的解析规则仍落在本站的路径:"//host"、"/\host"(含被剥掉的制表 / 换行)都会跳到站外 */
function isSameOriginPath(href: string): boolean {
  if (!href.startsWith("/")) return false;
  try {
    return new URL(href, SAME_ORIGIN_BASE).origin === SAME_ORIGIN_BASE;
  } catch {
    return false;
  }
}

/**
 * 事件所在页面的站内链接(带上记录下来的 query)。
 * 路径来自公开的 /api/vt:不是本站相对路径(手工构造的 "//evil.example" 等)时返回 null,调用方只显示文字。
 */
export function eventHref(row: Pick<AnalyticsEventRow, "path" | "route" | "query">): string | null {
  let href = row.path || "/";
  const route = row.route;
  // 私信对话页只记路由、不存对方 id:链到收件箱
  if (route === "/messages/[userId]") href = "/messages";
  const toLink = route ? ROUTE_LINKS[route] : undefined;
  if (route && toLink) {
    const id = row.path.split("/")[route.split("/").indexOf("[id]")];
    if (id) href = toLink(id);
  }
  if (!isSameOriginPath(href)) return null;
  if (row.query) href += (href.includes("?") ? "&" : "?") + row.query;
  return href;
}

/** 会话来源(紧凑):外链域名 > utm 来源 / 媒介 > 直接访问 */
export function sourceLabel(
  row: { referrer_host: string | null; utm_source: string | null; utm_medium?: string | null },
  t: TFn
): string {
  if (row.referrer_host) return row.referrer_host;
  if (row.utm_source) return [row.utm_source, row.utm_medium].filter(Boolean).join(" / ");
  return t("直接访问");
}

/** "手机 · Safari · iOS";原生 App 再补平台 */
export function deviceSummary(
  row: { device: string | null; browser: string | null; os: string | null; platform: string | null },
  t: TFn
): string {
  return [
    row.device ? deviceLabel(row.device, t) : null,
    row.browser,
    row.os,
    row.platform && row.platform !== "web" ? platformLabel(row.platform, t) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 24 小时制 "14:03"(各语言等宽,列表对齐) */
export function clockTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(dateLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** "10/05 14:03" */
export function shortDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocale(locale), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** 完整时间(tooltip) */
export function fullDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

/**
 * 车辆详情页一次访问会先记 pageview(/car/<id>),车辆加载完再记 car_view:
 * 时间线里隐藏前者,只留带车辆信息的那条(同会话、同路径、5 分钟内)。
 */
export function dropCarDetailPageviews(rows: AnalyticsEventRow[]): AnalyticsEventRow[] {
  const carViews = rows.filter((r) => r.type === "car_view");
  if (carViews.length === 0) return rows;
  return rows.filter((r) => {
    if (r.type !== "pageview" || r.route !== "/car/[id]") return true;
    const at = new Date(r.created_at).getTime();
    return !carViews.some(
      (c) =>
        c.session_id === r.session_id &&
        c.path === r.path &&
        Math.abs(new Date(c.created_at).getTime() - at) < 5 * 60_000
    );
  });
}

/** 车辆缩略图(默认 32×24),无图/已删除时显示车辆图标 */
export function CarThumb({ car, className = "h-6 w-8" }: { car: AnalyticsCarInfo | null; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ${className}`}>
      {car?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={car.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Car className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      )}
    </span>
  );
}

export interface EventRowProps {
  row: AnalyticsEventRow;
  /** 时间带日期(跨天的紧凑列表用);时间线里会话头已有日期,只显示时分 */
  showDate?: boolean;
  /** 未登录状态的事件加「未登录」标(用户轨迹里区分登录前的匿名浏览) */
  markAnonymous?: boolean;
}

/** 单条事件:时间 + 页面路径(新标签打开)或 车辆缩略图 + 标题 */
export function EventRow({ row, showDate = false, markAnonymous = false }: EventRowProps) {
  const { t, locale } = useI18n();

  let body: React.ReactNode;
  if (row.type === "car_view") {
    // 手机端浮层看车不改 URL,path 是打开浮层时所在的页面
    const onDetailPage = !!row.car_id && row.path === `/car/${row.car_id}`;
    const sub = [
      row.car?.price != null ? `$${formatNumber(row.car.price, locale)}` : null,
      onDetailPage ? null : t("在 {path} 中打开", { path: row.path }),
    ]
      .filter(Boolean)
      .join(" · ");
    const inner = (
      <>
        <CarThumb car={row.car} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {row.car ? carTitle(row.car, locale) || t("车辆") : t("已删除车辆")}
          </span>
          {sub && <span className="block truncate text-[10px] text-muted-foreground">{sub}</span>}
        </span>
      </>
    );
    body = row.car_id ? (
      <Link
        href={carLink(row.car_id)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
      >
        {inner}
      </Link>
    ) : (
      <span className="flex min-w-0 flex-1 items-center gap-2">{inner}</span>
    );
  } else {
    const full = row.query ? `${row.path}?${row.query}` : row.path;
    const href = eventHref(row);
    const inner = (
      <>
        <span className="flex h-6 w-8 shrink-0 items-center justify-center text-muted-foreground">
          <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {row.path}
          {row.query ? <span className="text-muted-foreground">?{row.query}</span> : null}
        </span>
      </>
    );
    // 不是本站路径(伪造的站外地址)只显示文字,不给链接
    body = href ? (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={full}
        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
      >
        {inner}
      </Link>
    ) : (
      <span className="flex min-w-0 flex-1 items-center gap-2" title={full}>
        {inner}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-1.5 text-[11px]">
      <time
        dateTime={row.created_at}
        title={fullDateTime(row.created_at, locale)}
        className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground"
      >
        {showDate ? shortDateTime(row.created_at, locale) : clockTime(row.created_at, locale)}
      </time>
      {body}
      {markAnonymous && !row.user_id && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {t("未登录")}
        </span>
      )}
    </div>
  );
}
