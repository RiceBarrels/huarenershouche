"use client";

// 访问统计的访客列表(全宽卡片):tab 全部 / 登录用户 / 匿名(在全局筛选上叠加 visitor_type),
// 按最后访问倒序,「加载更多」按 offset 翻页(区间在解析时已固定,翻页期间排序不会漂移)。
// 卡片够宽(≥ 56rem)时为表格列,否则为三行紧凑卡片;点访客打开其浏览轨迹。
// 重拉(范围 / 筛选 / tab 变化)期间保留上一帧并降低不透明度,过期响应按自增序号丢弃。

import { useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { fetchVisitors, type ResolvedRange } from "@/lib/analytics/admin";
import { formatGeoWithFlag } from "@/lib/analytics/geo";
import type { AnalyticsFilters, AnalyticsVisitorRow } from "@/lib/analytics/types";
import { anonymousLabel, formatNumber, relativeTime } from "@/components/analytics/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { VisitorIdentity } from "@/components/admin/analytics/identity";
import { AnalyticsErrorNotice } from "@/components/admin/analytics/analytics-error";
import { deviceSummary, fullDateTime, sourceLabel } from "@/components/admin/analytics/event-row";
import type { VisitorTimelineTarget } from "@/components/admin/analytics/visitor-timeline-sheet";

type VisitorTab = "all" | "user" | "anonymous";

const PAGE = 25;

// 宽卡片的表格列:访客 | 地区 | 设备 | 来源 | 浏览量 | 车辆浏览 | 会话 | 最后访问(表头与各行共用)
// 访客列最宽:用户名后面可能还跟着「未登录浏览」「管理员」两个标
const WIDE_GRID =
  "@4xl:grid @4xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_3.5rem_3.5rem_3rem_6rem] @4xl:items-center @4xl:gap-3";

interface PageState {
  /** 这份结果对应的请求键;与当前键不同 = 重拉中(显示为上一帧) */
  key: string;
  rows: AnalyticsVisitorRow[];
  total: number;
  /** 首页的错误 */
  error: unknown;
  /** 最近一次拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
  /** 「加载更多」的状态 */
  more: "idle" | "loading" | "error";
  moreError: unknown;
  /** 最后一页不满(或全是重复):没有更多了 */
  done: boolean;
}

export function VisitorsPanel({
  range,
  filters,
  reloadKey,
  onOpen,
}: {
  range: ResolvedRange;
  /** 全局筛选(已含 exclude_admins) */
  filters: AnalyticsFilters;
  /** 范围 / 筛选变化即重拉 */
  reloadKey: string;
  /** 点访客 → 打开浏览轨迹 */
  onOpen: (target: VisitorTimelineTarget) => void;
}) {
  const { t, locale } = useI18n();
  const uid = useId();
  const [tab, setTab] = useState<VisitorTab>("all");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<PageState | null>(null);
  const seqRef = useRef(0);
  const key = `${reloadKey}|${tab}|${attempt}`;
  const scoped: AnalyticsFilters = tab === "all" ? filters : { ...filters, visitor_type: tab };

  const tabs: { key: VisitorTab; label: string }[] = [
    { key: "all", label: t("全部") },
    { key: "user", label: t("登录用户") },
    { key: "anonymous", label: t("匿名") },
  ];

  const loadFirst = useEffectEvent((k: string) => {
    const seq = ++seqRef.current;
    Promise.resolve()
      .then(() => fetchVisitors(range, scoped, PAGE, 0))
      .then(
        (res) => {
          if (seqRef.current !== seq) return;
          const rows = res.rows ?? [];
          setPage({
            key: k,
            rows,
            total: res.total ?? rows.length,
            error: null,
            now: Date.now(),
            more: "idle",
            moreError: null,
            done: rows.length < PAGE,
          });
        },
        (error: unknown) => {
          if (seqRef.current !== seq) return;
          setPage({ key: k, rows: [], total: 0, error, now: Date.now(), more: "idle", moreError: null, done: true });
        }
      );
  });

  useEffect(() => {
    loadFirst(key);
  }, [key]);

  function loadMore() {
    if (!page || page.key !== key || page.error || page.more === "loading") return;
    // 不开新一轮:之后若重拉(范围 / 筛选 / tab 变化),这次的结果按序号与键双重作废
    const seq = seqRef.current;
    const k = key;
    const offset = page.rows.length;
    setPage((prev) => (prev && prev.key === k ? { ...prev, more: "loading", moreError: null } : prev));
    Promise.resolve()
      .then(() => fetchVisitors(range, scoped, PAGE, offset))
      .then(
        (res) => {
          if (seqRef.current !== seq) return;
          const now = Date.now();
          setPage((prev) => {
            if (!prev || prev.key !== k) return prev;
            const seen = new Set(prev.rows.map((r) => r.visitor_id));
            const got = res.rows ?? [];
            const fresh = got.filter((r) => !seen.has(r.visitor_id));
            return {
              ...prev,
              rows: [...prev.rows, ...fresh],
              total: res.total ?? prev.total,
              now,
              more: "idle",
              done: got.length < PAGE || fresh.length === 0,
            };
          });
        },
        (error: unknown) => {
          if (seqRef.current !== seq) return;
          setPage((prev) => (prev && prev.key === k ? { ...prev, more: "error", moreError: error } : prev));
        }
      );
  }

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((x) => x.key === tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(tabs[next].key);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  const fresh = page?.key === key;
  const loading = !fresh;
  const error = page && fresh ? page.error : null;
  const rows = page?.rows ?? [];
  const hasMore = !!page && fresh && !page.error && !page.done && rows.length < page.total;

  let body: React.ReactNode;
  if (error) {
    body = (
      <div className="space-y-2 py-2">
        <AnalyticsErrorNotice error={error} />
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="xs"
            className="text-[11px]"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RotateCw className="h-3 w-3" strokeWidth={1.5} />
            {t("重试")}
          </Button>
        </div>
      </div>
    );
  } else if (!page || (loading && !!page.error)) {
    body = (
      <div aria-hidden="true" className="space-y-1.5 py-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = <p className="py-10 text-center text-xs text-muted-foreground">{t("该时间段内暂无访客")}</p>;
  } else {
    body = (
      <>
        {/* 窄数值列的表头允许折行(译文较长时不被截断),底部对齐 */}
        <div
          aria-hidden="true"
          className={cn("hidden px-2 pt-1.5 pb-1 text-[10px] leading-tight text-muted-foreground", WIDE_GRID, "@4xl:items-end")}
        >
          <span className="truncate">{t("访客")}</span>
          <span className="truncate">{t("地区")}</span>
          <span className="truncate">{t("设备")}</span>
          <span className="truncate">{t("访问来源")}</span>
          <span className="text-right">{t("浏览量")}</span>
          <span className="text-right">{t("车辆浏览")}</span>
          <span className="text-right">{t("会话")}</span>
          <span className="truncate text-right">{t("最后访问")}</span>
        </div>
        <ul className="space-y-0.5">
          {rows.map((row) => (
            <VisitorRow key={row.visitor_id} row={row} now={page.now} onOpen={onOpen} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <section className="@container min-w-0 rounded-xl bg-card p-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="flex shrink-0 items-baseline gap-1.5 px-1 text-xs font-medium">
          {t("访客")}
          {page && !page.error && (
            <span
              className={cn(
                "font-normal tabular-nums text-muted-foreground transition-opacity",
                loading && "opacity-50"
              )}
            >
              {formatNumber(page.total, locale)}
            </span>
          )}
        </h3>
        <div
          role="tablist"
          aria-label={t("访客类型")}
          onKeyDown={onTabKeyDown}
          // 放不下就换行,不横向滚动:320px 宽 + es / fr 译文时末尾的「匿名」不会被裁掉
          className="-mx-1 flex min-w-0 max-w-full flex-wrap gap-x-0.5 gap-y-1 px-1"
        >
          {tabs.map((x) => {
            const on = x.key === tab;
            return (
              <button
                key={x.key}
                id={`${uid}-tab-${x.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(x.key)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  on ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {x.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${tab}`}
        aria-busy={loading || undefined}
        className={cn("mt-1 transition-opacity duration-150", loading && !!page && !page.error && "opacity-50")}
      >
        {body}
      </div>

      {page && fresh && !page.error && (page.more === "error" || hasMore) && (
        <div className="mt-2 space-y-2">
          {page.more === "error" && <AnalyticsErrorNotice error={page.moreError} />}
          {hasMore && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs"
              disabled={page.more === "loading"}
              onClick={loadMore}
            >
              {page.more === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("加载更多")}
              <span className="font-normal tabular-nums text-muted-foreground">
                {formatNumber(rows.length, locale)} / {formatNumber(page.total, locale)}
              </span>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** 一位访客:窄屏三行卡片,宽卡片按表格列排;整行打开浏览轨迹 */
function VisitorRow({
  row,
  now,
  onOpen,
}: {
  row: AnalyticsVisitorRow;
  now: number;
  onOpen: (target: VisitorTimelineTarget) => void;
}) {
  const { t, locale } = useI18n();
  const name = row.user_id ? row.username || row.user_id.slice(0, 8) : anonymousLabel(row.visitor_id, t);
  const geo = formatGeoWithFlag(row, locale) || t("未知地区");
  const device = deviceSummary(row, t) || t("未知");
  const source = sourceLabel(row, t);
  const seen = relativeTime(row.last_seen, t, locale, now);
  const seenTitle = fullDateTime(row.last_seen, locale);
  const pageviews = formatNumber(row.pageviews ?? 0, locale);
  const carViews = formatNumber(row.car_views ?? 0, locale);
  const sessions = formatNumber(row.sessions ?? 0, locale);

  // 行本身可点:身份只渲染文字(不嵌套用户页链接)
  const identity = (
    <span className="flex min-w-0 items-center gap-1.5">
      <VisitorIdentity
        visitorId={row.visitor_id}
        userId={row.user_id}
        username={row.username}
        avatarUrl={row.avatar_url}
        loggedIn={row.logged_in}
      />
      {row.role === "admin" && (
        <span className="shrink-0 rounded-full bg-foreground px-1 py-0.5 text-[10px] text-background">
          {t("管理员")}
        </span>
      )}
    </span>
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen({ visitorId: row.visitor_id, label: name })}
        title={t("查看浏览轨迹")}
        className="w-full rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {/* 窄:身份 + 最后访问 / 地区 · 设备 / 来源 + 计数(后两行缩进对齐到名字);
            来源按全文宽度参与换行,放不下时计数折到下一行,手机上来源不会被计数挤掉 */}
        <span className="flex min-w-0 flex-col gap-1 @4xl:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1">{identity}</span>
            <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground" title={seenTitle}>
              {seen}
            </span>
          </span>
          <span className="truncate pl-8 text-[10px] text-muted-foreground">
            {geo} · {device}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pl-8 text-[10px] text-muted-foreground">
            <span
              className="min-w-0 flex-auto truncate"
              title={row.landing_path ? `${source} → ${row.landing_path}` : source}
            >
              {t("访问来源")}: {source}
            </span>
            <span className="min-w-0 truncate tabular-nums">
              {t("浏览 {n}", { n: pageviews })} · {t("车辆 {n}", { n: carViews })} · {t("会话 {n}", { n: sessions })}
            </span>
          </span>
        </span>

        {/* 宽:表格列 */}
        <span className={cn("hidden", WIDE_GRID)}>
          {identity}
          <span className="truncate" title={geo}>
            {geo}
          </span>
          <span className="truncate text-muted-foreground" title={device}>
            {device}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate" title={source}>
              {source}
            </span>
            {row.landing_path && (
              <span className="truncate text-[10px] text-muted-foreground" title={row.landing_path}>
                {row.landing_path}
              </span>
            )}
          </span>
          <span className="text-right tabular-nums">
            <span className="sr-only">{t("浏览量")} </span>
            {pageviews}
          </span>
          <span className="text-right tabular-nums">
            <span className="sr-only">{t("车辆浏览")} </span>
            {carViews}
          </span>
          <span className="text-right tabular-nums">
            <span className="sr-only">{t("会话")} </span>
            {sessions}
          </span>
          <span className="truncate text-right text-[11px] text-muted-foreground" title={seenTitle}>
            {seen}
          </span>
        </span>
      </button>
    </li>
  );
}
