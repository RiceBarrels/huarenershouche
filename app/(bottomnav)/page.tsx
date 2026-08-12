"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "framer-motion";

import {
  Search,
  ArrowRight,
  Shield,
  MapPin,
  DollarSign,
  Zap,
  ChevronDown,
  ChevronRight,
  Car,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { HomeFeed } from "@/components/home-feed";
import { SectionHeader } from "@/components/section-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { scaleIn } from "@/lib/motion";
import { PriceDroppedCars } from "@/components/price-dropped-cars";
import { TrendingSearches } from "@/components/trending-searches";
import { RegionBrandEntry } from "@/components/region-brand-entry";
import { TrustReviews } from "@/components/trust-reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasUserHistory, rankCars, getFavoriteIds } from "@/lib/recommendations";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  MobileFilterDrawer,
  BrandDrawerContent,
  LocationDrawerContent,
  getLocationLabel,
  getBrandLabel,
} from "@/components/mobile-filters";
import { INITIAL_FILTERS, type Filters } from "@/components/search-filters";
import { FeatureRow } from "@/components/feature-grid";
import { MAKES_ZH, getBrandLogoUrl } from "@/lib/mock-data";
import { BODY_STYLE_OPTIONS, type BodyStyle } from "@/lib/body-style";
import { paymentToPrice, LOAN_ASSUMPTION } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { readDualCache, writeDualCache } from "@/lib/session-cache";
import { getCurrentPosition, reverseGeocode } from "@/lib/geocode";

import type { DbCar, DbCommunityPost } from "@/lib/types";
import { Heart } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";

// Map city names to Chinese region names, with NYC borough detection
const CITY_ZH_MAP: Record<string, string> = {
  "Los Angeles": "洛杉矶",
  "San Francisco": "旧金山",
  "San Diego": "圣地亚哥",
  "San Jose": "圣何塞",
  "Sacramento": "萨克拉门托",
  "Houston": "休斯顿",
  "Dallas": "达拉斯",
  "Austin": "奥斯汀",
  "San Antonio": "圣安东尼奥",
  "Chicago": "芝加哥",
  "Seattle": "西雅图",
  "Boston": "波士顿",
  "Philadelphia": "费城",
  "Pittsburgh": "匹兹堡",
  "Atlanta": "亚特兰大",
  "Miami": "迈阿密",
  "Orlando": "奥兰多",
  "Tampa": "坦帕",
  "Phoenix": "凤凰城",
  "Denver": "丹佛",
  "Portland": "波特兰",
  "Las Vegas": "拉斯维加斯",
  "Irvine": "尔湾",
  "Fremont": "弗里蒙特",
  "Cupertino": "库比蒂诺",
  "Palo Alto": "帕罗奥图",
  "Pasadena": "帕萨迪纳",
  "Arcadia": "阿卡迪亚",
  "Flushing": "法拉盛",
};

const NYC_BOROUGHS: { county: string; zh: string; en: string }[] = [
  { county: "New York County", zh: "曼哈顿", en: "Manhattan" },
  { county: "Kings County", zh: "布鲁克林", en: "Brooklyn" },
  { county: "Queens County", zh: "皇后区", en: "Queens" },
  { county: "Bronx County", zh: "布朗克斯", en: "Bronx" },
  { county: "Richmond County", zh: "史丹顿岛", en: "Staten Island" },
];

interface LocationInfo {
  formatted: string;       // "City, ST"
  zhName: string;          // "洛杉矶" or "纽约 · 皇后区"
}

async function detectDetailedLocation(): Promise<LocationInfo | null> {
  try {
    const pos = await getCurrentPosition();
    const { latitude: lat, longitude: lng } = pos.coords;

    const geo = await reverseGeocode(lat, lng);
    if (!geo) return null;

    // Check if user is in NYC (stateCode=NY and city is New York/Brooklyn/etc)
    const isNYC =
      geo.stateCode === "NY" &&
      (geo.city === "New York" || geo.city === "City of New York" || geo.city === "New York City" ||
       NYC_BOROUGHS.some((b) => geo.city.includes(b.en)));

    if (isNYC) {
      // Use a more detailed reverse geocode to detect the borough via county
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
          { headers: { "User-Agent": "clcauto/1.0" } }
        );
        if (res.ok) {
          const data = await res.json();
          const county = data.address?.county || "";
          const borough = NYC_BOROUGHS.find((b) => county.includes(b.county.replace(" County", "")) || county === b.county);
          if (borough) {
            return {
              formatted: `${borough.en}, New York`,
              zhName: `纽约 · ${borough.zh}`,
            };
          }
        }
      } catch { /* fall through */ }
      return { formatted: geo.formatted, zhName: "纽约市" };
    }

    // Regular city
    const zhCity = CITY_ZH_MAP[geo.city] || "";
    const stateZh = STATE_ZH_MAP[geo.stateCode] || "";
    const zhName = zhCity
      ? (stateZh ? `${stateZh} · ${zhCity}` : zhCity)
      : (stateZh || geo.formatted);

    return { formatted: geo.formatted, zhName };
  } catch {
    return null;
  }
}

const STATE_ZH_MAP: Record<string, string> = {
  CA: "加州", NY: "纽约", TX: "德州", FL: "佛州",
  IL: "伊利诺伊", WA: "华盛顿", MA: "麻省", NJ: "新泽西",
  PA: "宾州", GA: "乔治亚", OH: "俄亥俄", MI: "密歇根",
  NC: "北卡", VA: "弗吉尼亚", AZ: "亚利桑那", MD: "马里兰",
  CO: "科罗拉多", OR: "俄勒冈", NV: "内华达", CT: "康州",
  HI: "夏威夷", MN: "明尼苏达", IN: "印第安纳", TN: "田纳西",
  MO: "密苏里", WI: "威斯康辛", DC: "华盛顿特区",
};

const POPULAR_MAKES = [
  "Toyota",
  "Honda",
  "BMW",
  "Mercedes-Benz",
  "Tesla",
  "Lexus",
  "Audi",
  "Porsche",
];

const QUICK_TAGS: { label: string; params: Record<string, string> }[] = [
  { label: "$15K以下", params: { maxPrice: "15000" } },
  { label: "混动省油", params: { fuelType: "混动" } },
  { label: "纯电车型", params: { fuelType: "纯电" } },
  { label: "低里程", params: { maxMileage: "30000" } },
  { label: "四驱SUV", params: { drivetrain: "AWD" } },
  { label: "无事故", params: { noAccident: "true" } },
  { label: "一手车主", params: { oneOwner: "true" } },
];

const PAYMENT_PRESETS = [200, 300, 400, 500];

// 手机版品牌行(与金刚区同一 snap 滑动条,5 个/页,末位「更多」打开品牌抽屉)
const MOBILE_BRANDS = [
  "Toyota", "Honda", "BMW", "Mercedes-Benz", "Tesla",
  "Lexus", "Audi", "Nissan", "Ford", "Subaru",
  "Hyundai", "Kia", "Mazda", "Volkswagen",
];

// 简洁单色车型剪影(线条风格,配合 currentColor 使用)
// 统一画布 64x32,车轮固定在 (17,25)/(47,25),各类型只画车身轮廓差异
const BODY_SILHOUETTES: Record<BodyStyle, string[]> = {
  sedan: [
    "M3 25V22.2C3 20.6 4.1 19.3 5.7 19L14 17.4L20 11.6C21 10.7 22.2 10.2 23.6 10.2H33.5C34.9 10.2 36.1 10.7 37.1 11.6L43.3 17.4L55.4 19.2C57 19.5 58 20.7 58 22.3V25",
    "M3 25H13.5M20.5 25H43.5M50.5 25H58",
  ],
  suv: [
    "M4 25V18.6C4 17.2 4.9 16.2 6.3 15.9L11.5 15L17 8.9C17.8 8 19 7.5 20.2 7.5H42.5C43.8 7.5 45 8.1 45.8 9.1L50.7 15L57.6 16.1C59 16.4 60 17.5 60 18.9V25",
    "M4 25H13.5M20.5 25H43.5M50.5 25H60",
  ],
  truck: [
    "M4 25V18.8C4 17.6 4.8 16.7 6 16.4L9.5 15.7L14.2 9.4C15 8.4 16.1 7.9 17.4 7.9H25.6C26.9 7.9 27.9 8.9 27.9 10.2V15.6H57.4C58.8 15.6 60 16.7 60 18.1V25",
    "M4 25H13.5M20.5 25H43.5M50.5 25H60",
  ],
  coupe: [
    "M3 25V22.6C3 21 4 19.8 5.6 19.4L13.8 17.7L21.5 11.9C22.8 11 24.3 10.5 25.9 10.5H30.5C32.4 10.5 34.2 11.1 35.8 12.1L44 17.2L56 19.1C57.7 19.4 58.5 20.5 58.5 22V25",
    "M3 25H13.5M20.5 25H43.5M50.5 25H58.5",
  ],
  minivan: [
    "M4 25V18.3C4 17.6 4.3 16.9 4.8 16.4L13 9.2C14 8.4 15.2 8 16.5 8H53.5C55.7 8 57.5 9.8 57.5 12V25",
    "M4 25H13.5M20.5 25H43.5M50.5 25H57.5",
  ],
  hatchback: [
    "M5 25V21.8C5 20.3 6 19.1 7.5 18.8L14.5 17.4L20.3 11.7C21.2 10.8 22.4 10.3 23.7 10.3H38.5C39.8 10.3 41 10.9 41.8 11.9L50.6 19.6C52.4 20.3 53.5 21.3 53.5 22.8V25",
    "M5 25H13.5M20.5 25H43.5M50.5 25H53.5",
  ],
  wagon: [
    "M3 25V22C3 20.5 4 19.3 5.5 19L13.6 17.4L19.6 11.5C20.5 10.6 21.8 10.1 23.1 10.1H45.8C47 10.1 48.1 10.6 48.9 11.5L53.6 16.7L57.2 17.7C58.9 18.2 60 19.4 60 21V25",
    "M3 25H13.5M20.5 25H43.5M50.5 25H60",
  ],
  convertible: [
    "M3 25V21.5C3 20 4.1 18.9 5.6 18.6L14.5 17.2H53C56.5 17.2 58.5 18.6 58.5 21.4V25",
    "M25.5 17.2L29.5 11H31.5",
    "M40 17.2V13.8M47 17.2V13.8",
    "M3 25H13.5M20.5 25H43.5M50.5 25H58.5",
  ],
  van: [
    "M5 25V13.5C5 10.5 6.8 8.5 10 8.5H52C56.5 8.5 59 11 59 15V25",
    "M5 25H13.5M20.5 25H43.5M50.5 25H59",
  ],
};

function BodyStyleSilhouette({
  style,
  className,
}: {
  style: BodyStyle;
  className?: string;
}) {
  const paths = BODY_SILHOUETTES[style];
  if (!paths) return null;
  return (
    <svg
      viewBox="0 0 64 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      <circle cx="17" cy="25" r="3.5" />
      <circle cx="47" cy="25" r="3.5" />
    </svg>
  );
}

function buildUrl(params: Record<string, string>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  return `/browse?${sp.toString()}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

// 首页数据双层缓存(社区同款):session 命中直接复用不重拉,
// localStorage 冷启动兜底,先展示后台刷新
const HOME_CACHE_KEY = "clc_home_v1";
interface HomeCache {
  featured: DbCar[];
  recommended: DbCar[];
  carCount: number | null;
  communityPosts: DbCommunityPost[];
}

export default function Home() {
  const router = useRouter();
  // hero 搜索：与 /browse 同构的筛选对象，搜索时整体带入 URL
  const [searchFilters, setSearchFilters] = useState<Filters>(INITIAL_FILTERS);
  const [featured, setFeatured] = useState<DbCar[]>([]);
  const [recommended, setRecommended] = useState<DbCar[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState("400");
  const [carCount, setCarCount] = useState<number | null>(null);
  const [communityPosts, setCommunityPosts] = useState<DbCommunityPost[]>([]);

  // 手机端:hero 搜索框滑出视口后,顶部浮出缩小版搜索条
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const [miniSearch, setMiniSearch] = useState(false);

  useEffect(() => {
    const el = heroSearchRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setMiniSearch(!entry.isIntersecting),
      { rootMargin: "-1px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Subtle parallax on the hero grid backdrop
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const heroGridY = useTransform(scrollY, [0, 600], [0, 90]);

  const monthlyBudgetNum = parseInt(monthlyBudget, 10) || 0;
  const budgetPrice = monthlyBudgetNum > 0 ? paymentToPrice(monthlyBudgetNum) : 0;

  useEffect(() => {
    const hasHistory = hasUserHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage 信号,仅首帧一次
    setShowRecommended(hasHistory);

    async function load(withHistory: boolean) {
      const [carsRes, countRes, postsRes] = await Promise.all([
        supabase
          .from("cars")
          .select("*, profiles!seller_id(account_type, avatar_url)")
          .eq("status", "active")
          .eq("owner_hidden", false)
          .order("created_at", { ascending: false })
          // 有个性化信号时拉更大的候选池来排序,否则拉一小批用于直发优先展示
          .limit(withHistory ? 200 : 60),
        supabase
          .from("cars")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("owner_hidden", false),
        // 社区热帖入口:优先带图的最新帖
        supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      const cars = (carsRes.data as DbCar[]) || [];
      // 个人/车行直发优先于系统检索转载(稳定排序保持组内最新在前)
      const prioritized = [...cars].sort(
        (a, b) => Number(!!a.source_id) - Number(!!b.source_id)
      );
      const featuredNext = prioritized.slice(0, 6);
      setFeatured(featuredNext);

      let recommendedNext: DbCar[] = [];
      if (withHistory && cars.length > 0) {
        const recentIds = getRecentlyViewed();
        const favIds = getFavoriteIds();
        const signalIds = [...new Set([...recentIds, ...favIds])];

        let favoriteCars: DbCar[] = [];
        let viewedCars: DbCar[] = [];
        if (signalIds.length > 0) {
          const { data: sig } = await supabase.from("cars").select("*").in("id", signalIds);
          const byId = new Map(((sig as DbCar[]) || []).map((c) => [c.id, c]));
          // 保持收藏/浏览的原有顺序(浏览按新近度)
          favoriteCars = favIds.map((id) => byId.get(id)).filter(Boolean) as DbCar[];
          viewedCars = recentIds.map((id) => byId.get(id)).filter(Boolean) as DbCar[];
        }

        // 不把已经看过的车再推给用户;多排一些供手机端 tab 流无限滑
        const excludeIds = new Set(recentIds);
        recommendedNext = rankCars(cars, { favorites: favoriteCars, viewed: viewedCars }, { excludeIds, limit: 30 });
        setRecommended(recommendedNext);
      }

      const countNext = countRes.count ?? 0;
      setCarCount(countNext);

      const rows = (postsRes.data as DbCommunityPost[]) || [];
      const withImg = rows.filter((p) => p.images && p.images.length > 0);
      const withoutImg = rows.filter((p) => !p.images || p.images.length === 0);
      const postsNext = [...withImg, ...withoutImg].slice(0, 4);
      setCommunityPosts(postsNext);

      if (featuredNext.length > 0) {
        writeDualCache<HomeCache>(HOME_CACHE_KEY, {
          featured: featuredNext,
          recommended: recommendedNext,
          carCount: countNext,
          communityPosts: postsNext,
        });
      }
    }

    // 双层缓存(社区同款):本会话拉过就直接复用;localStorage 兜底数据先展示、后台刷新
    const cached = readDualCache<HomeCache>(HOME_CACHE_KEY);
    if (cached && cached.data.featured.length > 0) {
      setFeatured(cached.data.featured);
      setRecommended(cached.data.recommended || []);
      setCarCount(cached.data.carCount);
      setCommunityPosts(cached.data.communityPosts || []);
      if (cached.stale) load(hasHistory).catch(() => {});
    } else {
      load(hasHistory).catch(() => {});
    }

    // Auto-detect user location with detailed region info
    detectDetailedLocation()
      .then((loc) => {
        if (loc) setUserLocation(loc);
      })
      .finally(() => setLocationLoading(false));

  }, []);

  // 定位权限刚被授予(权限弹窗/设置页开启)时重新检测——mount 时那次可能因无权限失败
  useEffect(() => {
    function onLocationGranted() {
      detectDetailedLocation().then((loc) => {
        if (loc) setUserLocation(loc);
      });
    }
    window.addEventListener("clc-location-granted", onLocationGranted);
    return () => window.removeEventListener("clc-location-granted", onLocationGranted);
  }, []);

  // 手机搜索行的地区短标签:已选筛选地区 > 定位到的城市 > 全美
  const mobileLocLabel = searchFilters.location
    ? getLocationLabel(searchFilters)
    : userLocation?.zhName?.split(" · ").pop() || "全美";

  // 更多筛选已选条件数(不含关键词与默认距离)
  const searchActiveCount = Object.entries(searchFilters).filter(
    ([k, v]) => v && k !== "keyword" && !(k === "maxDistance" && v === "50")
  ).length;

  function handleSearch() {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(searchFilters)) {
      if (!v) continue;
      if (k === "maxDistance" && v === "50") continue; // 默认值不写入 URL
      if (k === "keyword") params.q = v;
      else params[k] = v;
    }
    router.push(buildUrl(params));
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-muted/30 font-mono md:bg-background gap-6 dark:bg-background"
    >
      <Header />

      {/* 手机端:滚过 hero 搜索后,顶部浮出缩小版搜索条 */}
      <AnimatePresence>
        {miniSearch && (
          <motion.div
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md md:hidden"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <Image src="/logo.png" alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  placeholder="搜索品牌、车型..."
                  className="h-9 rounded-full bg-muted pl-9 font-mono text-sm"
                  value={searchFilters.keyword}
                  onChange={(e) => setSearchFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-9 shrink-0 px-4 font-mono text-xs"
              >
                搜索
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero — typographic, grid backdrop */}
      <section 
        className="relative overflow-hidden p-4 rounded-b-lg bg-linear-160 from-primary/50 via-card dark:from-primary/15"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        {/* Grid backdrop with subtle parallax */}
        <motion.div
          aria-hidden="true"
          style={prefersReduced ? undefined : { y: heroGridY }}
          className="absolute inset-x-0 -top-24 bottom-0 hidden bg-grid [mask-image:linear-gradient(to_bottom,black_35%,transparent)] md:block"
        />

        <div className="relative mx-auto w-full max-w-5xl xl:max-w-6xl">
          {/* Micro label + location */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground md:block md:text-[11px]">
              North America · Chinese Used Car Marketplace
            </p>
            <span className="flex items-center gap-1.5 md:hidden">
              <Image src="/logo.png" alt="常來車網" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              <span className="font-logo text-lg">常來車網</span>
            </span>
            <div className="hidden items-center gap-1.5 md:flex">
              <MapPin className="h-3 w-3 text-muted-foreground/60" strokeWidth={1.5} />
              {locationLoading ? (
                <span className="font-mono text-[11px] text-muted-foreground/50">定位中...</span>
              ) : userLocation ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {userLocation.formatted}
                  {userLocation.zhName && (
                    <span className="text-muted-foreground/50"> · {userLocation.zhName}</span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLocationLoading(true);
                    detectDetailedLocation()
                      .then((loc) => {
                        if (loc) setUserLocation(loc);
                      })
                      .finally(() => setLocationLoading(false));
                  }}
                  className="font-mono text-[11px] text-muted-foreground/60 underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  点击获取当前位置
                </button>
              )}
            </div>
          </div>

          {/* Oversized mono headline */}
          <h1 className="mt-8 hidden font-logo text-4xl leading-[1.08] tracking-tight md:mt-10 md:block md:text-6xl xl:text-7xl">
            <span className="sr-only">常來車網 - 北美华人二手车交易平台，买车卖车免费发布</span>
            <span aria-hidden="true" className="block">华人买车</span>
            <span aria-hidden="true" className="block">
              就上常來車網<span className="animate-cursor-blink text-brand-ink">_</span>
            </span>
          </h1>
          <p className="mt-4 hidden font-mono text-sm text-muted-foreground md:block md:text-base">
            可靠车源 · 中文服务 · 覆盖全美 — CLCAuto.com
          </p>
          <p className="mt-2 hidden font-mono text-[11px] leading-relaxed text-muted-foreground/70 md:block md:text-xs">
            车源来自三类:车行网站车辆自动检索、个人发布、车行发布
          </p>

          {/* Structured search — 地区/品牌/更多筛选 drawer + 关键词 */}
          <div ref={heroSearchRef} className="mt-4 md:mt-10">
            <div className="grid-cols-3 gap-2 hidden md:grid">
              <Drawer>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border-0 bg-muted/60 px-3 py-2.5 text-left transition-colors active:bg-muted md:bg-background md:hover:bg-muted/40"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] text-muted-foreground">地区</span>
                      <span className={`block truncate font-mono text-xs ${searchFilters.location ? "font-medium" : "text-muted-foreground"}`}>
                        {getLocationLabel(searchFilters)}
                      </span>
                    </span>
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <DrawerClose asChild>
                      <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </DrawerClose>
                    <span className="font-mono text-sm font-semibold">地区</span>
                    <div className="h-8 w-8" />
                  </div>
                  <div className="overflow-y-auto px-4 pb-6">
                    <LocationDrawerContent
                      filters={searchFilters}
                      onUpdate={(key, value) => setSearchFilters((prev) => ({ ...prev, [key]: value }))}
                    />
                  </div>
                </DrawerContent>
              </Drawer>

              <Drawer>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border-0 bg-muted/60 px-3 py-2.5 text-left transition-colors active:bg-muted md:bg-background md:hover:bg-muted/40"
                  >
                    <Car className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] text-muted-foreground">品牌</span>
                      <span className={`block truncate font-mono text-xs ${searchFilters.make ? "font-medium" : "text-muted-foreground"}`}>
                        {getBrandLabel(searchFilters)}
                      </span>
                    </span>
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <DrawerClose asChild>
                      <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </DrawerClose>
                    <span className="font-mono text-sm font-semibold">品牌</span>
                    <div className="h-8 w-8" />
                  </div>
                  <div className="overflow-y-auto px-4 pb-6">
                    <BrandDrawerContent
                      filters={searchFilters}
                      onUpdate={(key, value) => setSearchFilters((prev) => ({ ...prev, [key]: value }))}
                    />
                  </div>
                </DrawerContent>
              </Drawer>

              <Drawer>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border-0 bg-muted/60 px-3 py-2.5 text-left transition-colors active:bg-muted md:bg-background md:hover:bg-muted/40"
                  >
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] text-muted-foreground">更多筛选</span>
                      <span className={`block truncate font-mono text-xs ${searchActiveCount > 0 ? "font-medium" : "text-muted-foreground"}`}>
                        {searchActiveCount > 0 ? `${searchActiveCount} 项` : "不限"}
                      </span>
                    </span>
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <DrawerClose asChild>
                      <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </DrawerClose>
                    <span className="font-mono text-sm font-semibold">筛选</span>
                    <div className="h-8 w-8" />
                  </div>
                  <div className="overflow-y-auto pb-6">
                    <MobileFilterDrawer
                      filters={searchFilters}
                      onFilter={setSearchFilters}
                      activeCount={searchActiveCount}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="mt-2 flex overflow-hidden rounded-full bg-background md:rounded-md"
            >
              {/* 手机:地区选择挂在搜索行左侧(瓜子式「城市▾ | 搜索 | 按钮」) */}
              <Drawer>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-0.5 pl-3.5 pr-1.5 font-mono text-sm font-medium transition-opacity active:opacity-60 md:hidden"
                  >
                    <span className="max-w-16 truncate">{mobileLocLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <DrawerClose asChild>
                      <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </DrawerClose>
                    <span className="font-mono text-sm font-semibold">地区</span>
                    <div className="h-8 w-8" />
                  </div>
                  <div className="overflow-y-auto px-4 pb-6">
                    <LocationDrawerContent
                      filters={searchFilters}
                      onUpdate={(key, value) => setSearchFilters((prev) => ({ ...prev, [key]: value }))}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  placeholder="搜索品牌、车型、关键词..."
                  className="h-12 rounded-none bg-transparent pl-10 font-mono text-sm shadow-none focus:bg-transparent focus:ring-0 focus-visible:ring-0"
                  value={searchFilters.keyword}
                  onChange={(e) => setSearchFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                />
              </div>
              <Button
                type="submit"
                className="h-12 gap-2 rounded-r-full bg-primary px-6 font-mono text-sm text-primary-foreground hover:opacity-90 md:px-8"
              >
                搜索
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </form>
          </div>

          {/* 手机版:金刚区 + 品牌行,合并为同一个 snap 分页滑动条(瓜子式) */}
          <div className="md:hidden">
            <FeatureRow
              brandTiles={[
                ...MOBILE_BRANDS.map((m) => {
                  const logo = getBrandLogoUrl(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => router.push(buildUrl({ make: m }))}
                      className="flex flex-col items-center gap-1.5 py-2 transition-opacity active:opacity-60"
                    >
                      <span className="flex h-7 w-7 items-center justify-center">
                        {logo ? (
                          <img src={logo} alt={m} className="h-6 w-6 object-contain" />
                        ) : (
                          <Car className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </span>
                      <span className="font-mono text-[11px]">{MAKES_ZH[m] || m}</span>
                    </button>
                  );
                }),
                /* 更多 → 品牌抽屉 */
                <Drawer key="brand-more">
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 py-2 transition-opacity active:opacity-60"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 font-mono text-xs text-muted-foreground">
                      ⋯
                    </span>
                    <span className="font-mono text-[11px]">更多</span>
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <DrawerClose asChild>
                      <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </DrawerClose>
                    <span className="font-mono text-sm font-semibold">品牌</span>
                    <div className="h-8 w-8" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    <BrandDrawerContent
                      filters={searchFilters}
                      onUpdate={(key, value) => setSearchFilters((prev) => ({ ...prev, [key]: value }))}
                    />
                  </div>
                  <div className="border-t border-border px-4 py-3">
                    <DrawerClose asChild>
                      <Button
                        className="w-full font-mono text-xs"
                        disabled={!searchFilters.make}
                        onClick={handleSearch}
                      >
                        按所选品牌搜索
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerContent>
                </Drawer>,
              ]}
            />
          </div>

          {/* Popular makes chips(桌面;手机用下方品牌宫格) */}
          <div className="mt-6 hidden flex-wrap items-center gap-1.5 md:flex">
            {POPULAR_MAKES.map((m) => (
              <button
                key={m}
                onClick={() => router.push(buildUrl({ make: m }))}
                className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                {MAKES_ZH[m]}
              </button>
            ))}
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-1.5 md:flex">
            {QUICK_TAGS.map((t) => (
              <button
                key={t.label}
                onClick={() => router.push(buildUrl(t.params))}
                className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Live platform stats */}
          <div className="mt-12 hidden max-w-md grid-cols-3 divide-x divide-border border-y border-border md:grid">
            <div className="py-4 pr-4">
              <p className="font-mono text-2xl font-bold tabular-nums md:text-3xl">
                {carCount === null ? "—" : <CountUp value={carCount} suffix="+" />}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                在售车源
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="font-mono text-2xl font-bold tabular-nums md:text-3xl">
                <CountUp value={50} suffix="+" />
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                覆盖州
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="font-mono text-2xl font-bold tabular-nums md:text-3xl">
                <CountUp value={100} suffix="%" />
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                免费使用
              </p>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 md:block">
          <span className="flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">
            Scroll
            <ChevronRight className="h-3 w-3 rotate-90 animate-bounce" strokeWidth={1.5} />
          </span>
        </div>
      </section>

      {/* 手机版楼层运营位:双列彩色卡片(中国 App 风格) */}
      {featured.length > 0 && (
        <section className="px-3 pt-3 md:hidden">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/browse?listedWithin=3"
              className="rounded-2xl bg-gradient-to-b from-primary/15 to-card p-3"
            >
              <p className="flex items-center justify-between font-mono text-[15px] font-bold">
                新上好车
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </p>
              <p className="font-mono text-[10px] text-brand-ink">最近 3 天上架</p>
              <div className="mt-2 space-y-2">
                {featured.slice(0, 2).map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    {c.image_url && (
                      <img
                        src={c.image_url}
                        alt=""
                        className="h-10 w-14 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px]">{c.title_zh}</p>
                      <p className="font-mono text-[11px] font-bold text-red-500">
                        {c.price > 0 ? `$${c.price.toLocaleString()}` : "电议"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Link>
            {(() => {
              const dropped = featured.filter(
                (c) => c.original_price && c.original_price > c.price
              );
              const useDropped = dropped.length > 0;
              const rows = useDropped
                ? dropped.slice(0, 2)
                : (recommended.length > 0 ? recommended : featured.slice(2, 4)).slice(0, 2);
              return (
                <Link
                  href={useDropped ? "/browse?priceDropped=true" : "/browse"}
                  className={`rounded-2xl bg-gradient-to-b p-3 ${useDropped ? "from-orange-500/15" : "from-sky-500/15"} to-card`}
                >
                  <p className="flex items-center justify-between font-mono text-[15px] font-bold">
                    {useDropped ? "降价捡漏" : "为你推荐"}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  </p>
                  <p
                    className={`font-mono text-[10px] ${useDropped ? "text-orange-600 dark:text-orange-400" : "text-sky-600 dark:text-sky-400"}`}
                  >
                    {useDropped ? "近期已降价" : "根据你的浏览挑选"}
                  </p>
                  <div className="mt-2 space-y-2">
                    {rows.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5">
                        {c.image_url && (
                          <img
                            src={c.image_url}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[10px]">{c.title_zh}</p>
                          <p className="font-mono text-[11px] font-bold text-red-500">
                            {c.price > 0 ? `$${c.price.toLocaleString()}` : "电议"}
                            {useDropped && c.original_price && (
                              <span className="ml-1 font-normal text-muted-foreground line-through">
                                ${c.original_price.toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })()}
          </div>
        </section>
      )}

      {/* 手机版:精选车源 tab 流(多分类 + 无限滚动 + 切换动画),取代逐楼层排布 */}
      {featured.length > 0 && (
        <HomeFeed
          featured={featured}
          recommended={recommended}
          showRecommended={showRecommended}
        />
      )}

      {/* Recommended for you */}
      {showRecommended && recommended.length > 0 && (
        <section className="hidden md:block md:px-4 md:py-10">
          <div className="">
            <Reveal>
              <SectionHeader
                index="01"
                label="Recommended"
                title="为你推荐"
                action={{ href: "/browse", label: "查看更多" }}
                className="mb-6"
              />
            </Reveal>
            <RevealGroup className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* 候选池按 30 排(供手机端无限滑),桌面楼层只展示前 6 */}
              {recommended.slice(0, 6).map((car) => (
                <RevealItem key={car.id}>
                  <CarCard car={car} />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="hidden md:block md:px-4 md:py-10">
          <div className="">
            <Reveal>
              <SectionHeader
                index={showRecommended && recommended.length > 0 ? "02" : "01"}
                label="Latest"
                title="最新车源"
                action={{ href: "/browse", label: "查看全部" }}
                className="mb-6"
              />
            </Reveal>
            <RevealGroup className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {featured.map((car) => (
                <RevealItem key={car.id}>
                  <CarCard car={car} />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* Price drops */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <PriceDroppedCars />
          </Reveal>
        </div>
      </section>

      {/* Browse by body style */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <SectionHeader index="03" label="Body Style" title="按车身类型找车" className="mb-6" />
          </Reveal>
          <RevealGroup stagger={0.05} className="flex gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-4 md:overflow-visible">
            {BODY_STYLE_OPTIONS.slice(0, 8).map((opt) => (
              <RevealItem key={opt.value} variants={scaleIn} className="w-32 shrink-0 md:w-auto">
                <Link
                  href={`/browse?bodyStyle=${opt.value}`}
                  className="group flex flex-col items-center rounded-xl bg-card px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <BodyStyleSilhouette
                    style={opt.value}
                    className="h-9 w-[72px] text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                  <span className="mt-1 font-mono text-sm font-medium">{opt.label}</span>
                  <span className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{opt.labelEn}</span>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Shop by monthly payment */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <SectionHeader index="04" label="Monthly Budget" title="月供预算购车" className="mb-2" />
          </Reveal>
          <div className="mb-4 flex justify-end">
            <span className="font-mono text-[10px] text-muted-foreground">
              估算口径:0 首付 / {(LOAN_ASSUMPTION.apr * 100).toFixed(1)}% APR / {LOAN_ASSUMPTION.months} 期
            </span>
          </div>
          <Reveal>
          <div className="flex flex-col gap-3 rounded-xl bg-card p-3 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              {PAYMENT_PRESETS.map((p) => (
                <Link
                  key={p}
                  href={`/browse?maxPayment=${p}`}
                  className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  ${p}/月
                </Link>
              ))}
            </div>
            <div className="hidden h-6 w-px shrink-0 bg-border md:block" />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">$</span>
                <Input
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric"
                  placeholder="月供"
                  className="h-8 w-28 pl-6 pr-9 font-mono text-xs"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">/月</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {budgetPrice > 0 ? (
                  <>
                    约可购 <span className="font-semibold text-foreground">{formatPrice(budgetPrice)}</span> 以内车型
                  </>
                ) : (
                  "输入月供,估算可购车价"
                )}
              </span>
              <Button
                size="sm"
                className="h-8 font-mono text-xs"
                disabled={budgetPrice <= 0}
                onClick={() => router.push(`/browse?maxPayment=${monthlyBudgetNum}`)}
              >
                按此预算看车
              </Button>
            </div>
          </div>
          </Reveal>
        </div>
      </section>

      {/* Trending searches */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <TrendingSearches />
          </Reveal>
        </div>
      </section>

      {/* Region entry */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <RegionBrandEntry />
          </Reveal>
        </div>
      </section>

      {/* Community & QA entry */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <SectionHeader
              index="05"
              label="Community"
              title="车友社区"
              action={{ href: "/community", label: "进入社区" }}
              className="mb-6"
            />
          </Reveal>

          {/* 最新社区帖子 */}
          {communityPosts.length > 0 && (
            <RevealGroup className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {communityPosts.map((post) => (
                <RevealItem key={post.id}>
                  <Link
                    href={`/community/${post.id}`}
                    className="block h-full overflow-hidden rounded-xl bg-card transition-colors hover:bg-muted/40"
                  >
                    {post.images?.[0] && (
                      <img
                        src={post.images[0]}
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-2.5">
                      <p className="line-clamp-2 font-mono text-xs font-medium leading-snug">
                        {post.title}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                          <img
                            src={avatarUrl(post.profiles?.avatar_url, post.profiles?.username)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
                          {post.profiles?.username || "匿名"}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
                          <Heart className="h-3 w-3" strokeWidth={1.5} />
                          {post.likes_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          )}

          <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: "/community", title: "车友圈", desc: "车评、晒车、交流" },
              { href: "/qa", title: "问答", desc: "购车、保险、过户" },
              { href: "/guide/buying", title: "购车指南", desc: "检查、谈价、防骗" },
              { href: "/guide/loan", title: "贷款预审", desc: "在线比价、秒批" },
            ].map((item) => (
              <RevealItem key={item.href}>
                <Link href={item.href} className="block rounded-xl bg-card p-4 transition-colors hover:bg-muted/40">
                  <p className="font-mono text-xs font-semibold">{item.title}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.desc}</p>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Trust reviews */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-10">
        <div className="">
          <Reveal>
            <TrustReviews />
          </Reveal>
        </div>
      </section>

      {/* Why choose us */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-14">
        <div className="">
          <Reveal>
            <SectionHeader index="06" label="Why Us" title="为什么选择常來車網" className="mb-2" />
          </Reveal>
          <p className="font-mono text-xs text-muted-foreground">专为北美华人打造的二手车交易平台</p>
          <RevealGroup stagger={0.1} className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { Icon: Shield, title: "VIN 认证", desc: "每辆车通过 NHTSA 官方数据库验证，查看召回记录、安全评级和投诉历史" },
              { Icon: DollarSign, title: "价格透明", desc: "市场价格分析，降价监控提醒，帮你判断车辆定价是否合理" },
              { Icon: Zap, title: "全中文服务", desc: "中文搜索、中文沟通、中文客服，消除语言障碍，买车更安心" },
              { Icon: MapPin, title: "覆盖全美", desc: "纽约、洛杉矶、旧金山、芝加哥等华人聚集城市，按距离找到身边的车" },
            ].map(({ Icon, title, desc }) => (
              <RevealItem key={title}>
                <div className="h-full rounded-xl bg-card p-4 transition-colors hover:bg-muted/40">
                  <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                  <h3 className="mt-3 font-mono text-sm font-semibold">{title}</h3>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* How it works */}
      <section className="hidden md:block md:border-t md:border-border md:bg-muted/30 md:px-4 md:py-14">
        <div className="">
          <Reveal>
            <SectionHeader index="07" label="How It Works" title="买车三步走" className="mb-8" />
          </Reveal>
          <RevealGroup stagger={0.1} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { n: "01", title: "搜索筛选", desc: "按品牌、价格、里程、地区等条件，快速找到心仪的车辆" },
              { n: "02", title: "查看详情", desc: "VIN 认证、安全召回查询、车辆配置一目了然，做出明智决定" },
              { n: "03", title: "联系卖家", desc: "在线私信或电话联系，中文沟通无障碍，约看车、谈价格" },
            ].map((step) => (
              <RevealItem key={step.n}>
                <div className="relative h-full overflow-hidden rounded-xl bg-background p-5">
                  <span className="pointer-events-none absolute -right-2 -top-4 select-none font-mono text-6xl font-bold text-foreground/[0.06]">
                    {step.n}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Step {step.n}</span>
                  <h3 className="mt-3 font-mono text-sm font-semibold">{step.title}</h3>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* For sellers */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-14">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center rounded-2xl bg-card p-6 text-center md:rounded-none md:bg-transparent md:p-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">For Sellers</p>
          <h2 className="mt-3 font-mono text-2xl font-bold md:text-3xl">想卖车？</h2>
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            免费发布车辆信息，精准触达北美华人买家。个人卖家和车行都可以使用。
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/post">
              <Button className="gap-1.5 font-mono text-xs">
                免费发布车辆
              </Button>
            </Link>
            <Link href="/business">
              <Button variant="outline" className="gap-1.5 font-mono text-xs">
                车行入驻
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* About / SEO content */}
      <section className="hidden md:block md:border-t md:border-border md:px-4 md:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-card p-4 md:rounded-none md:bg-transparent md:p-0">
          <h2 className="font-logo text-xl">关于常來車網</h2>
          <div className="mt-4 space-y-3 font-mono text-xs leading-relaxed text-muted-foreground">
            <p>
              常來車網（CLCAuto）是专为北美华人打造的二手车交易平台。无论你在
              <Link href="/cars/los-angeles" className="underline underline-offset-2 hover:text-foreground">洛杉矶</Link>、
              <Link href="/cars/san-francisco" className="underline underline-offset-2 hover:text-foreground">旧金山</Link>、
              <Link href="/cars/new-york-city" className="underline underline-offset-2 hover:text-foreground">纽约</Link>、
              <Link href="/cars/seattle" className="underline underline-offset-2 hover:text-foreground">西雅图</Link>还是
              <Link href="/cars/dallas" className="underline underline-offset-2 hover:text-foreground">达拉斯</Link>，
              都可以在这里找到同城华人车行和个人卖家直售的二手车源，按品牌、车型、价格、里程和距离精确筛选，全程中文沟通。
            </p>
            <p>
              买二手车最怕信息不透明。常來車網为每辆车提供免费的 VIN 召回记录查询和 NHTSA
              安全评级，部分车源附带 Carfax 车史报告；价格分析功能会将车源与全站同款车型对比，标出高于或低于市场价的车，帮你避开坑、砍好价。热门车型如
              <Link href="/cars/toyota/camry" className="underline underline-offset-2 hover:text-foreground">丰田凯美瑞</Link>、
              <Link href="/cars/honda/civic" className="underline underline-offset-2 hover:text-foreground">本田思域</Link>、
              <Link href="/cars/toyota/rav4" className="underline underline-offset-2 hover:text-foreground">RAV4</Link>、
              <Link href="/cars/tesla/model-3" className="underline underline-offset-2 hover:text-foreground">特斯拉 Model 3</Link>
              都有专属页面，可以直接对比同款车源。
            </p>
            <p>
              卖车同样简单：个人卖家和华人车行都可以免费发布车辆信息，触达全美华人买家，没有中间商抽成。刚来美国的留学生和新移民可以查看
              <Link href="/cars/student-cars" className="underline underline-offset-2 hover:text-foreground">留学生代步车专区</Link>和
              <Link href="/guide" className="underline underline-offset-2 hover:text-foreground">购车指南</Link>，
              了解美国买车、保险、过户的完整流程。更多分类请访问
              <Link href="/cars" className="underline underline-offset-2 hover:text-foreground">二手车分类导航</Link>。
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
