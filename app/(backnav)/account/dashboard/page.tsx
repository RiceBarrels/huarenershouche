"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { carLink } from "@/lib/static-link";
import { Eye, Heart, TrendingUp, MessageSquare, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar } from "@/lib/types";

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

interface ListingStats {
  car: DbCar;
  messageCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ListingStats[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      const { data: cars } = await supabase
        .from("cars")
        .select("*")
        .eq("seller_id", user!)
        .order("created_at", { ascending: false });

      if (!cars || cars.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const carIds = cars.map((c) => c.id);
      const { data: convos } = await supabase
        .from("conversations")
        .select("car_id")
        .in("car_id", carIds);

      const msgCountMap: Record<string, number> = {};
      for (const c of convos || []) {
        msgCountMap[c.car_id] = (msgCountMap[c.car_id] || 0) + 1;
      }

      setStats(
        (cars as DbCar[]).map((car) => ({
          car,
          messageCount: msgCountMap[car.id] || 0,
        }))
      );
      setLoading(false);
    }

    loadStats();
  }, [user]);

  const totalViews = stats.reduce((sum, s) => sum + (s.car.views_count || 0), 0);
  const totalFavorites = stats.reduce((sum, s) => sum + (s.car.favorites_count || 0), 0);
  const totalMessages = stats.reduce((sum, s) => sum + s.messageCount, 0);
  const activeCars = stats.filter((s) => s.car.status === "active").length;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
        <h1 className="font-mono text-lg font-semibold">数据面板</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          查看你的车辆曝光和互动数据
        </p>

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-border p-4">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-2 h-6 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Overview cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                icon={<Eye className="h-4 w-4" strokeWidth={1.5} />}
                label="总浏览"
                value={totalViews}
              />
              <StatCard
                icon={<Heart className="h-4 w-4" strokeWidth={1.5} />}
                label="总收藏"
                value={totalFavorites}
              />
              <StatCard
                icon={<MessageSquare className="h-4 w-4" strokeWidth={1.5} />}
                label="总询盘"
                value={totalMessages}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
                label="在售车辆"
                value={activeCars}
              />
            </div>

            {/* Conversion funnel */}
            {totalViews > 0 && (
              <div className="mt-6 border border-border p-4">
                <h2 className="font-mono text-xs font-medium text-muted-foreground">转化漏斗</h2>
                <div className="mt-3 flex items-center gap-4">
                  <FunnelStep label="浏览" value={totalViews} pct={100} />
                  <FunnelArrow />
                  <FunnelStep label="收藏" value={totalFavorites} pct={Math.round((totalFavorites / totalViews) * 100)} />
                  <FunnelArrow />
                  <FunnelStep label="询盘" value={totalMessages} pct={Math.round((totalMessages / totalViews) * 100)} />
                </div>
              </div>
            )}

            {/* Per-listing breakdown */}
            <div className="mt-6">
              <h2 className="font-mono text-sm font-medium">各车辆数据</h2>
              <div className="mt-3 space-y-2">
                {stats.length === 0 ? (
                  <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                    还没有发布过车辆
                  </p>
                ) : (
                  stats.map(({ car, messageCount }) => (
                    <Link
                      key={car.id}
                      href={carLink(car.id)}
                      className="flex items-center gap-3 border border-border p-3 transition-colors hover:border-foreground/20"
                    >
                      <div className="h-12 w-16 shrink-0 overflow-hidden bg-muted">
                        {car.image_url ? (
                          <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[9px] text-muted-foreground">无图</div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-mono text-xs font-medium">{car.title_zh}</p>
                        <div className="mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <Eye className="h-3 w-3" strokeWidth={1.5} />
                            {car.views_count || 0}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <Heart className="h-3 w-3" strokeWidth={1.5} />
                            {car.favorites_count || 0}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
                            {messageCount}
                          </span>
                        </div>
                      </div>
                      <PerformanceIndicator views={car.views_count || 0} favorites={car.favorites_count || 0} />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="font-mono text-[11px]">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl font-bold">{formatNumber(value)}</p>
    </div>
  );
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-lg font-bold">{formatNumber(value)}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

function FunnelArrow() {
  return <span className="font-mono text-xs text-muted-foreground">→</span>;
}

function PerformanceIndicator({ views, favorites }: { views: number; favorites: number }) {
  if (views === 0) return null;
  const rate = favorites / views;
  if (rate >= 0.1) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-[10px] text-green-600">
        <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
        热门
      </span>
    );
  }
  if (rate >= 0.03) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" strokeWidth={1.5} />
        正常
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 font-mono text-[10px] text-amber-600">
      <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />
      待优化
    </span>
  );
}
