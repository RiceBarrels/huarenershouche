"use client";

import { useEffect, useState } from "react";
import { useRouteParams } from "@/lib/use-route-params";
import { User, Calendar, Car, MapPin, Store, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

import { CarCard } from "@/components/car-card";
import { DealerReviews } from "@/components/dealer-reviews";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar } from "@/lib/types";

interface SellerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  account_type: "private" | "dealer";
  created_at: string;
}

export default function UserProfilePage() {
  const params = useRouteParams<{ id: string }>();
  const userId = params.id as string;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<{ avg: number; count: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [profileRes, carsRes, reviewsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, location, account_type, created_at")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("cars")
          .select("*")
          .eq("seller_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("dealer_reviews")
          .select("rating")
          .eq("dealer_id", userId),
      ]);
      setProfile(profileRes.data as SellerProfile | null);
      setCars((carsRes.data as DbCar[]) || []);

      const reviewData = (reviewsRes.data as { rating: number }[]) || [];
      if (reviewData.length > 0) {
        const sum = reviewData.reduce((s, r) => s + r.rating, 0);
        setAvgRating({ avg: sum / reviewData.length, count: reviewData.length });
      }

      setLoading(false);
    }
    fetchData();
  }, [userId]);

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">

      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h2 className="font-mono text-sm font-semibold">卖家主页</h2>
        {loading ? (
          <div className="mt-4">
            <div className="flex items-start gap-4 border-b border-border pb-6">
              <Skeleton className="h-16 w-16 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-border">
                    <Skeleton className="aspect-[16/10] w-full" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !profile ? (
          <div className="flex flex-col items-center py-20">
            <p className="font-mono text-sm text-muted-foreground">
              用户不存在
            </p>
            <Link
              href="/browse"
              className="mt-3 font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              返回浏览
            </Link>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex items-start gap-4 border-b border-border pb-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-border bg-muted">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-lg font-semibold">
                    {profile.username}
                  </h1>
                  {profile.account_type === "dealer" ? (
                    <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                      <Store className="h-3 w-3" strokeWidth={1.5} />
                      认证车行
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      个人
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
                  {profile.account_type === "dealer" && avgRating && (
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                      {avgRating.avg.toFixed(1)} ({avgRating.count}条评价)
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="h-3 w-3" strokeWidth={1.5} />
                    {memberSince} 加入
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Car className="h-3 w-3" strokeWidth={1.5} />
                    {cars.length} 辆在售
                  </span>
                  {profile.location && (
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Listings */}
            <div className="mt-6">
              <h2 className="font-mono text-sm font-semibold">
                在售车辆 ({cars.length})
              </h2>
              {cars.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cars.map((car) => (
                    <CarCard key={car.id} car={car} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
                  该用户暂无在售车辆
                </p>
              )}
            </div>

            {/* Dealer reviews */}
            {profile.account_type === "dealer" && (
              <DealerReviews dealerId={userId} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
