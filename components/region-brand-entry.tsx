"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/section-header";
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
    // 桌面端 px/py 与容器宽度交给首页外层 section 统一控制,内边距和 max-w 只留手机端,
    // 避免双重缩进导致楼层左边缘错位
    <section className="px-4 pb-10 md:p-0">
      <div className="mx-auto max-w-5xl md:max-w-none">
        {/* 手机保留小图标标题;桌面统一用 SectionHeader,与其他楼层同一套视觉语言 */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <MapPin className="h-4 w-4" strokeWidth={1.5} />
          <h2 className="font-mono text-sm font-medium">按地区找车</h2>
        </div>
        <div className="hidden md:block">
          <SectionHeader label="Regions" title="按地区找车" className="mb-6" />
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible md:pb-0 2xl:grid-cols-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-28 shrink-0 rounded-xl md:w-auto"
              />
            ))}
          </div>
        ) : (
          // 2xl 起 10 个城市一行排开,提升带鱼屏下的信息密度(骨架屏保持同构避免加载跳动)
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-5 md:overflow-visible md:pb-0 2xl:grid-cols-10">
            {regions.map((region) => (
              <Link
                key={region.nameZh}
                href={`/browse?location=${encodeURIComponent(region.locationMatch)}`}
                className="group flex shrink-0 flex-col items-center justify-center rounded-xl bg-card px-6 py-3 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-brand-ink/50 md:px-4"
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
