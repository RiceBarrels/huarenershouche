"use client";

// 访问统计「实时动态」:最近 24 小时内最新的事件(套用当前筛选),每 30 秒自动刷新 ——
// 只在页面可见时刷新,切回前台若已过一个周期立即补拉;顺带给控制行提供在线人数。
// 拉取放在 useLiveFeed(仪表盘持有,在线徽标与卡片共用一份数据),卡片 LiveFeed 只负责展示;
// 点一条打开该访客的浏览轨迹。

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { carTitle } from "@/lib/i18n";
import { fetchLive } from "@/lib/analytics/admin";
import { formatGeoWithFlag } from "@/lib/analytics/geo";
import type { AnalyticsEventRow, AnalyticsFilters, AnalyticsLive } from "@/lib/analytics/types";
import { anonymousLabel, relativeTime } from "@/components/analytics/format";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { VisitorIdentity } from "@/components/admin/analytics/identity";
import { AnalyticsErrorNotice } from "@/components/admin/analytics/analytics-error";
import { CarThumb, dropCarDetailPageviews, fullDateTime } from "@/components/admin/analytics/event-row";
import type { VisitorTimelineTarget } from "@/components/admin/analytics/visitor-timeline-sheet";

const LIMIT = 30;
const INTERVAL_MS = 30_000;
/** 默认显示条数,其余点「展开」 */
const COLLAPSED = 10;

interface LiveResult {
  key: string;
  data: AnalyticsLive | null;
  error: unknown;
  now: number;
}

export interface LiveFeedState {
  data: AnalyticsLive | null;
  /** 当前筛选下最近一次拉取的错误(自动刷新失败时 data 仍是上一份) */
  error: unknown;
  /** 筛选刚变、新数据还没到:data 是上一份 */
  stale: boolean;
  /** 拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
}

/**
 * 实时动态数据:key(筛选 + 手动刷新次数)变化立即重拉,之后每 30 秒自动刷新;
 * 过期响应按自增序号丢弃。paused(如统计 SQL 未执行)时停止拉取。
 */
export function useLiveFeed(filters: AnalyticsFilters, key: string, paused = false): LiveFeedState {
  const [res, setRes] = useState<LiveResult | null>(null);
  const seqRef = useRef(0);
  const lastRef = useRef(0);

  const load = useEffectEvent(() => {
    const seq = ++seqRef.current;
    const k = key;
    lastRef.current = Date.now();
    Promise.resolve()
      .then(() => fetchLive(filters, LIMIT))
      .then(
        (data) => {
          if (seqRef.current === seq) setRes({ key: k, data, error: null, now: Date.now() });
        },
        (error: unknown) => {
          if (seqRef.current !== seq) return;
          const now = Date.now();
          // 自动刷新偶发失败(断网等):同一筛选下已有数据就留着,只记下错误
          setRes((prev) =>
            prev && prev.key === k && prev.data ? { ...prev, error } : { key: k, data: null, error, now }
          );
        }
      );
  });

  useEffect(() => {
    if (paused) return;
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRef.current >= INTERVAL_MS) load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, paused]);

  const fresh = res?.key === key;
  return {
    data: res?.data ?? null,
    error: fresh ? res.error : null,
    stale: !fresh,
    now: res?.now ?? 0,
  };
}

export function LiveFeed({
  live,
  onOpen,
  className,
}: {
  live: LiveFeedState;
  /** 点一条 → 打开该访客的浏览轨迹 */
  onOpen: (target: VisitorTimelineTarget) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  // 车辆详情页先记 pageview 再记 car_view:只留带车辆信息的那条
  const rows = live.data ? dropCarDetailPageviews(live.data.rows ?? []) : [];
  const shown = expanded ? rows : rows.slice(0, COLLAPSED);

  let body: React.ReactNode;
  if (!live.data) {
    body = live.error ? (
      <AnalyticsErrorNotice error={live.error} />
    ) : (
      <div aria-hidden="true" className="space-y-1.5 py-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = <p className="py-8 text-center text-xs text-muted-foreground">{t("最近 24 小时暂无访问")}</p>;
  } else {
    body = (
      <ol className="space-y-0.5">
        {shown.map((row) => (
          <LiveRow key={row.id} row={row} now={live.now} onOpen={onOpen} />
        ))}
      </ol>
    );
  }

  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl bg-card p-3", className)}>
      <div className="flex min-w-0 items-baseline gap-2 px-1 py-1">
        <h3 className="shrink-0 text-xs font-medium">{t("实时动态")}</h3>
        <span className="min-w-0 truncate text-[10px] text-muted-foreground">
          {t("最近 24 小时 · 每 30 秒刷新")}
        </span>
        {live.data && live.error ? (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{t("刷新失败")}</span>
        ) : null}
      </div>

      <div
        aria-busy={live.stale || undefined}
        className={cn("mt-1 flex-1 transition-opacity duration-150", live.stale && !!live.data && "opacity-50")}
      >
        {body}
      </div>

      {rows.length > COLLAPSED && (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {expanded ? t("收起") : t("展开全部 {n} 条", { n: rows.length })}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </section>
  );
}

/** 一条事件:谁(头像 + 名 / 匿名访客)· 多久前;看了哪个页面或哪辆车 · 在哪 */
function LiveRow({
  row,
  now,
  onOpen,
}: {
  row: AnalyticsEventRow;
  now: number;
  onOpen: (target: VisitorTimelineTarget) => void;
}) {
  const { t, locale } = useI18n();
  const geo = formatGeoWithFlag(row, locale);
  const name = row.user_id ? row.username || row.user_id.slice(0, 8) : anonymousLabel(row.visitor_id, t);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen({ visitorId: row.visitor_id, label: name })}
        title={t("查看浏览轨迹")}
        className="flex w-full min-w-0 flex-col gap-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex w-full min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1">
            <VisitorIdentity
              visitorId={row.visitor_id}
              userId={row.user_id}
              username={row.username}
              avatarUrl={row.avatar_url}
            />
          </span>
          <time
            dateTime={row.created_at}
            title={fullDateTime(row.created_at, locale)}
            className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground"
          >
            {relativeTime(row.created_at, t, locale, now)}
          </time>
        </span>
        {/* 缩进对齐到名字(头像 24px + 间距 8px) */}
        <span className="flex w-full min-w-0 items-center gap-1.5 pl-8 text-[11px]">
          {row.type === "car_view" ? (
            <>
              <CarThumb car={row.car} className="h-4 w-5" />
              <span className="min-w-0 truncate">
                {row.car ? carTitle(row.car, locale) || t("车辆") : t("已删除车辆")}
              </span>
            </>
          ) : (
            <>
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <span className="min-w-0 truncate">
                {row.path}
                {row.query ? <span className="text-muted-foreground">?{row.query}</span> : null}
              </span>
            </>
          )}
          {geo && (
            <span className="ml-auto max-w-[45%] shrink-0 truncate pl-1 text-[10px] text-muted-foreground">
              {geo}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
