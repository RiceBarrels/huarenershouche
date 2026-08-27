"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
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
  RefreshCw,
  GitCompare,
  Check,
  X,
  Navigation,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addToCompare, removeFromCompare, isInCompare } from "@/lib/compare";
import { timeAgo, estimateMonthlyPayment, LOAN_ASSUMPTION } from "@/lib/format";
import { SITE_URL } from "@/lib/seo-pages";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Reveal } from "@/components/reveal";
import { ScrollProgress } from "@/components/scroll-progress";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { CommentSection } from "@/components/comment-section";
import { ChatThread } from "@/components/chat-thread";
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
import { OpenInMaps } from "@/components/open-in-maps";
import { VinCheck } from "@/components/vin-check";
import { ImageLightbox } from "@/components/image-lightbox";
import { VehicleHistoryPanel } from "@/components/vehicle-history";
import { LoanCalculator } from "@/components/loan-calculator";
import { MarketPosition } from "@/components/market-position";
import { ModelReviews } from "@/components/model-reviews";
import { DealerReviews } from "@/components/dealer-reviews";
import { getPriceInsight, findComparables } from "@/lib/price-insight";
import { useIdentity } from "@/components/identity-provider";
import { useOverlay } from "@/components/car-overlay-provider";
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

// leaflet 不能 SSR,按需加载
const StoreMap = nextDynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false },
);

export default function CarDetailPage({
  initialCar,
  embedded = false,
  onClose,
}: {
  initialCar?: DbCar | null;
  // embedded:在移动端浮层里内嵌打开(隐藏 Header/Footer,不占满整屏高度)
  embedded?: boolean;
  onClose?: () => void;
} = {}) {
  const params = useRouteParams<{ id: string }>();
  // SSR 预取时用路由参数兜底(静态导出下 params 才需客户端解析)
  const carId = (params.id as string) || initialCar?.id || "";
  const router = useRouter();
  const showChrome = !embedded;
  const [car, setCar] = useState<DbCar | null>(initialCar ?? null);
  const [loading, setLoading] = useState(!initialCar);
  const [isFavorited, setIsFavorited] = useState(false);
  // user = 当前操作身份(actingId,用于归属/私信判断);authId = 真实用户(收藏等个人操作)
  const { actingId, authId } = useIdentity();
  const { enabled: overlayEnabled, openUser } = useOverlay();
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
  const [renewing, setRenewing] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  // 移动端:发消息在 drawer 里直接聊(不跳 /messages,浮层下跳页看不见)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  // 月供计算器 drawer(受控:NonModalDrawer 无 Trigger)
  const [loanOpen, setLoanOpen] = useState(false);

  useEffect(() => {
    setInCompare(isInCompare(carId));
    function onCompareChange() {
      setInCompare(isInCompare(carId));
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, [carId]);

  // 分享用规范公网地址(App 内 origin 是 capacitor://localhost、浮层内 href 是列表页,均不可分享)
  const shareUrl = `${SITE_URL}/car/${carId}`;
  const [storeAddress, setStoreAddress] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
  const mobileGalleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type, avatar_url, is_system, claimed_by)")
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

        // 车行卖家：取门店地址，卖家信息里展示并可点击打开地图
        if (data.profiles?.account_type === "dealer") {
          supabase
            .from("dealer_stores")
            .select("address, lat, lng")
            .eq("owner_id", data.seller_id)
            .limit(1)
            .maybeSingle()
            .then(({ data: store }) => {
              if (store?.address) setStoreAddress(store);
            });
        }

        // 同品牌车源池：用于市场比价（getPriceInsight / findComparables）
        const { data: pool } = await supabase
          .from("cars")
          .select("id, make, model, year, price, mileage, status, vin")
          .eq("status", "active")
          .eq("owner_hidden", false)
          .eq("make", data.make)
          .limit(150);
        setMakePool((pool as DbCar[]) || []);

        // 相似车：优先同 make+model（±2 年）按上架时间新到旧，
        // 不足 4 台补同 make 按 |价差| 从小到大，再不足补 ±30% 价格区间
        const { data: sameMake } = await supabase
          .from("cars")
          .select("*")
          .eq("status", "active")
          .eq("owner_hidden", false)
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
            .eq("owner_hidden", false)
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

      // Check auth & favorite（收藏始终归属真实用户）
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        // user(操作身份)由下面的 actingId effect 统一设置,此处只处理个人收藏
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

  // 操作身份就绪后覆盖 user(用于归属/私信判断);收藏仍走真实用户 authId
  useEffect(() => {
    if (actingId) setUser(actingId);
  }, [actingId]);

  async function toggleFavorite() {
    if (!authId) return;
    if (isFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", authId)
        .eq("car_id", carId);
      if (!error) {
        setIsFavorited(false);
        setCar((prev) => prev ? { ...prev, favorites_count: Math.max(0, (prev.favorites_count || 0) - 1) } : prev);
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: authId, car_id: carId });
      if (!error) {
        setIsFavorited(true);
        setCar((prev) => prev ? { ...prev, favorites_count: (prev.favorites_count || 0) + 1 } : prev);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        {showChrome && <Header />}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 2xl:max-w-6xl min-[1920px]:max-w-7xl min-[2560px]:max-w-[88rem]">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] min-[1920px]:grid-cols-[1fr_380px] min-[1920px]:gap-8">
            <div>
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <div className="mt-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-xl bg-card p-3 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="rounded-xl bg-card p-4 space-y-3">
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
        {showChrome && <Footer />}
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        {showChrome && <Header />}
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-sm text-muted-foreground">
              车辆不存在或已下架
            </p>
            <Link href="/">
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 font-mono text-xs"
              >
                返回首页
              </Button>
            </Link>
          </div>
        </main>
        {showChrome && <Footer />}
      </div>
    );
  }

  const allImages = [
    car.image_url,
    ...(car.images || []),
  ].filter(Boolean) as string[];

  // 系统检索车源:原始车源网站域名(用于展示与入口链接)
  const sourceHost = car.source_url
    ? (() => {
        try {
          return new URL(car.source_url).hostname.replace(/^www\./, "");
        } catch {
          return null;
        }
      })()
    : null;

  // 手机端轮播:按一屏宽度左右滚动(跟手滑动之外的箭头/圆点跳转都走这里)
  function scrollGallery(dir: 1 | -1) {
    const el = mobileGalleryRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  const sourceBadge = (
    <div className="absolute left-3 top-3 z-10">
      {car.profiles?.is_system ? (
        <Badge variant="secondary" className="font-mono text-[10px] font-medium">系统检索</Badge>
      ) : car.profiles?.account_type === "dealer" ? (
        <Badge variant="secondary" className="font-mono text-[10px] font-medium">车行</Badge>
      ) : (
        <Badge variant="outline" className="bg-background/80 font-mono text-[10px] font-medium backdrop-blur-sm">个人</Badge>
      )}
    </div>
  );

  return (
    <div className={embedded ? "flex flex-col overflow-x-hidden bg-background font-mono" : "flex min-h-screen flex-col overflow-x-hidden bg-background font-mono"}>

      {showChrome && <Header />}
      {showChrome && <ScrollProgress />}
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-hidden px-4 py-6 2xl:max-w-6xl min-[1920px]:max-w-7xl min-[2560px]:max-w-[88rem]">

        <div className="grid gap-6 lg:grid-cols-[1fr_320px] min-[1920px]:grid-cols-[1fr_380px] min-[1920px]:gap-8">
          {/* Left: Image + Details */}
          <div>
            {/* Image gallery — main + thumbnails on desktop, real swipe carousel on mobile */}
            <div className="flex gap-2">
              {/* Mobile: 真·滑动轮播(scroll-snap,跟手滑动 + 吸附) */}
              <div className="relative flex-1 md:hidden">
                <div
                  ref={mobileGalleryRef}
                  className="flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl bg-muted [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const idx = Math.round(el.scrollLeft / el.clientWidth);
                    setCurrentImage((prev) => (prev === idx ? prev : idx));
                  }}
                >
                  {allImages.length > 0 ? (
                    allImages.map((url, i) => (
                      <div key={i} className="h-full w-full shrink-0 snap-center snap-always">
                        {isVideo(url) ? (
                          <video src={url} className="h-full w-full object-cover" controls muted playsInline />
                        ) : (
                          <img
                            src={url}
                            alt=""
                            loading={i === 0 ? "eager" : "lazy"}
                            className="h-full w-full cursor-zoom-in object-cover"
                            onClick={() => setLightboxOpen(true)}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-sm text-muted-foreground">
                      暂无图片
                    </div>
                  )}
                </div>
                {sourceBadge}
                {allImages.length > 1 && (
                  <>
                    <button
                      aria-label="上一张"
                      onClick={() => scrollGallery(-1)}
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm active:bg-background"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      aria-label="下一张"
                      onClick={() => scrollGallery(1)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm active:bg-background"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <div
                      className="absolute bottom-3 left-3 flex cursor-pointer items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm"
                      onClick={() => setLightboxOpen(true)}
                    >
                      <Eye className="h-3 w-3" strokeWidth={1.5} />
                      ({allImages.length}) 张照片
                    </div>
                  </>
                )}
              </div>

              {/* Desktop: single image + arrows */}
              {/* group:桌面箭头平时隐藏、悬停主图才浮现,减少常驻遮挡 */}
              <div className="group relative hidden aspect-[16/10] min-w-0 flex-1 overflow-hidden rounded-xl bg-muted md:block">
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
                {sourceBadge}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentImage((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                      }}
                      aria-label="上一张"
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentImage((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                      }}
                      aria-label="下一张"
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <div
                      className="absolute bottom-3 left-3 flex cursor-pointer items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm"
                      onClick={() => setLightboxOpen(true)}
                    >
                      <Eye className="h-3 w-3" strokeWidth={1.5} />
                      ({allImages.length}) 张照片
                    </div>
                  </>
                )}
              </div>

              {/* Desktop thumbnail column — 高度由 flex 拉伸跟随主图,不再用 100vw 估算
                  (主容器有 max-w 上限、embedded 浮层里宽度≠视口宽度,vw 换算在两种场景都会失真) */}
              {allImages.length > 1 && (
                <div className="relative hidden w-[120px] shrink-0 md:block min-[1920px]:w-[140px]">
                  <div className="absolute inset-0 flex flex-col gap-1.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {allImages.slice(0, 4).map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      aria-label={`第 ${i + 1} 张`}
                      className={`relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-muted ring-2 transition-all ${
                        // 与主图同比例裁切,选中高亮、未选中降透明度做即时 hover 反馈
                        i === currentImage
                          ? "ring-brand-ink"
                          : "opacity-75 ring-transparent hover:opacity-100 hover:ring-brand-ink/50"
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
                </div>
              )}
            </div>

            {/* Mobile image indicator — 点太多时(如 30+ 张图)改用计数,避免超出屏幕 */}
            {allImages.length > 1 && (
              allImages.length <= 8 ? (
                <div className="mt-2 flex justify-center gap-1.5 md:hidden">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const el = mobileGalleryRef.current;
                        if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
                        setCurrentImage(i);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentImage
                          ? "w-4 bg-foreground"
                          : "w-1.5 bg-border hover:bg-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex justify-center md:hidden">
                  <span className="rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {currentImage + 1} / {allImages.length}
                  </span>
                </div>
              )
            )}

            {/* Car info */}
            <div
              className="mt-6"
            >
              {/* 桌面标题略放大,与卡片小字拉开层级(手机保持 text-xl 不变) */}
              <h1 className="font-mono text-xl font-semibold tracking-tight md:text-2xl">
                {car.title_zh}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {car.title}
              </p>

              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tabular-nums md:text-3xl">
                  {formatPrice(car.price)}
                </span>
                {insight && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold ${insight.className}`}
                  >
                    {insight.label}
                  </span>
                )}
                {car.original_price && car.original_price > car.price && (
                  <span className="rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold bg-green-500/10 text-green-600">
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
                {/* 桌面把浏览/收藏/上架时间这组次要元数据推到行尾,与价格拉开视觉分组(手机保持顺排换行) */}
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground md:ml-auto">
                  {car.views_count || 0} 次浏览
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Heart className="h-3 w-3" strokeWidth={1.5} />
                  {car.favorites_count || 0} 人喜欢
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" strokeWidth={1.5} />
                  {timeAgo(car.created_at)}上架
                </span>
              </div>
            </div>

            <PriceHistoryChart carId={carId} />

            {/* 市场价位:min—avg—max 价位条 + 当前车价 marker */}
            <MarketPosition car={car} comparables={comparables} insight={insight} />

            <Separator className="my-6" />

            {/* Specs data sheet */}
            <Reveal>
              {/* 桌面参数卡间距略放宽,与上下楼层留白节奏一致(手机保持 gap-2) */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      年份
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium tabular-nums">
                    {car.year}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Gauge
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      里程
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium tabular-nums">
                    {formatMileage(car.mileage)} mi
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Fuel
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      燃油
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {car.fuel_type}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Settings
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      变速箱
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {car.transmission}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Palette
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      外观颜色
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {car.exterior_color || "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      所在地
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {car.location_zh}
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Features */}
            {car.features && car.features.length > 0 && (
              <Reveal>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    车辆配置
                  </h2>
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
              </Reveal>
            )}

            {/* Description */}
            {(car.description_zh || car.description) && (
              <Reveal>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    车辆描述
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
                    {car.description_zh || car.description}
                  </p>
                </div>
              </Reveal>
            )}

            {car.vin && (
              <Reveal>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    VIN 认证
                  </h2>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    {car.vin}
                  </p>
                  <VinCheck
                    vin={car.vin}
                    car={{ make: car.make, year: car.year, model: car.model }}
                  />
                </div>
              </Reveal>
            )}

            {/* Carfax report */}
            {car.carfax_url && (
              <Reveal>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Carfax 报告
                  </h2>
                  {car.carfax_summary && (
                    <p className="mt-2 font-mono text-sm text-muted-foreground">
                      {car.carfax_summary}
                    </p>
                  )}
                  <a
                    href={car.carfax_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted/70"
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    在 Carfax 查看完整报告
                  </a>
                </div>
              </Reveal>
            )}

            {/* Vehicle history: model-level NHTSA reference, tucked away at the bottom */}
            {car.vin && car.make && car.model && car.year > 0 && (
              <Reveal className="mt-8">
                <VehicleHistoryPanel
                  make={car.make}
                  model={car.model}
                  year={car.year}
                />
              </Reveal>
            )}
          </div>

          {/* Right: Seller card */}
          {/* 侧栏比视口高时 sticky 会钉住顶部、底部按钮永远够不到;
              限制最大高度让侧栏内部可滚(隐藏滚动条,滚轮悬停即可滚动) */}
          <div
            className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
          >
            <div className="rounded-xl bg-card p-4">
              <h3 className="font-mono text-sm font-semibold">卖家信息</h3>
              <Link
                href={userLink(car.seller_id)}
                onClick={(e) => {
                  if (overlayEnabled) {
                    e.preventDefault();
                    openUser(car.seller_id);
                  }
                }}
                className="mt-3 flex items-center gap-3 py-2 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  <img src={avatarUrl(car.profiles?.avatar_url, car.seller_name)} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium underline-offset-2 hover:underline">
                    {car.seller_name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {car.profiles?.is_system ? "系统检索车源" : car.profiles?.account_type === "dealer" ? "认证车行" : "个人卖家"} · 查看主页 →
                  </p>
                </div>
              </Link>
              {!storeAddress && (
                <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" strokeWidth={1.5} />
                  {car.location}
                </p>
              )}

              {storeAddress && (
                <OpenInMaps
                  target={{
                    address: storeAddress.address,
                    lat: storeAddress.lat,
                    lng: storeAddress.lng,
                    name: car.seller_name,
                  }}
                >
                  <button
                    type="button"
                    className="mt-1.5 flex items-start gap-1.5 text-left font-mono text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span>{storeAddress.address}</span>
                    <ExternalLink className="mt-0.5 h-2.5 w-2.5 shrink-0" strokeWidth={1.5} />
                  </button>
                </OpenInMaps>
              )}

              {car.profiles?.is_system && (
                <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    本车源由系统自动从公开车行网站检索汇总，非平台合作车源，价格与状态以原站为准，请致电核实
                  </p>
                  {car.source_url && (
                    <a
                      href={car.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      查看原始车源{sourceHost ? ` · ${sourceHost}` : ""}
                    </a>
                  )}
                </div>
              )}

              {/* 桌面在卖家信息与按钮组之间加一条分隔线,区分"信息区/操作区"(手机不变) */}
              <div className="mt-4 space-y-2 md:mt-3 md:border-t md:border-border md:pt-3">
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

                {/* 浮层模式下 收藏/对比/分享 在顶栏(CarSheetActions),此处不再重复 */}
                {!embedded &&
                  (user ? (
                    <Button
                      variant="secondary"
                      className="w-full gap-1.5 font-mono text-xs"
                      onClick={toggleFavorite}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${isFavorited ? "fill-current" : ""}`}
                        strokeWidth={1.5}
                      />
                      {isFavorited ? "已收藏" : "收藏"}
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button
                        variant="secondary"
                        className="w-full gap-1.5 font-mono text-xs"
                      >
                        <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                        登录后收藏
                      </Button>
                    </Link>
                  ))}

                {user && user === car.seller_id && (
                  <Link href={carEditLink(carId)}>
                    <Button variant="secondary" className="w-full gap-1.5 font-mono text-xs">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      编辑车辆
                    </Button>
                  </Link>
                )}

                {user && user === car.seller_id && car.status === "removed" && (
                  <Button
                    className="w-full gap-1.5 font-mono text-xs"
                    disabled={renewing}
                    onClick={async () => {
                      setRenewing(true);
                      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                      const { error } = await supabase
                        .from("cars")
                        .update({ status: "active", expires_at: expiresAt })
                        .eq("id", carId);
                      setRenewing(false);
                      if (!error) {
                        setCar((prev) => (prev ? { ...prev, status: "active", expires_at: expiresAt } : prev));
                      }
                    }}
                  >
                    {renewing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    {car.expires_at && new Date(car.expires_at).getTime() < Date.now() ? "续期并重新上架" : "重新上架"}
                  </Button>
                )}

                {(!car.profiles?.is_system || car.profiles?.claimed_by) &&
                  (user ? (
                    user !== car.seller_id && (
                      <Button
                        variant="outline"
                        className="w-full gap-1.5 font-mono text-xs"
                        onClick={async () => {
                          // 移动端:先开 drawer 立即反馈,会话在后台确保存在
                          // (否则首次点击要等 1-2 个网络往返 drawer 才出现);
                          // 桌面端保持先建会话再跳消息页
                          if (overlayEnabled) setChatOpen(true);
                          const { data: existing } = await supabase
                            .from("conversations")
                            .select("id")
                            .eq("car_id", carId)
                            .eq("buyer_id", user)
                            .eq("seller_id", car.seller_id)
                            .maybeSingle();
                          let convId = existing?.id as string | undefined;
                          if (!convId) {
                            const { data: created } = await supabase
                              .from("conversations")
                              .insert({
                                car_id: carId,
                                buyer_id: user,
                                seller_id: car.seller_id,
                              })
                              .select("id")
                              .single();
                            convId = created?.id;
                          }
                          if (overlayEnabled) {
                            if (convId) setChatConvId(convId);
                            else setChatOpen(false);
                          } else {
                            router.push(`/messages/${car.seller_id}`);
                          }
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
                  ))}

                <Button
                  variant="secondary"
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

                {!embedded && (
                  <Button
                    variant="secondary"
                    className="w-full gap-1.5 font-mono text-xs"
                    onClick={() => {
                      if (inCompare) removeFromCompare(carId);
                      else addToCompare(carId);
                    }}
                  >
                    {inCompare ? (
                      <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2} />
                    ) : (
                      <GitCompare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    {inCompare ? "已加入对比" : "加入对比"}
                  </Button>
                )}

                {!embedded && (
                  <Button
                    variant="secondary"
                    className="w-full gap-1.5 font-mono text-xs"
                    onClick={async () => {
                      const { nativeShare } = await import("@/lib/capacitor");
                      const shared = await nativeShare({
                        title: car.title_zh,
                        text: `${car.title_zh} - ${formatPrice(car.price)}`,
                        url: shareUrl,
                      });
                      if (!shared) {
                        navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {copied ? "已复制链接" : "分享"}
                  </Button>
                )}

                {/* 二维码分享仅电脑版 */}
                <div className="hidden md:block">
                  <QrShare
                    url={shareUrl}
                    title={car.title_zh || car.title}
                  />
                </div>

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

            {/* 车辆位置:地址 + OpenStreetMap 地图 + 一键导航 */}
            {(storeAddress || (car.lat != null && car.lng != null)) && (
              <div className="mt-4 rounded-xl bg-card p-4">
                <h3 className="font-mono text-sm font-semibold">
                  {storeAddress ? "门店地址" : "车辆位置"}
                </h3>
                <p className="mt-1.5 flex items-start gap-1.5 font-mono text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {storeAddress?.address || `${car.location_zh} · ${car.location}`}
                </p>
                {(storeAddress?.lat ?? car.lat) != null &&
                  (storeAddress?.lng ?? car.lng) != null && (
                    <div className="mt-3">
                      <StoreMap
                        markers={[
                          {
                            lat: (storeAddress?.lat ?? car.lat) as number,
                            lng: (storeAddress?.lng ?? car.lng) as number,
                            name: car.seller_name,
                            address: storeAddress?.address || car.location_zh,
                          },
                        ]}
                        className="h-44 w-full overflow-hidden rounded-xl bg-muted"
                      />
                    </div>
                  )}
                <OpenInMaps
                  target={
                    storeAddress
                      ? {
                          address: storeAddress.address,
                          lat: storeAddress.lat,
                          lng: storeAddress.lng,
                          name: car.seller_name,
                        }
                      : { lat: car.lat, lng: car.lng, name: car.seller_name }
                  }
                >
                  <Button
                    variant="secondary"
                    className="mt-3 w-full gap-1.5 font-mono text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
                    使用地图打开
                  </Button>
                </OpenInMaps>
              </div>
            )}

            {/* 预估月供:摘要卡片,点「计算」打开完整计算器 drawer */}
            {car.price > 0 && (
              <div className="mt-4 rounded-xl bg-card p-4">
                <h3 className="font-mono text-sm font-semibold">预估月供</h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  用计算器估算你的每月还款
                </p>
                <div className="mt-3 rounded-xl bg-muted/50 p-4">
                  <div className="border-l-2 border-foreground pl-3">
                    <p className="font-mono text-xl font-bold">
                      ${estimateMonthlyPayment(car.price).toLocaleString()}/月*
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      按 {(LOAN_ASSUMPTION.apr * 100).toFixed(1)}% APR 估算*
                    </p>
                  </div>
                  <Button
                    className="mt-4 w-full font-mono text-xs"
                    onClick={() => setLoanOpen(true)}
                  >
                    计算
                  </Button>
                  <NonModalDrawer open={loanOpen} onOpenChange={setLoanOpen}>
                    <div className="flex items-center justify-between px-4 pb-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setLoanOpen(false)}
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <span className="font-mono text-sm font-semibold">月供计算器</span>
                      <div className="h-8 w-8" />
                    </div>
                    <div className="overflow-y-auto px-4 pb-8">
                      <LoanCalculator price={car.price} />
                    </div>
                  </NonModalDrawer>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
                    *按 0 首付 / {LOAN_ASSUMPTION.months} 期估算,实际以贷款机构批核为准
                  </p>
                </div>
              </div>
            )}

            {/* Safety tips */}
            <div className="mt-4 rounded-xl bg-card p-4">
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
        {/* 车行评价:卖家为车行时展示 */}
        {car.profiles?.account_type === "dealer" && (
          <DealerReviews dealerId={car.seller_id} />
        )}

        {/* 车主口碑:社区车评 */}
        <ModelReviews make={car.make} model={car.model} />

        {/* Comments — no scroll reveal: interactive content must never start
            hidden (Safari IntersectionObserver can fail on tall sections) */}
        <CommentSection carId={carId} />

        {/* Similar cars */}
        {similarCars.length > 0 && (
          <section
            className="mt-10 border-t border-border pt-6"
          >
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              相似车辆推荐
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similarCars.map((c) => (
                <Reveal key={c.id}>
                  {/* hover 微上移放在内层 div:Reveal 的 motion 会写 inline transform,
                      直接加在同一层会互相覆盖;lg: 前缀确保只作用于桌面 */}
                  <div className="transition-transform duration-150 ease-out lg:hover:-translate-y-0.5">
                    <CarCard
                      car={c}
                      priceInsight={getPriceInsight(c, makePool)}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}
        {/* Spacer for mobile bottom action bar */}
        <div className="h-16 md:hidden" />
      </main>
      {showChrome && <Footer />}
      {showChrome && <BackToTop />}

      {/* Mobile sticky bottom action bar */}
      <div
        className={
          embedded
            ? "sticky inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm md:hidden"
            : "fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm md:hidden"
        }
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="font-mono text-lg font-bold">{formatPrice(car.price)}</p>
            {insight && (
              <span
                className={`rounded-full px-1 py-0.5 font-mono text-[10px] font-semibold ${insight.className}`}
              >
                {insight.label}
              </span>
            )}
            {car.original_price && car.original_price > car.price && (
              <span className="rounded-full px-1 py-0.5 font-mono text-[10px] font-semibold bg-green-500/10 text-green-600">
                -{Math.round((1 - car.price / car.original_price) * 100)}%
              </span>
            )}
          </div>
        </div>
        {/* 浮层模式下 收藏/分享 已在顶栏,底部只留 价格 + 联系卖家 */}
        {!embedded && (
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={toggleFavorite}
          >
            <Heart
              className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
              strokeWidth={1.5}
            />
          </Button>
        )}
        {!embedded && (
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={async () => {
              const { nativeShare } = await import("@/lib/capacitor");
              const shared = await nativeShare({
                title: car.title_zh,
                text: `${car.title_zh} - ${formatPrice(car.price)}`,
                url: shareUrl,
              });
              if (!shared) {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            <Share2 className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        )}
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
              <Button variant="secondary" size="sm" className="flex-1 font-mono text-xs">
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

      {/* 移动端:与卖家的对话直接在 drawer 里进行 */}
      <NonModalDrawer open={chatOpen} onOpenChange={setChatOpen}>
        <div className="flex h-[70dvh] flex-col overflow-hidden">
          {chatConvId && user ? (
            <ChatThread
              conversationId={chatConvId}
              currentUserId={user}
              otherUsername={car.seller_name}
              onBack={() => setChatOpen(false)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
              正在打开对话…
            </div>
          )}
        </div>
      </NonModalDrawer>
    </div>
  );
}
