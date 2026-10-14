"use client";

// 访问统计的单序列时间图:面积 + 折线,手写 SVG(不加依赖)。admin 与卖家仪表盘共用。
// 规范(dataviz 已校验):序列色浅 oklch(0.5 0.11 168) / 深 oklch(0.66 0.13 168),2px 圆角线 + ~10% 面积;
// 网格 1px 实线 var(--border);坐标文字用 muted-foreground(文字永不用序列色);
// 十字线吸附最近的桶 + tooltip(值在前),键盘聚焦后左右键同样可看;内置「图表 / 表格」切换(无障碍孪生,表格最新在上);
// loading 时保留上一帧、降低不透明度,首次无数据时才显示骨架。

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChartLine, Table2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCompact, formatNumber } from "@/components/analytics/format";
import {
  estimateTextWidth,
  formatBucketFull,
  formatBucketTick,
  nearestIndex,
  niceTicks,
  pointX,
  xLabelIndices,
} from "@/components/analytics/chart-utils";

export interface SeriesPoint {
  /** 桶起点,本地 wall time "YYYY-MM-DDTHH:MM:SS" */
  t: string;
  value: number;
}

/** 序列色 CSS 变量(浅 / 深两档),挂在组件根元素上;图表、KPI 指示线、排行背景条共用 */
export const VIZ_VARS = "[--viz:oklch(0.5_0.11_168)] dark:[--viz:oklch(0.66_0.13_168)]";

const AXIS_BAND = 22; // x 轴标签区高度(容器高度 = 绘图区 + 这一条,避免内部滚动)
const PAD_TOP = 8; // 顶部留白:顶刻度文字、2px 线与端点圆环不被裁
const PAD_RIGHT = 10;
const FONT = 10;

export function TimeSeriesChart({
  points,
  bucket,
  label,
  loading = false,
  height = 200,
}: {
  points: SeriesPoint[];
  bucket: "hour" | "day";
  /** 序列名(tooltip / 表格表头) */
  label: string;
  /** true 时保留上一帧并降低不透明度 */
  loading?: boolean;
  /** 绘图区高度,默认 200;容器高度自动包含 x 轴标签区 */
  height?: number;
}): React.JSX.Element {
  const { t, locale } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);

  // 宽度自适应:ResizeObserver 首次 observe 即回调一次,无需在 effect 里同步 setState
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.max(0, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const total = height + AXIS_BAND;
  const values = points.map((p) => (Number.isFinite(p.value) && p.value > 0 ? p.value : 0));
  const ticks = niceTicks(values.reduce((m, v) => Math.max(m, v), 0));
  const top = ticks[ticks.length - 1];
  const tickLabels = ticks.map((v) => formatCompact(v, locale));
  const x0 = Math.max(...tickLabels.map((s) => estimateTextWidth(s, FONT))) + 8;
  const plotW = Math.max(0, width - x0 - PAD_RIGHT);
  const plotH = height - PAD_TOP;
  const yOf = (v: number) => height - (top > 0 ? (v / top) * plotH : 0);
  const xs = points.map((_, i) => pointX(i, n, x0, plotW));
  const ys = values.map(yOf);
  const active = hover !== null && hover < n ? hover : null;

  const lineD = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join("");
  const areaD =
    n >= 2 ? `${lineD}L${xs[n - 1].toFixed(1)} ${height}L${xs[0].toFixed(1)} ${height}Z` : "";

  const tickTexts = points.map((p) => formatBucketTick(p.t, bucket, locale));
  const labelW = tickTexts.reduce((m, s) => Math.max(m, estimateTextWidth(s, FONT)), 0);
  const labelIdx = width > 0 ? xLabelIndices(points.map((p) => p.t), plotW, labelW, bucket) : [];

  const activeText =
    active !== null
      ? `${formatBucketFull(points[active].t, bucket, locale)}: ${formatNumber(points[active].value, locale)} ${label}`
      : "";

  function locate(e: PointerEvent<HTMLDivElement>) {
    if (n === 0 || plotW <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(nearestIndex(e.clientX - rect.left, x0, plotW, n));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return;
    let next: number | null | undefined;
    if (e.key === "ArrowLeft") next = active === null ? n - 1 : Math.max(0, active - 1);
    else if (e.key === "ArrowRight") next = active === null ? n - 1 : Math.min(n - 1, active + 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") next = null;
    if (next === undefined) return;
    e.preventDefault();
    setHover(next);
  }

  let body: React.ReactNode;
  if (n === 0) {
    body = loading ? (
      <Skeleton className="w-full" style={{ height: total }} />
    ) : (
      <div
        className="flex items-center justify-center rounded-lg bg-muted/40 text-xs text-muted-foreground"
        style={{ height: total }}
      >
        {t("暂无数据")}
      </div>
    );
  } else if (view === "table") {
    body = (
      <div
        className={cn(
          "overflow-y-auto rounded-lg border border-border transition-opacity duration-150",
          loading && "opacity-50"
        )}
        style={{ height: total }}
      >
        <table className="w-full text-xs">
          <caption className="sr-only">{label}</caption>
          <thead className="sticky top-0 bg-card text-[10px] text-muted-foreground">
            <tr>
              <th scope="col" className="px-2.5 py-1.5 text-left font-normal">
                {t("时间")}
              </th>
              <th scope="col" className="px-2.5 py-1.5 text-right font-normal">
                {label}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 最新的桶排最上面:表格框与图表同高(切换不跳版面),最近一天 / 一小时不用滚到底才看得到;
                key 仍用原下标(夏令时回拨时同一个本地整点会出现两次) */}
            {[...points].reverse().map((p, j) => (
              <tr key={`${n - 1 - j}|${p.t}`} className="border-t border-border/60">
                <td className="px-2.5 py-1.5 whitespace-nowrap">{formatBucketFull(p.t, bucket, locale)}</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">{formatNumber(p.value, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    const ax = active !== null ? xs[active] : 0;
    const flip = ax > width / 2;
    body = (
      <div
        role="group"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "relative w-full touch-pan-y rounded-md outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
          loading && "opacity-50"
        )}
        style={{ height: total }}
        onPointerDown={locate}
        onPointerMove={locate}
        onPointerLeave={(e) => {
          // 触屏抬手也会触发 leave:保留读数,点别处(失焦)再收起
          if (e.pointerType === "mouse") setHover(null);
        }}
        // 在图上竖向滑动 = 滚动页面(touch-pan-y 交给浏览器,随后 pointercancel):收起读数;横向拖动不受影响
        onPointerCancel={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        {width > 0 && (
          <svg
            width={width}
            height={total}
            className="absolute inset-0 block overflow-visible"
            aria-hidden="true"
          >
            {ticks.map((v, i) => {
              const y = Math.round(yOf(v)) + 0.5;
              return (
                <g key={v}>
                  <line
                    x1={x0}
                    x2={width - PAD_RIGHT}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                  <text
                    x={x0 - 6}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={FONT}
                    fill="var(--muted-foreground)"
                    className="tabular-nums"
                  >
                    {tickLabels[i]}
                  </text>
                </g>
              );
            })}
            {n >= 2 && (
              <>
                <path d={areaD} fill="var(--viz)" fillOpacity={0.1} />
                <path
                  d={lineD}
                  fill="none"
                  stroke="var(--viz)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}
            {/* 只有一个桶时画不出线,用端点表示 */}
            {n === 1 && active === null && (
              <circle cx={xs[0]} cy={ys[0]} r={4} fill="var(--viz)" stroke="var(--card)" strokeWidth={2} />
            )}
            {labelIdx.map((i) => {
              const w = estimateTextWidth(tickTexts[i], FONT);
              const x = Math.min(Math.max(xs[i], w / 2), width - w / 2);
              return (
                <text
                  key={i}
                  x={x}
                  y={height + 15}
                  textAnchor="middle"
                  fontSize={FONT}
                  fill="var(--muted-foreground)"
                  className="tabular-nums"
                >
                  {tickTexts[i]}
                </text>
              );
            })}
            {active !== null && (
              <>
                <line
                  x1={Math.round(ax) + 0.5}
                  x2={Math.round(ax) + 0.5}
                  y1={PAD_TOP}
                  y2={height}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <circle cx={ax} cy={ys[active]} r={4} fill="var(--viz)" stroke="var(--card)" strokeWidth={2} />
              </>
            )}
          </svg>
        )}
        {active !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-border bg-popover px-2.5 py-1.5 whitespace-nowrap text-popover-foreground"
            style={{ left: ax, transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
          >
            <p className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full bg-[color:var(--viz)]" />
              <span className="text-sm font-semibold tabular-nums">{formatNumber(points[active].value, locale)}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatBucketFull(points[active].t, bucket, locale)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={boxRef} className={cn(VIZ_VARS, "w-full min-w-0")} aria-busy={loading || undefined}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full bg-[color:var(--viz)]" />
          <span className="truncate">{label}</span>
        </span>
        <div className="flex shrink-0 items-center rounded-full bg-muted p-0.5">
          <ViewToggle
            pressed={view === "chart"}
            onClick={() => setView("chart")}
            label={t("图表视图")}
            icon={<ChartLine className="h-3.5 w-3.5" strokeWidth={1.5} />}
          />
          <ViewToggle
            pressed={view === "table"}
            onClick={() => {
              setView("table");
              setHover(null);
            }}
            label={t("表格视图")}
            icon={<Table2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
          />
        </div>
      </div>
      {body}
      <span className="sr-only" aria-live="polite">
        {activeText}
      </span>
    </div>
  );
}

function ViewToggle({
  pressed,
  onClick,
  label,
  icon,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-6 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        pressed ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}
