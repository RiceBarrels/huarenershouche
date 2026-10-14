"use client";

// 管理后台「访问统计」(类似 Vercel Analytics)。自上而下:
// 一行控制(时间范围 / 排除管理员 / 在线人数 / 刷新)→ 筛选胶囊 → KPI(点访客 / 浏览量 / 车辆浏览切换图表指标)
// → 时间序列图 → 维度排行卡片(点行加筛选;车辆行打开浏览者面板)+ 实时动态 → 访客列表(点访客看浏览轨迹)。
// 范围 / 筛选 / 排除管理员任一变化即全部重拉(reloadKey);过期响应按自增序号丢弃,重拉期间保留上一帧并降低不透明度。
// 时间范围只在切换预设 / 点刷新时解析成具体区间,之后加筛选沿用同一区间 —— 点排行行后 KPI 与该行的数字对得上。

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, RefreshCw, RotateCw } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { carTitle, type Locale } from "@/lib/i18n";
import {
  browserTimeZone,
  fetchBreakdown,
  fetchOverview,
  resolveRange,
  type RangePreset,
  type ResolvedRange,
} from "@/lib/analytics/admin";
import type {
  AnalyticsBreakdownRow,
  AnalyticsDimension,
  AnalyticsFilters,
  AnalyticsOverview,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  collectingSince,
  delta,
  formatCompact,
  formatNumber,
  formatPercent,
  prevPeriodComplete,
  shortDate,
} from "@/components/analytics/format";
import { RangeTabs } from "@/components/analytics/range-tabs";
import { FilterChips, type FilterChip } from "@/components/analytics/filter-chips";
import { KpiTile } from "@/components/analytics/kpi-tile";
import { TimeSeriesChart } from "@/components/analytics/time-series-chart";
import { BreakdownCard, type BreakdownTab } from "@/components/analytics/breakdown-card";
import { dimensionName, filterChipLabel, filtersForRow } from "@/components/analytics/dimension-label";
import { useExcludeAdmins } from "@/components/admin/analytics/use-exclude-admins";
import { AnalyticsErrorNotice, isAnalyticsNotInstalled } from "@/components/admin/analytics/analytics-error";
import { CarViewersSheet } from "@/components/admin/analytics/car-viewers-sheet";
import {
  VisitorTimelineSheet,
  type VisitorTimelineTarget,
} from "@/components/admin/analytics/visitor-timeline-sheet";
import { VisitorsPanel } from "@/components/admin/analytics/visitors-panel";
import { LiveFeed, useLiveFeed } from "@/components/admin/analytics/live-feed";

/** 图表可切换的指标(KPI 里可点的三格) */
type Metric = "visitors" | "pageviews" | "car_views";

interface Span {
  preset: RangePreset;
  range: ResolvedRange;
}

interface OverviewResult {
  /** 这份结果对应的 reloadKey;与当前不同 = 重拉中(显示为上一帧) */
  key: string;
  data: AnalyticsOverview | null;
  error: unknown;
  /** data 对应的区间(判断上一周期是否已开始采集用) */
  range: ResolvedRange;
}

type Delta = { pct: number | null; dir: "up" | "down" | "flat" };

// 排行卡片的维度分组(tab 顺序即显示顺序)
const PAGE_DIMS: AnalyticsDimension[] = ["path", "route"];
const SOURCE_DIMS: AnalyticsDimension[] = ["referrer_host", "utm_source", "utm_medium", "utm_campaign"];
const GEO_DIMS: AnalyticsDimension[] = ["country", "region", "city"];
const DEVICE_DIMS: AnalyticsDimension[] = ["device", "browser", "os", "platform", "locale"];

/** 地区筛选是层级的:去掉国家连带州/省与城市,去掉州/省连带城市 */
const FILTER_CHILDREN: Partial<Record<keyof AnalyticsFilters, (keyof AnalyticsFilters)[]>> = {
  country: ["region", "city"],
  region: ["city"],
};

/** KPI 数值:一万以内写全(1,284),再大用紧凑写法(12.9K / 1.3万) */
function kpiNumber(n: number | null | undefined, locale: Locale): string {
  const v = n ?? 0;
  return Math.abs(v) >= 10000 ? formatCompact(v, locale) : formatNumber(v, locale);
}

/** 跳出率的环比用百分点差(40% → 42% 显示 ↑2%),比率的相对变化不直观;任一周期没有会话时不比较 */
function rateDelta(cur: number | null | undefined, prev: number | null | undefined): Delta | null {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 10000) / 10000;
  return { pct: d, dir: d > 0 ? "up" : d < 0 ? "down" : "flat" };
}

export function AnalyticsDashboard() {
  const { t, locale } = useI18n();
  // 区间在挂载 / 切换预设 / 刷新时解析一次(惰性初始值只在挂载时取当前时间)
  const [span, setSpan] = useState<Span>(() => ({ preset: "7d", range: resolveRange("7d") }));
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [excludeAdmins, setExcludeAdmins] = useExcludeAdmins();
  const [metric, setMetric] = useState<Metric>("visitors");
  // 手动刷新次数:实时动态也跟着重拉
  const [rev, setRev] = useState(0);
  const [overview, setOverview] = useState<OverviewResult | null>(null);
  // 车辆浏览者面板:记下点击时的范围与筛选,面板里的数字与点的那一行一致
  const [carSheet, setCarSheet] = useState<{
    id: string;
    title?: string;
    span: Span;
    filters: AnalyticsFilters;
  } | null>(null);
  const [timeline, setTimeline] = useState<VisitorTimelineTarget | null>(null);
  const seqRef = useRef(0);

  const { range } = span;
  // 所有请求共用的筛选(排除管理员作为 exclude_admins 叠加)
  const scoped: AnalyticsFilters = excludeAdmins ? { ...filters, exclude_admins: true } : filters;
  const reloadKey = JSON.stringify([range.from.getTime(), range.to.getTime(), range.bucket, rev, scoped]);

  const loadOverview = useEffectEvent((key: string) => {
    const seq = ++seqRef.current;
    const at = range;
    Promise.resolve()
      .then(() => fetchOverview(at, scoped, browserTimeZone()))
      .then(
        (data) => {
          if (seqRef.current === seq) setOverview({ key, data, error: null, range: at });
        },
        (error: unknown) => {
          if (seqRef.current === seq) setOverview({ key, data: null, error, range: at });
        }
      );
  });

  useEffect(() => {
    loadOverview(reloadKey);
  }, [reloadKey]);

  const ovLoading = overview?.key !== reloadKey;
  const ovError = overview && !ovLoading ? overview.error : null;
  const notInstalled = isAnalyticsNotInstalled(ovError);
  const data = overview?.data ?? null;

  const live = useLiveFeed(scoped, JSON.stringify([rev, scoped]), notInstalled);
  // 在线人数优先用每 30 秒刷新的实时动态,其次用概览;筛选刚变时沿用上一份并变淡
  const online = live.data?.online ?? data?.online ?? null;
  const onlineStale = live.data ? live.stale : ovLoading;

  function changePreset(preset: RangePreset) {
    setSpan({ preset, range: resolveRange(preset) });
  }

  function refresh() {
    setSpan({ preset: span.preset, range: resolveRange(span.preset) });
    setRev((n) => n + 1);
  }

  function removeFilter(key: string) {
    const k = key as keyof AnalyticsFilters;
    setFilters((prev) => {
      const next = { ...prev };
      for (const drop of [k, ...(FILTER_CHILDREN[k] ?? [])]) delete next[drop];
      return next;
    });
  }

  // 点排行行:车辆行打开「车辆浏览者」(沿用当前范围与筛选),其余叠加对应筛选(region / city 行连带上级地区)
  function selectRow(dimension: string, row: AnalyticsBreakdownRow) {
    if (dimension === "car") {
      if (row.key) {
        setCarSheet({ id: row.key, title: (row.car && carTitle(row.car, locale)) || undefined, span, filters });
      }
      return;
    }
    const next = filtersForRow(dimension, row);
    if (Object.keys(next).length > 0) setFilters((prev) => ({ ...prev, ...next }));
  }

  // BreakdownCard 在拉取时才调用(读最新的区间与筛选,与 reloadKey 同步)
  const loadBreakdown = (dimension: string, limit: number, search: string | null) =>
    fetchBreakdown(range, scoped, dimension as AnalyticsDimension, limit, search);

  const tabsOf = (dims: AnalyticsDimension[]): BreakdownTab[] =>
    dims.map((d) => ({ dimension: d, label: dimensionName(d, t) }));

  const chips: FilterChip[] = (Object.keys(filters) as (keyof AnalyticsFilters)[])
    .filter((k) => k !== "exclude_admins" && filters[k] !== undefined)
    .map((k) => ({ key: k, label: filterChipLabel(k, String(filters[k]), t, locale) }));

  const visitorsCol = { key: "visitors" as const, label: t("访客") };
  const metricLabel: Record<Metric, string> = {
    visitors: t("访客"),
    pageviews: t("浏览量"),
    car_views: t("车辆浏览"),
  };

  if (notInstalled) {
    return (
      <div className="space-y-2">
        <AnalyticsErrorNotice error={ovError} />
        <Button variant="secondary" size="xs" className="text-[11px]" onClick={refresh}>
          <RotateCw className="h-3 w-3" strokeWidth={1.5} />
          {t("重试")}
        </Button>
      </div>
    );
  }

  const kpis = data?.kpis;
  const prev = data?.prev;
  const points = (data?.series ?? []).map((p) => ({ t: p.t, value: p[metric] ?? 0 }));
  // 统计上线不久:上一周期还没开始采集时不显示环比(否则持平也是 ↑200%),区间起点早于采集时说明一句
  const prevOk = !overview || prevPeriodComplete(overview.range, data?.data_since);
  const since = overview ? collectingSince(overview.range, data?.data_since) : null;
  const cmp = (cur: number, before: number): Delta | null => (prevOk ? delta(cur, before) : null);
  // 手机:可点的三格一行、另两格一行(6 列栅格各占 2 / 3);够宽时 5 格一行
  const wide = "col-span-3 @3xl:col-span-1";
  const narrow = "col-span-2 @3xl:col-span-1";

  return (
    <div className="@container min-w-0 space-y-3">
      {/* 一行控制,在所有图表之上;时间范围在最前 */}
      <div className="flex flex-wrap items-center gap-2">
        <RangeTabs value={span.preset} onChange={changePreset} />
        <button
          type="button"
          role="switch"
          aria-checked={excludeAdmins}
          onClick={() => setExcludeAdmins(!excludeAdmins)}
          title={t("剔除曾以管理员身份登录过的访客(含其登录前的匿名浏览)")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            excludeAdmins
              ? "bg-primary/30 font-medium text-brand-ink"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {excludeAdmins && <Check className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />}
          {t("排除管理员")}
        </button>
        <div className="ml-auto flex items-center gap-1">
          {online !== null && (
            <span
              title={t("最近 5 分钟内的访客")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] whitespace-nowrap transition-opacity",
                onlineStale && "opacity-60"
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", online > 0 ? "bg-emerald-500" : "bg-muted-foreground/40")}
              />
              {t("{n} 在线", { n: formatNumber(online, locale) })}
            </span>
          )}
          {/* 加载中也可再点:请求卡住时不至于锁死,旧请求的结果按序号丢弃 */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refresh}
            aria-busy={ovLoading || undefined}
            aria-label={t("刷新")}
            title={t("刷新")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", ovLoading && "animate-spin")} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <FilterChips chips={chips} onRemove={removeFilter} onClear={() => setFilters({})} />
      {since !== null && !ovError && (
        <p className="px-1 text-[11px] text-muted-foreground">
          {t("自 {date} 起开始统计", { date: shortDate(since, locale) })}
        </p>
      )}

      {ovError ? (
        <div className="space-y-2">
          <AnalyticsErrorNotice error={ovError} />
          <Button variant="secondary" size="xs" className="text-[11px]" onClick={refresh}>
            <RotateCw className="h-3 w-3" strokeWidth={1.5} />
            {t("重试")}
          </Button>
        </div>
      ) : (
        <>
          {kpis && prev ? (
            <div
              aria-busy={ovLoading || undefined}
              className={cn(
                "grid grid-cols-6 gap-2 transition-opacity duration-150 @3xl:grid-cols-5",
                ovLoading && "opacity-60"
              )}
            >
              <div className={cn("flex min-w-0", narrow)}>
                <KpiTile
                  label={t("访客")}
                  value={kpiNumber(kpis.visitors, locale)}
                  delta={cmp(kpis.visitors, prev.visitors)}
                  active={metric === "visitors"}
                  onClick={() => setMetric("visitors")}
                />
              </div>
              <div className={cn("flex min-w-0", narrow)}>
                <KpiTile
                  label={t("浏览量")}
                  value={kpiNumber(kpis.pageviews, locale)}
                  delta={cmp(kpis.pageviews, prev.pageviews)}
                  active={metric === "pageviews"}
                  onClick={() => setMetric("pageviews")}
                />
              </div>
              <div className={cn("flex min-w-0", narrow)}>
                <KpiTile
                  label={t("跳出率")}
                  value={formatPercent(kpis.bounce_rate, locale)}
                  delta={prevOk ? rateDelta(kpis.bounce_rate, prev.bounce_rate) : null}
                  goodWhen="down"
                />
              </div>
              <div className={cn("flex min-w-0", wide)}>
                <KpiTile
                  label={t("车辆浏览")}
                  value={kpiNumber(kpis.car_views, locale)}
                  delta={cmp(kpis.car_views, prev.car_views)}
                  active={metric === "car_views"}
                  onClick={() => setMetric("car_views")}
                />
              </div>
              <div className={cn("flex min-w-0", wide)}>
                <KpiTile
                  label={t("登录用户")}
                  value={kpiNumber(kpis.users, locale)}
                  delta={cmp(kpis.users, prev.users)}
                />
              </div>
            </div>
          ) : (
            <div aria-hidden="true" className="grid grid-cols-6 gap-2 @3xl:grid-cols-5">
              {[narrow, narrow, narrow, wide, wide].map((cls, i) => (
                <Skeleton key={i} className={cn("h-[76px] rounded-xl", cls)} />
              ))}
            </div>
          )}

          <div className="rounded-xl bg-card p-3">
            <TimeSeriesChart
              points={points}
              bucket={data?.bucket ?? range.bucket}
              label={metricLabel[metric]}
              loading={ovLoading}
            />
          </div>
        </>
      )}

      {/* 排行卡片:够宽两列,手机一列;最后一行车辆排行与实时动态并排 */}
      <div className="grid min-w-0 gap-3 @3xl:grid-cols-2">
        <BreakdownCard
          tabs={tabsOf(PAGE_DIMS)}
          load={loadBreakdown}
          reloadKey={reloadKey}
          onSelect={selectRow}
          columns={[visitorsCol, { key: "pageviews", label: t("浏览量") }]}
        />
        <BreakdownCard tabs={tabsOf(SOURCE_DIMS)} load={loadBreakdown} reloadKey={reloadKey} onSelect={selectRow} />
        <BreakdownCard tabs={tabsOf(GEO_DIMS)} load={loadBreakdown} reloadKey={reloadKey} onSelect={selectRow} />
        <BreakdownCard tabs={tabsOf(DEVICE_DIMS)} load={loadBreakdown} reloadKey={reloadKey} onSelect={selectRow} />
        <BreakdownCard
          tabs={[{ dimension: "car", label: t("热门车辆") }]}
          load={loadBreakdown}
          reloadKey={reloadKey}
          onSelect={selectRow}
          columns={[visitorsCol, { key: "pageviews", label: t("浏览次数") }]}
        />
        <LiveFeed live={live} onOpen={setTimeline} />
      </div>

      <VisitorsPanel range={range} filters={scoped} reloadKey={reloadKey} onOpen={setTimeline} />

      <CarViewersSheet
        carId={carSheet?.id ?? null}
        title={carSheet?.title}
        span={carSheet?.span}
        filters={carSheet?.filters}
        onOpenChange={(open) => {
          if (!open) setCarSheet(null);
        }}
      />
      <VisitorTimelineSheet
        target={timeline}
        onOpenChange={(open) => {
          if (!open) setTimeline(null);
        }}
      />
    </div>
  );
}
