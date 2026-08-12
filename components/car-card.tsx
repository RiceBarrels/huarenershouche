"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { carLink } from "@/lib/static-link";
import { MapPin, Gauge, Fuel, Calendar, Navigation, Heart, GitCompare, Check, Flame, Phone, ArrowUpRight } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage,仅挂载时一次
    setLiked(getFavorites().includes(car.id));
    setInCompare(isInCompare(car.id));
    function onCompareChange() {
      setInCompare(isInCompare(car.id));
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, [car.id]);

  function handleCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(car.id);
    } else {
      addToCompare(car.id);
    }
  }

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { liked: newLiked, delta } = toggleFavorite(car.id);
    setLiked(newLiked);
    setFavCount((c) => Math.max(0, c + delta));
    updateFavCount(car.id, delta);
  }

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
        className="group cursor-pointer overflow-hidden rounded-xl bg-card transition-colors hover:bg-card/50 active:bg-accent"
      >
        {/* ===== 手机版:图左文右 + 标签行 + 位置行 + 操作按钮 ===== */}
        <div className="p-3 md:hidden">
          <div className="flex gap-2.5">
            <div className="relative aspect-square w-[32%] shrink-0 self-start overflow-hidden rounded-lg bg-muted">
              {car.image_url ? (
                <img
                  src={car.image_url}
                  alt={car.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
                  暂无图片
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span className="font-mono text-lg font-bold tracking-tight">
                    {formatPrice(car.price)}
                  </span>
                  {car.original_price && car.original_price > car.price && (
                    <span className="font-mono text-[11px] text-muted-foreground line-through">
                      {formatPrice(car.original_price)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={liked ? "取消收藏" : "收藏"}
                  className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors active:bg-muted"
                  onClick={handleFavorite}
                >
                  <Heart
                    className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`}
                    strokeWidth={1.5}
                  />
                </button>
              </div>
              <h3 className="line-clamp-2 font-mono text-[14px] font-medium leading-snug">
                {car.title_zh}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                {car.year}年 · {formatMileage(car.mileage)} mi · {car.fuel_type}
                {car.source_id ? " · 系统检索" : ""}
              </p>

              {/* 标签行:价格评级 / 降价 / 新上·热门(放右栏,填满图片旁空间) */}
              {(priceInsight ||
                (car.original_price && car.original_price > car.price) ||
                daysListed(car) <= 3 ||
                isHotListing(car)) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {priceInsight && (
                    <span
                      className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${priceInsight.className}`}
                    >
                      <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                      {priceInsight.label}
                    </span>
                  )}
                  {car.original_price && car.original_price > car.price && (
                    <span className="flex items-center rounded-full bg-green-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-green-600 dark:text-green-400">
                      已降价 {Math.round((1 - car.price / car.original_price) * 100)}%
                    </span>
                  )}
                  {daysListed(car) < 1 ? (
                    <span className="flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      今日新上
                    </span>
                  ) : daysListed(car) <= 3 ? (
                    <span className="flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      新上架
                    </span>
                  ) : isHotListing(car) ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-orange-600 dark:text-orange-400">
                      <Flame className="h-3 w-3" strokeWidth={1.5} />
                      热门
                    </span>
                  ) : null}
                </div>
              )}

              {/* 位置行 */}
              <p className="mt-1.5 flex items-center gap-1 font-mono text-[12px] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">
                  {car.location_zh}
                  {distance !== undefined && (
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {" "}({formatDistance(distance)})
                    </span>
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* 操作:电话(有号码时)+ 加入对比 */}
          <div className="mt-2.5 flex gap-2">
            {car.phone && (
              <button
                type="button"
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-5 font-mono text-[14px] font-semibold transition-opacity active:opacity-70"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `tel:${car.phone}`;
                }}
              >
                <Phone className="h-4 w-4" strokeWidth={1.75} />
                电话
              </button>
            )}
            <button
              type="button"
              className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full font-mono text-[14px] font-semibold transition-opacity active:opacity-70 ${
                inCompare
                  ? "bg-muted text-muted-foreground"
                  : "bg-brand text-primary-foreground"
              }`}
              onClick={handleCompare}
            >
              {inCompare ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2} />
                  已加入对比
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4" strokeWidth={1.75} />
                  加入对比
                </>
              )}
            </button>
          </div>
        </div>

        {/* ===== 桌面版:图上文下(原布局) ===== */}
        <div className="hidden md:block">
          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
            {car.image_url ? (
              <img
                src={car.image_url}
                alt={car.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                暂无图片
              </div>
            )}
            <div className="absolute left-2 right-32 top-2 flex flex-wrap gap-1">
              {car.source_id ? null : car.profiles?.account_type === "dealer" ? (
                <Badge variant="secondary" className="font-mono text-[11px] font-medium">
                  车行
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-background/90 font-mono text-[11px] font-medium"
                >
                  个人
                </Badge>
              )}
              {distance !== undefined && (
                <Badge
                  variant="outline"
                  className="gap-0.5 bg-background/90 font-mono text-[11px] font-medium"
                >
                  <Navigation className="h-2.5 w-2.5" strokeWidth={1.5} />
                  {formatDistance(distance)}
                </Badge>
              )}
              {daysListed(car) < 1 ? (
                <Badge
                  variant="outline"
                  className="bg-background/90 px-2 font-mono text-[10px] font-medium text-blue-600 dark:text-blue-400"
                >
                  今日新上
                </Badge>
              ) : daysListed(car) <= 3 ? (
                <Badge
                  variant="outline"
                  className="bg-background/90 px-2 font-mono text-[10px] font-medium text-blue-600 dark:text-blue-400"
                >
                  新上架
                </Badge>
              ) : isHotListing(car) ? (
                <Badge
                  variant="outline"
                  className="gap-0.5 bg-background/90 px-2 font-mono text-[11px] font-medium text-orange-600 dark:text-orange-400"
                >
                  <Flame className="h-2.5 w-2.5" strokeWidth={1.5} />
                  热门
                </Badge>
              ) : null}
            </div>
            {/* 图上操作按钮 */}
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded-full bg-background/90 px-2.5 transition-colors hover:bg-background"
                onClick={handleCompare}
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 transition-colors hover:bg-background"
                onClick={handleFavorite}
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                  strokeWidth={1.5}
                />
              </button>
            </div>
          </div>

          <div className="min-w-0 p-4">
            <h3 className="font-mono text-base font-semibold leading-snug tracking-tight">
              {car.title_zh}
            </h3>
            <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">
              {car.title}
            </p>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-xl font-bold">
                {formatPrice(car.price)}
              </span>
              {car.original_price && car.original_price > car.price && (
                <span className="rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
                  -{Math.round((1 - car.price / car.original_price) * 100)}%
                </span>
              )}
              {car.original_price && car.original_price > car.price && (
                <span className="font-mono text-[11px] text-muted-foreground line-through">
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
                <span className="font-mono text-[11px] text-muted-foreground">
                  分期 ~${estimateMonthlyPayment(car.price)}/月
                </span>
              )}
            </div>

            {priceInsight &&
              (priceInsight.level === "great" || priceInsight.level === "good") &&
              priceInsight.delta >= 300 && (
                <p className="mt-1 font-mono text-[12px] text-green-600 dark:text-green-400">
                  比同类均价低 {formatPrice(priceInsight.delta)}
                  <span className="text-muted-foreground">
                    {" "}· {priceInsight.sampleSize} 台同类对比
                  </span>
                </p>
              )}

            {/* 2×2 参数栅格 */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="font-mono text-[13px] text-muted-foreground">
                  {formatMileage(car.mileage)} mi
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="font-mono text-[13px] text-muted-foreground">
                  {car.fuel_type}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
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
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="font-mono text-[13px] text-muted-foreground">
                  {car.year}年
                </span>
              </div>
            </div>

            {/* 卖家/收藏数/系统检索 底栏 */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
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
                {car.source_id && (
                  <Badge variant="secondary" className="font-mono text-[10px] font-medium">
                    系统检索
                  </Badge>
                )}
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
