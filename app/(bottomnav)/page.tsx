"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { carLink } from "@/lib/static-link";

import {
  Search,
  ArrowRight,
  Shield,
  MapPin,
  DollarSign,
  Zap,
  ChevronRight,
  Gauge,
  Car,
  Calculator,
} from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PriceDroppedCars } from "@/components/price-dropped-cars";
import { TrendingSearches } from "@/components/trending-searches";
import { RegionBrandEntry } from "@/components/region-brand-entry";
import { TrustReviews } from "@/components/trust-reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasUserHistory, rankCars } from "@/lib/recommendations";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { BODY_STYLE_OPTIONS, type BodyStyle } from "@/lib/body-style";
import { paymentToPrice, LOAN_ASSUMPTION } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { getCurrentPosition, reverseGeocode, detectUserZip } from "@/lib/geocode";

import type { DbCar } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

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

const PRICE_RANGES: { value: string; label: string; min?: number; max?: number }[] = [
  { value: "any", label: "不限" },
  { value: "under-10k", label: "$10K以下", max: 10000 },
  { value: "10k-20k", label: "$10K-20K", min: 10000, max: 20000 },
  { value: "20k-30k", label: "$20K-30K", min: 20000, max: 30000 },
  { value: "30k-50k", label: "$30K-50K", min: 30000, max: 50000 },
  { value: "over-50k", label: "$50K以上", min: 50000 },
];

const PAYMENT_PRESETS = [200, 300, 400, 500];

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
  sp.set("showResult", "true");
  return `/browse?${sp.toString()}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(mi: number): string {
  return new Intl.NumberFormat("en-US").format(mi) + " mi";
}

export default function Home() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [make, setMake] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [zip, setZip] = useState("");
  const [featured, setFeatured] = useState<DbCar[]>([]);
  const [recommended, setRecommended] = useState<DbCar[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState("400");

  const monthlyBudgetNum = parseInt(monthlyBudget, 10) || 0;
  const budgetPrice = monthlyBudgetNum > 0 ? paymentToPrice(monthlyBudgetNum) : 0;

  useEffect(() => {
    const hasHistory = hasUserHistory();
    setShowRecommended(hasHistory);

    supabase
      .from("cars")
      .select("*, profiles!seller_id(account_type, avatar_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(hasHistory ? 30 : 6)
      .then(async ({ data }) => {
        if (!data) return;
        const cars = data as DbCar[];
        setFeatured(cars.slice(0, 6));

        if (hasHistory) {
          const recentIds = getRecentlyViewed();
          if (recentIds.length > 0) {
            const { data: viewedData } = await supabase
              .from("cars")
              .select("*")
              .in("id", recentIds.slice(0, 10));
            const viewedCars = (viewedData || []) as DbCar[];
            const excludeIds = new Set(recentIds);
            const ranked = rankCars(cars, viewedCars, excludeIds);
            setRecommended(ranked.slice(0, 6));
          }
        }
      });

    // Auto-detect user location with detailed region info
    detectDetailedLocation()
      .then((loc) => {
        if (loc) setUserLocation(loc);
      })
      .finally(() => setLocationLoading(false));

    detectUserZip().then((z) => {
      if (z) setZip(z);
    });
  }, []);

  function handleSearch() {
    const params: Record<string, string> = {};
    if (keyword) params.q = keyword;
    if (make && make !== "all") params.make = make;
    const range = PRICE_RANGES.find((r) => r.value === priceRange);
    if (range?.min) params.minPrice = String(range.min);
    if (range?.max) params.maxPrice = String(range.max);
    if (zip) params.zip = zip;
    router.push(buildUrl(params));
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background font-mono"
      style={{ marginTop: "calc(-1 * env(safe-area-inset-top, 0px))" }}
    >
      {/* Announcement banner — marquee */}
      <div className="relative overflow-hidden bg-foreground font-mono text-[11px] text-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex animate-marquee whitespace-nowrap py-1.5">
          {[0, 1].map((i) => (
            <span key={i} className="mx-8 inline-flex items-center gap-6">
              <span>🚗 北美华人二手车平台正式上线</span>
              <Link href="/post" className="underline underline-offset-2">免费发布车辆 →</Link>
              <span>🔒 VIN认证 · 真实车源</span>
              <span>📍 覆盖全美 · 中文服务</span>
              <Link href="/browse?showResult=true" className="underline underline-offset-2">立即找车 →</Link>
            </span>
          ))}
        </div>
      </div>

      <Header />

      {/* Hero with banner image */}
      <section className="relative flex flex-col items-center justify-center px-4 pb-12 pt-16 md:pb-20 md:pt-32">
        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/hero-banner.jpg"
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-background" />
        </div>

        <div className="relative mx-auto w-full max-w-3xl text-center">
          <div className="flex items-center justify-center gap-3">
            <Image src="/logo.png" alt="常来车网" width={64} height={64} className="h-10 w-10 object-contain drop-shadow-md md:h-16 md:w-16" />
            <h1 className="flex font-mono text-3xl font-semibold tracking-tight text-white drop-shadow-md md:text-5xl gap-2">
              <div className="flex justify-center items-center flex-col gap-1">
                <span>常来车网</span>
                <Badge className="">CLCAuto.com</Badge>
              </div>
              <Badge variant="secondary">测试版</Badge>
            </h1>
          </div>
          <p
            className="mt-3 font-mono text-sm text-white/70 md:text-base"
          >
            可靠车源 · 中文服务 · 覆盖全美
          </p>

          {/* Current location indicator */}
          <div
            className="mt-2 flex flex-col items-center gap-0.5"
          >
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-white/50" strokeWidth={1.5} />
              {locationLoading ? (
                <span className="font-mono text-[11px] text-white/40">定位中...</span>
              ) : userLocation ? (
                <span className="font-mono text-[11px] text-white/60">
                  {userLocation.formatted}
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
                    detectUserZip().then((z) => {
                      if (z) setZip(z);
                    });
                  }}
                  className="font-mono text-[11px] text-white/50 underline underline-offset-2 transition-colors hover:text-white/80"
                >
                  点击获取当前位置
                </button>
              )}
            </div>
            {userLocation && (
              <span className="font-mono text-[10px] text-white/40">
                {userLocation.zhName}
              </span>
            )}
          </div>

          {/* Structured search form - cars.com style */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mt-8 overflow-hidden border border-white/10 bg-background shadow-lg rounded-xl"
          >
            {/* Row: Make + Price | Keyword | ZIP | Search */}
            <div className="flex flex-col md:flex-row">
              {/* Make + Price dropdowns (side by side on mobile) */}
              <div className="flex border-b border-border md:border-b-0">
                <div className="w-1/2 border-r border-border md:w-auto">
                  <Select value={make} onValueChange={setMake}>
                    <SelectTrigger className="h-12 w-full rounded-none border-0 px-4 font-mono text-sm shadow-none focus:ring-0 md:w-36">
                      <SelectValue placeholder="品牌" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部品牌</SelectItem>
                      {MAKES.filter((m) => m !== "Other").map((m) => (
                        <SelectItem key={m} value={m}>
                          {MAKES_ZH[m]} {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-1/2 md:w-auto md:border-r md:border-border">
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="h-12 w-full rounded-none border-0 px-4 font-mono text-sm shadow-none focus:ring-0 md:w-32">
                      <SelectValue placeholder="价格" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_RANGES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Keyword input */}
              <div className="relative flex-1 border-b border-border md:border-b-0 md:border-r">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  placeholder="搜索车型、关键词..."
                  className="h-12 rounded-none border-0 pl-11 font-mono text-sm shadow-none focus-visible:ring-0"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              {/* ZIP input */}
              <div className="border-b border-border md:border-b-0 md:border-r">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    placeholder="ZIP"
                    className="h-12 w-full rounded-none border-0 pl-11 font-mono text-sm shadow-none focus-visible:ring-0 md:w-28"
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Search button */}
              <Button
                type="submit"
                className="h-12 gap-2 rounded-none px-8 font-mono text-sm rounded-lg"
              >
                搜索
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </form>

          {/* Popular makes */}
          <div
            className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
          >
            {POPULAR_MAKES.map((m) => (
              <button
                key={m}
                onClick={() => router.push(buildUrl({ make: m }))}
                className="border border-white/20 px-2.5 py-1 font-mono text-[11px] text-white/70 transition-colors hover:border-white hover:text-white"
              >
                {MAKES_ZH[m]}
              </button>
            ))}
          </div>

          {/* Quick tags */}
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-1.5"
          >
            {QUICK_TAGS.map((t) => (
              <button
                key={t.label}
                onClick={() => router.push(buildUrl(t.params))}
                className="bg-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended for you */}
      {showRecommended && recommended.length > 0 && (
        <section className="px-4 pb-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-sm font-medium">为你推荐</h2>
              <Link
                href="/browse?showResult=true"
                className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                查看更多
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {recommended.map((car) => (
                <div key={car.id}>
                  <Link
                    href={carLink(car.id)}
                    className="group block border border-border transition-colors hover:border-foreground/20"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {car.image_url ? (
                        <img
                          src={car.image_url}
                          alt={car.title_zh}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="font-mono text-xs text-muted-foreground">暂无图片</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate font-mono text-xs font-medium">{car.title_zh}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{formatPrice(car.price)}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Gauge className="h-3 w-3" strokeWidth={1.5} />
                          {formatMileage(car.mileage)}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <MapPin className="h-3 w-3" strokeWidth={1.5} />
                          {car.location_zh}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-5xl">
            <div
              className="mb-4 flex items-center justify-between"
            >
              <h2 className="font-mono text-sm font-medium">最新车源</h2>
              <Link
                href="/browse?showResult=true"
                className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                查看全部
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </div>
            <div
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              {featured.map((car) => (
                <div key={car.id}>
                <Link
                  href={carLink(car.id)}
                  className="group block border border-border transition-colors hover:border-foreground/20"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.title_zh}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-mono text-xs text-muted-foreground">
                          暂无图片
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="truncate font-mono text-xs font-medium">
                      {car.title_zh}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                      {formatPrice(car.price)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Gauge className="h-3 w-3" strokeWidth={1.5} />
                        {formatMileage(car.mileage)}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <MapPin className="h-3 w-3" strokeWidth={1.5} />
                        {car.location_zh}
                      </span>
                    </div>
                  </div>
                </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Price drops */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <PriceDroppedCars />
        </div>
      </section>

      {/* Browse by body style */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Car className="h-4 w-4" strokeWidth={1.5} />
            <h2 className="font-mono text-sm font-medium">按车身类型找车</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-4 md:overflow-visible">
            {BODY_STYLE_OPTIONS.slice(0, 8).map((opt) => (
              <Link
                key={opt.value}
                href={`/browse?bodyStyle=${opt.value}&showResult=true`}
                className="group flex w-32 shrink-0 flex-col items-center border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/50 md:w-auto"
              >
                <BodyStyleSilhouette
                  style={opt.value}
                  className="h-9 w-[72px] text-muted-foreground transition-colors group-hover:text-foreground"
                />
                <span className="mt-1 font-mono text-sm font-medium">{opt.label}</span>
                <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{opt.labelEn}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by monthly payment */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" strokeWidth={1.5} />
              <h2 className="font-mono text-sm font-medium">月供预算购车</h2>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              估算口径:0 首付 / {(LOAN_ASSUMPTION.apr * 100).toFixed(1)}% APR / {LOAN_ASSUMPTION.months} 期
            </span>
          </div>
          <div className="flex flex-col gap-3 border border-border bg-card p-3 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              {PAYMENT_PRESETS.map((p) => (
                <Link
                  key={p}
                  href={`/browse?maxPayment=${p}&showResult=true`}
                  className="border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
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
                onClick={() => router.push(`/browse?maxPayment=${monthlyBudgetNum}&showResult=true`)}
              >
                按此预算看车
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending searches */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <TrendingSearches />
        </div>
      </section>

      {/* Region entry */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <RegionBrandEntry />
        </div>
      </section>

      {/* Community & QA entry */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-sm font-medium">车友社区</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/community" className="border border-border p-4 transition-colors hover:border-foreground/20">
              <p className="font-mono text-xs font-semibold">车友圈</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">车评、晒车、交流</p>
            </Link>
            <Link href="/qa" className="border border-border p-4 transition-colors hover:border-foreground/20">
              <p className="font-mono text-xs font-semibold">问答</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">购车、保险、过户</p>
            </Link>
            <Link href="/guide/buying" className="border border-border p-4 transition-colors hover:border-foreground/20">
              <p className="font-mono text-xs font-semibold">购车指南</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">检查、谈价、防骗</p>
            </Link>
            <Link href="/guide/loan" className="border border-border p-4 transition-colors hover:border-foreground/20">
              <p className="font-mono text-xs font-semibold">贷款预审</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">在线比价、秒批</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust reviews */}
      <section className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <TrustReviews />
        </div>
      </section>

      {/* Why choose us */}
      <section className="border-t border-border px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-mono text-lg font-semibold">为什么选择常来车网</h2>
          <p className="mt-2 text-center font-mono text-xs text-muted-foreground">专为北美华人打造的二手车交易平台</p>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="border border-border p-4">
              <Shield className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-3 font-mono text-sm font-semibold">VIN 认证</h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                每辆车通过 NHTSA 官方数据库验证，查看召回记录、安全评级和投诉历史
              </p>
            </div>
            <div className="border border-border p-4">
              <DollarSign className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-3 font-mono text-sm font-semibold">价格透明</h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                市场价格分析，降价监控提醒，帮你判断车辆定价是否合理
              </p>
            </div>
            <div className="border border-border p-4">
              <Zap className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-3 font-mono text-sm font-semibold">全中文服务</h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                中文搜索、中文沟通、中文客服，消除语言障碍，买车更安心
              </p>
            </div>
            <div className="border border-border p-4">
              <MapPin className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-3 font-mono text-sm font-semibold">覆盖全美</h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                纽约、洛杉矶、旧金山、芝加哥等华人聚集城市，按距离找到身边的车
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-mono text-lg font-semibold">买车三步走</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-border bg-background font-mono text-lg font-bold">1</div>
              <h3 className="mt-4 font-mono text-sm font-semibold">搜索筛选</h3>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                按品牌、价格、里程、地区等条件，快速找到心仪的车辆
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-border bg-background font-mono text-lg font-bold">2</div>
              <h3 className="mt-4 font-mono text-sm font-semibold">查看详情</h3>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                VIN 认证、安全召回查询、车辆配置一目了然，做出明智决定
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-border bg-background font-mono text-lg font-bold">3</div>
              <h3 className="mt-4 font-mono text-sm font-semibold">联系卖家</h3>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                在线私信或电话联系，中文沟通无障碍，约看车、谈价格
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For sellers */}
      <section className="border-t border-border px-4 py-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="font-mono text-lg font-semibold">想卖车？</h2>
          <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
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
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-muted/30 px-4 py-10">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-mono text-2xl font-bold">{featured.length > 0 ? `${featured.length}+` : "—"}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">在售车辆</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold">50+</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">覆盖州</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold">100%</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">免费使用</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
