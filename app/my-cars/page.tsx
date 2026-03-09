"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Heart,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "在售", variant: "default" },
  sold: { label: "已售", variant: "secondary" },
  pending: { label: "审核中", variant: "outline" },
  removed: { label: "已下架", variant: "destructive" },
};

export default function MyCarsPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [myCars, setMyCars] = useState<DbCar[]>([]);
  const [favorites, setFavorites] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/");
        return;
      }
      setUser(authUser.id);

      // Fetch my listings
      const { data: cars } = await supabase
        .from("cars")
        .select("*")
        .eq("seller_id", authUser.id)
        .order("created_at", { ascending: false });
      setMyCars((cars as DbCar[]) || []);

      // Fetch favorites
      const { data: favs } = await supabase
        .from("favorites")
        .select("car_id")
        .eq("user_id", authUser.id);
      if (favs && favs.length > 0) {
        const ids = favs.map((f) => f.car_id);
        const { data: favCars } = await supabase
          .from("cars")
          .select("*")
          .in("id", ids);
        setFavorites((favCars as DbCar[]) || []);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function toggleStatus(carId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "removed" : "active";
    await supabase.from("cars").update({ status: newStatus }).eq("id", carId);
    setMyCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, status: newStatus as DbCar["status"] } : c))
    );
  }

  async function markSold(carId: string) {
    await supabase.from("cars").update({ status: "sold" }).eq("id", carId);
    setMyCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, status: "sold" } : c))
    );
  }

  async function deleteCar(carId: string) {
    if (!confirm("确定要删除这辆车吗？此操作不可恢复。")) return;
    await supabase.from("cars").delete().eq("id", carId);
    setMyCars((prev) => prev.filter((c) => c.id !== carId));
  }

  async function removeFavorite(carId: string) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user!)
      .eq("car_id", carId);
    setFavorites((prev) => prev.filter((c) => c.id !== carId));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            我的中心
          </h1>
          <Link href="/post">
            <Button size="sm" className="gap-1.5 font-mono text-xs">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              发布新车
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="listings" className="mt-6">
          <TabsList className="font-mono">
            <TabsTrigger value="listings" className="font-mono text-xs">
              我的发布 ({myCars.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="font-mono text-xs">
              我的收藏 ({favorites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            {myCars.length === 0 ? (
              <div className="flex flex-col items-center border border-border py-12">
                <p className="font-mono text-sm text-muted-foreground">
                  你还没有发布过车辆
                </p>
                <Link href="/post">
                  <Button
                    size="sm"
                    className="mt-4 font-mono text-xs"
                  >
                    立即发布
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myCars.map((car) => (
                  <div
                    key={car.id}
                    className="flex gap-4 border border-border p-3"
                  >
                    <Link href={`/car/${car.id}`} className="shrink-0">
                      <div className="h-20 w-28 bg-muted">
                        {car.image_url ? (
                          <img
                            src={car.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                            无图
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/car/${car.id}`}>
                            <h3 className="font-mono text-sm font-semibold hover:underline">
                              {car.title_zh}
                            </h3>
                          </Link>
                          <Badge
                            variant={STATUS_MAP[car.status]?.variant || "outline"}
                            className="font-mono text-[10px]"
                          >
                            {STATUS_MAP[car.status]?.label || car.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {formatPrice(car.price)} · {car.location_zh} ·{" "}
                          {car.views_count || 0} 次浏览
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {car.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 font-mono text-[11px]"
                            onClick={() => markSold(car.id)}
                          >
                            <CheckCircle
                              className="h-3 w-3"
                              strokeWidth={1.5}
                            />
                            标为已售
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 font-mono text-[11px]"
                          onClick={() => toggleStatus(car.id, car.status)}
                        >
                          {car.status === "active" ? (
                            <>
                              <XCircle
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                              下架
                            </>
                          ) : car.status === "removed" ? (
                            <>
                              <Eye className="h-3 w-3" strokeWidth={1.5} />
                              重新上架
                            </>
                          ) : null}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 font-mono text-[11px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => deleteCar(car.id)}
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center border border-border py-12">
                <p className="font-mono text-sm text-muted-foreground">
                  还没有收藏车辆
                </p>
                <Link href="/">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 font-mono text-xs"
                  >
                    去看看
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((car) => (
                  <div
                    key={car.id}
                    className="flex gap-4 border border-border p-3"
                  >
                    <Link href={`/car/${car.id}`} className="shrink-0">
                      <div className="h-20 w-28 bg-muted">
                        {car.image_url ? (
                          <img
                            src={car.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                            无图
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link href={`/car/${car.id}`}>
                          <h3 className="font-mono text-sm font-semibold hover:underline">
                            {car.title_zh}
                          </h3>
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {formatPrice(car.price)} · {car.location_zh}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-fit gap-1 font-mono text-[11px]"
                        onClick={() => removeFavorite(car.id)}
                      >
                        <Heart
                          className="h-3 w-3 fill-current"
                          strokeWidth={1.5}
                        />
                        取消收藏
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
