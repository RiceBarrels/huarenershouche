"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import nextDynamic from "next/dynamic";
import { useRouteParams } from "@/lib/use-route-params";
import Link from "@/components/localized-navigation";
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
  Languages,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addToCompare, removeFromCompare, isInCompare } from "@/lib/compare";
import {
  timeAgo,
  estimateMonthlyPayment,
  LOAN_ASSUMPTION,
  approxMileageMi,
  approxPriceUsd,
  formatCarMileage,
  formatCarPrice,
} from "@/lib/format";
import { MAX_UNITS_PER_USD, MIN_UNITS_PER_USD, carCurrency, carPriceUsd } from "@/lib/currency";
import { SITE_URL } from "@/lib/seo-pages";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { avatarUrl } from "@/lib/avatar";
import { ProfileBadges } from "@/components/profile-badges";
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
import { trackCarView } from "@/lib/analytics/client";
import { useI18n } from "@/components/i18n-provider";
import { carTitle, carLocation } from "@/lib/i18n";
import { localizeCarfaxSummary } from "@/lib/i18n/carfax";
import { normTag } from "@/lib/i18n/hashtags";
import { legacyOriginal } from "@/lib/i18n/content/resolve";
import {
  CAR_LIST_COLUMN_SETS,
  CAR_PROFILE_EMBED,
  PUBLIC_CAR_COLUMN_SETS,
} from "@/lib/i18n/content/columns";
import { queryWithColumnFallback } from "@/lib/supabase-compat";
import { useBundleRow, useLocalized } from "@/hooks/use-localized";
import { useTermLabels } from "@/hooks/use-term-labels";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import { sellerSpeaksLocale } from "@/lib/i18n/languages";
import { languageList } from "@/components/language-picker";
import { useOverlay } from "@/components/car-overlay-provider";
import { QrShare } from "@/components/qr-share";
import { ContactAppButtons, useSellerContactApps } from "@/components/contact-app-buttons";
import { hasContactApps } from "@/lib/contact-apps";
import { TradeSafetyCard } from "@/components/trade-safety-card";
import { TitleStatusBadge } from "@/components/title-status-badge";
import { deriveCountry } from "@/lib/postal";
import { DealerFinancingTags } from "@/components/dealer-financing-tags";
import { CarConditionChecklist } from "@/components/car-condition-checklist";
import { isConditionEmpty } from "@/lib/car-condition";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar, DbComment, PublicCar } from "@/lib/types";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;
function isVideo(url: string): boolean {
  return VIDEO_RE.test(url);
}

// leaflet 不能 SSR,按需加载
const StoreMap = nextDynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false },
);

interface CarDetailProps {
  // 服务端预取的公开整行(不含电话)/ 浮层传入的列表精简行 / not-found 页车主补拉的行
  initialCar?: PublicCar | null;
  // 服务端预取的首批评论(随页面 SSR 直出)
  initialComments?: DbComment[];
  // embedded:在移动端浮层里内嵌打开(隐藏 Header/Footer,不占满整屏高度)
  embedded?: boolean;
  onClose?: () => void;
  // 重新上架成功(not-found 页据此收起「已下架」提示条)
  onRelisted?: () => void;
}

// 详情整行:公开列 + 卖家资料(不含电话,登录后点开联系方式再单独取);从新到旧多组列集合
// (title-status.sql / i18n-v2.sql / car-currency.sql 各自可能还没执行)
const CAR_ROW_SELECTS = PUBLIC_CAR_COLUMN_SETS.map((cols) => `${cols}, ${CAR_PROFILE_EMBED}`);
// 相似车渲染成卡片:列表列集 + 卖家资料(车行 / 系统检索徽标);car-currency.sql 未执行时第二组去掉币种 / 单位
const CAR_CARD_SELECTS = CAR_LIST_COLUMN_SETS.map((cols) => `${cols}, ${CAR_PROFILE_EMBED}`);
// 市场比价池只用到这几列(最多 150 台,不拉卡片列);币种 / 里程单位用于折算成美元 / 英里再比价
const PRICE_POOL_SELECTS = [
  "id, make, model, year, price, mileage, status, vin, currency, mileage_unit",
  "id, make, model, year, price, mileage, status, vin",
] as const;
const NO_FEATURES: readonly string[] = [];

/**
 * 拉一辆车的详情整行。可见性交给 RLS:公开车源人人可读,已下架的只有车主 / 认领者 / 管理员可读。
 * title-status.sql / i18n-v2.sql 未执行(新列不存在)时依次退回旧列集。failed = 请求本身出错(网络等),区别于「查无此车」。
 */
export async function fetchCarRow(id: string): Promise<{ row: PublicCar | null; failed: boolean }> {
  const query = (columns: string) =>
    supabase.from("cars").select(columns).eq("id", id).maybeSingle();
  const { data, error } = await queryWithColumnFallback(query, CAR_ROW_SELECTS);
  return { row: error ? null : ((data as PublicCar | null) ?? null), failed: !!error };
}

/**
 * 传入的行能否直接当详情整行用(SSR / not-found 取的都是):要有原文列,且带完整卖家资料
 * (CAR_PROFILE_EMBED,以最后一列 languages 为准;embed 结果为 null = 查无卖家,补拉也一样)。
 * 浮层传入的列表行 —— 列表列集 / browse_cars 不带原文,select("*") 带原文但 profiles 缺失或只有部分列 —— 都要补拉
 */
function isDetailRow(car: PublicCar): boolean {
  return (
    "description_original" in car &&
    "profiles" in car &&
    (car.profiles == null || "languages" in car.profiles)
  );
}

interface FeatureChip {
  key: string;
  label: string;
}

/** 配置标签一个术语只留一条(同一配置的中英文双写合并),保持首次出现的顺序 */
function uniqueByKey(items: readonly FeatureChip[]): FeatureChip[] {
  const seen = new Set<string>();
  const chips: FeatureChip[] = [];
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    chips.push(item);
  }
  return chips;
}

export default function CarDetailPage(props: CarDetailProps = {}) {
  const params = useRouteParams<{ id: string }>();
  // initialCar(浮层传入 / 服务端预取)优先:useParams() 是整棵路由树共用的,布局里渲染的浮层
  // 会读到当前页面的 [id](/car/A 上点相似车 B、/user/U 上点车都会错成 A / U);
  // 只有静态导出的 /car?id= 整页没有 initialCar,才靠路由参数
  const carId = props.initialCar?.id || (params.id as string) || "";
  // 按 carId 重新挂载:静态导出页内从 A 跳到 B 时,A 的收藏 / 门店 / 相似车等状态不会带到 B
  return <CarDetailView key={carId} {...props} carId={carId} />;
}

function CarDetailView({
  carId,
  initialCar,
  initialComments,
  embedded = false,
  onRelisted,
}: CarDetailProps & { carId: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const showChrome = !embedded;
  const [car, setCar] = useState<PublicCar | null>(initialCar ?? null);
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
  // 重新上架被拒:系统审核 / 管理员下架的车,车主不能自行恢复(触发器抛 listing_blocked)
  const [relistBlocked, setRelistBlocked] = useState(false);
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

  // 分享用规范公网地址(App 内 origin 是 capacitor://localhost、浮层内 href 是列表页,均不可分享);
  // 带显示语言前缀(原生端同样取显示语言),对方打开看到同一语言
  const shareUrl = `${SITE_URL}/${locale}/car/${carId}`;
  const [storeAddress, setStoreAddress] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
  const mobileGalleryRef = useRef<HTMLDivElement>(null);

  // 以下副作用各按 carId 跑一次。只有 (a) 整行补拉是有条件的:
  // SSR / not-found 已给整行时不再请求,其余副作用照常基于 initialCar 执行。

  // (a) 整行:没有 initialCar(静态导出 /car?id=),或传入的是浮层 / 列表精简行(见 isDetailRow)
  const needsRow = !initialCar || !isDetailRow(initialCar);
  useEffect(() => {
    if (!needsRow || !carId) return;
    let cancelled = false;
    fetchCarRow(carId).then(({ row, failed }) => {
      if (cancelled) return;
      // 网络失败时保留浮层传入的精简行,别把已显示的车清空
      if (row || !failed) setCar(row);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [carId, needsRow]);

  const hasRow = car !== null;

  // (b) 浏览量 +1(RPC 绕过 RLS),成功后本地计数同步
  useEffect(() => {
    if (!hasRow) return;
    let cancelled = false;
    supabase.rpc("increment_views", { car_id: carId }).then(({ error }) => {
      if (cancelled || error) return;
      setCar((prev) => (prev ? { ...prev, views_count: (prev.views_count || 0) + 1 } : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [carId, hasRow]);

  // (c) 有行(SSR / 浮层传入 / 补拉)就记一次:访问统计、最近浏览、价格快照。
  // 访问统计的车辆浏览(手机浮层打开车辆不改 URL,只能在这里打点);取最新界面语言,但不让 effect 随语言重跑
  const reportCarView = useEffectEvent((id: string) => trackCarView(id, locale));
  const recordPriceSnapshot = useEffectEvent((id: string) => {
    if (car) recordPrice(id, car.title, car.price);
  });
  useEffect(() => {
    if (!hasRow) return;
    reportCarView(carId);
    addRecentlyViewed(carId);
    recordPriceSnapshot(carId);
  }, [carId, hasRow]);

  // (d) 车行卖家：取门店地址，卖家信息里展示并可点击打开地图(精简行没带卖家资料时,补拉到整行后再取)
  const dealerSellerId = car?.profiles?.account_type === "dealer" ? car.seller_id : null;
  useEffect(() => {
    if (!dealerSellerId) return;
    let cancelled = false;
    supabase
      .from("dealer_stores")
      .select("address, lat, lng")
      .eq("owner_id", dealerSellerId)
      .limit(1)
      .maybeSingle()
      .then(({ data: store }) => {
        if (!cancelled && store?.address) setStoreAddress(store);
      });
    return () => {
      cancelled = true;
    };
  }, [dealerSellerId]);

  // (e) 同品牌比价池 + 相似车:只用到行里的品牌 / 车型 / 年份 / 价格(精简行也有)
  const make = car?.make;
  const model = car?.model;
  const year = car?.year;
  // 价差比较一律按折合美元(加元车源和美元车源混在一起时不直接比原值)
  const price = car ? carPriceUsd(car) : undefined;
  useEffect(() => {
    if (!make || year === undefined || price === undefined) return;
    let cancelled = false;
    (async () => {
      // 同品牌车源池：用于市场比价（getPriceInsight / findComparables）
      const { data: pool } = await queryWithColumnFallback(
        (cols) =>
          supabase
            .from("cars")
            .select(cols)
            .eq("status", "active")
            .eq("owner_hidden", false)
            .eq("make", make)
            .limit(150),
        PRICE_POOL_SELECTS
      );
      if (cancelled) return;
      setMakePool((pool as unknown as DbCar[] | null) || []);

      // 相似车：优先同 make+model（±2 年）按上架时间新到旧，
      // 不足 4 台补同 make 按 |价差| 从小到大，再不足补 ±30% 价格区间
      const { data: sameMake } = await queryWithColumnFallback(
        (select) =>
          supabase
            .from("cars")
            .select(select)
            .eq("status", "active")
            .eq("owner_hidden", false)
            .eq("make", make)
            .neq("id", carId)
            .order("created_at", { ascending: false })
            .limit(24),
        CAR_CARD_SELECTS
      );
      const sameMakeCars = (sameMake as unknown as DbCar[] | null) || [];
      const modelKey = (model || "").toLowerCase().trim();
      const tier1 = modelKey
        ? sameMakeCars.filter(
            (c) =>
              (c.model || "").toLowerCase().trim() === modelKey &&
              Math.abs(c.year - year) <= 2
          )
        : [];
      // 电议车（price=0）按价差排序会把最便宜的车排最前，改按年份接近度
      const tier2 = sameMakeCars
        .filter((c) => !tier1.some((t) => t.id === c.id))
        .sort((a, b) =>
          price > 0
            ? Math.abs(carPriceUsd(a) - price) - Math.abs(carPriceUsd(b) - price)
            : Math.abs(a.year - year) - Math.abs(b.year - year)
        );
      let picked = [...tier1, ...tier2].slice(0, 4);
      if (picked.length < 4 && price > 0) {
        // 库里是各车自己的币种:原值区间放宽到能覆盖所有支持币种的车源(美元价 × 汇率最小 / 最大值,
        // lib/currency.ts),拉回来后再按折合美元精确筛 ±30%
        const { data: priceSimilar } = await queryWithColumnFallback(
          (select) =>
            supabase
              .from("cars")
              .select(select)
              .eq("status", "active")
              .eq("owner_hidden", false)
              .neq("id", carId)
              .gte("price", Math.floor(price * 0.7 * MIN_UNITS_PER_USD))
              .lte("price", Math.ceil(price * 1.3 * MAX_UNITS_PER_USD))
              .limit(16),
          CAR_CARD_SELECTS
        );
        const extra = ((priceSimilar as unknown as DbCar[] | null) || []).filter((c) => {
          const usd = carPriceUsd(c);
          return usd >= price * 0.7 && usd <= price * 1.3 && !picked.some((p) => p.id === c.id);
        });
        picked = [...picked, ...extra].slice(0, 4);
      }
      if (!cancelled) setSimilarCars(picked);
    })();
    return () => {
      cancelled = true;
    };
  }, [carId, make, model, year, price]);

  // (f) 降价监控状态(localStorage)与收藏(收藏始终归属真实用户 authId)
  useEffect(() => {
    setWatching(isWatching(carId));
    setWatchedPrice(getWatchedPrice(carId));
  }, [carId]);
  useEffect(() => {
    if (!authId) return;
    let cancelled = false;
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", authId)
      .eq("car_id", carId)
      .maybeSingle()
      .then(({ data: fav }) => {
        if (!cancelled) setIsFavorited(!!fav);
      });
    return () => {
      cancelled = true;
    };
  }, [carId, authId]);

  // 描述:卖家原文(任何语言)+ 当前界面语言的译文(i18n_bundle);SSR 由 ContentI18nProvider 预置,首屏即最终文本
  const desc = useLocalized("car", car?.id, { description: car ? legacyOriginal(car) : null });
  // 配置(与 resolveCarView 同一口径):bundle 有配置标签就用(已按术语去重并本地化);
  // 没有(浮层首帧 / 原生端 / SQL 未上线)时按卖家原始标签查术语表
  const bundleFeatures = useBundleRow("car", car?.id)?.x?.features;
  const bundled = bundleFeatures && bundleFeatures.length > 0 ? bundleFeatures : null;
  const rawFeatures = car?.features_original ?? car?.features ?? NO_FEATURES;
  const termLabels = useTermLabels("feature", bundled ? NO_FEATURES : rawFeatures);

  // 电话不随 SSR / 详情行下发(不进 RSC payload):登录用户点开联系方式时再单独取
  const phoneMissing = car !== null && car.phone === undefined;
  useEffect(() => {
    if (!contactVisible || !user || !phoneMissing) return;
    let cancelled = false;
    supabase
      .from("cars")
      .select("phone")
      .eq("id", carId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        // 取失败就收起,用户可以再点一次
        if (error) {
          setContactVisible(false);
          return;
        }
        const phone = (data as { phone: string | null } | null)?.phone ?? null;
        setCar((prev) => (prev ? { ...prev, phone } : prev));
      });
    return () => {
      cancelled = true;
    };
  }, [carId, contactVisible, user, phoneMissing]);
  const phoneLoading = contactVisible && phoneMissing;
  // 卖家的即时通讯联系方式:与电话一样不随 SSR 下发,已登录访客在客户端单独取(没填 / SQL 未执行为空)
  const sellerContactApps = useSellerContactApps(car?.seller_id, !!user);
  // 手机底栏放了即时通讯按钮时让出分享按钮的位置(分享在卖家卡片的操作列表里仍可用),保证底栏宽度不变
  const barHasContactApp = !!user && hasContactApps(sellerContactApps);
  const revealedPhone = contactVisible && !phoneLoading ? (car?.phone ?? null) : null;

  // 市场比价：与同品牌车源池对比（里程修正后的同类均价）;比价只读价格 / 里程 / 年份等公开列
  // 非美元 / 公里车源附「≈」折合美元 / 英里(美元 / 英里车源为 null,不显示);里程单位按界面语言
  const approxPrice = car ? approxPriceUsd(car) : null;
  const approxMileage = car ? approxMileageMi(car, t) : null;
  const insight = useMemo(
    () => (car ? getPriceInsight(car as DbCar, makePool) : null),
    [car, makePool]
  );
  const comparables = useMemo(
    () => (car ? findComparables(car as DbCar, makePool).cars : []),
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

  if (loading && carId) {
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
              {t("车辆不存在或已下架")}
            </p>
            <Link href="/">
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 font-mono text-xs"
              >
                {t("返回首页")}
              </Button>
            </Link>
          </div>
        </main>
        {showChrome && <Footer />}
      </div>
    );
  }

  // 标题是确定性的(zh 用 title_zh,其余用 title),SSR 与客户端一致,不会闪
  const title = carTitle(car, locale);
  const carfaxText = localizeCarfaxSummary(car.carfax_summary, t);
  // 「显示原文」时配置也切回卖家原始标签(逐字);否则一个术语一条,显示当前语言标签。
  // 未归并的标签(r: 键)bundle 给的是原文,与 useTermLabels 的回退一致走 UI 词典(倒车影像 → Backup camera)
  const featureChips: FeatureChip[] = desc.showOriginal
    ? rawFeatures.filter((raw) => raw.trim()).map((raw, i) => ({ key: `${i}:${raw}`, label: raw }))
    : uniqueByKey(
        bundled
          ? bundled.map((f) => (f.key.startsWith("r:") ? { key: f.key, label: t(f.label) } : f))
          : rawFeatures.filter((raw) => normTag(raw) !== null).map((raw) => termLabels[raw]),
      );

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
        <Badge variant="secondary" className="font-mono text-[10px] font-medium">{t("系统检索")}</Badge>
      ) : car.profiles?.account_type === "dealer" ? (
        <Badge variant="secondary" className="font-mono text-[10px] font-medium">{t("车行")}</Badge>
      ) : (
        <Badge variant="outline" className="bg-background/80 font-mono text-[10px] font-medium backdrop-blur-sm">{t("个人")}</Badge>
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
                            alt={i === 0 ? title : ""}
                            loading={i === 0 ? "eager" : "lazy"}
                            className="h-full w-full cursor-zoom-in object-cover"
                            onClick={() => setLightboxOpen(true)}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-sm text-muted-foreground">
                      {t("暂无图片")}
                    </div>
                  )}
                </div>
                {sourceBadge}
                {allImages.length > 1 && (
                  <>
                    <button
                      aria-label={t("上一张")}
                      onClick={() => scrollGallery(-1)}
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm active:bg-background"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      aria-label={t("下一张")}
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
                      {t("({n}) 张照片", { n: allImages.length })}
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
                      alt={title}
                      className="h-full w-full cursor-zoom-in object-cover"
                      onClick={() => setLightboxOpen(true)}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
                    {t("暂无图片")}
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
                      aria-label={t("上一张")}
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentImage((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                      }}
                      aria-label={t("下一张")}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <div
                      className="absolute bottom-3 left-3 flex cursor-pointer items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm"
                      onClick={() => setLightboxOpen(true)}
                    >
                      <Eye className="h-3 w-3" strokeWidth={1.5} />
                      {t("({n}) 张照片", { n: allImages.length })}
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
                      aria-label={t("第 {n} 张", { n: i + 1 })}
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
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tabular-nums md:text-3xl">
                  {formatCarPrice(car, car.price)}
                </span>
                {/* 非美元车源附折合美元(固定近似汇率,lib/currency.ts);星号对应价格行下方的说明 */}
                {approxPrice && (
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    ≈ {approxPrice}*
                  </span>
                )}
                {insight && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold ${insight.className}`}
                  >
                    {t(insight.label)}
                  </span>
                )}
                {car.original_price && car.original_price > car.price && (
                  <span className="rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold bg-green-500/10 text-green-600">
                    -{Math.round((1 - car.price / car.original_price) * 100)}%
                  </span>
                )}
                {car.original_price && car.original_price > car.price && (
                  <span className="font-mono text-sm text-muted-foreground line-through">
                    {formatCarPrice(car, car.original_price)}
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
                    {car.price < watchedPrice ? t("降") : t("涨")}
                    {formatCarPrice(car, Math.abs(car.price - watchedPrice))}
                  </span>
                )}
                {/* 桌面把浏览/收藏/上架时间这组次要元数据推到行尾,与价格拉开视觉分组(手机保持顺排换行) */}
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground md:ml-auto">
                  {t("{n} 次浏览", { n: car.views_count || 0 })}
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Heart className="h-3 w-3" strokeWidth={1.5} />
                  {t("{n} 人喜欢", { n: car.favorites_count || 0 })}
                </span>
                {/* 相对时间在服务端渲染与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
                <span
                  className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  <Calendar className="h-3 w-3" strokeWidth={1.5} />
                  {t("{time}上架", { time: timeAgo(car.created_at, t) })}
                </span>
              </div>
              {/* 汇率说明直接写出来(手机 / App 没有悬停提示) */}
              {approxPrice && (
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                  * {t("按固定近似汇率换算，仅供参考")}
                </p>
              )}
            </div>

            <PriceHistoryChart carId={carId} currency={carCurrency(car)} />

            {/* 市场价位:min—avg—max 价位条 + 当前车价 marker */}
            <MarketPosition car={car as DbCar} comparables={comparables} insight={insight} />

            <Separator className="my-6" />

            {/* Specs data sheet — ssrVisible:SSR 首屏即可见,不靠滚动动画显现 */}
            <Reveal ssrVisible>
              {/* 桌面参数卡间距略放宽,与上下楼层留白节奏一致(手机保持 gap-2) */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {t("年份")}
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
                      {t("里程")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium tabular-nums">
                    {formatCarMileage(car, t)}
                  </p>
                  {approxMileage && (
                    <p className="font-mono text-[10px] tabular-nums text-muted-foreground">≈ {approxMileage}</p>
                  )}
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Fuel
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {t("燃油")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {t(car.fuel_type)}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Settings
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {t("变速箱")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {t(car.transmission)}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <Palette
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {t("外观颜色")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {car.exterior_color ? t(car.exterior_color) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin
                      className="h-3.5 w-3.5 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {t("所在地")}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-medium">
                    {carLocation(car, locale)}
                  </p>
                </div>
              </div>
              {/* 产权状态:卖家填了才显示,点开看解释(title-status.sql 未执行时没有该字段,不渲染);
                  澳新两项附 PPSR 官网链接,国家按坐标 / location 读时推断 */}
              <TitleStatusBadge value={car.title_status} country={deriveCountry(car)} />
            </Reveal>

            {car.vin && (
              <Reveal ssrVisible>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("VIN 认证")}
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

            {/* Features */}
            {featureChips.length > 0 && (
              <Reveal ssrVisible>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("车辆配置")}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featureChips.map((f) => (
                      <Badge
                        key={f.key}
                        variant="outline"
                        className="font-mono text-[11px]"
                      >
                        {f.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* 车况清单:只列卖家填了的项,整张没填(或 car-condition.sql 未执行、没有该字段)不显示 */}
            {!isConditionEmpty(car.condition) && (
              <Reveal ssrVisible>
                <Separator className="my-6" />
                <CarConditionChecklist value={car.condition} />
              </Reveal>
            )}

            {/* Description — 原文或译文直出(无骨架);译文时附「已从 X 翻译 · 显示原文」,切换同时作用于上方配置 */}
            {(desc.text.description || desc.original.description) && (
              <Reveal ssrVisible>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("车辆描述")}
                  </h2>
                  <TranslationNotice
                    view={desc}
                    originalUncertain={car.original_uncertain}
                    className="mt-2"
                  />
                  <LocalizedText
                    view={desc}
                    field="description"
                    as="p"
                    className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground"
                  />
                </div>
              </Reveal>
            )}

            {/* Carfax report */}
            {car.carfax_url && (
              <Reveal ssrVisible>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("Carfax 报告")}
                  </h2>
                  {carfaxText && (
                    <p className="mt-2 font-mono text-sm text-muted-foreground">
                      {carfaxText}
                    </p>
                  )}
                  <a
                    href={car.carfax_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted/70"
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {t("在 Carfax 查看完整报告")}
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
              <h3 className="font-mono text-sm font-semibold">{t("卖家信息")}</h3>
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
                  <p className="flex items-center gap-1 font-mono text-sm font-medium underline-offset-2 hover:underline">
                    {car.seller_name}
                    <ProfileBadges
                      verifiedDealer={
                        car.profiles?.account_type === "dealer" ||
                        (!!car.profiles?.is_system && !!car.profiles?.claimed_by)
                      }
                      system={car.profiles?.is_system}
                      className="h-3.5 w-3.5"
                    />
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {t(car.profiles?.is_system ? "系统检索车源" : car.profiles?.account_type === "dealer" ? "认证车行" : "个人卖家")} · {t("查看主页")} →
                  </p>
                </div>
              </Link>
              {!storeAddress && (
                <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" strokeWidth={1.5} />
                  {carLocation(car, locale)}
                </p>
              )}
              {/* 卖家沟通语言;会说当前界面语言时高亮提示 */}
              {!!car.profiles?.languages?.length && (
                <p className="mt-1.5 flex items-start gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Languages className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
                  <span>
                    {languageList(car.profiles.languages)}
                    {locale !== "zh" && sellerSpeaksLocale(car.profiles.languages, locale) && (
                      <span className="ml-1.5 rounded-sm bg-primary/15 px-1 py-px text-[10px] font-medium text-foreground">
                        {t("可用你的语言沟通")}
                      </span>
                    )}
                  </span>
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

              {/* 车行贷款 / 付款方式标签(卖家门店自填)+ 合规提示;没有标签不渲染 */}
              <DealerFinancingTags key={car.seller_id} sellerId={car.seller_id} carId={car.id} />

              {car.profiles?.is_system && (
                <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {t("本车源由系统自动从公开车行网站检索汇总，非平台合作车源，价格与状态以原站为准，请致电核实")}
                  </p>
                  {car.source_url && (
                    <a
                      href={car.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      {t("查看原始车源")}{sourceHost ? ` · ${sourceHost}` : ""}
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
                    {phoneLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    {contactVisible && !phoneLoading
                      ? car.phone || t("未提供电话")
                      : t("查看联系方式")}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button className="w-full gap-1.5 font-mono text-xs">
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("登录查看联系方式")}
                    </Button>
                  </Link>
                )}

                {/* 即时通讯 / 短信(只给已登录访客,只显示卖家填了的) */}
                {user && (
                  <ContactAppButtons
                    variant="sidebar"
                    apps={sellerContactApps}
                    carId={carId}
                    title={title}
                    shareUrl={shareUrl}
                    phone={revealedPhone}
                  />
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
                      {isFavorited ? t("已收藏") : t("收藏")}
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button
                        variant="secondary"
                        className="w-full gap-1.5 font-mono text-xs"
                      >
                        <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {t("登录后收藏")}
                      </Button>
                    </Link>
                  ))}

                {user && user === car.seller_id && (
                  <Link href={carEditLink(carId)}>
                    <Button variant="secondary" className="w-full gap-1.5 font-mono text-xs">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("编辑车辆")}
                    </Button>
                  </Link>
                )}

                {user && user === car.seller_id && car.status === "removed" && (
                  <>
                    <Button
                      className="w-full gap-1.5 font-mono text-xs"
                      disabled={renewing || relistBlocked}
                      onClick={async () => {
                        setRenewing(true);
                        const { error } = await supabase
                          .from("cars")
                          .update({ status: "active" })
                          .eq("id", carId);
                        setRenewing(false);
                        if (!error) {
                          setCar((prev) => (prev ? { ...prev, status: "active" } : prev));
                          onRelisted?.();
                        } else if (error.message.includes("listing_blocked")) {
                          setRelistBlocked(true);
                        }
                      }}
                    >
                      {renewing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                      {t("重新上架")}
                    </Button>
                    {relistBlocked && (
                      <p role="alert" className="font-mono text-[11px] leading-relaxed text-red-600 dark:text-red-400">
                        {t("该车源已被系统或管理员下架，无法重新上架")}
                      </p>
                    )}
                  </>
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
                        {t("发消息给卖家")}
                      </Button>
                    )
                  ) : (
                    <Link href="/login">
                      <Button
                        variant="outline"
                        className="w-full gap-1.5 font-mono text-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {t("登录后私信")}
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
                        title,
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
                  {watching ? t("取消降价监控") : t("降价监控")}
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
                    {inCompare ? t("已加入对比") : t("加入对比")}
                  </Button>
                )}

                {!embedded && (
                  <Button
                    variant="secondary"
                    className="w-full gap-1.5 font-mono text-xs"
                    onClick={async () => {
                      const { nativeShare } = await import("@/lib/capacitor");
                      const shared = await nativeShare({
                        title,
                        text: `${title} - ${formatCarPrice(car, car.price)}`,
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
                    {copied ? t("已复制链接") : t("分享")}
                  </Button>
                )}

                {/* 二维码分享仅电脑版 */}
                <div className="hidden md:block">
                  <QrShare
                    url={shareUrl}
                    title={title}
                  />
                </div>

                <ReportDialog targetType="car" targetId={carId}>
                  <Button
                    variant="ghost"
                    className="w-full gap-1.5 font-mono text-xs text-muted-foreground"
                  >
                    <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {t("举报")}
                  </Button>
                </ReportDialog>
              </div>
            </div>

            {/* 交易安全提示(默认收起;手机端为流式元素,不影响底部固定联系栏) */}
            <TradeSafetyCard />

            {/* 车辆位置:地址 + OpenStreetMap 地图 + 一键导航 */}
            {(storeAddress || (car.lat != null && car.lng != null)) && (
              <div className="mt-4 rounded-xl bg-card p-4">
                <h3 className="font-mono text-sm font-semibold">
                  {storeAddress ? t("门店地址") : t("车辆位置")}
                </h3>
                <p className="mt-1.5 flex items-start gap-1.5 font-mono text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {storeAddress?.address || carLocation(car, locale)}
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
                            address: storeAddress?.address || carLocation(car, locale),
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
                    {t("使用地图打开")}
                  </Button>
                </OpenInMaps>
              </div>
            )}

            {/* 预估月供:摘要卡片,点「计算」打开完整计算器 drawer */}
            {car.price > 0 && (
              <div className="mt-4 rounded-xl bg-card p-4">
                <h3 className="font-mono text-sm font-semibold">{t("预估月供")}</h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {t("用计算器估算你的每月还款")}
                </p>
                <div className="mt-3 rounded-xl bg-muted/50 p-4">
                  <div className="border-l-2 border-foreground pl-3">
                    <p className="font-mono text-xl font-bold">
                      {/* 月供按车源币种显示(加元 → CA$),写法同 LoanCalculator:金额 + t("/月");formatCarPrice 固定 en-US,SSR 与水合一致 */}
                      {formatCarPrice(car, estimateMonthlyPayment(car.price))}
                      {t("/月")}*
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {t("按 {apr}% APR 估算*", { apr: (LOAN_ASSUMPTION.apr * 100).toFixed(1) })}
                    </p>
                  </div>
                  <Button
                    className="mt-4 w-full font-mono text-xs"
                    onClick={() => setLoanOpen(true)}
                  >
                    {t("计算")}
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
                      <span className="font-mono text-sm font-semibold">{t("月供计算器")}</span>
                      <div className="h-8 w-8" />
                    </div>
                    <div className="overflow-y-auto px-4 pb-8">
                      <LoanCalculator price={car.price} currency={carCurrency(car)} />
                    </div>
                  </NonModalDrawer>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
                    {t("*按 0 首付 / {months} 期估算,实际以贷款机构批核为准", { months: LOAN_ASSUMPTION.months })}
                  </p>
                </div>
              </div>
            )}

            {/* Safety tips */}
            <div className="mt-4 rounded-xl bg-card p-4">
              <h3 className="font-mono text-xs font-semibold">{t("交易安全提示")}</h3>
              <ul className="mt-2 space-y-1.5">
                <li className="font-mono text-[11px] text-muted-foreground">
                  · {t("见面交易前先核实车辆信息")}
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · {t("建议在公共场所看车、试驾")}
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · {t("交易前请做 CarFax 车辆报告")}
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · {t("建议找认证技师做 Pre-purchase inspection")}
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
        <CommentSection carId={carId} initialComments={initialComments} />

        {/* Similar cars */}
        {similarCars.length > 0 && (
          <section
            className="mt-10 border-t border-border pt-6"
          >
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("相似车辆推荐")}
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
        {/* min-w-0:按钮多时价格块可收缩,标签先截断,不把底栏撑出屏幕 */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
            <p className="shrink-0 font-mono text-lg font-bold">{formatCarPrice(car, car.price)}</p>
            {insight && (
              <span
                className={`min-w-0 truncate rounded-full px-1 py-0.5 font-mono text-[10px] font-semibold ${insight.className}`}
              >
                {t(insight.label)}
              </span>
            )}
            {car.original_price && car.original_price > car.price && (
              <span className="shrink-0 rounded-full px-1 py-0.5 font-mono text-[10px] font-semibold bg-green-500/10 text-green-600">
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
        {!embedded && !barHasContactApp && (
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={async () => {
              const { nativeShare } = await import("@/lib/capacitor");
              const shared = await nativeShare({
                title,
                text: `${title} - ${formatCarPrice(car, car.price)}`,
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
        {user && (
          <ContactAppButtons
            variant="bar"
            apps={sellerContactApps}
            carId={carId}
            title={title}
            shareUrl={shareUrl}
            phone={revealedPhone}
          />
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
            {phoneLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Phone className="h-4 w-4" strokeWidth={1.5} />
            )}
            {contactVisible && !phoneLoading ? (car.phone || t("无电话")) : t("联系卖家")}
          </Button>
        ) : (
          <Link href="/login">
            <Button className="h-10 gap-1.5 font-mono text-xs">
              <Phone className="h-4 w-4" strokeWidth={1.5} />
              {t("登录联系卖家")}
            </Button>
          </Link>
        )}
      </div>

      {/* Call dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{t("拨打电话")}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {t("是否拨打卖家电话 {phone}？", { phone: car.phone ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <DialogClose asChild>
              <Button variant="secondary" size="sm" className="flex-1 font-mono text-xs">
                {t("取消")}
              </Button>
            </DialogClose>
            <Button size="sm" className="flex-1 gap-1.5 font-mono text-xs" asChild>
              <a href={`tel:${car.phone}`}>
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t("拨打")}
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
              {t("正在打开对话…")}
            </div>
          )}
        </div>
      </NonModalDrawer>
    </div>
  );
}
