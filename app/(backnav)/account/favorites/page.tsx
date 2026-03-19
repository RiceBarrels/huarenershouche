"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AdUnit, AadsUnit } from "@/components/ad-unit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [favorites, setFavorites] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser.id);

      const { data: favs } = await supabase.from("favorites").select("car_id").eq("user_id", authUser.id);
      if (favs && favs.length > 0) {
        const ids = favs.map((f) => f.car_id);
        const { data: favCars } = await supabase.from("cars").select("*").in("id", ids);
        setFavorites((favCars as DbCar[]) || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function removeFavorite(carId: string) {
    await supabase.from("favorites").delete().eq("user_id", user!).eq("car_id", carId);
    setFavorites((prev) => prev.filter((c) => c.id !== carId));
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
        <h1 className="font-mono text-lg font-semibold">我的收藏</h1>
        <div className="mt-4 space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 border border-border p-3">
                <Skeleton className="h-20 w-28 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Heart className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
              <p className="mt-3 font-mono text-sm text-muted-foreground">还没有收藏车辆</p>
              <Link href="/browse"><Button variant="outline" size="sm" className="mt-4 font-mono text-xs">去看看</Button></Link>
            </div>
          ) : (
            favorites.map((car) => (
              <div key={car.id} className="flex gap-3 border border-border p-3">
                <Link href={`/car/${car.id}`} className="shrink-0">
                  <div className="h-20 w-28 bg-muted">
                    {car.image_url ? (
                      <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">无图</div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/car/${car.id}`}><h3 className="font-mono text-sm font-semibold hover:underline">{car.title_zh}</h3></Link>
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
      </main>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <AdUnit slot="FAVORITES" format="horizontal" />
        <AadsUnit id="2430994" background="" />
      </div>
      <Footer />
    </div>
  );
}
