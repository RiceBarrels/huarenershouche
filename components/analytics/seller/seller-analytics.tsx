"use client";

// 卖家「数据面板」(/account/dashboard)里的访问统计:个人卖家、车行、认领后操作的系统车行通用,
// 只统计该账号名下车辆的浏览(seller_analytics_*;卖家自己与平台管理员的浏览在库内恒定剔除)。
// 版式:时间范围 + 已选筛选在最上面,作用于下面全部区块;KPI(含环比)→ 浏览趋势 → 排行卡片
// (热门车辆 / 来源 / 地区 / 设备)→ 浏览者。点车辆 → 该车浏览者;点其他排行行 → 加筛选;
// 点浏览者 → 他在本账号车辆上的浏览记录。浏览者默认匿名(访客 #xxxxxx),不出现任何后台链接。

import { useEffect, useId, useState } from "react";
import { Eye, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { resolveRange, type RangePreset, type ResolvedRange } from "@/lib/analytics/admin";
import { fetchSellerBreakdown, fetchSellerOverview, fetchSellerViewers } from "@/lib/analytics/seller";
import type {
  AnalyticsBreakdownRow,
  AnalyticsFilters,
  SellerAnalyticsDimension,
  SellerAnalyticsFilters,
  SellerOverview,
  SellerViewerRow,
} from "@/lib/analytics/types";
import {
  collectingSince,
  delta,
  formatNumber,
  prevPeriodComplete,
  shortDate,
} from "@/components/analytics/format";
import { KpiTile } from "@/components/analytics/kpi-tile";
import { RangeTabs, presetLabel } from "@/components/analytics/range-tabs";
import { FilterChips, type FilterChip } from "@/components/analytics/filter-chips";
import { TimeSeriesChart } from "@/components/analytics/time-series-chart";
import { BreakdownCard, type BreakdownTab } from "@/components/analytics/breakdown-card";
import { dimensionName, filterChipLabel, filtersForRow } from "@/components/analytics/dimension-label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  SellerAnalyticsNotice,
  sellerErrorKind,
  sellerErrorText,
} from "@/components/analytics/seller/seller-notice";
import { SellerViewerItem, carName } from "@/components/analytics/seller/seller-viewer";
import {
  SellerCarViewersSheet,
  type SellerCarTarget,
} from "@/components/analytics/seller/seller-car-viewers-sheet";
import { SellerViewerTimelineSheet } from "@/components/analytics/seller/seller-viewer-timeline-sheet";

const RANGE_OPTIONS: RangePreset[] = ["24h", "7d", "30d", "90d"];
const DEFAULT_PRESET: RangePreset = "30d";
const CHART_HEIGHT = 180;
// 浏览者每页条数:数据面板里只占一屏左右,下面还有「各车辆数据」
const VIEWERS_PAGE = 10;

// 卖家可用的筛选键,也是筛选胶囊的展示顺序(车 → 来源 → 地区 → 设备);其他键一律丢弃,SQL 侧也会再过滤
const FILTER_KEYS = [
  "car_id",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "country",
  "region",
  "city",
  "device",
  "browser",
  "os",
  "platform",
  "locale",
  "visitor_type",
] as const satisfies readonly (keyof SellerAnalyticsFilters)[];

const SOURCE_DIMS: SellerAnalyticsDimension[] = ["referrer_host", "utm_source", "utm_medium", "utm_campaign"];
const GEO_DIMS: SellerAnalyticsDimension[] = ["country", "region", "city"];
const DEVICE_DIMS: SellerAnalyticsDimension[] = ["device", "browser", "os", "platform", "locale"];

function pickSellerFilters(f: Partial<AnalyticsFilters>): SellerAnalyticsFilters {
  const out: Record<string, unknown> = {};
  for (const k of FILTER_KEYS) if (f[k] !== undefined) out[k] = f[k];
  return out as SellerAnalyticsFilters;
}

function sameFilters(a: SellerAnalyticsFilters, b: SellerAnalyticsFilters): boolean {
  return FILTER_KEYS.every((k) => a[k] === b[k]);
}

interface Query {
  /** 自增:范围 / 筛选 / 刷新任一变化 +1,各区块据此判断结果是否过期 */
  version: number;
  preset: RangePreset;
  /** 这一轮发起时解析好的具体区间,各区块共用(数字互相对得上) */
  range: ResolvedRange;
  filters: SellerAnalyticsFilters;
}

interface OverviewState {
  version: number;
  /** 最近一次成功的数据:本轮失败或重拉中时保留上一帧 */
  data: SellerOverview | null;
  /** data 对应的区间(判断上一周期是否已开始采集用) */
  range: ResolvedRange;
  /** data 是否带筛选拉的(空态只认「无筛选且没有浏览」的那份数据) */
  filtered: boolean;
  error: unknown;
}

interface ViewersState {
  /** `${query.version}|${第几次重试}` */
  key: string;
  rows: SellerViewerRow[];
  total: number;
  /** 加载更多没拿到新行(翻页期间数据有变动):不再显示「加载更多」 */
  exhausted: boolean;
  error: unknown;
  /** 拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
}

interface MoreState {
  key: string;
  loading: boolean;
  error: unknown;
}

export function SellerAnalytics({ sellerId }: { sellerId: string }) {
  // 切换操作身份(本人 ↔ 认领的车行)时整块重置:筛选条件属于上一个账号的车
  return <SellerAnalyticsBody key={sellerId} sellerId={sellerId} />;
}

function SellerAnalyticsBody({ sellerId }: { sellerId: string }) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const [query, setQuery] = useState<Query>(() => ({
    version: 0,
    preset: DEFAULT_PRESET,
    range: resolveRange(DEFAULT_PRESET),
    filters: {},
  }));
  const [metric, setMetric] = useState<"views" | "viewers">("views");
  // 「只看这辆车」时记下车名,筛选胶囊显示车名而不是 id
  const [carNames, setCarNames] = useState<Record<string, string>>({});
  const [overview, setOverview] = useState<OverviewState | null>(null);
  const [viewersAttempt, setViewersAttempt] = useState(0);
  const [viewers, setViewers] = useState<ViewersState | null>(null);
  const [more, setMore] = useState<MoreState | null>(null);
  const [carSheet, setCarSheet] = useState<SellerCarTarget | null>(null);
  const [viewer, setViewer] = useState<SellerViewerRow | null>(null);

  // 概览(KPI + 趋势):范围 / 筛选 / 刷新任一变化即重拉,过期请求的结果在 cleanup 里丢弃
  useEffect(() => {
    let cancelled = false;
    const { version, range, filters } = query;
    const filtered = Object.keys(filters).length > 0;
    fetchSellerOverview(sellerId, range, filters).then(
      (data) => {
        if (!cancelled) setOverview({ version, data, range, filtered, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setOverview((prev) => ({
            version,
            data: prev?.data ?? null,
            range: prev?.range ?? range,
            filtered: prev?.filtered ?? filtered,
            error,
          }));
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sellerId, query]);

  // 浏览者第一页:与概览并行拉(列表等概览首次成功后才显示)
  const viewersKey = `${query.version}|${viewersAttempt}`;
  useEffect(() => {
    let cancelled = false;
    const { range, filters } = query;
    fetchSellerViewers(sellerId, range, filters, VIEWERS_PAGE, 0).then(
      (res) => {
        if (cancelled) return;
        setViewers({
          key: viewersKey,
          rows: res.rows ?? [],
          total: res.total ?? 0,
          exhausted: false,
          error: null,
          now: Date.now(),
        });
      },
      (error: unknown) => {
        if (!cancelled) setViewers({ key: viewersKey, rows: [], total: 0, exhausted: false, error, now: Date.now() });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sellerId, query, viewersKey]);

  /** 发起新一轮:时间范围按此刻重新解析,所有区块一起重拉 */
  function reload(next: { preset?: RangePreset; filters?: SellerAnalyticsFilters } = {}) {
    const preset = next.preset ?? query.preset;
    setQuery({
      version: query.version + 1,
      preset,
      range: resolveRange(preset),
      filters: next.filters ?? query.filters,
    });
  }

  function addFilters(patch: Partial<AnalyticsFilters>) {
    const merged = pickSellerFilters({ ...query.filters, ...patch });
    if (!sameFilters(merged, query.filters)) reload({ filters: merged });
  }

  function removeFilter(key: string) {
    const next: SellerAnalyticsFilters = { ...query.filters };
    delete next[key as keyof SellerAnalyticsFilters];
    // 州省 / 城市是点地区行时连带加上的:去掉上级时下级一起去掉
    if (key === "country") {
      delete next.region;
      delete next.city;
    } else if (key === "region") {
      delete next.city;
    }
    reload({ filters: next });
  }

  function openCar(row: AnalyticsBreakdownRow) {
    if (!row.key) return;
    setCarSheet({ id: row.key, title: carName(row.car ?? null, t, locale) });
  }

  function filterByCar(car: SellerCarTarget) {
    setCarNames((prev) => ({ ...prev, [car.id]: car.title }));
    setCarSheet(null);
    addFilters({ car_id: car.id });
  }

  async function loadMoreViewers() {
    const cur = viewers;
    if (!cur || cur.key !== viewersKey || (more?.key === cur.key && more.loading)) return;
    const key = cur.key;
    const { range, filters } = query;
    setMore({ key, loading: true, error: null });
    try {
      const res = await fetchSellerViewers(sellerId, range, filters, VIEWERS_PAGE, cur.rows.length);
      const now = Date.now();
      setViewers((prev) => {
        if (!prev || prev.key !== key) return prev;
        // offset 翻页期间有新浏览会让行往后挪:按 viewer_key 去重
        const seen = new Set(prev.rows.map((r) => r.viewer_key));
        const fresh = (res.rows ?? []).filter((r) => !seen.has(r.viewer_key));
        return {
          ...prev,
          rows: [...prev.rows, ...fresh],
          total: res.total ?? prev.total,
          exhausted: fresh.length === 0,
          now,
        };
      });
      setMore((m) => (m?.key === key ? null : m));
    } catch (error) {
      setMore((m) => (m?.key === key ? { key, loading: false, error } : m));
    }
  }

  // 卡片的取数:未上线 / 无权的报错换成卖家看得懂的话(卡片自带「加载失败 + 重试」)
  const reloadKey = `${sellerId}|${query.version}`;
  const loadBreakdown = (dimension: string, limit: number, search: string | null) =>
    fetchSellerBreakdown(
      sellerId,
      query.range,
      query.filters,
      dimension as SellerAnalyticsDimension,
      limit,
      search
    ).catch((err: unknown) => {
      throw new Error(sellerErrorText(err, t));
    });
  const onRowFilter = (dimension: string, row: AnalyticsBreakdownRow) => addFilters(filtersForRow(dimension, row));
  const tabsOf = (dims: SellerAnalyticsDimension[]): BreakdownTab[] =>
    dims.map((d) => ({ dimension: d, label: dimensionName(d, t) }));
  const viewersColumn = [{ key: "visitors" as const, label: t("浏览人数") }];

  const chips: FilterChip[] = FILTER_KEYS.filter((k) => query.filters[k] !== undefined).map((k) => {
    const value = String(query.filters[k]);
    const label =
      k === "car_id" && carNames[value]
        ? `${dimensionName("car_id", t)}: ${carNames[value]}`
        : filterChipLabel(k, value, t, locale);
    return { key: k, label };
  });
  // 车辆浏览者面板沿用当前范围与筛选,在面板顶部用一行字说明
  const scope = [presetLabel(query.preset, t), ...chips.filter((c) => c.key !== "car_id").map((c) => c.label)].join(
    " · "
  );

  const ovFresh = overview?.version === query.version;
  const ovError = ovFresh ? overview.error : null;
  const ovLoading = !ovFresh;
  const ov = overview?.data ?? null;
  // 概览首次成功后才挂排行卡片与浏览者列表:未上线 / 无权时整块换成一条提示,卡片不会先闪一下报错
  const ready = ov !== null;
  const errorKind = ovError ? sellerErrorKind(ovError) : null;
  const viewersLoading = viewers?.key !== viewersKey;
  const busy = ovLoading || viewersLoading;
  // 没有任何筛选且该时间段一次浏览都没有:只留 KPI(看环比),其余区块换成一条空态。
  // 按「手上这份数据」判断:清除筛选后重拉期间旧数据是带筛选的,不会闪成空态
  const empty = ready && !ovError && !overview?.filtered && (ov.kpis?.views ?? 0) === 0;

  const heading = (
    <h2 id={headingId} className="px-1 text-xs font-medium text-muted-foreground">
      {t("访问统计")}
    </h2>
  );

  if (errorKind === "not_installed" || errorKind === "forbidden") {
    return (
      <section aria-labelledby={headingId}>
        {heading}
        <SellerAnalyticsNotice error={ovError} className="mt-2" />
      </section>
    );
  }

  const kpis = ov?.kpis;
  const prev = ov?.prev;
  const points = (ov?.series ?? []).map((p) => ({ t: p.t, value: metric === "views" ? p.views : p.viewers }));
  // 统计上线不久:上一周期还没开始采集时不显示环比(否则持平也是 ↑200%),区间起点早于采集时说明一句
  const prevOk = !overview || prevPeriodComplete(overview.range, ov?.data_since);
  const since = overview ? collectingSince(overview.range, ov?.data_since) : null;

  return (
    <section aria-labelledby={headingId}>
      {heading}
      <p className="mt-1 px-1 text-[11px] leading-relaxed text-muted-foreground">
        {t("仅统计你名下车辆的浏览,已排除你自己和平台管理员的访问")}
      </p>
      {since !== null && (
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("自 {date} 起开始统计", { date: shortDate(since, locale) })}
        </p>
      )}

      {/* 时间范围 + 刷新;已选筛选在下一行。作用于下面全部区块 */}
      <div className="mt-3 flex items-center gap-2">
        <RangeTabs value={query.preset} onChange={(p) => reload({ preset: p })} options={RANGE_OPTIONS} />
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          onClick={() => reload()}
          aria-label={t("刷新")}
          title={t("刷新")}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} strokeWidth={1.5} />
        </Button>
      </div>
      {chips.length > 0 && (
        <div className="mt-2">
          <FilterChips chips={chips} onRemove={removeFilter} onClear={() => reload({ filters: {} })} />
        </div>
      )}

      <div className="mt-3 space-y-3">
        {ovError ? (
          <SellerAnalyticsNotice error={ovError} onRetry={() => reload()} />
        ) : (
          <div
            className={cn(
              "grid grid-cols-2 gap-2 transition-opacity duration-150 md:grid-cols-4",
              ready && ovLoading && "opacity-50"
            )}
            aria-busy={ovLoading || undefined}
          >
            {kpis
              ? [
                  { label: t("浏览次数"), cur: kpis.views, prev: prev?.views, chart: "views" as const },
                  { label: t("浏览人数"), cur: kpis.viewers, prev: prev?.viewers, chart: "viewers" as const },
                  { label: t("登录用户"), cur: kpis.logged_in_viewers, prev: prev?.logged_in_viewers, chart: null },
                  { label: t("被浏览车辆"), cur: kpis.cars_viewed, prev: prev?.cars_viewed, chart: null },
                ].map(({ label, cur, prev: before, chart }) => (
                  <KpiTile
                    key={label}
                    label={label}
                    value={formatNumber(cur ?? 0, locale)}
                    delta={prevOk ? delta(cur, before) : null}
                    // 浏览次数 / 浏览人数可切换趋势图指标;空态没有图,不可点
                    active={!empty && chart === metric}
                    onClick={chart && !empty ? () => setMetric(chart) : undefined}
                  />
                ))
              : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px] rounded-xl" />)}
          </div>
        )}

        {empty ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl bg-card px-4 py-10 text-center">
            <Eye className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{t("该时间段内暂无浏览记录")}</p>
          </div>
        ) : (
          <>
            {!ovError && (
              <div className="rounded-xl bg-card p-3">
                <TimeSeriesChart
                  points={points}
                  bucket={ov?.bucket ?? query.range.bucket}
                  label={metric === "views" ? t("浏览次数") : t("浏览人数")}
                  loading={ovLoading}
                  height={CHART_HEIGHT}
                />
              </div>
            )}

            {ready ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <BreakdownCard
                    tabs={[{ dimension: "car", label: t("热门车辆") }]}
                    load={loadBreakdown}
                    reloadKey={reloadKey}
                    columns={[
                      { key: "visitors", label: t("浏览人数") },
                      { key: "pageviews", label: t("浏览次数") },
                    ]}
                    onSelect={(_, row) => openCar(row)}
                  />
                  <BreakdownCard
                    tabs={tabsOf(SOURCE_DIMS)}
                    load={loadBreakdown}
                    reloadKey={reloadKey}
                    columns={viewersColumn}
                    onSelect={onRowFilter}
                  />
                  <BreakdownCard
                    tabs={tabsOf(GEO_DIMS)}
                    load={loadBreakdown}
                    reloadKey={reloadKey}
                    columns={viewersColumn}
                    onSelect={onRowFilter}
                  />
                  <BreakdownCard
                    tabs={tabsOf(DEVICE_DIMS)}
                    load={loadBreakdown}
                    reloadKey={reloadKey}
                    columns={viewersColumn}
                    onSelect={onRowFilter}
                  />
                </div>

                <ViewersCard
                  state={viewers}
                  loading={viewersLoading}
                  loadingMore={more?.key === viewersKey && more.loading}
                  moreError={more?.key === viewersKey ? more.error : null}
                  onLoadMore={loadMoreViewers}
                  onRetry={() => setViewersAttempt((n) => n + 1)}
                  onOpen={setViewer}
                />
              </>
            ) : (
              !ovError && (
                <div className="grid gap-3 md:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 rounded-xl" />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      <SellerCarViewersSheet
        sellerId={sellerId}
        car={carSheet}
        range={query.range}
        filters={query.filters}
        scope={scope}
        onOpenChange={(open) => {
          if (!open) setCarSheet(null);
        }}
        onFilterCar={filterByCar}
      />
      <SellerViewerTimelineSheet
        sellerId={sellerId}
        viewer={viewer}
        onOpenChange={(open) => {
          if (!open) setViewer(null);
        }}
      />
    </section>
  );
}

/** 浏览者列表(按最近浏览倒序,分页「加载更多」);点一行打开他的浏览记录 */
function ViewersCard({
  state,
  loading,
  loadingMore,
  moreError,
  onLoadMore,
  onRetry,
  onOpen,
}: {
  state: ViewersState | null;
  /** 重拉中:保留上一帧并降低不透明度 */
  loading: boolean;
  loadingMore: boolean;
  moreError: unknown;
  onLoadMore: () => void;
  onRetry: () => void;
  onOpen: (row: SellerViewerRow) => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const error = state && !loading ? state.error : null;
  const rows = state?.rows ?? [];
  const hasMore = !!state && !loading && !error && !state.exhausted && rows.length < state.total;

  let body: React.ReactNode;
  if (error) {
    body = <SellerAnalyticsNotice error={error} onRetry={onRetry} className="py-6" />;
  } else if (!state || (loading && !!state.error)) {
    // 首次加载,或上一次失败后正在重试:骨架(别先闪「暂无浏览记录」)
    body = (
      <div className="space-y-1.5 px-1 py-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = <p className="py-8 text-center text-xs text-muted-foreground">{t("该时间段内暂无浏览记录")}</p>;
  } else {
    body = (
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.viewer_key}>
            <SellerViewerItem row={row} now={state.now} onOpen={() => onOpen(row)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby={titleId} className="rounded-xl bg-card p-3">
      <div className="flex items-baseline gap-1.5 px-1 py-1">
        <h3 id={titleId} className="text-xs font-medium">
          {t("浏览者")}
        </h3>
        {state && !state.error && (
          <span className="text-[11px] text-muted-foreground tabular-nums">{formatNumber(state.total, locale)}</span>
        )}
      </div>
      <div
        className={cn("mt-1 transition-opacity duration-150", loading && state && !state.error && "opacity-50")}
        aria-busy={loading || undefined}
      >
        {body}
      </div>
      {hasMore && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-2 h-8 w-full gap-1.5 text-xs"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("加载更多")}
        </Button>
      )}
      {!!moreError && !loadingMore && (
        <p role="alert" className="mt-1.5 text-center text-[10px] text-muted-foreground">
          {t("加载失败")}
        </p>
      )}
    </section>
  );
}
