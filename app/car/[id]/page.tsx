"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { BackToTop } from "@/components/back-to-top";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthDialog } from "@/components/auth-dialog";
import { MAKES_ZH } from "@/lib/mock-data";
import { addRecentlyViewed } from "@/lib/recently-viewed";
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

export default function CarDetailPage() {
  const params = useParams();
  const carId = params.id as string;
  const router = useRouter();
  const [car, setCar] = useState<DbCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [similarCars, setSimilarCars] = useState<DbCar[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("cars")
        .select("*")
        .eq("id", carId)
        .single();
      setCar(data as DbCar);
      setLoading(false);

      // Increment view count via RPC (bypasses RLS)
      if (data) {
        supabase.rpc("increment_views", { car_id: carId });
        addRecentlyViewed(carId);

        // Load similar cars (same make, different id)
        const { data: similar } = await supabase
          .from("cars")
          .select("*")
          .eq("status", "active")
          .eq("make", data.make)
          .neq("id", carId)
          .limit(4);
        if (similar && similar.length > 0) {
          setSimilarCars(similar as DbCar[]);
        } else {
          // Fallback: similar price range ±30%
          const { data: priceSimilar } = await supabase
            .from("cars")
            .select("*")
            .eq("status", "active")
            .neq("id", carId)
            .gte("price", data.price * 0.7)
            .lte("price", data.price * 1.3)
            .limit(4);
          setSimilarCars((priceSimilar as DbCar[]) || []);
        }
      }

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

  async function toggleFavorite() {
    if (!user) return;
    if (isFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user)
        .eq("car_id", carId);
      if (!error) setIsFavorited(false);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user, car_id: carId });
      if (!error) setIsFavorited(true);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          <Skeleton className="aspect-[16/9] w-full" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
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
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          返回列表
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: Image + Details */}
          <div>
            {/* Main image with navigation */}
            <div className="relative aspect-[16/10] overflow-hidden border border-border bg-muted">
              {allImages.length > 0 ? (
                <img
                  src={allImages[currentImage]}
                  alt={car.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
                  暂无图片
                </div>
              )}
              <div className="absolute left-3 top-3">
                {car.seller_type === "dealer" ? (
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
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
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
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-background/80 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm">
                    {currentImage + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Image thumbnails */}
            {allImages.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`h-16 w-24 shrink-0 border bg-muted transition-colors ${
                      i === currentImage
                        ? "border-foreground"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Car info */}
            <div className="mt-6">
              <h1 className="font-mono text-xl font-semibold tracking-tight">
                {car.title_zh}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {car.title}
              </p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold">
                  {formatPrice(car.price)}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {car.views_count || 0} 次浏览
                </span>
              </div>
            </div>

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
                  <h2 className="font-mono text-sm font-semibold">VIN</h2>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {car.vin}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right: Seller card */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="border border-border p-4">
              <h3 className="font-mono text-sm font-semibold">卖家信息</h3>
              <div className="mt-3 space-y-2">
                <p className="font-mono text-sm">{car.seller_name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {car.seller_type === "dealer" ? "认证车行" : "个人卖家"}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" strokeWidth={1.5} />
                  {car.location}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  className="w-full gap-1.5 font-mono text-xs"
                  onClick={() => setContactVisible(!contactVisible)}
                >
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {contactVisible
                    ? car.phone || "未提供电话"
                    : "查看联系方式"}
                </Button>

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
                  <AuthDialog onSuccess={() => window.location.reload()}>
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 font-mono text-xs"
                    >
                      <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                      登录后收藏
                    </Button>
                  </AuthDialog>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-1.5 font-mono text-xs"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: car.title_zh,
                        text: `${car.title_zh} - ${formatPrice(car.price)}`,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {copied ? "已复制链接" : "分享"}
                </Button>
              </div>
            </div>

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
        {/* Similar cars */}
        {similarCars.length > 0 && (
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="font-mono text-sm font-semibold">相似车辆推荐</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similarCars.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
