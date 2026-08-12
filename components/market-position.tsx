"use client";

import { formatPrice } from "@/lib/format";
import type { PriceInsight } from "@/lib/price-insight";
import type { DbCar } from "@/lib/types";

interface MarketPositionProps {
  car: DbCar;
  comparables: DbCar[];
  insight: PriceInsight | null;
}

/**
 * cars.com 式市场价位条：min—avg—max 三个刻度 + 当前车价 marker。
 * 同类样本不足（insight 为 null）时不渲染。
 */
export function MarketPosition({ car, comparables, insight }: MarketPositionProps) {
  if (!insight || comparables.length === 0 || car.price <= 0) return null;

  const prices = comparables.map((c) => c.price);
  const avg = insight.marketAvg;
  // 刻度范围覆盖同类最低/最高价、修正后均价与当前车价
  const lo = Math.min(...prices, car.price, avg);
  const hi = Math.max(...prices, car.price, avg);
  const span = hi - lo || 1;
  const pct = (v: number) => Math.min(97, Math.max(3, ((v - lo) / span) * 100));

  const carPct = pct(car.price);
  const avgPct = pct(avg);
  // 均价标签额外收紧,避免与两端 min/max 标签重叠
  const avgLabelPct = Math.min(82, Math.max(18, avgPct));

  return (
    <div className="mt-3 rounded-xl bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-sm font-semibold">市场价位</h2>
        <span
          className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${insight.className}`}
        >
          {insight.label}
        </span>
      </div>

      {/* 价位条 */}
      <div className="mt-8">
        <div className="relative">
          {/* 当前车价 marker：价格 + 小三角 + 竖线 */}
          <div
            className="absolute bottom-full flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${carPct}%` }}
          >
            <span className="whitespace-nowrap font-mono text-[11px] font-bold">
              {formatPrice(car.price)}
            </span>
            <div className="h-0 w-0 border-x-4 border-t-[5px] border-x-transparent border-t-foreground" />
          </div>
          <div className="relative h-2 w-full bg-muted">
            {/* 均价刻度 */}
            <div
              className="absolute -top-1 h-[16px] w-px -translate-x-1/2 bg-muted-foreground/60"
              style={{ left: `${avgPct}%` }}
            />
            {/* 当前车价竖线 */}
            <div
              className="absolute -top-1 h-[16px] w-[2px] -translate-x-1/2 bg-foreground"
              style={{ left: `${carPct}%` }}
            />
          </div>
        </div>
        {/* min / avg / max 标签 */}
        <div className="relative mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>低 {formatPrice(lo)}</span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${avgLabelPct}%` }}
          >
            均价 {formatPrice(avg)}
          </span>
          <span>高 {formatPrice(hi)}</span>
        </div>
      </div>

      {/* 结论文案 */}
      <p className="mt-4 font-mono text-[11px]">
        {insight.delta > 0 ? (
          <span className="font-semibold text-green-600">
            低于市场均价 {formatPrice(insight.delta)}
          </span>
        ) : insight.delta < 0 ? (
          <span className="font-semibold text-orange-600">
            高于市场均价 {formatPrice(Math.abs(insight.delta))}
          </span>
        ) : (
          <span className="font-semibold text-foreground">与市场均价持平</span>
        )}
        <span className="text-muted-foreground">
          {" "}· 对比 {insight.sampleSize} 台
          {insight.sameModel ? "同款车型" : "同品牌"}在售车源
        </span>
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        * 均价已按里程差异修正，仅供参考
      </p>
    </div>
  );
}
