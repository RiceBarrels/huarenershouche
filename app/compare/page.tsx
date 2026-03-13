"use client";

import { useState, useEffect } from "react";
import { X, Plus, Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCompareIds, clearCompare } from "@/lib/compare";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MAKES_ZH } from "@/lib/mock-data";
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

const COMPARE_FIELDS: { key: keyof DbCar | "make_zh" | "account_type"; label: string }[] = [
  { key: "make_zh", label: "品牌" },
  { key: "year", label: "年份" },
  { key: "price", label: "价格" },
  { key: "mileage", label: "里程" },
  { key: "fuel_type", label: "燃油类型" },
  { key: "transmission", label: "变速箱" },
  { key: "drivetrain", label: "驱动方式" },
  { key: "exterior_color", label: "外观颜色" },
  { key: "interior_color", label: "内饰颜色" },
  { key: "location_zh", label: "所在地" },
  { key: "account_type", label: "卖家类型" },
  { key: "views_count", label: "浏览量" },
];

export default function ComparePage() {
  const [cars, setCars] = useState<(DbCar | null)[]>([null, null, null]);
  const [allCars, setAllCars] = useState<DbCar[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCars() {
      const { data } = await supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const all = (data as DbCar[]) || [];
      setAllCars(all);

      // Pre-fill from compare bar selections
      const compareIds = getCompareIds();
      if (compareIds.length > 0) {
        const prefilled = compareIds
          .map((id) => all.find((c) => c.id === id) || null)
          .slice(0, 3);
        while (prefilled.length < 3) prefilled.push(null);
        setCars(prefilled);
        clearCompare();
      }
    }
    fetchCars();
  }, []);

  const filteredCars = allCars.filter((car) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      car.title.toLowerCase().includes(q) ||
      car.title_zh.includes(searchQuery) ||
      car.make.toLowerCase().includes(q)
    );
  });

  const selectedIds = cars.filter(Boolean).map((c) => c!.id);

  function selectCar(car: DbCar) {
    if (activeSlot === null) return;
    const next = [...cars];
    next[activeSlot] = car;
    setCars(next);
    setActiveSlot(null);
    setSearchQuery("");
  }

  function removeCar(index: number) {
    const next = [...cars];
    next[index] = null;
    setCars(next);
  }

  function getCellValue(car: DbCar, key: string): string {
    switch (key) {
      case "make_zh":
        return `${MAKES_ZH[car.make] || car.make} ${car.make}`;
      case "price":
        return formatPrice(car.price);
      case "mileage":
        return `${formatMileage(car.mileage)} mi`;
      case "account_type":
        return car.profiles?.account_type === "dealer" ? "车行" : "个人";
      case "views_count":
        return String(car.views_count || 0);
      default:
        return String((car as any)[key] || "—");
    }
  }

  function getBestValue(
    key: string
  ): string | null {
    const filled = cars.filter(Boolean) as DbCar[];
    if (filled.length < 2) return null;
    switch (key) {
      case "price":
        return filled.reduce((a, b) => (a.price < b.price ? a : b)).id;
      case "mileage":
        return filled.reduce((a, b) => (a.mileage < b.mileage ? a : b)).id;
      case "year":
        return filled.reduce((a, b) => (a.year > b.year ? a : b)).id;
      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            车辆对比
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            选择最多 3 辆车进行对比
          </p>
        </div>

        {/* Car slots */}
        <div className="grid grid-cols-3 gap-3">
          {cars.map((car, i) => (
            <div key={i} className="border border-border">
              {car ? (
                <div className="relative">
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                        暂无图片
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeCar(i)}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <div className="p-2">
                    <p className="truncate font-mono text-xs font-semibold">
                      {car.title_zh}
                    </p>
                    <p className="font-mono text-sm font-bold">
                      {formatPrice(car.price)}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setActiveSlot(i)}
                  className={`flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 transition-colors hover:bg-muted/50 ${
                    activeSlot === i ? "bg-muted" : ""
                  }`}
                >
                  <Plus className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  <span className="font-mono text-xs text-muted-foreground">
                    添加车辆
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Search panel */}
        {activeSlot !== null && (
          <div className="mt-4 border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                搜索并选择车辆
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 font-mono text-xs"
                onClick={() => {
                  setActiveSlot(null);
                  setSearchQuery("");
                }}
              >
                取消
              </Button>
            </div>
            <Input
              placeholder="输入品牌、车型..."
              className="mt-2 font-mono text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
              {filteredCars
                .filter((c) => !selectedIds.includes(c.id))
                .slice(0, 20)
                .map((car) => (
                  <button
                    key={car.id}
                    onClick={() => selectCar(car)}
                    className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-muted"
                  >
                    <div className="h-10 w-16 shrink-0 overflow-hidden bg-muted">
                      {car.image_url && (
                        <img
                          src={car.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-medium">
                        {car.title_zh}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {formatPrice(car.price)} · {formatMileage(car.mileage)}{" "}
                        mi
                      </p>
                    </div>
                  </button>
                ))}
              {filteredCars.length === 0 && (
                <p className="py-4 text-center font-mono text-xs text-muted-foreground">
                  没有找到匹配的车辆
                </p>
              )}
            </div>
          </div>
        )}

        {/* Comparison table */}
        {cars.some(Boolean) && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                {COMPARE_FIELDS.map((field) => {
                  const bestId = getBestValue(field.key);
                  return (
                    <tr key={field.key} className="border-b border-border">
                      <td className="whitespace-nowrap bg-muted/30 px-3 py-2.5 font-mono text-[11px] font-medium text-muted-foreground">
                        {field.label}
                      </td>
                      {cars.map((car, i) => (
                        <td
                          key={i}
                          className={`px-3 py-2.5 font-mono text-xs ${
                            car && bestId === car.id
                              ? "font-semibold text-green-600 dark:text-green-400"
                              : ""
                          }`}
                        >
                          {car ? getCellValue(car, field.key) : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {/* Features row */}
                <tr className="border-b border-border">
                  <td className="whitespace-nowrap bg-muted/30 px-3 py-2.5 font-mono text-[11px] font-medium text-muted-foreground">
                    配置
                  </td>
                  {cars.map((car, i) => (
                    <td key={i} className="px-3 py-2.5">
                      {car && car.features?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {car.features.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {f}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono text-xs">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!cars.some(Boolean) && (
          <div className="mt-12 flex flex-col items-center justify-center py-12">
            <Scale className="h-10 w-10 text-muted-foreground/40" strokeWidth={1} />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              点击上方"添加车辆"开始对比
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
