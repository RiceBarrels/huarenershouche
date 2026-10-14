"use client";

// 访问统计 KPI 格:标签 + 数值 + 与上一周期对比(箭头 + 百分比;颜色按「变好 / 变坏」,不只靠颜色)。
// 上一周期为 0(pct = null,无基数)时不显示对比,免得刚上线时每格都只剩一个孤零零的箭头。
// active = 图表当前显示的指标(标签前带序列色短线 + 边框);有 onClick 时渲染为按钮(aria-pressed)。
// 大号数值用比例数字(不加 tabular-nums)。

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { formatPercent } from "@/components/analytics/format";
import { VIZ_VARS } from "@/components/analytics/time-series-chart";
import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  delta,
  goodWhen = "up",
  active = false,
  onClick,
}: {
  label: string;
  /** 已格式化 */
  value: string;
  /** 来自 format.ts delta();pct 为 null(上一周期为 0)时不显示对比 */
  delta?: { pct: number | null; dir: "up" | "down" | "flat" } | null;
  /** 默认 "up";跳出率传 "down" */
  goodWhen?: "up" | "down";
  /** 当前图表指标 */
  active?: boolean;
  /** 有则渲染为 button */
  onClick?: () => void;
}): React.JSX.Element {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {active && <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full bg-[color:var(--viz)]" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {/* 格子很窄(如 md 断点下一行 5 格)时数值降一档,不溢出到相邻格 */}
        <span className="text-xl leading-tight font-semibold text-foreground @[8rem]:text-2xl">{value}</span>
        {delta && delta.pct !== null && <DeltaBadge pct={delta.pct} dir={delta.dir} goodWhen={goodWhen} />}
      </span>
    </>
  );

  // @container:数值字号按格子宽度取档;flex-1 保证放进 flex 行时按份分宽(容器查询的格子不能靠内容撑宽)
  const cls = cn(
    VIZ_VARS,
    "@container flex h-full min-w-0 flex-1 flex-col rounded-xl border bg-card p-3 text-left",
    active ? "border-foreground/20" : "border-transparent"
  );

  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        cls,
        "transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted/40",
        !active && "hover:border-border"
      )}
    >
      {body}
    </button>
  );
}

function DeltaBadge({
  pct,
  dir,
  goodWhen,
}: {
  pct: number;
  dir: "up" | "down" | "flat";
  goodWhen: "up" | "down";
}) {
  const { t, locale } = useI18n();
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  // 11px 小字:浅色卡片上用 emerald-700(白底约 5.4:1;emerald-600 只有约 3.7:1,不到 AA 的 4.5:1)
  const tone =
    dir === "flat"
      ? "text-muted-foreground"
      : dir === goodWhen
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
  const dirText = dir === "up" ? t("上升") : dir === "down" ? t("下降") : t("持平");
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px]", tone)} title={t("与上一周期相比")}>
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />
      <span className="sr-only">{dirText}</span>
      {formatPercent(Math.abs(pct), locale)}
    </span>
  );
}
