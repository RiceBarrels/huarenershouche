"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { carLink } from "@/lib/static-link";
import { MapPin, Gauge, Fuel, Calendar, Navigation, Heart, GitCompare, Check, Flame } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geocode";
import { supabase } from "@/lib/supabase";
import { addToCompare, isInCompare, removeFromCompare } from "@/lib/compare";
import { estimateMonthlyPayment } from "@/lib/format";
import { useCarOverlay } from "@/components/car-overlay-provider";
import type { PriceInsight } from "@/lib/price-insight";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function daysListed(car: DbCar): number {
  return (Date.now() - new Date(car.created_at).getTime()) / 86400000;
}

function isHotListing(car: DbCar): boolean {
  const days = Math.max(1, daysListed(car));
  return (car.views_count || 0) / days >= 30 || (car.favorites_count || 0) >= 5;
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
  priceInsight?: PriceInsight | null;
}) {
  const [liked, setLiked] = useState(false);
  const [favCount, setFavCount] = useState(car.favorites_count || 0);
  const [inCompare, setInCompare] = useState(false);
  const { enabled: overlayEnabled, openCar, openUser } = useCarOverlay();

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
    <Link
      href={carLink(car.id)}
      onClick={(e) => {
        // 移动端:在当前页浮层打开(从卡片放大);桌面端正常跳转
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openCar(
            car,
            { top: r.top, left: r.left, width: r.width, height: r.height },
            e.currentTarget.outerHTML,
            e.currentTarget,
          );
        }
      }}
    >
      <motion.article
        whileHover={{ y: -2 }}
        whileTap={{ scale: 1.02 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group flex cursor-pointer rounded-xl overflow-hidden bg-card transition-colors hover:bg-card/50 active:bg-accent md:block"
      >
        {/* 图片:手机在左(约 2/5 宽,随文字高度拉伸),桌面在上(16:10) */}
        <div className="relative w-[40%] shrink-0 self-stretch overflow-hidden bg-muted md:aspect-[16/10] md:w-auto md:self-auto">
          {car.image_url ? (
            <img
              src={car.image_url}
              alt={car.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] md:static"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground md:static md:h-full">
              暂无图片
            </div>
          )}
          <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1 md:left-2 md:right-32 md:top-2">
            {car.source_id ? null : car.profiles?.account_type === "dealer" ? (
              <Badge
                variant="secondary"
                className="hidden font-mono text-[11px] font-medium md:inline-flex"
              >
                车行
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="hidden bg-background/80 font-mono text-[11px] font-medium backdrop-blur-sm md:inline-flex"
              >
                个人
              </Badge>
            )}
            {distance !== undefined && (
              <Badge
                variant="outline"
                className="hidden gap-0.5 bg-background/80 font-mono text-[11px] font-medium backdrop-blur-sm md:inline-flex"
              >
                <Navigation className="h-2.5 w-2.5" strokeWidth={1.5} />
                {formatDistance(distance)}
              </Badge>
            )}
            {daysListed(car) < 1 ? (
              <Badge
                variant="outline"
                className="bg-background/80 px-1 font-mono text-[10px] font-medium text-blue-600 backdrop-blur-sm dark:text-blue-400 md:px-2 md:text-[10px]"
              >
                今日新上
              </Badge>
            ) : daysListed(car) <= 3 ? (
              <Badge
                variant="outline"
                className="bg-background/80 px-1 font-mono text-[10px] font-medium text-blue-600 backdrop-blur-sm dark:text-blue-400 md:px-2 md:text-[10px]"
              >
                新上架
              </Badge>
            ) : isHotListing(car) ? (
              <Badge
                variant="outline"
                className="gap-0.5 bg-background/80 px-1 font-mono text-[10px] font-medium text-orange-600 backdrop-blur-sm md:px-2 md:text-[11px] dark:text-orange-400"
              >
                <Flame className="h-2.5 w-2.5" strokeWidth={1.5} />
                热门
              </Badge>
            ) : null}
          </div>
          {/* 图上操作按钮:仅桌面(手机版操作在文字区底部) */}
          <div className="absolute right-2 top-2 hidden items-center gap-1 md:flex">
            <button
              type="button"
              className="flex h-8 items-center gap-1 rounded-full bg-background/80 px-2.5 backdrop-blur-sm transition-colors hover:bg-background"
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
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2} />
                  <span className="font-mono text-[11px] text-green-600 dark:text-green-500">已加对比</span>
                </>
              ) : (
                <>
                  <GitCompare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="font-mono text-[13px] text-muted-foreground">对比</span>
                </>
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

        <div className="min-w-0 flex-1 p-4">
          <h3 className="truncate font-mono text-[15px] font-semibold leading-snug tracking-tight md:whitespace-normal md:text-base">
            {car.title_zh}
          </h3>
          <p className="mt-0.5 hidden font-mono text-[13px] text-muted-foreground md:block">
            {car.title}
          </p>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:mt-2">
            <span className="font-mono text-lg font-bold md:text-xl">
              {formatPrice(car.price)}
            </span>
            {car.original_price && car.original_price > car.price && (
              <span className="rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
                -{Math.round((1 - car.price / car.original_price) * 100)}%
              </span>
            )}
            {car.original_price && car.original_price > car.price && (
              <span className="hidden font-mono text-[11px] text-muted-foreground line-through md:inline">
                {formatPrice(car.original_price)}
              </span>
            )}
            {priceInsight && (
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold ${priceInsight.className}`}
              >
                {priceInsight.label}
              </span>
            )}
            {car.price > 0 && (
              <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
                分期 ~${estimateMonthlyPayment(car.price)}/月
              </span>
            )}
          </div>

          {priceInsight &&
            (priceInsight.level === "great" || priceInsight.level === "good") &&
            priceInsight.delta >= 300 && (
              <p className="mt-1 hidden font-mono text-[12px] text-green-600 md:block dark:text-green-400">
                比同类均价低 {formatPrice(priceInsight.delta)}
                <span className="text-muted-foreground">
                  {" "}· {priceInsight.sampleSize} 台同类对比
                </span>
              </p>
            )}

          {/* 手机:一行紧凑参数 */}
          <p className="mt-1 truncate font-mono text-[13px] text-muted-foreground md:hidden">
            {car.year}年 · {formatMileage(car.mileage)} mi · {car.fuel_type}
            {car.source_id ? " · 系统检索" : ""}
          </p>

          {/* 桌面:2×2 参数栅格 */}
          <div className="mt-3 hidden grid-cols-2 gap-x-4 gap-y-1.5 md:grid">
            <div className="flex items-center gap-1.5">
              <Gauge
                className="h-3.5 w-3.5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[13px] text-muted-foreground">
                {formatMileage(car.mileage)} mi
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel
                className="h-3.5 w-3.5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[13px] text-muted-foreground">
                {car.fuel_type}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin
                className="h-3.5 w-3.5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[13px] text-muted-foreground">
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
                className="h-3.5 w-3.5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[13px] text-muted-foreground">
                {car.year}年
              </span>
            </div>
          </div>

          {/* 手机:位置 + 收藏/对比 操作 */}
          <div className="mt-2 flex items-center justify-between gap-2 md:hidden">
            <span className="flex min-w-0 items-center gap-1 font-mono text-[12px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              <span className="truncate">
                {car.location_zh}
                {distance !== undefined && (
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {" · "}{formatDistance(distance)}
                  </span>
                )}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="flex h-7 items-center gap-1 rounded-full bg-muted px-2 font-mono text-[12px] text-muted-foreground transition-colors active:bg-muted/70"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (inCompare) {
                    removeFromCompare(car.id);
                  } else {
                    addToCompare(car.id);
                  }
                }}
              >
                {inCompare ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" strokeWidth={2} />
                    <span className="text-green-600 dark:text-green-500">已加</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="h-3 w-3" strokeWidth={1.5} />
                    对比
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label={liked ? "取消收藏" : "收藏"}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 transition-colors active:bg-muted"
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
                  className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                  strokeWidth={1.5}
                />
              </button>
            </span>
          </div>

          {/* 桌面:卖家/收藏数/系统检索 底栏 */}
          <div className="mt-3 hidden items-center justify-between border-t border-border pt-2.5 md:flex">
            <span
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (overlayEnabled) openUser(car.seller_id);
                else window.location.href = `/user/${car.seller_id}`;
              }}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                <img
                  src={avatarUrl(car.profiles?.avatar_url, car.seller_name)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
              {car.seller_name}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {favCount > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground/60">
                  <Heart className="h-3 w-3" strokeWidth={1.5} />
                  {favCount}
                </span>
              )}
              {/* 系统检索标识:卡片右下角 */}
              {car.source_id && (
                <Badge variant="secondary" className="font-mono text-[10px] font-medium">
                  系统检索
                </Badge>
              )}
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
