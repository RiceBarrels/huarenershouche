"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRouteParams } from "@/lib/use-route-params";
import Link from "next/link";
import { carEditLink, userLink } from "@/lib/static-link";

import {
  ExternalLink,
  MapPin,
  Gauge,
  Fuel,
  Calendar,
  Palette,
  Settings,
  Heart,
  Share2,
  MessageSquare,
  Phone,
  ChevronLeft,
  ChevronRight,
  Eye,
  BellRing,
  BellOff,
  Flag,
  TrendingDown,
  TrendingUp,
  Loader2,
  Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { CommentSection } from "@/components/comment-section";
import { BackToTop } from "@/components/back-to-top";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { MAKES_ZH } from "@/lib/mock-data";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { recordPrice } from "@/lib/price-history";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { isWatching, addPriceWatch, removePriceWatch, getWatchedPrice } from "@/lib/price-watch";
import { ReportDialog } from "@/components/report-dialog";
import { VinCheck } from "@/components/vin-check";
import { ImageLightbox } from "@/components/image-lightbox";
import { VehicleHistoryPanel } from "@/components/vehicle-history";
import { LoanCalculator } from "@/components/loan-calculator";
import { MarketPosition } from "@/components/market-position";
import { ModelReviews } from "@/components/model-reviews";
import { getPriceInsight, findComparables } from "@/lib/price-insight";
import { QrShare } from "@/components/qr-share";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles);
}

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;
function isVideo(url: string): boolean {
  return VIDEO_RE.test(url);
}

export default function CarDetailPage() {
  const params = useRouteParams<{ id: string }>();
  const carId = params.id as string;
  const router = useRouter();
  const [car, setCar] = useState<DbCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [similarCars, setSimilarCars] = useState<DbCar[]>([]);
  const [makePool, setMakePool] = useState<DbCar[]>([]);
  const [copied, setCopied] = useState(false);
  const [watching, setWatching] = useState(false);
  const [watchedPrice, setWatchedPrice] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type)")
        .eq("id", carId)
        .single();
      setCar(data as DbCar);
      setLoading(false);

      // Increment view count via RPC (bypasses RLS)
      if (data) {
        supabase.rpc("increment_views", { car_id: carId }).then(() => {
          setCar((prev) => prev ? { ...prev, views_count: (prev.views_count || 0) + 1 } : prev);
        });
        addRecentlyViewed(carId);
        recordPrice(carId, data.title, data.price);

        // 同品牌车源池：用于市场比价（getPriceInsight / findComparables）
        const { data: pool } = await supabase
          .from("cars")
          .select("id, make, model, year, price, mileage, status")
          .eq("status", "active")
          .eq("make", data.make)
          .limit(150);
        setMakePool((pool as DbCar[]) || []);

        // 相似车：优先同 make+model（±2 年）按上架时间新到旧，
        // 不足 4 台补同 make 按 |价差| 从小到大，再不足补 ±30% 价格区间
        const { data: sameMake } = await supabase
          .from("cars")
          .select("*")
          .eq("status", "active")
          .eq("make", data.make)
          .neq("id", carId)
          .order("created_at", { ascending: false })
          .limit(24);
        const sameMakeCars = (sameMake as DbCar[]) || [];
        const modelKey = (data.model || "").toLowerCase().trim();
        const tier1 = modelKey
          ? sameMakeCars.filter(
              (c) =>
                (c.model || "").toLowerCase().trim() === modelKey &&
                Math.abs(c.year - data.year) <= 2
            )
          : [];
        // 电议车（price=0）按价差排序会把最便宜的车排最前，改按年份接近度
        const tier2 = sameMakeCars
          .filter((c) => !tier1.some((t) => t.id === c.id))
          .sort((a, b) =>
            data.price > 0
              ? Math.abs(a.price - data.price) - Math.abs(b.price - data.price)
              : Math.abs(a.year - data.year) - Math.abs(b.year - data.year)
          );
        let picked = [...tier1, ...tier2].slice(0, 4);
        if (picked.length < 4 && data.price > 0) {
          const { data: priceSimilar } = await supabase
            .from("cars")
            .select("*")
            .eq("status", "active")
            .neq("id", carId)
            .gte("price", data.price * 0.7)
            .lte("price", data.price * 1.3)
            .limit(8);
          const extra = ((priceSimilar as DbCar[]) || []).filter(
            (c) => !picked.some((p) => p.id === c.id)
          );
          picked = [...picked, ...extra].slice(0, 4);
        }
        setSimilarCars(picked);
      }

      // Check price watch
      setWatching(isWatching(carId));
      setWatchedPrice(getWatchedPrice(carId));

      // Check auth & favorite
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser.id);
        const { data: fav } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", authUser.id)
          .eq("car_id", carId)
          .maybeSingle();
        setIsFavorited(!!fav);
      }
    }
    load();
  }, [carId]);

  // 市场比价：与同品牌车源池对比（里程修正后的同类均价）
  const insight = useMemo(
    () => (car ? getPriceInsight(car, makePool) : null),
    [car, makePool]
  );
  const comparables = useMemo(
    () => (car ? findComparables(car, makePool).cars : []),
    [car, makePool]
  );

  async function toggleFavorite() {
    if (!user) return;
    if (isFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user)
        .eq("car_id", carId);
      if (!error) {
        setIsFavorited(false);
        setCar((prev) => prev ? { ...prev, favorites_count: Math.max(0, (prev.favorites_count || 0) - 1) } : prev);
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user, car_id: carId });
      if (!error) {
        setIsFavorited(true);
        setCar((prev) => prev ? { ...prev, favorites_count: (prev.favorites_count || 0) + 1 } : prev);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <Skeleton className="aspect-[16/10] w-full" />
              <div className="mt-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="border border-border p-3 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="border border-border p-4 space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-sm text-muted-foreground">
              车辆不存在或已下架
            </p>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="mt-4 font-mono text-xs"
              >
                返回首页
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const allImages = [
    car.image_url,
    ...(car.images || []),
  ].filter(Boolean) as string[];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background font-mono">

      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-hidden px-4 py-6">

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: Image + Details */}
          <div>
            {/* Image gallery — main + thumbnails on desktop, swipeable on mobile */}
            <div className="flex gap-2">
              {/* Main image */}
              <div
                className="relative flex-1 aspect-[16/10] overflow-hidden border border-border bg-muted"
                onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchStart === null) return;
                  const diff = e.changedTouches[0].clientX - touchStart;
                  if (Math.abs(diff) > 50) {
                    if (diff < 0) {
                      setCurrentImage((prev) => prev === allImages.length - 1 ? 0 : prev + 1);
                    } else {
                      setCurrentImage((prev) => prev === 0 ? allImages.length - 1 : prev - 1);
                    }
                  }
                  setTouchStart(null);
                }}
              >
                {allImages.length > 0 ? (
                  isVideo(allImages[currentImage]) ? (
                    <video
                      src={allImages[currentImage]}
                      className="h-full w-full cursor-zoom-in object-cover"
                      controls
                      muted
                      onClick={() => setLightboxOpen(true)}
                    />
                  ) : (
                    <img
                      src={allImages[currentImage]}
                      alt={car.title}
                      className="h-full w-full cursor-zoom-in object-cover"
                      onClick={() => setLightboxOpen(true)}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
                    暂无图片
                  </div>
                )}
                <div className="absolute left-3 top-3">
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
                </div>
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentImage((prev) =>
                          prev === 0 ? allImages.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center bg-background/80 backdrop-blur-sm transition-colors hover:bg-background md:flex"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentImage((prev) =>
                          prev === allImages.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center bg-background/80 backdrop-blur-sm transition-colors hover:bg-background md:flex"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <div
                      className="absolute bottom-3 left-3 flex items-center gap-1 bg-background/80 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm cursor-pointer"
                      onClick={() => setLightboxOpen(true)}
                    >
                      <Eye className="h-3 w-3" strokeWidth={1.5} />
                      ({allImages.length}) 张照片
                    </div>
                  </>
                )}
              </div>

              {/* Desktop thumbnail column */}
              {allImages.length > 1 && (
                <div className="hidden w-[120px] shrink-0 flex-col gap-1.5 overflow-y-auto md:flex" style={{ maxHeight: "calc((100vw - 2rem - 320px - 1.5rem) * 10 / 16)" }}>
                  {allImages.slice(0, 4).map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`relative aspect-[4/3] w-full shrink-0 overflow-hidden border bg-muted transition-colors ${
                        i === currentImage ? "border-foreground" : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {isVideo(url) ? (
                        <div className="flex h-full items-center justify-center bg-muted">
                          <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                      ) : (
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      )}
                      {i === 3 && allImages.length > 4 && (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-xs font-medium text-white cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                        >
                          +{allImages.length - 4}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile image dots */}
            {allImages.length > 1 && (
              <div className="mt-2 flex justify-center gap-1.5 md:hidden">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentImage
                        ? "w-4 bg-foreground"
                        : "w-1.5 bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Car info */}
            <div
              className="mt-6"
            >
              <h1 className="font-mono text-xl font-semibold tracking-tight">
                {car.title_zh}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {car.title}
              </p>

              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-2xl font-bold">
                  {formatPrice(car.price)}
                </span>
                {insight && (
                  <span
                    className={`px-1.5 py-0.5 font-mono text-xs font-semibold ${insight.className}`}
                  >
                    {insight.label}
                  </span>
                )}
                {car.original_price && car.original_price > car.price && (
                  <span className="px-1.5 py-0.5 font-mono text-xs font-semibold bg-green-500/10 text-green-600">
                    -{Math.round((1 - car.price / car.original_price) * 100)}%
                  </span>
                )}
                {car.original_price && car.original_price > car.price && (
                  <span className="font-mono text-sm text-muted-foreground line-through">
                    {formatPrice(car.original_price)}
                  </span>
                )}
                {watchedPrice !== null && watchedPrice !== car.price && (
                  <span
                    className={`flex items-center gap-0.5 font-mono text-xs font-semibold ${
                      car.price < watchedPrice
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-500"
                    }`}
                  >
                    {car.price < watchedPrice ? (
                      <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    {car.price < watchedPrice ? "降" : "涨"}
                    {formatPrice(Math.abs(car.price - watchedPrice))}
                  </span>
                )}
                <span className="font-mono text-[11px] text-muted-foreground">
                  {car.views_count || 0} 次浏览
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Heart className="h-3 w-3" strokeWidth={1.5} />
                  {car.favorites_count || 0} 人喜欢
                </span>
              </div>
            </div>

            <PriceHistoryChart carId={carId} />

            {/* 市场价位:min—avg—max 价位条 + 当前车价 marker */}
            <MarketPosition car={car} comparables={comparables} insight={insight} />

            <Separator className="my-6" />

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="border border-border p-3">
                <div className="flex items-center gap-1.5">
                  <Calendar
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    年份
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-medium">
                  {car.year}
                </p>
              </div>
              <div className="border border-border p-3">
                <div className="flex items-center gap-1.5">
                  <Gauge
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    里程
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-medium">
                  {formatMileage(car.mileage)} mi
                </p>
              </div>
              <div className="border border-border p-3">
                <div className="flex items-center gap-1.5">
                  <Fuel
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    燃油
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-medium">
                  {car.fuel_type}
                </p>
              </div>
              <div className="border border-border p-3">
                <div className="flex items-center gap-1.5">
                  <Settings
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    变速箱
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-medium">
                  {car.transmission}
                </p>
              </div>
              <div className="border border-border p-3">
                <div className="flex items-center gap-1.5">
                  <Palette
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    外观颜色
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-medium">
                  {car.exterior_color || "—"}
                </p>
              </div>
              <div className="border border-border p-3">
                <div className="flex items-center gap-1.5">
                  <MapPin
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    所在地
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-medium">
                  {car.location_zh}
                </p>
              </div>
            </div>

            {/* Features */}
            {car.features && car.features.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-sm font-semibold">车辆配置</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {car.features.map((f) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className="font-mono text-[11px]"
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Description */}
            {car.description_zh && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-sm font-semibold">车辆描述</h2>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
                    {car.description_zh}
                  </p>
                </div>
              </>
            )}

            {car.vin && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-sm font-semibold">VIN 认证</h2>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {car.vin}
                  </p>
                  <VinCheck
                    vin={car.vin}
                    car={{ make: car.make, year: car.year, model: car.model }}
                  />
                </div>
              </>
            )}

            {/* Carfax report */}
            {car.carfax_url && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-sm font-semibold">Carfax 报告</h2>
                  {car.carfax_summary && (
                    <p className="mt-1 font-mono text-sm text-muted-foreground">
                      {car.carfax_summary}
                    </p>
                  )}
                  <a
                    href={car.carfax_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    在 Carfax 查看完整报告
                  </a>
                </div>
              </>
            )}

            {/* Vehicle history: model-level NHTSA reference, tucked away at the bottom */}
            {car.vin && car.make && car.model && car.year > 0 && (
              <div className="mt-8">
                <VehicleHistoryPanel
                  make={car.make}
                  model={car.model}
                  year={car.year}
                />
              </div>
            )}
          </div>

          {/* Right: Seller card */}
          <div
            className="lg:sticky lg:top-20 lg:self-start"
          >
            <div className="border border-border p-4">
              <h3 className="font-mono text-sm font-semibold">卖家信息</h3>
              <Link
                href={userLink(car.seller_id)}
                className="mt-3 flex items-center gap-3 py-2 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                  {car.profiles?.account_type === "dealer" ? (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <p className="font-mono text-sm font-medium underline-offset-2 hover:underline">
                    {car.seller_name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {car.profiles?.account_type === "dealer" ? "认证车行" : "个人卖家"} · 查看主页 →
                  </p>
                </div>
              </Link>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" strokeWidth={1.5} />
                {car.location}
              </p>

              <div className="mt-4 space-y-2">
                {user ? (
                  <Button
                    className="w-full gap-1.5 font-mono text-xs"
                    onClick={() => {
                      if (contactVisible && car.phone) {
                        setCallDialogOpen(true);
                      } else {
                        setContactVisible(true);
                      }
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {contactVisible
                      ? car.phone || "未提供电话"
                      : "查看联系方式"}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button className="w-full gap-1.5 font-mono text-xs">
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                      登录查看联系方式
                    </Button>
                  </Link>
                )}

                {user ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 font-mono text-xs"
                      onClick={toggleFavorite}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${isFavorited ? "fill-current" : ""}`}
                        strokeWidth={1.5}
                      />
                      {isFavorited ? "已收藏" : "收藏"}
                    </Button>
                  </>
                ) : (
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 font-mono text-xs"
                    >
                      <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                      登录后收藏
                    </Button>
                  </Link>
                )}

                {user && user === car.seller_id && (
                  <Link href={carEditLink(carId)}>
                    <Button variant="outline" className="w-full gap-1.5 font-mono text-xs">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      编辑车辆
                    </Button>
                  </Link>
                )}

                {user ? (
                  user !== car.seller_id && (
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 font-mono text-xs"
                      onClick={async () => {
                        // Ensure conversation exists, then navigate
                        const { data: existing } = await supabase
                          .from("conversations")
                          .select("id")
                          .eq("car_id", carId)
                          .eq("buyer_id", user)
                          .eq("seller_id", car.seller_id)
                          .maybeSingle();
                        if (!existing) {
                          await supabase
                            .from("conversations")
                            .insert({
                              car_id: carId,
                              buyer_id: user,
                              seller_id: car.seller_id,
                            });
                        }
                        router.push(`/messages/${car.seller_id}`);
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                      发消息给卖家
                    </Button>
                  )
                ) : (
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 font-mono text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                      登录后私信
                    </Button>
                  </Link>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-1.5 font-mono text-xs"
                  onClick={() => {
                    if (watching) {
                      removePriceWatch(carId);
                      setWatching(false);
                      setWatchedPrice(null);
                    } else {
                      addPriceWatch({
                        carId,
                        title: car.title_zh,
                        price: car.price,
                        watchedAt: new Date().toISOString(),
                        imageUrl: car.image_url,
                      });
                      setWatching(true);
                      setWatchedPrice(car.price);
                    }
                  }}
                >
                  {watching ? (
                    <BellOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <BellRing className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {watching ? "取消降价监控" : "降价监控"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-1.5 font-mono text-xs"
                  onClick={async () => {
                    const { nativeShare } = await import("@/lib/capacitor");
                    const shared = await nativeShare({
                      title: car.title_zh,
                      text: `${car.title_zh} - ${formatPrice(car.price)}`,
                      url: window.location.href,
                    });
                    if (!shared) {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {copied ? "已复制链接" : "分享"}
                </Button>

                <QrShare
                  url={typeof window !== "undefined" ? window.location.href : ""}
                  title={car.title_zh || car.title}
                />

                <ReportDialog carId={carId}>
                  <Button
                    variant="ghost"
                    className="w-full gap-1.5 font-mono text-xs text-muted-foreground"
                  >
                    <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />
                    举报
                  </Button>
                </ReportDialog>
              </div>
            </div>

            {/* Loan Calculator */}
            {car.price > 0 && (
              <div className="mt-4 border border-border p-4">
                <LoanCalculator price={car.price} />
              </div>
            )}

            {/* Safety tips */}
            <div className="mt-4 border border-border p-4">
              <h3 className="font-mono text-xs font-semibold">交易安全提示</h3>
              <ul className="mt-2 space-y-1.5">
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 见面交易前先核实车辆信息
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 建议在公共场所看车、试驾
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 交易前请做 CarFax 车辆报告
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 建议找认证技师做 Pre-purchase inspection
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* 车主口碑:社区车评 */}
        <ModelReviews make={car.make} model={car.model} />

        {/* Comments */}
        <CommentSection carId={carId} />

        {/* Similar cars */}
        {similarCars.length > 0 && (
          <section
            className="mt-10 border-t border-border pt-6"
          >
            <h2 className="font-mono text-sm font-semibold">相似车辆推荐</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similarCars.map((c) => (
                <CarCard
                  key={c.id}
                  car={c}
                  priceInsight={getPriceInsight(c, makePool)}
                />
              ))}
            </div>
          </section>
        )}
        {/* Spacer for mobile bottom action bar */}
        <div className="h-16 md:hidden" />
      </main>
      <Footer />
      <BackToTop />

      {/* Mobile sticky bottom action bar */}
      <div 
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="font-mono text-lg font-bold">{formatPrice(car.price)}</p>
            {insight && (
              <span
                className={`px-1 py-0.5 font-mono text-[10px] font-semibold ${insight.className}`}
              >
                {insight.label}
              </span>
            )}
            {car.original_price && car.original_price > car.price && (
              <span className="px-1 py-0.5 font-mono text-[10px] font-semibold bg-green-500/10 text-green-600">
                -{Math.round((1 - car.price / car.original_price) * 100)}%
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={toggleFavorite}
        >
          <Heart
            className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
            strokeWidth={1.5}
          />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={async () => {
            const { nativeShare } = await import("@/lib/capacitor");
            const shared = await nativeShare({
              title: car.title_zh,
              text: `${car.title_zh} - ${formatPrice(car.price)}`,
              url: window.location.href,
            });
            if (!shared) {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }}
        >
          <Share2 className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        {user ? (
          <Button
            className="h-10 gap-1.5 font-mono text-xs"
            onClick={() => {
              if (contactVisible && car.phone) {
                setCallDialogOpen(true);
              } else {
                setContactVisible(true);
              }
            }}
          >
            <Phone className="h-4 w-4" strokeWidth={1.5} />
            {contactVisible ? (car.phone || "无电话") : "联系卖家"}
          </Button>
        ) : (
          <Link href="/login">
            <Button className="h-10 gap-1.5 font-mono text-xs">
              <Phone className="h-4 w-4" strokeWidth={1.5} />
              登录联系卖家
            </Button>
          </Link>
        )}
      </div>

      {/* Call dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">拨打电话</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              是否拨打卖家电话 {car.phone}？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="flex-1 font-mono text-xs">
                取消
              </Button>
            </DialogClose>
            <Button size="sm" className="flex-1 gap-1.5 font-mono text-xs" asChild>
              <a href={`tel:${car.phone}`}>
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                拨打
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        images={allImages}
        initialIndex={currentImage}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
