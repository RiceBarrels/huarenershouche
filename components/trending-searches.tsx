"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MAKES_ZH } from "@/lib/mock-data";
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
    <section className="px-4 pb-10">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
          <h2 className="font-mono text-sm font-medium">热门搜索</h2>
        </div>

        {/* Row 1: Popular brands */}
        <div className="mb-3">
          <p className="mb-2 font-mono text-[10px] text-muted-foreground">
            热门品牌
          </p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-none" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topMakes.map(({ make, count }) => (
                <Link
                  key={make}
                  href={`/browse?make=${encodeURIComponent(make)}&showResult=true`}
                  className="border border-border px-3 py-1.5 font-mono text-[11px] text-foreground transition-colors hover:bg-foreground hover:text-background"
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
                href={`/browse?${tag.params}&showResult=true`}
                className="border border-border px-3 py-1.5 font-mono text-[11px] text-foreground transition-colors hover:bg-foreground hover:text-background"
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
