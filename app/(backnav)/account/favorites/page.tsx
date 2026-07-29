"use client";

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
        <h1 className="font-mono text-lg font-semibold">我的收藏</h1>
        <Tabs defaultValue="cars" className="mt-3">
          <TabsList variant="line">
            <TabsTrigger value="cars" className="font-mono text-xs">收藏车辆</TabsTrigger>
            <TabsTrigger value="searches" className="font-mono text-xs">保存的搜索</TabsTrigger>
          </TabsList>
          <TabsContent value="cars">
            <div className="mt-3 space-y-3">
              {loading ? (<div></div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
                  <p className="mt-3 font-mono text-sm text-muted-foreground">还没有收藏车辆</p>
                  <Link href="/browse"><Button variant="outline" size="sm" className="mt-4 font-mono text-xs">去看看</Button></Link>
                </div>
              ) : (
                list.map((car) => (
                  <div key={car.id} className="flex gap-3 rounded-xl border border-border p-3">
                    <Link href={carLink(car.id)} className="shrink-0">
                      <div className="h-20 w-28 overflow-hidden rounded-lg bg-muted">
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
                      <Button variant="outline" size="sm" className="h-8 w-fit gap-1 font-mono text-[11px]" onClick={() => removeFavorite(car.id)}>
                        <Heart className="h-3 w-3 fill-current" strokeWidth={1.5} />取消收藏
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="searches">
            <SavedSearchesTab />
          </TabsContent>
        </Tabs>
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
      <div className="mt-3 flex flex-col items-center py-16">
        <Search className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
        <p className="mt-3 font-mono text-sm text-muted-foreground">还没有保存的搜索</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          去 <Link href="/browse" className="text-foreground underline underline-offset-2">浏览页</Link> 设置筛选条件后点「保存搜索」
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {searches.map((search) => (
        <Link
          key={search.id}
          href={buildSearchUrl(search.params)}
          className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-medium">{search.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">保存于 {timeAgo(search.createdAt)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            aria-label="删除保存的搜索"
            onClick={(e) => handleRemove(e, search.id)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </Link>
      ))}
    </div>
  );
}
