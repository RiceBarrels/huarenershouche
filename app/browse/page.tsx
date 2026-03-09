"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { SearchFilters } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { match } from "pinyin-pro";
import { MAKES_ZH } from "@/lib/mock-data";
import { getUserCoords, haversineDistance } from "@/lib/geocode";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { getPriceInsight } from "@/lib/price-insight";
import { BackToTop } from "@/components/back-to-top";
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

  // Sync filters when URL params change
  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    async function fetchCars() {
      const { data } = await supabase
        .from("cars")
        .select("*")
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
    getUserCoords().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

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
      if (filters.sellerType && car.seller_type !== filters.sellerType) return false;
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

      <SearchFilters onFilter={setFilters} initialFilters={filters} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
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
          <div className="flex items-center gap-1">
            <ArrowUpDown className="mr-1 h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`px-2 py-1 font-mono text-[11px] transition-colors ${
                  sort === opt.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

      <Footer />
      <BackToTop />
    </div>
  );
}
