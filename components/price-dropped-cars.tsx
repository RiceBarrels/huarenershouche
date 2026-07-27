"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carLink } from "@/lib/static-link";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function PriceDroppedCars() {
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // 多取一些再过滤,避免"先 limit 后过滤"漏掉真正降价的车
        const { data } = await supabase
          .from("cars")
          .select("*")
          .eq("status", "active")
          .not("original_price", "is", null)
          .order("price_updated_at", { ascending: false })
          .limit(24);
        if (data) {
          // Filter client-side: price < original_price
          const dropped = (data as DbCar[]).filter(
            (c) => c.original_price !== null && c.price < c.original_price
          );
          setCars(dropped.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to load price-dropped cars:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!loading && cars.length === 0) return null;

  return (
    <section className="px-4 pb-10">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            <h2 className="font-mono text-sm font-medium">最近降价</h2>
          </div>
          <Link
            href="/browse?priceDropped=true"
            className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            查看全部
            <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Horizontal scrollable row */}
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[220px] shrink-0 border border-border"
              >
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="p-2.5">
                  <Skeleton className="h-3 w-3/4 rounded-none" />
                  <Skeleton className="mt-2 h-4 w-1/2 rounded-none" />
                  <Skeleton className="mt-2 h-3 w-2/3 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {cars.map((car) => {
              const discountPct = car.original_price
                ? Math.round((1 - car.price / car.original_price) * 100)
                : 0;
              const dropAmount = car.original_price
                ? car.original_price - car.price
                : 0;

              return (
                <Link
                  key={car.id}
                  href={carLink(car.id)}
                  className="group w-[220px] shrink-0 border border-border bg-card transition-colors hover:border-foreground/20"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.title_zh}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          暂无图片
                        </span>
                      </div>
                    )}
                    {/* Discount badges */}
                    {dropAmount > 0 && (
                      <div className="absolute left-2 top-2 flex items-center gap-1">
                        {discountPct > 0 && (
                          <span className="bg-green-600 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                            -{discountPct}%
                          </span>
                        )}
                        <span className="bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-green-600 dark:text-green-400">
                          -{formatPrice(dropAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="truncate font-mono text-xs font-medium">
                      {car.title_zh}
                    </p>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold">
                        {formatPrice(car.price)}
                      </span>
                      {car.original_price && (
                        <span className="font-mono text-[10px] text-muted-foreground line-through">
                          {formatPrice(car.original_price)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      <span className="font-mono text-[10px]">
                        {car.location_zh}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
