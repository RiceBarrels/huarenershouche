"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MAKES_ZH } from "@/lib/mock-data";
import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@/components/ui/skeleton";

interface MakeCount {
  make: string;
  count: number;
}

const QUICK_FILTERS: { label: string; params: string }[] = [
  { label: "$15K以下", params: "maxPrice=15000" },
  { label: "月供$300内", params: "maxPayment=300" },
  { label: "低里程<3万", params: "maxMileage=30000" },
  { label: "混动省油", params: "fuelType=混动" },
  { label: "无事故", params: "noAccident=true" },
  { label: "四驱SUV", params: "drivetrain=AWD" },
  { label: "只看好价", params: "dealRating=good" },
  { label: "3天内新上架", params: "listedWithin=3" },
];

export function TrendingSearches() {
  const [topMakes, setTopMakes] = useState<MakeCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("cars")
          .select("make")
          .eq("status", "active");
        if (data) {
          // Count by make client-side
          const counts: Record<string, number> = {};
          for (const row of data) {
            const m = (row as { make: string }).make;
            counts[m] = (counts[m] || 0) + 1;
          }
          const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([make, count]) => ({ make, count }));
          setTopMakes(sorted);
        }
      } catch (err) {
        console.error("Failed to load trending makes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    // 桌面端由首页外层 section 统一控制 px/py 与容器宽度,这里的内边距和 max-w 只留给手机端,
    // 否则会出现双重缩进、楼层左边缘对不齐的问题
    <section className="px-4 pb-10 md:p-0">
      <div className="mx-auto max-w-5xl md:max-w-none">
        {/* 手机保留小图标标题;桌面统一用 SectionHeader,与其他楼层同一套视觉语言 */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
          <h2 className="font-mono text-sm font-medium">热门搜索</h2>
        </div>
        <div className="hidden md:block">
          <SectionHeader label="Trending" title="热门搜索" className="mb-6" />
        </div>

        {/* Row 1: Popular brands */}
        <div className="mb-3">
          <p className="mb-2 font-mono text-[10px] text-muted-foreground">
            热门品牌
          </p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topMakes.map(({ make, count }) => (
                <Link
                  key={make}
                  href={`/browse?make=${encodeURIComponent(make)}`}
                  className="rounded-full bg-muted px-3 py-1.5 font-mono text-[11px] text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-brand-ink/50"
                >
                  {MAKES_ZH[make] || make}
                  <span className="ml-1 text-muted-foreground">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Quick filters */}
        <div>
          <p className="mb-2 font-mono text-[10px] text-muted-foreground">
            快速筛选
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((tag) => (
              <Link
                key={tag.label}
                href={`/browse?${tag.params}`}
                className="rounded-full bg-muted px-3 py-1.5 font-mono text-[11px] text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-brand-ink/50"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
