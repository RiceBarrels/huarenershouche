"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LocationCombobox } from "@/components/location-combobox";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";

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

const PRICE_OPTIONS = [
  { value: "5000", label: "$5,000" },
  { value: "10000", label: "$10,000" },
  { value: "15000", label: "$15,000" },
  { value: "20000", label: "$20,000" },
  { value: "25000", label: "$25,000" },
  { value: "30000", label: "$30,000" },
  { value: "40000", label: "$40,000" },
  { value: "50000", label: "$50,000" },
  { value: "75000", label: "$75,000" },
  { value: "100000", label: "$100,000" },
];

const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const year = 2026 - i;
  return { value: String(year), label: String(year) };
});

const MILEAGE_OPTIONS = [
  { value: "10000", label: "1万英里以内" },
  { value: "30000", label: "3万英里以内" },
  { value: "50000", label: "5万英里以内" },
  { value: "75000", label: "7.5万英里以内" },
  { value: "100000", label: "10万英里以内" },
  { value: "150000", label: "15万英里以内" },
];

const FUEL_OPTIONS = [
  { value: "汽油", label: "汽油" },
  { value: "纯电", label: "纯电" },
  { value: "混动", label: "混动" },
  { value: "插电混动", label: "插电混动" },
  { value: "柴油", label: "柴油" },
];

const TRANSMISSION_OPTIONS = [
  { value: "自动", label: "自动挡" },
  { value: "手动", label: "手动挡" },
];

const DRIVETRAIN_OPTIONS = [
  { value: "FWD", label: "前驱 FWD" },
  { value: "RWD", label: "后驱 RWD" },
  { value: "AWD", label: "四驱 AWD" },
  { value: "4WD", label: "四驱 4WD" },
];

const COLOR_OPTIONS = [
  { value: "白", label: "白色", color: "#ffffff" },
  { value: "黑", label: "黑色", color: "#1a1a1a" },
  { value: "灰", label: "灰色", color: "#808080" },
  { value: "银", label: "银色", color: "#c0c0c0" },
  { value: "红", label: "红色", color: "#dc2626" },
  { value: "蓝", label: "蓝色", color: "#2563eb" },
  { value: "绿", label: "绿色", color: "#16a34a" },
  { value: "金", label: "金色", color: "#ca8a04" },
  { value: "棕", label: "棕色", color: "#78350f" },
];

export function SearchFilters({
  onFilter,
  initialFilters,
}: {
  onFilter: (filters: Filters) => void;
  initialFilters?: Filters;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters || INITIAL_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initialFilters) setFilters(initialFilters);
  }, [initialFilters]);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== "keyword"
  ).length;

  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilter(next);
  }

  function reset() {
    setFilters(INITIAL_FILTERS);
    onFilter(INITIAL_FILTERS);
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Main search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="搜索品牌、车型、关键词..."
              className="pl-9 font-mono text-sm"
              value={filters.keyword}
              onChange={(e) => update("keyword", e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-xs"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            筛选
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 font-mono text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Quick filters row */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={filters.make} onValueChange={(v) => update("make", v)}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] font-mono text-xs">
              <SelectValue placeholder="品牌" />
            </SelectTrigger>
            <SelectContent>
              {MAKES.map((make) => (
                <SelectItem key={make} value={make} className="font-mono text-xs">
                  {MAKES_ZH[make]} {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-auto min-w-[140px]">
            <LocationCombobox
              value={filters.location}
              onValueChange={(v) => update("location", v)}
              placeholder="地区"
              className="h-8"
            />
          </div>

          <Select value={filters.sellerType} onValueChange={(v) => update("sellerType", v)}>
            <SelectTrigger className="h-8 w-auto min-w-[80px] font-mono text-xs">
              <SelectValue placeholder="卖家类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dealer" className="font-mono text-xs">
                车行
              </SelectItem>
              <SelectItem value="private" className="font-mono text-xs">
                个人
              </SelectItem>
            </SelectContent>
          </Select>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 font-mono text-xs text-muted-foreground"
              onClick={reset}
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
              清除
            </Button>
          )}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {/* Row 1: Price & Year */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">最低价格</Label>
                <Select value={filters.minPrice} onValueChange={(v) => update("minPrice", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">最高价格</Label>
                <Select value={filters.maxPrice} onValueChange={(v) => update("maxPrice", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">最早年份</Label>
                <Select value={filters.minYear} onValueChange={(v) => update("minYear", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">最新年份</Label>
                <Select value={filters.maxYear} onValueChange={(v) => update("maxYear", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Fuel, Transmission, Drivetrain, Mileage */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">燃油类型</Label>
                <Select value={filters.fuelType} onValueChange={(v) => update("fuelType", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">变速箱</Label>
                <Select value={filters.transmission} onValueChange={(v) => update("transmission", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">驱动方式</Label>
                <Select value={filters.drivetrain} onValueChange={(v) => update("drivetrain", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVETRAIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">最高里程</Label>
                <Select value={filters.maxMileage} onValueChange={(v) => update("maxMileage", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {MILEAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Color */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">外观颜色</Label>
                <Select value={filters.exteriorColor} onValueChange={(v) => update("exteriorColor", v)}>
                  <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: opt.color }}
                          />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
