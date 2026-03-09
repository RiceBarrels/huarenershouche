"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
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

type SortKey = "newest" | "price-asc" | "price-desc" | "mileage" | "year" | "distance";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "最新发布" },
  { value: "price-asc", label: "价格↑" },
  { value: "price-desc", label: "价格↓" },
  { value: "mileage", label: "里程最少" },
  { value: "year", label: "年份最新" },
  { value: "distance", label: "距离最近" },
];

const POPULAR_MAKES = [
  "Toyota",
  "Honda",
  "BMW",
  "Mercedes-Benz",
  "Tesla",
  "Lexus",
];

export default function Home() {
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
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
  });
  const [sort, setSort] = useState<SortKey>("newest");
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [recentCars, setRecentCars] = useState<DbCar[]>([]);

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

      // Load recently viewed
      const recentIds = getRecentlyViewed();
      if (recentIds.length > 0) {
        const recent = recentIds
          .map((id) => allCars.find((c) => c.id === id))
          .filter(Boolean) as DbCar[];
        setRecentCars(recent.slice(0, 6));
      }
    }
    fetchCars();
    // Silently try to get user location for distance display
    getUserCoords().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

  // Pre-compute distances
  const distances = useMemo(() => {
    if (!userCoords) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const car of cars) {
      if (car.lat && car.lng) {
        map.set(
          car.id,
          haversineDistance(userCoords.lat, userCoords.lng, car.lat, car.lng)
        );
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
        // pinyin-pro match: supports full pinyin, initials, and mixed input
        if (!enText.includes(kw) && match(zhText, kw) === null) return false;
      }
      if (filters.make && car.make !== filters.make) return false;
      if (filters.minPrice && car.price < Number(filters.minPrice))
        return false;
      if (filters.maxPrice && car.price > Number(filters.maxPrice))
        return false;
      if (filters.minYear && car.year < Number(filters.minYear)) return false;
      if (filters.maxYear && car.year > Number(filters.maxYear)) return false;
      if (
        filters.location &&
        !car.location.toLowerCase().includes(filters.location.toLowerCase()) &&
        !car.location_zh.includes(filters.location)
      )
        return false;
      if (filters.sellerType && car.seller_type !== filters.sellerType)
        return false;
      if (filters.fuelType && car.fuel_type !== filters.fuelType)
        return false;
      if (filters.transmission && car.transmission !== filters.transmission)
        return false;
      if (filters.drivetrain && car.drivetrain !== filters.drivetrain)
        return false;
      if (filters.maxMileage && car.mileage > Number(filters.maxMileage))
        return false;
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
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    }
    return sorted;
  }, [cars, filters, sort, distances]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />

      {/* Hero */}
      <section className="border-b border-border bg-foreground px-4 py-12 text-background">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-mono text-2xl font-semibold tracking-tight md:text-3xl">
            北美华人二手车交易平台
          </h1>
          <p className="mt-2 font-mono text-sm text-background/60">
            可靠车源 · 中文服务 · 覆盖全美主要华人社区
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {POPULAR_MAKES.map((make) => (
              <button
                key={make}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    make: f.make === make ? "" : make,
                  }))
                }
                className={`border px-3 py-1.5 font-mono text-xs transition-colors ${
                  filters.make === make
                    ? "border-background bg-background text-foreground"
                    : "border-background/20 text-background/80 hover:border-background/40 hover:text-background"
                }`}
              >
                {MAKES_ZH[make]} {make}
              </button>
            ))}
          </div>
        </div>
      </section>

      <SearchFilters onFilter={setFilters} />

      {/* Results */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-xs text-muted-foreground">
            共{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            辆车
          </p>
          <div className="flex items-center gap-1">
            <ArrowUpDown
              className="mr-1 h-3 w-3 text-muted-foreground"
              strokeWidth={1.5}
            />
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
                <Skeleton className="aspect-[16/10] w-full" />
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
              onClick={() =>
                setFilters({
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
                })
              }
            >
              清除所有筛选
            </Button>
          </div>
        )}

        {/* Recently viewed */}
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

        {/* Stats */}
        <section className="mt-12 border-t border-border pt-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="border border-border p-4">
              <p className="font-mono text-2xl font-semibold">1,200+</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                在售车辆
              </p>
            </div>
            <div className="border border-border p-4">
              <p className="font-mono text-2xl font-semibold">50+</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                认证车行
              </p>
            </div>
            <div className="border border-border p-4">
              <p className="font-mono text-2xl font-semibold">10</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                覆盖城市
              </p>
            </div>
            <div className="border border-border p-4">
              <p className="font-mono text-2xl font-semibold">中文</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                全程服务
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
