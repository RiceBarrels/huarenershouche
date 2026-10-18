"use client";

import { useEffect, useState } from "react";
import { getPriceHistory, type PriceRecord } from "@/lib/price-history";
import { useI18n } from "@/components/i18n-provider";
import { formatPrice } from "@/lib/format";
import type { Currency } from "@/lib/currency";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// currency:车源自己的币种(本机记录的历史价与车价同币种)
export function PriceHistoryChart({ carId, currency }: { carId: string; currency?: Currency | null }) {
  const { t } = useI18n();
  const [records, setRecords] = useState<PriceRecord[]>([]);

  useEffect(() => {
    setRecords(getPriceHistory(carId));
  }, [carId]);

  if (records.length <= 1) return null;

  return (
    // 桌面内边距/行距略放宽,与市场价位卡片的密度一致;
    // 日期在左、价格在右,数字用 tabular-nums 保证多行纵向对齐
    <div className="mt-3 rounded-xl bg-card p-3 md:p-4">
      <p className="font-mono text-xs font-semibold">{t("价格变动记录")}</p>
      <div className="mt-2 space-y-1 tabular-nums md:space-y-1.5">
        {records.map((rec, i) => {
          if (i === 0) {
            return (
              <div
                key={i}
                className="flex items-center justify-between font-mono text-[11px] text-muted-foreground"
              >
                <span>{formatDate(rec.date)}</span>
                <span>{formatPrice(rec.price, currency)}</span>
              </div>
            );
          }

          const prev = records[i - 1];
          const diff = rec.price - prev.price;
          const pct = ((diff / prev.price) * 100).toFixed(1);
          const dropped = diff < 0;

          return (
            <div
              key={i}
              className="flex items-center justify-between font-mono text-[11px]"
            >
              <span className="text-muted-foreground">
                {formatDate(rec.date)}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    dropped
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500"
                  }
                >
                  {dropped ? "↓" : "↑"} {formatPrice(Math.abs(diff), currency)} (
                  {dropped ? "" : "+"}
                  {pct}%)
                </span>
                <span>{formatPrice(rec.price, currency)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
