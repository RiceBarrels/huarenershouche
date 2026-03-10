"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal, X, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { SearchFilters } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { match } from "pinyin-pro";
import { MAKES_ZH } from "@/lib/mock-data";
import { detectUserZip, geocodeZipToCoords, haversineDistance } from "@/lib/geocode";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { getSearchHistory, addSearchHistory, clearSearchHistory } from "@/lib/search-history";
import { getPriceInsight } from "@/lib/price-insight";
import { BackToTop } from "@/components/back-to-top";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { DbCar } from "@/lib/types";

interface Filters {
  keyword: string;
  make: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  location: string;
  sellerType: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  maxMileage: string;
  exteriorColor: string;
}

const INITIAL_FILTERS: Filters = {
  keyword: "",
  make: "",
  minPrice: "",
  maxPrice: "",
  minYear: "",
  maxYear: "",
  location: "",
  sellerType: "",
  fuelType: "",
  transmission: "",
  drivetrain: "",
  maxMileage: "",
  exteriorColor: "",
};

type SortKey = "newest" | "price-asc" | "price-desc" | "mileage" | "year" | "distance";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "最新发布" },
  { value: "price-asc", label: "价格↑" },
  { value: "price-desc", label: "价格↓" },
  { value: "mileage", label: "里程最少" },
  { value: "year", label: "年份最新" },
  { value: "distance", label: "距离最近" },
];

function filtersFromParams(sp: URLSearchParams): Filters {
  return {
    keyword: sp.get("q") || "",
    make: sp.get("make") || "",
    minPrice: sp.get("minPrice") || "",
    maxPrice: sp.get("maxPrice") || "",
    minYear: sp.get("minYear") || "",
    maxYear: sp.get("maxYear") || "",
    location: sp.get("location") || "",
    sellerType: sp.get("sellerType") || "",
    fuelType: sp.get("fuelType") || "",
    transmission: sp.get("transmission") || "",
    drivetrain: sp.get("drivetrain") || "",
    maxMileage: sp.get("maxMileage") || "",
    exteriorColor: sp.get("exteriorColor") || "",
  };
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams));
  const [sort, setSort] = useState<SortKey>("newest");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [recentCars, setRecentCars] = useState<DbCar[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [userZip, setUserZip] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync filters when URL params change
  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    async function fetchCars() {
      const { data } = await supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const allCars = (data as DbCar[]) || [];
      setCars(allCars);
      setLoading(false);

      const recentIds = getRecentlyViewed();
      if (recentIds.length > 0) {
        const recent = recentIds
          .map((id) => allCars.find((c) => c.id === id))
          .filter(Boolean) as DbCar[];
        setRecentCars(recent.slice(0, 6));
      }
    }
    fetchCars();

    // Auto-detect user zipcode on first visit
    if (!userZip) {
      detectUserZip().then((zip) => {
        if (zip) setUserZip(zip);
      });
    }
  }, []);

  // Geocode user zipcode for distance calculation
  useEffect(() => {
    if (/^\d{5}$/.test(userZip)) {
      geocodeZipToCoords(userZip).then((coords) => {
        setUserCoords(coords);
      });
    } else {
      setUserCoords(null);
    }
  }, [userZip]);

  const distances = useMemo(() => {
    if (!userCoords) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const car of cars) {
      if (car.lat && car.lng) {
        map.set(car.id, haversineDistance(userCoords.lat, userCoords.lng, car.lat, car.lng));
      }
    }
    return map;
  }, [cars, userCoords]);

  function clearFilter(key: string) {
    const next = { ...filters };
    if (key === "price") {
      next.minPrice = "";
      next.maxPrice = "";
    } else if (key === "year") {
      next.minYear = "";
      next.maxYear = "";
    } else {
      (next as Record<string, string>)[key] = "";
    }
    setFilters(next);
  }

  // Build active filter chips for mobile display
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.make) chips.push({ key: "make", label: MAKES_ZH[filters.make] || filters.make });
    if (filters.location) chips.push({ key: "location", label: filters.location });
    if (filters.sellerType) chips.push({ key: "sellerType", label: filters.sellerType === "dealer" ? "车行" : "个人" });
    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : "$0";
      const max = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : "不限";
      chips.push({ key: "price", label: `${min}-${max}` });
    }
    if (filters.minYear || filters.maxYear) {
      const min = filters.minYear || "2000";
      const max = filters.maxYear || "2026";
      chips.push({ key: "year", label: `${min}-${max}年` });
    }
    if (filters.fuelType) chips.push({ key: "fuelType", label: filters.fuelType });
    if (filters.transmission) chips.push({ key: "transmission", label: filters.transmission });
    if (filters.drivetrain) chips.push({ key: "drivetrain", label: filters.drivetrain });
    if (filters.maxMileage) chips.push({ key: "maxMileage", label: `≤${(Number(filters.maxMileage) / 10000).toFixed(0)}万mi` });
    if (filters.exteriorColor) chips.push({ key: "exteriorColor", label: filters.exteriorColor + "色" });
    return chips;
  }, [filters]);

  const filtered = useMemo(() => {
    let result = cars.filter((car) => {
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const zhText = `${car.title_zh} ${MAKES_ZH[car.make] || ""} ${car.location_zh} ${car.seller_name} ${car.fuel_type} ${car.exterior_color || ""}`;
        const enText = `${car.title} ${car.make} ${car.model}`.toLowerCase();
        if (!enText.includes(kw) && match(zhText, kw) === null) return false;
      }
      if (filters.make && car.make !== filters.make) return false;
      if (filters.minPrice && car.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && car.price > Number(filters.maxPrice)) return false;
      if (filters.minYear && car.year < Number(filters.minYear)) return false;
      if (filters.maxYear && car.year > Number(filters.maxYear)) return false;
      if (
        filters.location &&
        !car.location.toLowerCase().includes(filters.location.toLowerCase()) &&
        !car.location_zh.includes(filters.location)
      )
        return false;
      if (filters.sellerType && car.profiles?.account_type !== filters.sellerType) return false;
      if (filters.fuelType && car.fuel_type !== filters.fuelType) return false;
      if (filters.transmission && car.transmission !== filters.transmission) return false;
      if (filters.drivetrain && car.drivetrain !== filters.drivetrain) return false;
      if (filters.maxMileage && car.mileage > Number(filters.maxMileage)) return false;
      if (
        filters.exteriorColor &&
        car.exterior_color &&
        !car.exterior_color.includes(filters.exteriorColor)
      )
        return false;
      return true;
    });

    const sorted = [...result];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "mileage":
        sorted.sort((a, b) => a.mileage - b.mileage);
        break;
      case "year":
        sorted.sort((a, b) => b.year - a.year);
        break;
      case "distance":
        sorted.sort((a, b) => {
          const da = distances.get(a.id) ?? Infinity;
          const db = distances.get(b.id) ?? Infinity;
          return da - db;
        });
        break;
      default:
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    return sorted;
  }, [cars, filters, sort, distances]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />

      {/* Banner */}
      <div className="border-b border-border bg-gradient-to-r from-foreground/[0.03] to-foreground/[0.06]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-mono text-sm font-semibold">华人二手车 HuarenCars</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              北美华人最信赖的二手车交易平台 · 免费发布 · 中文服务
            </p>
          </div>
          <Link href="/post">
            <Button size="sm" className="font-mono text-xs">
              免费发布车辆
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile: search bar + filter button */}
      <div className="border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div ref={searchWrapperRef} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="搜索品牌、车型..."
              className="pl-9 font-mono text-sm"
              value={filters.keyword}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                const next = { ...filters, keyword: e.target.value };
                setFilters(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filters.keyword.trim()) {
                  addSearchHistory(filters.keyword.trim());
                  setSearchHistory(getSearchHistory());
                  setSearchFocused(false);
                }
              }}
            />
            {/* Search history dropdown */}
            {searchFocused && !filters.keyword && searchHistory.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 border border-border bg-background shadow-md">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">搜索历史</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearSearchHistory();
                      setSearchHistory([]);
                    }}
                    className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} />
                    清除
                  </button>
                </div>
                {searchHistory.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setFilters({ ...filters, keyword: term });
                      setSearchFocused(false);
                    }}
                  >
                    <Clock className="h-3 w-3" strokeWidth={1.5} />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative gap-1 font-mono text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                筛选
                {activeFilterChips.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[10px] text-background">
                    {activeFilterChips.length}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="font-mono text-sm">筛选</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6">
                <SearchFilters onFilter={setFilters} initialFilters={filters} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => clearFilter(chip.key)}
                className="flex items-center gap-1 border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] transition-colors hover:bg-muted"
              >
                {chip.label}
                <X className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={2} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        {/* Left sidebar filters — desktop only */}
        <div className="hidden w-[240px] shrink-0 md:block">
          <div className="sticky top-4">
            <SearchFilters onFilter={setFilters} initialFilters={filters} />
          </div>
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-mono text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                返回搜索
              </Link>
              <p className="font-mono text-xs text-muted-foreground">
                共{" "}
                <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                辆车
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="你的 Zipcode"
                className="h-8 w-[110px] font-mono text-xs"
                maxLength={5}
                value={userZip}
                onChange={(e) => setUserZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              />
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-auto min-w-[130px] gap-1 font-mono text-xs">
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-border">
                  <Skeleton className="aspect-16/10 w-full" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  distance={distances.get(car.id)}
                  priceInsight={getPriceInsight(car, cars)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="font-mono text-sm text-muted-foreground">
                没有找到符合条件的车辆
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 font-mono text-xs"
                onClick={() => setFilters(INITIAL_FILTERS)}
              >
                清除所有筛选
              </Button>
            </div>
          )}

          {recentCars.length > 0 && (
            <section className="mt-10 border-t border-border pt-6">
              <h2 className="font-mono text-sm font-semibold">最近浏览</h2>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {recentCars.map((car) => (
                  <CarCard
                    key={"recent-" + car.id}
                    car={car}
                    distance={distances.get(car.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <Footer />
      <BackToTop />
    </div>
  );
}
