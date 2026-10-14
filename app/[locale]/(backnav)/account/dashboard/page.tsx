"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { carLink } from "@/lib/static-link";
import { Eye, Heart, TrendingUp, MessageSquare, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIdentity } from "@/components/identity-provider";
import { SellerAnalytics } from "@/components/analytics/seller/seller-analytics";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGroup, LargeTitle } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import { carTitle } from "@/lib/i18n";
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
  const { t, locale } = useI18n();
  // 以「正在操作的账号」为准(默认本人;切换到已认领的系统车行时为该车行账号),与「我的发布」一致
  const { actingId, authId, loading: identityLoading } = useIdentity();
  // 统计结果记下所属账号:切换身份后旧数据立即作废(回到骨架),不会和新账号的访问统计错位
  const [loaded, setLoaded] = useState<{ acct: string; stats: ListingStats[] } | null>(null);
  const loading = !actingId || loaded?.acct !== actingId;
  const stats = loaded && loaded.acct === actingId ? loaded.stats : [];

  useEffect(() => {
    if (!identityLoading && !authId) router.push("/login");
  }, [identityLoading, authId, router]);

  useEffect(() => {
    if (!actingId) return;
    const acct = actingId;
    let cancelled = false;

    async function loadStats() {
      const { data: cars } = await supabase
        .from("cars")
        .select("*")
        .eq("seller_id", acct)
        .order("created_at", { ascending: false });
      if (cancelled) return;

      if (!cars || cars.length === 0) {
        setLoaded({ acct, stats: [] });
        return;
      }

      const carIds = cars.map((c) => c.id);
      const { data: convos } = await supabase
        .from("conversations")
        .select("car_id")
        .in("car_id", carIds);
      if (cancelled) return;

      const msgCountMap: Record<string, number> = {};
      for (const c of convos || []) {
        msgCountMap[c.car_id] = (msgCountMap[c.car_id] || 0) + 1;
      }

      setLoaded({
        acct,
        stats: (cars as DbCar[]).map((car) => ({
          car,
          messageCount: msgCountMap[car.id] || 0,
        })),
      });
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [actingId]);

  const totalViews = stats.reduce((sum, s) => sum + (s.car.views_count || 0), 0);
  const totalFavorites = stats.reduce((sum, s) => sum + (s.car.favorites_count || 0), 0);
  const totalMessages = stats.reduce((sum, s) => sum + s.messageCount, 0);
  const activeCars = stats.filter((s) => s.car.status === "active").length;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      {/* 桌面边距与账户主页(md:px-6 md:py-8)对齐,避免子页忽紧忽松 */}
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8">
        <LargeTitle title={t("数据面板")} subtitle={t("车辆曝光与互动数据")} />

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-card p-4">
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
                label={t("总浏览")}
                value={totalViews}
              />
              <StatCard
                icon={<Heart className="h-4 w-4" strokeWidth={1.5} />}
                label={t("总收藏")}
                value={totalFavorites}
              />
              <StatCard
                icon={<MessageSquare className="h-4 w-4" strokeWidth={1.5} />}
                label={t("总询盘")}
                value={totalMessages}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
                label={t("在售车辆")}
                value={activeCars}
              />
            </div>

            {/* Conversion funnel(进度条式,一眼看出转化率) */}
            {totalViews > 0 && (
              <div className="rounded-xl bg-card mt-4 p-4">
                <h2 className="font-mono text-xs font-medium text-muted-foreground">{t("转化漏斗")}</h2>
                <div className="mt-3 space-y-2.5">
                  <FunnelBar label={t("浏览")} value={totalViews} pct={100} />
                  <FunnelBar label={t("收藏")} value={totalFavorites} pct={Math.round((totalFavorites / totalViews) * 100)} />
                  <FunnelBar label={t("询盘")} value={totalMessages} pct={Math.round((totalMessages / totalViews) * 100)} />
                </div>
              </div>
            )}

            {/* 访问统计(第一方埋点,个人与车行都显示;只看名下车辆的浏览)。还没发布过车辆时不显示 */}
            {actingId && stats.length > 0 && (
              <div className="mt-6">
                <SellerAnalytics sellerId={actingId} />
              </div>
            )}

            {/* Per-listing breakdown */}
            <div className="mt-6">
              <h2 className="px-1 font-mono text-xs font-medium text-muted-foreground">{t("各车辆数据")}</h2>
              <SettingsGroup capsule={stats.length === 1} className="mt-2">
                {stats.length === 0 ? (
                  <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                    {t("还没有发布过车辆")}
                  </p>
                ) : (
                  stats.map(({ car, messageCount }) => (
                    <Link
                      key={car.id}
                      href={carLink(car.id)}
                      className="group/row flex items-center gap-3 pl-3 transition-colors active:bg-muted/60 md:hover:bg-muted/40"
                    >
                      {/* 同心圆角:卡 26px − 边距 12px = 14px */}
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-[14px] bg-muted">
                        {car.image_url ? (
                          <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[9px] text-muted-foreground">{t("无图")}</div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border/60 py-3 pr-3 group-last/row:border-0">
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-mono text-xs font-medium">{carTitle(car, locale)}</p>
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
                      </div>
                    </Link>
                  ))
                )}
              </SettingsGroup>
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
    <div className="rounded-xl bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="font-mono text-xs">{label}</span>
      </div>
      <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

function FunnelBar({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 shrink-0 font-mono text-[11px] text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/70">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }}
        />
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums">
        {formatNumber(value)} · {pct}%
      </span>
    </div>
  );
}

function PerformanceIndicator({ views, favorites }: { views: number; favorites: number }) {
  const { t } = useI18n();
  if (views === 0) return null;
  const rate = favorites / views;
  if (rate >= 0.1) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-[10px] text-green-600">
        <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
        {t("热门")}
      </span>
    );
  }
  if (rate >= 0.03) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" strokeWidth={1.5} />
        {t("正常")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 font-mono text-[10px] text-amber-600">
      <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />
      {t("待优化")}
    </span>
  );
}
