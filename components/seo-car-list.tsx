"use client";

// SEO 落地页的车源列表：服务端渲染页面骨架 + 客户端拉取匹配车源。
// 过滤逻辑与 browse 页保持口径一致（州按 location 结尾缩写、车身类型按车型名推断）。

import { useEffect, useState } from "react";
import Link from "@/components/localized-navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CAR_LIST_COLUMN_SETS } from "@/lib/i18n/content/columns";
import { queryWithColumnFallback } from "@/lib/supabase-compat";
import { KM_PER_MI, MAX_UNITS_PER_USD, MIN_UNITS_PER_USD, carMileageMi, carPriceUsd } from "@/lib/currency";
import { CarCard } from "@/components/car-card";
import { classifyBodyStyle } from "@/lib/body-style";
import { useI18n } from "@/components/i18n-provider";
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
  const { t } = useI18n();
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 车主停用的转载车源不展示(与列表/详情口径一致)。
      // 价格条件是美元、里程是英里,库里是各车自己的币种 / 单位:服务端只按放宽到能覆盖所有支持币种
      // (汇率最小 / 最大值,lib/currency.ts)/ 公里车源的原值区间粗筛,拉回来再按折合美元 / 英里精筛(同 lib/car-filters.ts)
      const run = (cols: string) => {
        let query = supabase
          .from("cars")
          .select(`${cols}, profiles!seller_id(account_type, avatar_url)`)
          .eq("status", "active")
          .eq("owner_hidden", false)
          .order("created_at", { ascending: false })
          .limit(200);
        if (filter.make) query = query.eq("make", filter.make);
        if (filter.model) query = query.ilike("model", filter.model);
        if (filter.fuelType) query = query.eq("fuel_type", filter.fuelType);
        if (filter.maxMileage) query = query.lte("mileage", Math.ceil(filter.maxMileage * KM_PER_MI));
        if (filter.minPrice) query = query.gte("price", Math.floor(filter.minPrice * MIN_UNITS_PER_USD));
        if (filter.maxPrice) query = query.lte("price", Math.ceil(filter.maxPrice * MAX_UNITS_PER_USD)).gt("price", 0);
        if (filter.minYear) query = query.gte("year", filter.minYear);
        if (filter.maxYear) query = query.lte("year", filter.maxYear);
        return query;
      };
      // car-currency.sql 未执行时退回不带币种 / 里程单位的列集(全部按 USD / mi)
      const { data } = await queryWithColumnFallback(run, CAR_LIST_COLUMN_SETS);
      if (cancelled) return;
      let result = ((data as unknown as DbCar[]) || []).filter(
        (c) =>
          (!filter.maxMileage || carMileageMi(c) <= filter.maxMileage) &&
          (!filter.minPrice || carPriceUsd(c) >= filter.minPrice) &&
          (!filter.maxPrice || carPriceUsd(c) <= filter.maxPrice)
      );
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
        <span className="font-mono text-xs text-muted-foreground">{t("正在加载车源...")}</span>
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          {t("该分类下暂时没有在售车源，去看看全部车源吧")}
        </p>
        <Link
          href="/browse"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted/70"
        >
          {t("浏览全部车源")}
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {t("共 {n} 辆在售", { n: `${cars.length}${cars.length >= 200 ? "+" : ""}` })}
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
            {t("查看全部 {n} 辆", { n: `${cars.length}${cars.length >= 200 ? "+" : ""}` })}
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>
      )}
    </div>
  );
}
