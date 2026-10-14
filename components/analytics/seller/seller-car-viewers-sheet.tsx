"use client";

// 某辆车的浏览者(右侧 Sheet,手机全宽):沿用数据面板当前的时间范围与筛选,数字与「热门车辆」那一行一致;
// 汇总浏览次数 / 浏览人数 / 登录用户,逐个列出浏览者(默认匿名);点浏览者打开他在本账号车辆上的浏览记录。
// 「只看这辆车」把整个数据面板筛到这辆车(看它的来源 / 地区 / 设备)。

import { useEffect, useState } from "react";
import Link from "@/components/localized-navigation";
import { ChevronRight, Filter, Users, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { carLink } from "@/lib/static-link";
import type { ResolvedRange } from "@/lib/analytics/admin";
import { fetchSellerCarViewers } from "@/lib/analytics/seller";
import { formatNumber } from "@/components/analytics/format";
import type { SellerAnalyticsFilters, SellerCarViewers, SellerViewerRow } from "@/lib/analytics/types";
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
import { cn } from "@/lib/utils";
import { SellerAnalyticsNotice } from "@/components/analytics/seller/seller-notice";
import { SellerViewerItem } from "@/components/analytics/seller/seller-viewer";
import {
  SELLER_SHEET_CLASS,
  SellerViewerTimelineSheet,
} from "@/components/analytics/seller/seller-viewer-timeline-sheet";

export interface SellerCarTarget {
  id: string;
  /** 已按界面语言取好的车辆标题 */
  title: string;
}

const LIMIT = 100;

/** 车由 p_car_id 指定,数据面板上的车辆筛选不再叠加 */
function withoutCar(filters: SellerAnalyticsFilters): SellerAnalyticsFilters {
  const rest = { ...filters };
  delete rest.car_id;
  return rest;
}

export function SellerCarViewersSheet({
  sellerId,
  car,
  range,
  filters,
  scope,
  onOpenChange,
  onFilterCar,
}: {
  sellerId: string;
  /** 非空即打开 */
  car: SellerCarTarget | null;
  /** 数据面板当前的时间范围与筛选 */
  range: ResolvedRange;
  filters: SellerAnalyticsFilters;
  /** 范围与筛选的文字说明,如「30 天 · 国家: 美国」 */
  scope: string;
  onOpenChange: (open: boolean) => void;
  /** 「只看这辆车」;不传则不显示 */
  onFilterCar?: (car: SellerCarTarget) => void;
}) {
  // 关闭动画期间 car 已置空:保留上一次的内容,避免面板先变空再滑出
  const [shown, setShown] = useState<SellerCarTarget | null>(car);
  if (car && (!shown || shown.id !== car.id || shown.title !== car.title)) {
    setShown(car);
  }

  return (
    <Sheet open={!!car} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className={SELLER_SHEET_CLASS}>
        {shown && (
          <CarViewersBody
            key={shown.id}
            sellerId={sellerId}
            car={shown}
            range={range}
            filters={filters}
            scope={scope}
            onFilterCar={onFilterCar}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface Result {
  /** 对应的请求标识,与当前 reqKey 不同即「加载中」(保留上一帧并降低不透明度) */
  key: string;
  data: SellerCarViewers | null;
  error: unknown;
  /** 拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
}

function CarViewersBody({
  sellerId,
  car,
  range,
  filters,
  scope,
  onFilterCar,
}: {
  sellerId: string;
  car: SellerCarTarget;
  range: ResolvedRange;
  filters: SellerAnalyticsFilters;
  scope: string;
  onFilterCar?: (car: SellerCarTarget) => void;
}) {
  const { t, locale } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [viewer, setViewer] = useState<SellerViewerRow | null>(null);

  const reqKey = `${range.from.getTime()}|${range.to.getTime()}|${JSON.stringify(filters)}|${attempt}`;
  useEffect(() => {
    let cancelled = false;
    fetchSellerCarViewers(sellerId, car.id, range, withoutCar(filters), LIMIT).then(
      (data) => {
        if (!cancelled) setResult({ key: reqKey, data, error: null, now: Date.now() });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key: reqKey, data: null, error, now: Date.now() });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [sellerId, car.id, range, filters, reqKey]);

  const loading = result?.key !== reqKey;
  const data = result?.data ?? null;
  const rows = data?.rows ?? [];
  const canFilter = !!onFilterCar && filters.car_id !== car.id;

  return (
    <>
      <SheetHeader
        className={cn("flex-row items-start gap-2 px-4", canFilter ? "pb-2" : "border-b border-border pb-3")}
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t("车辆浏览者")}
          </SheetTitle>
          <Link
            href={carLink(car.id)}
            className="flex max-w-full items-center gap-0.5 text-xs font-medium hover:underline"
          >
            <span className="truncate">{car.title}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <SheetDescription className="truncate text-[10px]">{scope}</SheetDescription>
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon-sm" className="-mr-1 shrink-0" aria-label={t("关闭")}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </SheetClose>
      </SheetHeader>

      {canFilter && (
        <div className="border-b border-border px-4 pb-2.5">
          <Button
            variant="secondary"
            size="xs"
            className="gap-1 text-[11px]"
            onClick={() => onFilterCar?.(car)}
          >
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            {t("只看这辆车")}
          </Button>
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        {result?.error && !loading ? (
          <SellerAnalyticsNotice error={result.error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : !data ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className={cn("space-y-3 transition-opacity", loading && "opacity-60")} aria-busy={loading || undefined}>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t("浏览次数"), value: data.views ?? 0 },
                { label: t("浏览人数"), value: data.viewers ?? 0 },
                { label: t("登录用户"), value: data.logged_in_viewers ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-card px-3 py-2.5">
                  <p className="text-lg leading-tight font-semibold">{formatNumber(s.value, locale)}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("该时间段内暂无浏览记录")}</p>
            ) : (
              <ul className="space-y-0.5 rounded-xl bg-card p-1">
                {rows.map((row) => (
                  <li key={row.viewer_key}>
                    <SellerViewerItem row={row} now={result?.now ?? 0} onOpen={() => setViewer(row)} showCar={false} />
                  </li>
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

      <SellerViewerTimelineSheet
        sellerId={sellerId}
        viewer={viewer}
        onOpenChange={(open) => {
          if (!open) setViewer(null);
        }}
      />
    </>
  );
}
