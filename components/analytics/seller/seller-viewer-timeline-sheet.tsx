"use client";

// 某位浏览者在本账号车辆上的浏览记录(右侧 Sheet,手机全宽):不限时间范围(受 180 天保留期限制),
// 只含该卖家名下车辆的浏览,看不到他在站内别处的足迹(seller_analytics_viewer_timeline)。
// 打开它的那一行受数据面板的时间范围与筛选限制,这里不受,两边次数可能不同:面板头部写明范围。
// 同一天、环境相同(地区 / 设备 / 来源 / 登录状态)的相邻浏览归为一组:组头显示日期与环境,组内逐条列时间 + 车辆。
// RPC 没有游标,「加载更多」= 加大条数重拉(上限 500)。

import { useEffect, useState } from "react";
import Link from "@/components/localized-navigation";
import { History, Loader2, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { carLink } from "@/lib/static-link";
import { formatPrice } from "@/lib/format";
import { fetchSellerViewerTimeline } from "@/lib/analytics/seller";
import type { SellerViewerEvent, SellerViewerRow } from "@/lib/analytics/types";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerAnalyticsNotice } from "@/components/analytics/seller/seller-notice";
import {
  CarThumb,
  SellerViewerIdentity,
  ViewerBadge,
  carName,
  clockTime,
  dayLabel,
  fullDateTime,
  viewerMeta,
  viewsText,
} from "@/components/analytics/seller/seller-viewer";

/** 卖家各浏览面板共用的 Sheet 样式:右侧,手机全宽,桌面 32rem(挂在 body 下,自带等宽字体) */
export const SELLER_SHEET_CLASS =
  "gap-0 p-0 font-mono data-[side=right]:w-full data-[side=right]:sm:max-w-lg";

const PAGE = 100;
const MAX_ROWS = 500; // RPC 的 p_limit 上限
// 事件保留天数:与 supabase/analytics.sql 的 pg_cron 任务 analytics-retention(删除 180 天前的事件)一致,改动需同步
const RETENTION_DAYS = 180;

export function SellerViewerTimelineSheet({
  sellerId,
  viewer,
  onOpenChange,
}: {
  sellerId: string;
  /** 非空即打开 */
  viewer: SellerViewerRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  // 关闭动画期间 viewer 已置空:保留上一次的内容,避免面板先变空再滑出
  const [shown, setShown] = useState<SellerViewerRow | null>(viewer);
  if (viewer && (!shown || shown.viewer_key !== viewer.viewer_key)) {
    setShown(viewer);
  }

  return (
    <Sheet open={!!viewer} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className={SELLER_SHEET_CLASS}>
        {shown && <TimelineBody key={shown.viewer_key} sellerId={sellerId} viewer={shown} />}
      </SheetContent>
    </Sheet>
  );
}

interface Loaded {
  /** 对应的请求(条数上限 | 第几次尝试),与当前不同即「加载中」 */
  key: string;
  /** 成功拉到这批数据时用的条数上限 */
  limit: number;
  rows: SellerViewerEvent[];
  error: unknown;
  /** 拉取完成的时刻:日期标题判断跨年用(渲染期不读 Date.now()) */
  now: number;
}

interface VisitGroup {
  sig: string;
  /** 时间倒序 */
  rows: SellerViewerEvent[];
}

/** 本地同一天、环境相同的相邻浏览归为一组(rows 已按时间倒序) */
function groupVisits(rows: SellerViewerEvent[]): VisitGroup[] {
  const out: VisitGroup[] = [];
  for (const r of rows) {
    const d = new Date(r.created_at);
    const sig = [
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      r.logged_in,
      r.country,
      r.region,
      r.city,
      r.device,
      r.browser,
      r.os,
      r.platform,
      r.referrer_host,
      r.utm_source,
    ].join("|");
    const last = out[out.length - 1];
    if (last && last.sig === sig) last.rows.push(r);
    else out.push({ sig, rows: [r] });
  }
  return out;
}

function TimelineBody({ sellerId, viewer }: { sellerId: string; viewer: SellerViewerRow }) {
  const { t, locale } = useI18n();
  const [limit, setLimit] = useState(PAGE);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${limit}|${attempt}`;

  useEffect(() => {
    let cancelled = false;
    const reqKey = `${limit}|${attempt}`;
    fetchSellerViewerTimeline(sellerId, viewer.viewer_key, limit).then(
      (res) => {
        if (!cancelled) setLoaded({ key: reqKey, limit, rows: res.rows ?? [], error: null, now: Date.now() });
      },
      (error: unknown) => {
        if (cancelled) return;
        const now = Date.now();
        // 加载更多失败:保留已拉到的记录,只在列表下方提示
        setLoaded((prev) => ({
          key: reqKey,
          limit: prev?.limit ?? limit,
          rows: prev?.rows ?? [],
          error,
          now: prev?.now ?? now,
        }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sellerId, viewer.viewer_key, limit, attempt]);

  const loading = loaded?.key !== key;
  const rows = loaded?.rows ?? [];
  const error = loaded && !loading ? loaded.error : null;
  const capped = rows.length >= MAX_ROWS;
  const hasMore = !!loaded && rows.length >= loaded.limit && !capped;
  const groups = groupVisits(rows);
  const cars = new Set(rows.map((r) => r.car_id).filter(Boolean)).size;

  let description: string;
  if (loaded && rows.length > 0) {
    description = [
      viewsText(rows.length, t, locale, hasMore),
      cars > 1 ? t("看了 {n} 辆车", { n: cars }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } else if (error) {
    description = t("加载失败");
  } else if (loaded) {
    description = t("暂无浏览记录");
  } else {
    description = t("加载中...");
  }

  return (
    <>
      <SheetHeader
        className="flex-row items-start gap-2 border-b border-border px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <History className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t("浏览记录")}
          </SheetTitle>
          <SellerViewerIdentity row={viewer} size="md" />
          <SheetDescription className="text-[10px] leading-relaxed">
            {description}
            {/* 范围说明常驻(加载前后头部高度不变) */}
            <span className="block">
              {t("近 {n} 天内的全部浏览,不受时间范围与筛选影响", { n: RETENTION_DAYS })}
            </span>
          </SheetDescription>
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon-sm" className="-mr-1 shrink-0" aria-label={t("关闭")}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </SheetClose>
      </SheetHeader>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        {!loaded ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : rows.length === 0 ? (
          error ? (
            <SellerAnalyticsNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
          ) : (
            <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无浏览记录")}</p>
          )
        ) : (
          <>
            {groups.map((g) => (
              <VisitCard key={`${g.sig}|${g.rows[0].created_at}`} group={g} now={loaded.now} />
            ))}
            {error ? (
              <SellerAnalyticsNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
            ) : hasMore ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs"
                disabled={loading}
                onClick={() => setLimit((l) => Math.min(MAX_ROWS, l + PAGE))}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("加载更多")}
              </Button>
            ) : (
              <p className="py-2 text-center text-[10px] text-muted-foreground">
                {capped ? t("仅显示最近 {n} 条", { n: MAX_ROWS }) : t("没有更早的记录了")}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** 一组浏览:组头(日期、登录状态、本组次数、地区 / 设备 / 来源)+ 逐条车辆 */
function VisitCard({ group, now }: { group: VisitGroup; now: number }) {
  const { t, locale } = useI18n();
  const latest = group.rows[0];
  return (
    <section className="overflow-hidden rounded-xl bg-card">
      <header className="space-y-1 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-medium">{dayLabel(latest.created_at, locale, now)}</span>
          <ViewerBadge loggedIn={latest.logged_in} />
          <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
            {viewsText(group.rows.length, t, locale)}
          </span>
        </div>
        {/* break-keep:中日韩文只在空格处折行 */}
        <p className="text-[10px] leading-relaxed break-words break-keep text-muted-foreground">
          {viewerMeta(latest, t, locale, true)}
        </p>
      </header>
      <ol className="divide-y divide-border/40 py-0.5">
        {group.rows.map((r, i) => (
          <li key={`${r.created_at}|${r.car_id ?? ""}|${i}`}>
            <VisitRow row={r} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 单次浏览:时间 + 车辆缩略图 / 标题 / 价格(点开车辆页) */
function VisitRow({ row }: { row: SellerViewerEvent }) {
  const { t, locale } = useI18n();
  const inner = (
    <>
      <CarThumb car={row.car} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{carName(row.car, t, locale)}</span>
        {row.car?.price != null && (
          <span className="block truncate text-[10px] text-muted-foreground">{formatPrice(row.car.price)}</span>
        )}
      </span>
    </>
  );
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-1.5 text-[11px]">
      <time
        dateTime={row.created_at}
        title={fullDateTime(row.created_at, locale)}
        className="shrink-0 whitespace-nowrap text-muted-foreground tabular-nums"
      >
        {clockTime(row.created_at, locale)}
      </time>
      {row.car_id && row.car ? (
        <Link href={carLink(row.car_id)} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
          {inner}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2">{inner}</span>
      )}
    </div>
  );
}
