"use client";

// 访客 / 用户的浏览轨迹(右侧 Sheet,手机全宽):按会话分组,会话头显示来源、地区、设备与登录状态,
// 每条事件显示页面路径或车辆;底部「加载更多」以最后一条的时间为游标往前翻。
// 按用户查时 = 本人登录时的事件 + 他用过的设备上未登录时的浏览(admin_analytics_timeline 的 p_user_id 语义);
// 同一设备上别的账号登录时的事件不算他的。按访客查是该设备的全部事件(共用设备上可能有多个账号),会话头标出登录的用户 @用户名。

import { useEffect, useState } from "react";
import Link from "@/components/localized-navigation";
import { Car, FileText, Loader2, Route, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { adminUserLink } from "@/lib/static-link";
import { fetchTimeline } from "@/lib/analytics/admin";
import { formatNumber, localeLabel, relativeTime, shortVisitorId } from "@/components/analytics/format";
import { placeText } from "@/components/analytics/seller/seller-viewer";
import type { AnalyticsEventRow } from "@/lib/analytics/types";
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
import { VisitorIdentity } from "@/components/admin/analytics/identity";
import { AnalyticsErrorNotice } from "@/components/admin/analytics/analytics-error";
import {
  EventRow,
  deviceSummary,
  dropCarDetailPageviews,
  shortDateTime,
} from "@/components/admin/analytics/event-row";

export interface VisitorTimelineTarget {
  visitorId?: string | null;
  userId?: string | null;
  /** 头部显示名(用户名 / 匿名访客 #xxxxxx),数据到之前先用它 */
  label?: string;
}

const PAGE = 100;

/** 管理后台各浏览面板共用的 Sheet 样式:右侧,手机全宽,桌面 32rem */
export const ANALYTICS_SHEET_CLASS =
  "gap-0 p-0 font-mono data-[side=right]:w-full data-[side=right]:sm:max-w-lg";

function targetKey(t: VisitorTimelineTarget): string {
  return `${t.visitorId ?? ""}|${t.userId ?? ""}`;
}

/** 两个时间点相差的分钟数 */
function spanMinutes(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000);
}

type UserEvent = AnalyticsEventRow & { user_id: string };

interface SessionGroup {
  sessionId: string;
  visitorId: string;
  /** 时间倒序 */
  rows: AnalyticsEventRow[];
}

/** 相邻同 session_id 的事件归为一组(多设备并行浏览时同一会话可能被切成几段) */
function groupSessions(rows: AnalyticsEventRow[]): SessionGroup[] {
  const out: SessionGroup[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.sessionId === r.session_id) last.rows.push(r);
    else out.push({ sessionId: r.session_id, visitorId: r.visitor_id, rows: [r] });
  }
  return out;
}

export function VisitorTimelineSheet({
  target,
  onOpenChange,
}: {
  target: { visitorId?: string | null; userId?: string | null; label?: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  // 关闭动画期间 target 已置空:保留上一次的内容,避免面板先变空再滑出
  const [shown, setShown] = useState<VisitorTimelineTarget | null>(target);
  if (target && (!shown || targetKey(shown) !== targetKey(target) || shown.label !== target.label)) {
    setShown(target);
  }

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className={ANALYTICS_SHEET_CLASS}>
        {shown && <TimelineBody key={targetKey(shown)} target={shown} />}
      </SheetContent>
    </Sheet>
  );
}

interface Loaded {
  visitorIds: string[];
  rows: AnalyticsEventRow[];
  hasMore: boolean;
  /** 拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
}

function TimelineBody({ target }: { target: VisitorTimelineTarget }) {
  const { t, locale } = useI18n();
  const { visitorId, userId, label } = target;
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchTimeline({ visitorId, userId, limit: PAGE });
        if (cancelled) return;
        const rows = res.rows ?? [];
        setData({ visitorIds: res.visitor_ids ?? [], rows, hasMore: rows.length >= PAGE, now: Date.now() });
      } catch (e) {
        if (!cancelled) setError(e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [visitorId, userId]);

  async function loadMore() {
    if (!data || loadingMore || data.rows.length === 0) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      // 游标原样回传 RPC 给的时间串(保留微秒,不经 Date 往返)
      const before = data.rows[data.rows.length - 1].created_at;
      const res = await fetchTimeline({ visitorId, userId, before, limit: PAGE });
      const now = Date.now();
      setData((prev) => {
        if (!prev) return prev;
        const seen = new Set(prev.rows.map((r) => r.id));
        const fresh = (res.rows ?? []).filter((r) => !seen.has(r.id));
        const ids = [...prev.visitorIds];
        for (const id of res.visitor_ids ?? []) if (!ids.includes(id)) ids.push(id);
        return {
          visitorIds: ids,
          rows: [...prev.rows, ...fresh],
          hasMore: (res.rows?.length ?? 0) >= PAGE && fresh.length > 0,
          now,
        };
      });
    } catch (e) {
      setMoreError(e);
    } finally {
      setLoadingMore(false);
    }
  }

  const rows = data?.rows ?? [];
  // 头部身份:按用户查就是该用户;按访客查取该设备最近登录过的用户
  const userRow = rows.find((r): r is UserEvent => !!r.user_id && (!userId || r.user_id === userId));
  const identityUserId = userId ?? userRow?.user_id ?? null;
  const identityVisitorId = visitorId ?? data?.visitorIds[0] ?? "";
  const latest = rows[0]?.created_at;
  const earliest = rows[rows.length - 1]?.created_at;
  const groups = groupSessions(rows);
  const multiDevice = (data?.visitorIds.length ?? 0) > 1;

  const meta: string[] = [];
  if (data) {
    meta.push(t("{n} 台设备", { n: data.visitorIds.length }));
    meta.push(t("{n} 条记录", { n: `${formatNumber(rows.length, locale)}${data.hasMore ? "+" : ""}` }));
    if (latest) meta.push(t("最近访问 {time}", { time: relativeTime(latest, t, locale, data.now) }));
    if (earliest) {
      meta.push(
        data.hasMore
          ? t("已加载至 {time}", { time: shortDateTime(earliest, locale) })
          : t("首次访问 {time}", { time: shortDateTime(earliest, locale) })
      );
    }
  }

  return (
    <>
      <SheetHeader
        className="flex-row items-start gap-2 border-b border-border px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Route className="h-4 w-4" strokeWidth={1.5} />
            {t("访问轨迹")}
          </SheetTitle>
          {/* 数据到之前先显示调用方给的名字,避免「匿名 → 用户」闪一下 */}
          {!data && label ? (
            <p className="truncate py-1.5 text-xs font-medium">{label}</p>
          ) : (
            <VisitorIdentity
              visitorId={identityVisitorId}
              userId={identityUserId}
              username={userRow?.username ?? (identityUserId ? label ?? null : null)}
              avatarUrl={userRow?.avatar_url ?? null}
              linkUser
              size="md"
            />
          )}
          <SheetDescription className="text-[10px] leading-relaxed">
            {data ? meta.join(" · ") : error ? t("加载失败") : t("加载中…")}
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
        {error ? (
          <AnalyticsErrorNotice error={error} />
        ) : !data ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无访问记录")}</p>
        ) : (
          <>
            {groups.map((g) => (
              <SessionCard
                key={`${g.sessionId}-${g.rows[0].id}`}
                group={g}
                multiDevice={multiDevice}
                targetUserId={userId ?? null}
              />
            ))}
            {data.hasMore ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("加载更多")}
              </Button>
            ) : (
              <p className="py-2 text-center text-[10px] text-muted-foreground">{t("没有更早的记录了")}</p>
            )}
            {moreError ? <AnalyticsErrorNotice error={moreError} /> : null}
          </>
        )}
      </div>
    </>
  );
}

const PILL = "shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px]";

/** 一个会话:头部(开始时间、时长、页面/车辆数、来源、地区、设备、登录状态)+ 事件列表 */
function SessionCard({
  group,
  multiDevice,
  targetUserId,
}: {
  group: SessionGroup;
  multiDevice: boolean;
  /** 按用户查看时的用户 id:同一用户的会话只标「已登录」,不重复显示用户名 */
  targetUserId: string | null;
}) {
  const { t, locale } = useI18n();
  const rows = group.rows;
  const first = rows[rows.length - 1];
  const last = rows[0];
  const minutes = spanMinutes(first.created_at, last.created_at);
  const pageviews = rows.filter((r) => r.type === "pageview").length;
  const carViews = rows.length - pageviews;
  const user = rows.find((r): r is UserEvent => !!r.user_id);
  // 同一会话里先匿名后登录:逐条标出登录前的事件
  const mixed = !!user && rows.some((r) => !r.user_id);

  // 来源是会话级的(会话开始时确定,每条事件都带),取最早一条
  const utm = [first.utm_source, first.utm_medium, first.utm_campaign].filter(Boolean).join(" / ");
  const source = [first.referrer_host, utm ? `utm: ${utm}` : null].filter(Boolean).join(" · ") || t("直接访问");
  const info = [
    `${t("访问来源")}: ${source}`,
    placeText(last, t, locale),
    deviceSummary(last, t),
    last.locale ? localeLabel(last.locale, t) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="overflow-hidden rounded-xl bg-card">
      <header className="space-y-1 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-medium tabular-nums">{shortDateTime(first.created_at, locale)}</span>
          {minutes >= 1 && <span className="text-muted-foreground">{t("{n} 分钟", { n: minutes })}</span>}
          <span className="ml-auto flex items-center gap-2.5 tabular-nums text-muted-foreground">
            <span className="flex items-center gap-0.5" title={t("页面浏览")}>
              <FileText className="h-3 w-3" strokeWidth={1.5} />
              {pageviews}
            </span>
            <span className="flex items-center gap-0.5" title={t("车辆浏览")}>
              <Car className="h-3 w-3" strokeWidth={1.5} />
              {carViews}
            </span>
          </span>
        </div>
        {/* break-keep:中日韩文只在空格处折行(「中文」不拆成两行);旗帜与城市之间是不换行空格 */}
        <p className="break-words break-keep text-[10px] leading-relaxed text-muted-foreground">{info}</p>
        <div className="flex flex-wrap items-center gap-1">
          {user ? (
            user.user_id === targetUserId ? (
              <span className={`${PILL} text-foreground`}>{t("已登录")}</span>
            ) : (
              <Link href={adminUserLink(user.user_id)} className={`${PILL} text-foreground hover:underline`}>
                @{user.username || user.user_id.slice(0, 8)}
              </Link>
            )
          ) : (
            <span className={`${PILL} text-muted-foreground`}>{t("未登录")}</span>
          )}
          {multiDevice && (
            <span className={`${PILL} text-muted-foreground`}>
              {t("设备 #{id}", { id: shortVisitorId(group.visitorId) })}
            </span>
          )}
        </div>
      </header>
      <ol className="divide-y divide-border/40 py-0.5">
        {dropCarDetailPageviews(rows).map((r) => (
          <li key={r.id}>
            <EventRow row={r} markAnonymous={mixed} />
          </li>
        ))}
      </ol>
    </section>
  );
}
