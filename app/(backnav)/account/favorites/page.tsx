"use client";

// 我的收藏(iOS 26 风格):分段控件切换「收藏车辆 / 保存的
// 搜索」,白色卡片列表,缩略图按同心圆角(26 − 12 = 14px)。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { carLink } from "@/lib/static-link";
import { Heart, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGroup, LargeTitle, SegmentedControl } from "@/components/ios-settings";
import { useCachedData } from "@/lib/use-cached-data";
import { timeAgo } from "@/lib/format";
import {
  getSavedSearches,
  removeSavedSearch,
  buildSearchUrl,
  SAVED_SEARCHES_EVENT,
  type SavedSearch,
} from "@/lib/saved-searches";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function FavoritesPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [tab, setTab] = useState<"cars" | "searches">("cars");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user.id);
    });
  }, [router]);

  const { data: favorites, loading, mutate } = useCachedData<DbCar[]>(
    user ? `account_favorites_${user}` : null,
    async () => {
      const { data: favs } = await supabase.from("favorites").select("car_id").eq("user_id", user!);
      if (favs && favs.length > 0) {
        const ids = favs.map((f) => f.car_id);
        const { data: favCars } = await supabase.from("cars").select("*").in("id", ids);
        return (favCars as DbCar[]) || [];
      }
      return [];
    },
    [user],
  );

  async function removeFavorite(carId: string) {
    await supabase.from("favorites").delete().eq("user_id", user!).eq("car_id", carId);
    mutate((prev) => (prev || []).filter((c) => c.id !== carId));
  }

  const list = favorites || [];

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      {/* 桌面边距与账户主页(md:px-6 md:py-8)对齐,避免子页忽紧忽松 */}
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8">
        <LargeTitle title="我的收藏" />
        <div className="mt-4 md:max-w-xs">
          <SegmentedControl
            options={[
              { value: "cars", label: "收藏车辆" },
              { value: "searches", label: "保存的搜索" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "cars" ? (
          // 桌面 4xl 容器下单列横卡右侧大量留白,改双栏网格提高密度
          <div className="mt-4 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-card flex gap-3 p-3">
                  <Skeleton className="h-20 w-28 rounded-[14px]" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : list.length === 0 ? (
              // 空状态横跨两栏,否则会被网格挤到左半边
              <div className="flex flex-col items-center py-16 md:col-span-2">
                <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-3 font-mono text-sm text-muted-foreground">还没有收藏车辆</p>
                <Link href="/browse"><Button size="sm" className="mt-4 h-9 px-5 font-mono text-xs">去看看</Button></Link>
              </div>
            ) : (
              list.map((car) => (
                <div key={car.id} className="rounded-xl bg-card flex gap-3 p-3">
                  <Link href={carLink(car.id)} className="shrink-0">
                    <div className="h-20 w-28 overflow-hidden rounded-[14px] bg-muted">
                      {car.image_url ? (
                        <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">无图</div>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link href={carLink(car.id)}><h3 className="font-mono text-sm font-semibold hover:underline">{car.title_zh}</h3></Link>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{formatPrice(car.price)} · {car.location_zh}</p>
                    </div>
                    <Button variant="secondary" size="sm" className="h-8 w-fit gap-1 px-3 font-mono text-[11px]" onClick={() => removeFavorite(car.id)}>
                      <Heart className="h-3 w-3 fill-current" strokeWidth={1.5} />取消收藏
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <SavedSearchesTab />
        )}
      </main>
      <Footer />
    </div>
  );
}

function SavedSearchesTab() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    const refresh = () => setSearches(getSavedSearches());
    refresh();
    window.addEventListener(SAVED_SEARCHES_EVENT, refresh);
    return () => window.removeEventListener(SAVED_SEARCHES_EVENT, refresh);
  }, []);

  function handleRemove(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    // removeSavedSearch 会触发 SAVED_SEARCHES_EVENT，列表即时刷新
    removeSavedSearch(id);
  }

  if (searches.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center py-16">
        <Search className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 font-mono text-sm text-muted-foreground">还没有保存的搜索</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          去 <Link href="/browse" className="text-foreground underline underline-offset-2">浏览页</Link> 设置筛选条件后点「保存搜索」
        </p>
      </div>
    );
  }

  return (
    <SettingsGroup capsule={searches.length === 1} className="mt-4">
      {searches.map((search) => (
        <Link
          key={search.id}
          href={buildSearchUrl(search.params)}
          className="group/row flex items-center gap-3 pl-4 transition-colors active:bg-muted/60 md:hover:bg-muted/40"
        >
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <span className="flex min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-3.5 group-last/row:border-0 min-h-[56px]">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm font-medium">{search.name}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">保存于 {timeAgo(search.createdAt)}</span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              aria-label="删除保存的搜索"
              onClick={(e) => handleRemove(e, search.id)}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </span>
        </Link>
      ))}
    </SettingsGroup>
  );
}
