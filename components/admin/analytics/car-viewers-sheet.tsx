"use client";

// 某辆车的浏览者(右侧 Sheet,手机全宽):自带时间范围与「排除管理员」开关
// (与仪表盘共用同一个 localStorage 键);汇总浏览次数 / 人数 / 登录用户,逐个访客列出地区、设备、来源;
// 点访客打开其浏览轨迹(嵌套 VisitorTimelineSheet)。
// 从仪表盘「热门车辆」打开时沿用仪表盘的时间范围与筛选(数字与点的那一行一致,筛选列在标题下);
// 从车辆 tab 打开时默认最近 90 天、不加筛选。
// 列表只取最近 100 位浏览者:另有「全部 / 登录用户 / 匿名」分段(visitor_type 筛选),热门车辆的
// 登录用户不会被大量匿名浏览挤出列表;汇总数字随分段一起按筛选后的浏览计。

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import Link from "@/components/localized-navigation";
import { Check, ExternalLink, Filter, RefreshCw, UserRound, Users, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { adminUserLink, carLink } from "@/lib/static-link";
import { fetchCarViewers, resolveRange, type RangePreset, type ResolvedRange } from "@/lib/analytics/admin";
import { formatGeoWithFlag } from "@/lib/analytics/geo";
import { anonymousLabel, formatNumber, relativeTime } from "@/components/analytics/format";
import { viewsText } from "@/components/analytics/seller/seller-viewer";
import { RangeTabs } from "@/components/analytics/range-tabs";
import { filterChipLabel } from "@/components/analytics/dimension-label";
import type { AnalyticsCarViewerRow, AnalyticsCarViewers, AnalyticsFilters } from "@/lib/analytics/types";
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
import { useExcludeAdmins } from "@/components/admin/analytics/use-exclude-admins";
import { AnalyticsErrorNotice } from "@/components/admin/analytics/analytics-error";
import { deviceSummary, fullDateTime, sourceLabel } from "@/components/admin/analytics/event-row";
import {
  ANALYTICS_SHEET_CLASS,
  VisitorTimelineSheet,
  type VisitorTimelineTarget,
} from "@/components/admin/analytics/visitor-timeline-sheet";

const LIMIT = 100;

type ViewerTab = "all" | "user" | "anonymous";
const VIEWER_TABS: ViewerTab[] = ["all", "user", "anonymous"];

/** 打开面板时的时间范围:预设 + 已解析好的区间(仪表盘的 span) */
export interface CarViewersSpan {
  preset: RangePreset;
  range: ResolvedRange;
}

interface Shown {
  carId: string;
  title?: string;
  span?: CarViewersSpan;
  filters?: AnalyticsFilters;
}

/** 车由 p_car_id 指定、排除管理员与访客类型由面板里的开关 / 分段决定:传入的筛选去掉这几项 */
function scopeFilters(filters: AnalyticsFilters | undefined): AnalyticsFilters {
  const rest = { ...filters };
  delete rest.car_id;
  delete rest.exclude_admins;
  delete rest.visitor_type;
  return rest;
}

/** 车 / 范围 / 筛选任一变化即重建面板内容(内容的初始状态取自这几项) */
function shownKey(s: Shown): string {
  const r = s.span?.range;
  return JSON.stringify([s.carId, s.span?.preset, r?.from.getTime(), r?.to.getTime(), s.filters ?? {}]);
}

export function CarViewersSheet({
  carId,
  title,
  span,
  filters,
  onOpenChange,
}: {
  carId: string | null;
  title?: string;
  /** 打开时的时间范围(从仪表盘打开时传仪表盘当前的范围);不传默认最近 90 天 */
  span?: CarViewersSpan;
  /** 仪表盘当前的筛选(排除管理员另由面板里的开关决定);不传不筛选 */
  filters?: AnalyticsFilters;
  onOpenChange: (open: boolean) => void;
}) {
  // 关闭动画期间 carId 已置空:保留上一次的内容,避免面板先变空再滑出
  const [shown, setShown] = useState<Shown | null>(carId ? { carId, title, span, filters } : null);
  if (
    carId &&
    (!shown ||
      shown.carId !== carId ||
      shown.title !== title ||
      shown.span !== span ||
      shown.filters !== filters)
  ) {
    setShown({ carId, title, span, filters });
  }

  return (
    <Sheet open={!!carId} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className={ANALYTICS_SHEET_CLASS}>
        {shown && (
          <ViewersBody
            key={shownKey(shown)}
            carId={shown.carId}
            title={shown.title}
            span={shown.span}
            filters={shown.filters}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface Result {
  /** 对应的请求标识,与当前 reqKey 不同即「加载中」(保留上一帧并降低不透明度) */
  key: string;
  data: AnalyticsCarViewers | null;
  error: unknown;
  /** 拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
}

function ViewersBody({ carId, title, span, filters }: Shown) {
  const { t, locale } = useI18n();
  // 时间范围:先沿用打开时给的区间(与仪表盘那一行的数字一致);切换预设或手动刷新后
  // range 置空,改为拉取时按当前时间解析(渲染期不读当前时间)
  const [period, setPeriod] = useState<{ preset: RangePreset; range: ResolvedRange | null }>(() => ({
    preset: span?.preset ?? "90d",
    range: span?.range ?? null,
  }));
  // 打开时的筛选:只取一次(范围 / 筛选变了外层会按 key 重建),父组件重渲染传来的新对象不触发重拉
  const [scoped] = useState(() => scopeFilters(filters));
  const [excludeAdmins, setExcludeAdmins] = useExcludeAdmins();
  const [tab, setTab] = useState<ViewerTab>(() => filters?.visitor_type ?? "all");
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [timeline, setTimeline] = useState<VisitorTimelineTarget | null>(null);
  const uid = useId();

  // 范围 / 排除管理员 / 访客类型 / 手动刷新任一变化即重拉;过期请求的结果在 cleanup 里丢弃
  const fixed = period.range ? `${period.range.from.getTime()}-${period.range.to.getTime()}` : "";
  const reqKey = `${period.preset}|${fixed}|${excludeAdmins ? 1 : 0}|${tab}|${tick}`;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchCarViewers(
          carId,
          period.range ?? resolveRange(period.preset),
          {
            ...scoped,
            ...(tab !== "all" ? { visitor_type: tab } : {}),
            ...(excludeAdmins ? { exclude_admins: true } : {}),
          },
          LIMIT
        );
        if (!cancelled) setResult({ key: reqKey, data, error: null, now: Date.now() });
      } catch (error) {
        if (!cancelled) setResult({ key: reqKey, data: null, error, now: Date.now() });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [carId, period, scoped, excludeAdmins, tab, reqKey]);

  function refresh() {
    setPeriod((p) => (p.range ? { ...p, range: null } : p));
    setTick((n) => n + 1);
  }

  const tabLabel: Record<ViewerTab, string> = { all: t("全部"), user: t("登录用户"), anonymous: t("匿名") };
  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = VIEWER_TABS.indexOf(tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % VIEWER_TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + VIEWER_TABS.length) % VIEWER_TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = VIEWER_TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(VIEWER_TABS[next]);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  // 沿用的筛选,如「国家: 美国 · 访问来源: google.com」
  const scope = (Object.keys(scoped) as (keyof AnalyticsFilters)[])
    .filter((k) => scoped[k] !== undefined)
    .map((k) => filterChipLabel(k, String(scoped[k]), t, locale))
    .join(" · ");

  const loading = result?.key !== reqKey;
  const data = result?.data ?? null;
  const rows = data?.rows ?? [];

  return (
    <>
      <SheetHeader
        className="flex-row items-start gap-2 px-4 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4" strokeWidth={1.5} />
            {t("车辆浏览者")}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            <Link
              href={carLink(carId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 hover:underline"
            >
              <span className="truncate">{title || carId.slice(0, 8)}</span>
              <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            </Link>
          </SheetDescription>
          {scope && (
            <p className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground" title={scope}>
              <Filter className="h-3 w-3 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">{t("筛选")}: </span>
              <span className="truncate">{scope}</span>
            </p>
          )}
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon-sm" className="-mr-1 shrink-0" aria-label={t("关闭")}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </SheetClose>
      </SheetHeader>

      {/* 时间范围 + 排除管理员 + 刷新 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 pb-2.5">
        <RangeTabs
          value={period.preset}
          onChange={(preset) => setPeriod((p) => (p.preset === preset ? p : { preset, range: null }))}
        />
        <button
          type="button"
          role="switch"
          aria-checked={excludeAdmins}
          onClick={() => setExcludeAdmins(!excludeAdmins)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
            excludeAdmins
              ? "bg-primary/30 font-medium text-brand-ink"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {excludeAdmins && <Check className="h-3 w-3" strokeWidth={2} />}
          {t("排除管理员")}
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          disabled={loading}
          onClick={refresh}
          aria-label={t("刷新")}
          title={t("刷新")}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
        </Button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        {/* 访客类型:放不下就换行(不横向滚动,末尾的 tab 不会被裁掉) */}
        <div
          role="tablist"
          aria-label={t("访客类型")}
          onKeyDown={onTabKeyDown}
          className="mb-2.5 flex flex-wrap gap-x-0.5 gap-y-1"
        >
          {VIEWER_TABS.map((key) => {
            const on = key === tab;
            return (
              <button
                key={key}
                id={`${uid}-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(key)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none ${
                  on ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabLabel[key]}
              </button>
            );
          })}
        </div>
        <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`}>
          {result?.error ? (
            <AnalyticsErrorNotice error={result.error} />
          ) : !data ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("浏览次数"), value: data.views ?? 0 },
                  { label: t("浏览人数"), value: data.viewers ?? 0 },
                  { label: t("登录用户"), value: data.logged_in_viewers ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-card px-3 py-2.5">
                    <p className="text-lg font-semibold leading-tight">{formatNumber(s.value, locale)}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">{t("该时间段内暂无浏览记录")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {rows.map((row) => (
                    <ViewerRow
                      key={row.visitor_id}
                      row={row}
                      now={result?.now ?? 0}
                      onOpen={() =>
                        setTimeline({
                          visitorId: row.visitor_id,
                          label: row.user_id
                            ? row.username || row.user_id.slice(0, 8)
                            : anonymousLabel(row.visitor_id, t),
                        })
                      }
                    />
                  ))}
                </ul>
              )}
              {rows.length >= LIMIT && (
                <p className="text-center text-[10px] text-muted-foreground">
                  {t("仅显示最近 {n} 位浏览者", { n: LIMIT })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <VisitorTimelineSheet
        target={timeline}
        onOpenChange={(open) => {
          if (!open) setTimeline(null);
        }}
      />
    </>
  );
}

/** 一位浏览者:身份 + 地区/设备 + 来源 + 浏览次数/最近浏览;整行打开轨迹,右侧图标进后台用户页 */
function ViewerRow({
  row,
  now,
  onOpen,
}: {
  row: AnalyticsCarViewerRow;
  now: number;
  onOpen: () => void;
}) {
  const { t, locale } = useI18n();
  const place = [formatGeoWithFlag(row, locale) || t("未知地区"), deviceSummary(row, t)]
    .filter(Boolean)
    .join(" · ");
  // 来源单独一行:和地区 / 设备挤在一行时手机上总被截掉
  const source = `${t("访问来源")}: ${sourceLabel(row, t)}`;

  return (
    <li className="flex items-stretch overflow-hidden rounded-xl bg-card">
      <button
        type="button"
        onClick={onOpen}
        title={t("查看浏览轨迹")}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="block min-w-0 flex-1 space-y-1">
          <VisitorIdentity
            visitorId={row.visitor_id}
            userId={row.user_id}
            username={row.username}
            avatarUrl={row.avatar_url}
            loggedIn={row.logged_in}
          />
          <span className="block text-[10px] text-muted-foreground">
            <span className="block truncate" title={place}>
              {place}
            </span>
            <span className="block truncate" title={source}>
              {source}
            </span>
          </span>
        </span>
        <span className="block shrink-0 text-right">
          <span className="block text-xs font-medium tabular-nums">{viewsText(row.views, t, locale)}</span>
          <span
            className="block text-[10px] text-muted-foreground"
            title={fullDateTime(row.last_viewed, locale)}
          >
            {relativeTime(row.last_viewed, t, locale, now)}
          </span>
        </span>
      </button>
      {row.user_id && (
        <Link
          href={adminUserLink(row.user_id)}
          title={t("用户详情")}
          aria-label={t("用户详情")}
          className="flex w-9 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <UserRound className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      )}
    </li>
  );
}
