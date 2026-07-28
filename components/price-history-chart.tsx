"use client";

import { useEffect, useState } from "react";
import { getPriceHistory, type PriceRecord } from "@/lib/price-history";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PriceHistoryChart({ carId }: { carId: string }) {
  const [records, setRecords] = useState<PriceRecord[]>([]);

  useEffect(() => {
    setRecords(getPriceHistory(carId));
  }, [carId]);

  if (records.length <= 1) return null;

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <p className="font-mono text-xs font-semibold">价格变动记录</p>
      <div className="mt-2 space-y-1">
        {records.map((rec, i) => {
          if (i === 0) {
            return (
              <div
                key={i}
                className="flex items-center justify-between font-mono text-[11px] text-muted-foreground"
              >
                <span>{formatDate(rec.date)}</span>
                <span>{formatPrice(rec.price)}</span>
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
                  {dropped ? "↓" : "↑"} {formatPrice(Math.abs(diff))} (
                  {dropped ? "" : "+"}
                  {pct}%)
                </span>
                <span>{formatPrice(rec.price)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
