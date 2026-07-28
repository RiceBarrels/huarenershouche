"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface RegionData {
  nameZh: string;
  locationMatch: string;
  count: number;
}

const METRO_AREAS: { nameZh: string; locationMatch: string }[] = [
  { nameZh: "洛杉矶", locationMatch: "洛杉矶" },
  { nameZh: "旧金山", locationMatch: "旧金山" },
  { nameZh: "纽约", locationMatch: "纽约" },
  { nameZh: "西雅图", locationMatch: "西雅图" },
  { nameZh: "休斯顿", locationMatch: "休斯顿" },
  { nameZh: "芝加哥", locationMatch: "芝加哥" },
  { nameZh: "波士顿", locationMatch: "波士顿" },
  { nameZh: "达拉斯", locationMatch: "达拉斯" },
  { nameZh: "亚特兰大", locationMatch: "亚特兰大" },
  { nameZh: "费城", locationMatch: "费城" },
];

export function RegionBrandEntry() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("cars")
          .select("location_zh")
          .eq("status", "active");
        if (data) {
          const locations = data as { location_zh: string }[];
          const result: RegionData[] = METRO_AREAS.map((metro) => {
            const count = locations.filter((row) =>
              row.location_zh?.includes(metro.locationMatch)
            ).length;
            return { ...metro, count };
          });
          setRegions(result);
        }
      } catch (err) {
        console.error("Failed to load region data:", err);
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
          <MapPin className="h-4 w-4" strokeWidth={1.5} />
          <h2 className="font-mono text-sm font-medium">按地区找车</h2>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-28 shrink-0 rounded-lg md:w-auto"
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-5 md:overflow-visible">
            {regions.map((region) => (
              <Link
                key={region.nameZh}
                href={`/browse?location=${encodeURIComponent(region.locationMatch)}`}
                className="group flex shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/50 md:px-4"
              >
                <span className="font-mono text-sm font-medium group-hover:text-foreground">
                  {region.nameZh}
                </span>
                <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {region.count > 0 ? `${region.count} 辆在售` : "暂无车源"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
