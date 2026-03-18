"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Search,
  ArrowRight,
  Shield,
  MapPin,
  DollarSign,
  Zap,
  ChevronRight,
  Gauge,
} from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { getCurrentPosition, reverseGeocode, detectUserZip } from "@/lib/geocode";

import type { DbCar } from "@/lib/types";
import type { GeoResult } from "@/lib/geocode";

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
];

function buildUrl(params: Record<string, string>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/browse?${qs}` : "/browse";
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
  const [zip, setZip] = useState("");
  const [featured, setFeatured] = useState<DbCar[]>([]);
  const [userLocation, setUserLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("cars")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setFeatured(data as DbCar[]);
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
              <Link href="/browse" className="underline underline-offset-2">立即找车 →</Link>
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
            <Image src="/logo.png" alt="车来车网" width={48} height={48} className="h-10 w-10 object-contain drop-shadow-md brightness-0 invert md:h-14 md:w-14" />
            <h1 className="font-mono text-3xl font-semibold tracking-tight text-white drop-shadow-md md:text-5xl">
              车来车网
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
            {/* Row: Make | Keyword | ZIP | Search */}
            <div className="flex flex-col md:flex-row">
              {/* Make dropdown */}
              <div className="border-b border-border md:border-b-0 md:border-r">
                <Select value={make} onValueChange={setMake}>
                  <SelectTrigger className="h-12 rounded-none border-0 px-4 font-mono text-sm shadow-none focus:ring-0 md:w-44">
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

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-5xl">
            <div
              className="mb-4 flex items-center justify-between"
            >
              <h2 className="font-mono text-sm font-medium">最新车源</h2>
              <Link
                href="/browse"
                className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                查看全部
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </div>
            <div
              className="grid grid-cols-2 gap-3 md:grid-cols-3"
            >
              {featured.map((car) => (
                <div key={car.id}>
                <Link
                  href={`/car/${car.id}`}
                  className="group block border border-border transition-colors hover:border-foreground/20"
                >
                  {/* Image */}
                  <div className="aspect-16/10 overflow-hidden bg-muted">
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

      {/* Features - minimal */}
      <section
        className="border-t border-border px-4 py-8"
      >
        <div className="mx-auto flex max-w-2xl justify-around">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              可靠车源
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              覆盖全美
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              价格透明
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              中文服务
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
