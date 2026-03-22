"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Gauge, Fuel, Calendar, Navigation, Heart, GitCompare, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geocode";
import { supabase } from "@/lib/supabase";
import { addToCompare, isInCompare, removeFromCompare } from "@/lib/compare";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function estimateMonthly(price: number): string {
  // Default: 0 down, 6.5% APR, 60 months
  const principal = price;
  const monthlyRate = 0.065 / 12;
  const months = 60;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return `~$${Math.round(payment)}/月`;
}

function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles);
}

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("huaren_favorites") || "[]");
  } catch {
    return [];
  }
}

function toggleFavorite(carId: string): { liked: boolean; delta: number } {
  const favs = getFavorites();
  const idx = favs.indexOf(carId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    localStorage.setItem("huaren_favorites", JSON.stringify(favs));
    return { liked: false, delta: -1 };
  } else {
    favs.unshift(carId);
    localStorage.setItem("huaren_favorites", JSON.stringify(favs.slice(0, 100)));
    return { liked: true, delta: 1 };
  }
}

async function updateFavCount(carId: string, delta: number) {
  const { data } = await supabase
    .from("cars")
    .select("favorites_count")
    .eq("id", carId)
    .single();
  const current = data?.favorites_count ?? 0;
  await supabase
    .from("cars")
    .update({ favorites_count: Math.max(0, current + delta) })
    .eq("id", carId);
}

export function CarCard({
  car,
  distance,
  priceInsight,
}: {
  car: DbCar;
  distance?: number;
  priceInsight?: { label: string; className: string } | null;
}) {
  const [liked, setLiked] = useState(false);
  const [favCount, setFavCount] = useState(car.favorites_count || 0);
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    setLiked(getFavorites().includes(car.id));
    setInCompare(isInCompare(car.id));
    function onCompareChange() {
      setInCompare(isInCompare(car.id));
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, [car.id]);

  return (
    <Link href={`/car/${car.id}`}>
      <motion.article
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group cursor-pointer border border-border bg-card transition-colors hover:border-foreground/20 active:bg-muted/30"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {car.image_url ? (
            <img
              src={car.image_url}
              alt={car.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
              暂无图片
            </div>
          )}
          <div className="absolute left-2 top-2 flex gap-1">
            {car.profiles?.account_type === "dealer" ? (
              <Badge
                variant="secondary"
                className="font-mono text-[10px] font-medium"
              >
                车行
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-background/80 font-mono text-[10px] font-medium backdrop-blur-sm"
              >
                个人
              </Badge>
            )}
            {distance !== undefined && (
              <Badge
                variant="outline"
                className="gap-0.5 bg-background/80 font-mono text-[10px] font-medium backdrop-blur-sm"
              >
                <Navigation className="h-2.5 w-2.5" strokeWidth={1.5} />
                {formatDistance(distance)}
              </Badge>
            )}
          </div>
          {/* Action buttons */}
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (inCompare) {
                  removeFromCompare(car.id);
                } else {
                  addToCompare(car.id);
                }
              }}
              title={inCompare ? "移出对比" : "加入对比"}
            >
              {inCompare ? (
                <Check className="h-4 w-4 text-green-500" strokeWidth={2} />
              ) : (
                <GitCompare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const { liked: newLiked, delta } = toggleFavorite(car.id);
                setLiked(newLiked);
                setFavCount((c) => Math.max(0, c + delta));
                updateFavCount(car.id, delta);
              }}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-mono text-sm font-semibold leading-tight tracking-tight">
            {car.title_zh}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {car.title}
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-base font-bold">
              {formatPrice(car.price)}
            </span>
            {car.original_price && car.original_price > car.price && (
              <span className="px-1 py-0.5 font-mono text-[10px] font-semibold bg-green-500/10 text-green-600">
                -{Math.round((1 - car.price / car.original_price) * 100)}%
              </span>
            )}
            {car.original_price && car.original_price > car.price && (
              <span className="font-mono text-[10px] text-muted-foreground line-through">
                {formatPrice(car.original_price)}
              </span>
            )}
            {priceInsight && (
              <span
                className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold ${priceInsight.className}`}
              >
                {priceInsight.label}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted-foreground">
              分期 {estimateMonthly(car.price)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Gauge
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatMileage(car.mileage)} mi
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {car.fuel_type}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {car.location_zh}
                {distance !== undefined && (
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {" · "}{formatDistance(distance)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {car.year}年
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <span
              className="font-mono text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/user/${car.seller_id}`;
              }}
            >
              {car.seller_name}
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60">
              {favCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5" strokeWidth={1.5} />
                  {favCount}
                </span>
              )}
              {new Date(car.created_at).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
