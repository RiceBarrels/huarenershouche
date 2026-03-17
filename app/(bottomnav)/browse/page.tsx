"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { ArrowUpDown, Search, SlidersHorizontal, X, Clock, Trash2, MapPin, Loader2, Car } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { SearchFilters, US_STATES } from "@/components/search-filters";
import { MobileFilterDrawer, BrandDrawerContent } from "@/components/mobile-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { match } from "pinyin-pro";
import { MAKES_ZH } from "@/lib/mock-data";
import { detectUserZip, geocodeZipToCoords, haversineDistance, lookupZip } from "@/lib/geocode";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { getSearchHistory, addSearchHistory, clearSearchHistory } from "@/lib/search-history";
import { getPriceInsight } from "@/lib/price-insight";
import { BackToTop } from "@/components/back-to-top";
import { CompareBar } from "@/components/compare-bar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
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
  interiorColor: string;
  cylinders: string;
  maxDistance: string;
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
  interiorColor: "",
  cylinders: "",
  maxDistance: "",
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
    interiorColor: sp.get("interiorColor") || "",
    cylinders: sp.get("cylinders") || "",
    maxDistance: sp.get("maxDistance") || "",
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
  const [zipLabel, setZipLabel] = useState("");
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

  // Geocode user zipcode for distance calculation + location name + auto-set location
  useEffect(() => {
    if (/^\d{5}$/.test(userZip)) {
      geocodeZipToCoords(userZip).then((coords) => {
        setUserCoords(coords);
      });
      lookupZip(userZip).then((geo) => {
        if (!geo) { setZipLabel(""); return; }
        setZipLabel(geo.formatted);
        // Auto-set location filter from zip
        const state = US_STATES.find((s) => s.value === geo.stateCode);
        if (state) {
          if (state.subRegions) {
            const cityLower = geo.city.toLowerCase();
            const sub = state.subRegions.find((sr) =>
              sr.label.toLowerCase().includes(cityLower) && !sr.value.endsWith("-other")
            );
            setFilters((f) => ({ ...f, location: sub ? sub.value : state.value }));
          } else {
            setFilters((f) => ({ ...f, location: state.value }));
          }
        }
      });
    } else {
      setUserCoords(null);
      setZipLabel("");
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
    if (filters.make) {
      for (const m of filters.make.split(",")) {
        chips.push({ key: "make", label: MAKES_ZH[m] || m });
      }
    }
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
    if (filters.fuelType) {
      for (const v of filters.fuelType.split(",")) {
        chips.push({ key: "fuelType", label: v });
      }
    }
    if (filters.drivetrain) {
      for (const v of filters.drivetrain.split(",")) {
        chips.push({ key: "drivetrain", label: v });
      }
    }
    if (filters.maxMileage) chips.push({ key: "maxMileage", label: `≤${(Number(filters.maxMileage) / 10000).toFixed(0)}万mi` });
    if (filters.exteriorColor) {
      for (const v of filters.exteriorColor.split(",")) {
        chips.push({ key: "exteriorColor", label: "外" + v + "色" });
      }
    }
    if (filters.interiorColor) {
      for (const v of filters.interiorColor.split(",")) {
        chips.push({ key: "interiorColor", label: "内" + v + "色" });
      }
    }
    if (filters.maxDistance) chips.push({ key: "maxDistance", label: `≤${filters.maxDistance}mi` });
    return chips;
  }, [filters]);

  const filtered = useMemo(() => {
    // Helper: check if car value matches any of the comma-separated filter values
    function matchesMulti(filterVal: string, carVal: string | undefined | null): boolean {
      if (!filterVal) return true;
      if (!carVal) return false;
      return filterVal.split(",").includes(carVal);
    }

    function matchesColorMulti(filterVal: string, carVal: string | undefined | null): boolean {
      if (!filterVal) return true;
      if (!carVal) return false;
      return filterVal.split(",").some((c) => carVal.includes(c));
    }

    // Filter without location first to check fallback
    function applyNonLocationFilters(car: DbCar): boolean {
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const zhText = `${car.title_zh} ${MAKES_ZH[car.make] || ""} ${car.location_zh} ${car.seller_name} ${car.fuel_type} ${car.exterior_color || ""}`;
        const enText = `${car.title} ${car.make} ${car.model}`.toLowerCase();
        if (!enText.includes(kw) && match(zhText, kw) === null) return false;
      }
      if (filters.make && !matchesMulti(filters.make, car.make)) return false;
      if (filters.minPrice && car.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && car.price > Number(filters.maxPrice)) return false;
      if (filters.minYear && car.year < Number(filters.minYear)) return false;
      if (filters.maxYear && car.year > Number(filters.maxYear)) return false;
      if (filters.sellerType && car.profiles?.account_type !== filters.sellerType) return false;
      if (filters.fuelType && !matchesMulti(filters.fuelType, car.fuel_type)) return false;
      if (filters.transmission && !matchesMulti(filters.transmission, car.transmission)) return false;
      if (filters.drivetrain && !matchesMulti(filters.drivetrain, car.drivetrain)) return false;
      if (filters.maxMileage && car.mileage > Number(filters.maxMileage)) return false;
      if (filters.exteriorColor && !matchesColorMulti(filters.exteriorColor, car.exterior_color)) return false;
      if (filters.interiorColor && !matchesColorMulti(filters.interiorColor, car.interior_color)) return false;
      return true;
    }

    const NYC_KEYWORDS = ["manhattan", "brooklyn", "queens", "bronx", "staten island", "曼哈顿", "布鲁克林", "皇后", "布朗克斯", "史丹顿"];

    function applyLocationFilter(car: DbCar): boolean {
      if (!filters.location) return true;
      const loc = filters.location;
      const locLower = car.location.toLowerCase();
      const locZh = car.location_zh;
      if (loc === "NY-NYC") {
        // Match any of the 5 NYC boroughs
        return NYC_KEYWORDS.some((kw) => locLower.includes(kw) || locZh.includes(kw));
      } else if (loc.includes("-")) {
        const [state] = loc.split("-");
        if (!locLower.includes(state.toLowerCase()) && !locZh.includes(state)) return false;
      } else if (/^\d{5}$/.test(loc)) {
        // Zipcode — don't hard-filter, let distance sort handle it
      } else {
        if (!locLower.includes(loc.toLowerCase()) && !locZh.includes(loc)) return false;
      }
      return true;
    }

    // Apply non-location filters
    const nonLocFiltered = cars.filter(applyNonLocationFilters);

    // Try applying location filter
    let result: DbCar[];
    let usingDistanceFallback = false;
    if (filters.location) {
      const locFiltered = nonLocFiltered.filter(applyLocationFilter);
      if (locFiltered.length > 0) {
        result = locFiltered;
      } else {
        // Fallback: show all results sorted by distance
        result = nonLocFiltered;
        usingDistanceFallback = true;
      }
    } else {
      result = nonLocFiltered;
    }

    // Apply distance filter
    if (filters.maxDistance && userCoords) {
      const maxDist = Number(filters.maxDistance);
      if (maxDist > 0) {
        result = result.filter((car) => {
          const d = distances.get(car.id);
          return d !== undefined && d <= maxDist;
        });
      }
    }

    const sorted = [...result];
    // If location yielded no results and we have coords, sort by distance
    const effectiveSort = usingDistanceFallback && userCoords ? "distance" as SortKey : sort;
    switch (effectiveSort) {
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
  }, [cars, filters, sort, distances, userCoords]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />

      {/* Banner */}
      <div className="hidden border-b border-border bg-gradient-to-r from-foreground/[0.03] to-foreground/[0.06] sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-mono text-sm font-semibold">车来车网</p>
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
                  filters={filters}
                  onFilter={setFilters}
                  activeCount={activeFilterChips.length}
                />
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`gap-1 font-mono text-xs ${filters.make ? "border-foreground" : ""}`}
              >
                <Car className="h-3.5 w-3.5" strokeWidth={1.5} />
                {filters.make ? (filters.make.split(",").length > 1 ? `${MAKES_ZH[filters.make.split(",")[0]] || filters.make.split(",")[0]}等${filters.make.split(",").length}品牌` : MAKES_ZH[filters.make] || filters.make) : "全部品牌"}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <DrawerClose asChild>
                  <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </DrawerClose>
                <span className="font-mono text-sm font-semibold">选择品牌</span>
                <div className="h-8 w-8" />
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">
                <BrandDrawerContent
                  filters={filters as any}
                  onUpdate={(key, value) => setFilters({ ...filters, [key]: value })}
                />
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 font-mono text-xs"
              >
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                {SORT_OPTIONS.find((o) => o.value === sort)?.label || "排序"}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <DrawerClose asChild>
                  <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </DrawerClose>
                <span className="font-mono text-sm font-semibold">排序方式</span>
                <div className="h-8 w-8" />
              </div>
              <div className="px-4 pb-6">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-3 font-mono text-sm transition-colors ${sort === opt.value ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
                    onClick={() => setSort(opt.value)}
                  >
                    {opt.label}
                    {sort === opt.value && (
                      <span className="text-foreground">✓</span>
                    )}
                  </button>
                ))}
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
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2} />
              清空所有
            </button>
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
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-border">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.map((car) => (
                <div
                  key={car.id}
                >
                  <CarCard
                    car={car}
                    distance={distances.get(car.id)}
                    priceInsight={getPriceInsight(car, cars)}
                  />
                </div>
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
            <section
              className="mt-10 border-t border-border pt-6"
            >
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
      <CompareBar />
    </div>
  );
}
