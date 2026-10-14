"use client";

// 卖家视角的浏览者展示(数据面板浏览者列表 / 车辆浏览者面板 / 浏览记录共用)与几个格式化小工具。
// 浏览者默认匿名:「访客 #<viewer_key 前 6 位>」+「已登录用户 / 游客」标;viewer_key 是按卖家加盐的哈希,
// 不是访客 id。库里打开身份开关(analytics_seller_identity_enabled)后 RPC 才返回用户名 / 头像,这里只按返回值展示。
// 卖家界面不出现任何后台链接。

import { Car, UserRound } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { avatarUrl } from "@/lib/avatar";
import { carTitle, dateLocale, type Locale } from "@/lib/i18n";
import { countryFlag, formatGeo, type GeoParts } from "@/lib/analytics/geo";
import { deviceLabel, formatNumber, platformLabel, relativeTime } from "@/components/analytics/format";
import type { AnalyticsCarInfo, SellerViewerRow } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

type IdentityFields = Pick<SellerViewerRow, "viewer_key" | "user_id" | "username" | "avatar_url" | "logged_in">;

interface DeviceFields {
  device: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
}

interface GeoSourceFields extends DeviceFields {
  country: string | null;
  region: string | null;
  city: string | null;
  referrer_host: string | null;
  utm_source: string | null;
}

/** 匿名浏览者短标识:「访客 #3f9a1c」 */
export function viewerLabel(viewerKey: string, t: TFn): string {
  return t("访客 #{id}", { id: viewerKey.slice(0, 6) });
}

/** 显示名:RPC 返回了用户(身份开关开且浏览时已登录)→ 用户名,否则匿名标识 */
export function viewerName(row: Pick<SellerViewerRow, "viewer_key" | "user_id" | "username">, t: TFn): string {
  return (row.user_id && row.username) || viewerLabel(row.viewer_key, t);
}

/** 车辆标题:多语言标题都缺时用「年份 品牌 车型」;车已删除显示「已删除车辆」 */
export function carName(car: AnalyticsCarInfo | null, t: TFn, locale: Locale): string {
  if (!car) return t("已删除车辆");
  return carTitle(car, locale) || [car.year, car.make, car.model].filter(Boolean).join(" ") || t("车辆");
}

/** "手机 · iOS App";detailed 再带浏览器与系统("手机 · Safari · iOS") */
export function deviceText(row: DeviceFields, t: TFn, detailed = false): string {
  return [
    row.device ? deviceLabel(row.device, t) : null,
    detailed ? row.browser : null,
    detailed ? row.os : null,
    row.platform && row.platform !== "web" ? platformLabel(row.platform, t) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 来源:外链域名 > utm 来源 > 直接访问 */
export function sourceText(row: Pick<GeoSourceFields, "referrer_host" | "utm_source">, t: TFn): string {
  return row.referrer_host || row.utm_source || t("直接访问");
}

/** 「🇺🇸 Flushing, NY」;旗帜后用不换行空格,摘要折行时旗帜不会单独留在上一行。全空为「未知地区」 */
export function placeText(geo: GeoParts, t: TFn, locale: Locale): string {
  return [countryFlag(geo.country), formatGeo(geo, locale)].filter(Boolean).join("\u00a0") || t("未知地区");
}

/**
 * 一行摘要:「🇺🇸 Flushing, NY · 手机 · 访问来源: google.com」(「来源」在 ko / ja 词典里是贷款机构,用专门的 key)。
 * 允许折行的地方配 break-keep:中日韩文只在空格处换行,不会拆成「访问来 / 源」「유입 경 / 로」
 */
export function viewerMeta(row: GeoSourceFields, t: TFn, locale: Locale, detailed = false): string {
  return [
    placeText(row, t, locale),
    deviceText(row, t, detailed),
    `${t("访问来源")}: ${sourceText(row, t)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * 「N 次浏览」。en / es / fr 的「{n} 次浏览」只有复数译文,恰好 1 次时改用「1 次浏览」(1 view / 1 vista / 1 vue);
 * more = 还有没拉完的记录,数字后带「+」(「100+ 次浏览」)
 */
export function viewsText(n: number, t: TFn, locale: Locale, more = false): string {
  if (n === 1 && !more) return t("1 次浏览");
  return t("{n} 次浏览", { n: `${formatNumber(n, locale)}${more ? "+" : ""}` });
}

/** 24 小时制 "14:03"(各语言等宽,列表对齐) */
export function clockTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(dateLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** 完整时间(悬停提示) */
export function fullDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** 日期标题「10月12日周日」/ "Sun, Oct 12";不在 nowMs 那一年时带年份 */
export function dayLabel(iso: string, locale: Locale, nowMs: number): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date(nowMs).getFullYear();
  return d.toLocaleDateString(dateLocale(locale), {
    year: sameYear ? undefined : "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

/** 车辆缩略图(默认 32×24),无图 / 已删除时显示车辆图标 */
export function CarThumb({ car, className = "h-6 w-8" }: { car: AnalyticsCarInfo | null; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted", className)}>
      {car?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={car.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Car className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      )}
    </span>
  );
}

/** 头像:有用户(身份开关开)用其头像,否则通用人形图标 */
export function ViewerAvatar({
  row,
  size = "sm",
}: {
  row: Pick<SellerViewerRow, "user_id" | "username" | "avatar_url">;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-8 w-8" : "h-7 w-7";
  if (row.user_id) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl(row.avatar_url, row.username || row.user_id)}
        alt=""
        loading="lazy"
        className={cn(box, "shrink-0 rounded-full bg-muted object-cover")}
      />
    );
  }
  return (
    <span className={cn(box, "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground")}>
      <UserRound className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

/** 「已登录用户」/「游客」:浏览时是否处于登录态 */
export function ViewerBadge({ loggedIn }: { loggedIn: boolean }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "max-w-full shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px]",
        loggedIn ? "bg-primary/30 text-brand-ink" : "bg-muted text-muted-foreground"
      )}
    >
      {loggedIn ? t("已登录用户") : t("游客")}
    </span>
  );
}

/**
 * 名字 + 登录标:放不下时登录标折到名字下一行,名字只在独占一行仍放不下时才截断 ——
 * 否则窄屏 + 较长的译文(fr「Utilisateur connecté」)会把「访客 #3f9a1c」挤成「Visiteur #…」,列表里分不清谁是谁
 */
function NameWithBadge({ row, className }: { row: IdentityFields; className: string }) {
  const { t } = useI18n();
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className={cn("max-w-full truncate font-medium", className)}>{viewerName(row, t)}</span>
      {!row.user_id && <ViewerBadge loggedIn={row.logged_in} />}
    </span>
  );
}

/** 头像 + 名字(匿名时再带登录标);面板标题处用 md */
export function SellerViewerIdentity({ row, size = "sm" }: { row: IdentityFields; size?: "sm" | "md" }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ViewerAvatar row={row} size={size} />
      <NameWithBadge row={row} className={size === "md" ? "text-sm" : "text-xs"} />
    </span>
  );
}

/**
 * 浏览者列表的一行(整行是按钮,打开浏览记录):身份 + 最近看的车(showCar)+ 地区 / 设备 / 来源;
 * 右侧浏览次数与最近浏览时间。now = 数据拉取时刻,相对时间的基准(渲染期不读 Date.now())。
 */
export function SellerViewerItem({
  row,
  now,
  onOpen,
  showCar = true,
}: {
  row: SellerViewerRow;
  now: number;
  onOpen: () => void;
  showCar?: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full min-w-0 items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted/60"
    >
      <span className="mt-0.5 flex shrink-0">
        <ViewerAvatar row={row} />
      </span>
      <span className="min-w-0 flex-1">
        <NameWithBadge row={row} className="text-xs" />
        {showCar && row.last_car && (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px]">
            <Car className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{carName(row.last_car, t, locale)}</span>
            {row.cars_viewed > 1 && (
              <span className="shrink-0 text-muted-foreground">· {t("看了 {n} 辆车", { n: row.cars_viewed })}</span>
            )}
          </span>
        )}
        {/* 最多两行:手机上地区 + 设备就占满一行,单行截断会把来源整个截掉;不能再加 block(会覆盖 line-clamp 的 display)。
            break-keep:中日韩文只在空格处折行(不拆成「访问来 / 源」) */}
        <span className="mt-0.5 line-clamp-2 break-words break-keep text-[10px] text-muted-foreground">
          {viewerMeta(row, t, locale)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-xs font-medium whitespace-nowrap tabular-nums">
          {viewsText(row.views, t, locale)}
        </span>
        <time
          dateTime={row.last_viewed}
          title={fullDateTime(row.last_viewed, locale)}
          className="mt-0.5 block text-[10px] whitespace-nowrap text-muted-foreground"
        >
          {relativeTime(row.last_viewed, t, locale, now)}
        </time>
      </span>
    </button>
  );
}
