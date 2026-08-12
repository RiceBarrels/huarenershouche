"use client";

// SEO 落地页的车源列表：服务端渲染页面骨架 + 客户端拉取匹配车源。
// 过滤逻辑与 browse 页保持口径一致（州按 location 结尾缩写、车身类型按车型名推断）。

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CarCard } from "@/components/car-card";
import { classifyBodyStyle } from "@/lib/body-style";
import type { DbCar } from "@/lib/types";
import type { SeoListFilter } from "@/lib/seo-pages";

const SHOW_LIMIT = 12;

function matchesLocation(car: DbCar, filter: SeoListFilter): boolean {
  const loc = `${car.location || ""} ${car.location_zh || ""}`.toLowerCase();
  if (filter.stateAbbr) {
    const abbr = filter.stateAbbr.toLowerCase();
    // "Los Angeles, CA" / "Irvine, CA 92602" 结尾或紧跟邮编
    if (!new RegExp(`[,\\s]${abbr}(\\s|$|\\d)`).test(loc)) return false;
  }
  if (filter.cityKeywords && filter.cityKeywords.length > 0) {
    if (!filter.cityKeywords.some((k) => loc.includes(k.toLowerCase()))) return false;
  }
  return true;
}

export function SeoCarList({
  filter,
  browseHref,
}: {
  filter: SeoListFilter;
  browseHref: string;
}) {
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let query = supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter.make) query = query.eq("make", filter.make);
      if (filter.model) query = query.ilike("model", filter.model);
      if (filter.fuelType) query = query.eq("fuel_type", filter.fuelType);
      if (filter.maxMileage) query = query.lte("mileage", filter.maxMileage);
      if (filter.minPrice) query = query.gte("price", filter.minPrice);
      if (filter.maxPrice) query = query.lte("price", filter.maxPrice).gt("price", 0);
      if (filter.minYear) query = query.gte("year", filter.minYear);
      if (filter.maxYear) query = query.lte("year", filter.maxYear);
      const { data } = await query;
      if (cancelled) return;
      let result = (data as DbCar[]) || [];
      if (filter.stateAbbr || filter.cityKeywords) {
        result = result.filter((c) => matchesLocation(c, filter));
      }
      if (filter.bodyStyle) {
        result = result.filter((c) => classifyBodyStyle(c) === filter.bodyStyle);
      }
      setCars(result);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter)]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
        <span className="font-mono text-xs text-muted-foreground">正在加载车源...</span>
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          该分类下暂时没有在售车源，去看看全部车源吧
        </p>
        <Link
          href="/browse"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted/70"
        >
          浏览全部车源
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] text-muted-foreground">
        共 {cars.length}{cars.length >= 200 ? "+" : ""} 辆在售
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cars.slice(0, SHOW_LIMIT).map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
      {cars.length > SHOW_LIMIT && (
        <div className="mt-4 text-center">
          <Link
            href={browseHref}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-4 py-2 font-mono text-xs transition-colors hover:bg-muted/70"
          >
            查看全部 {cars.length}{cars.length >= 200 ? "+" : ""} 辆
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>
      )}
    </div>
  );
}
