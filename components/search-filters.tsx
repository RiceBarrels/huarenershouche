"use client";

import { Search, X, Clock, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getSearchHistory, addSearchHistory, clearSearchHistory } from "@/lib/search-history";
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
import { Slider } from "@/components/ui/slider";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";

const US_STATES = [
  { value: "CA", label: "加州 California" },
  { value: "NY", label: "纽约 New York" },
  { value: "TX", label: "德州 Texas" },
  { value: "FL", label: "佛州 Florida" },
  { value: "IL", label: "伊利诺伊 Illinois" },
  { value: "WA", label: "华盛顿 Washington" },
  { value: "MA", label: "麻省 Massachusetts" },
  { value: "NJ", label: "新泽西 New Jersey" },
  { value: "PA", label: "宾州 Pennsylvania" },
  { value: "GA", label: "乔治亚 Georgia" },
  { value: "OH", label: "俄亥俄 Ohio" },
  { value: "MI", label: "密歇根 Michigan" },
  { value: "NC", label: "北卡 North Carolina" },
  { value: "VA", label: "弗吉尼亚 Virginia" },
  { value: "AZ", label: "亚利桑那 Arizona" },
  { value: "MD", label: "马里兰 Maryland" },
  { value: "CO", label: "科罗拉多 Colorado" },
  { value: "MN", label: "明尼苏达 Minnesota" },
  { value: "OR", label: "俄勒冈 Oregon" },
  { value: "NV", label: "内华达 Nevada" },
  { value: "CT", label: "康州 Connecticut" },
  { value: "HI", label: "夏威夷 Hawaii" },
];

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
  { value: "AT", label: "AT 自动" },
  { value: "手动", label: "手动挡" },
  { value: "CVT", label: "CVT 无级变速" },
  { value: "双离合", label: "双离合 DCT" },
  { value: "E-CVT", label: "E-CVT 电子无级" },
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
  { value: "橙", label: "橙色", color: "#e87830" },
  { value: "紫", label: "紫色", color: "#6a0dad" },
  { value: "黄", label: "黄色", color: "#ffd700" },
  { value: "青", label: "青色", color: "#00ced1" },
];

export function SearchFilters({
  onFilter,
  initialFilters,
}: {
  onFilter: (filters: Filters) => void;
  initialFilters?: Filters;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters || INITIAL_FILTERS);
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFilters) setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    <aside className="w-full space-y-4">
      {/* Search */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder="搜索品牌、车型..."
            className="pl-9 font-mono text-sm"
            value={filters.keyword}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => update("keyword", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filters.keyword.trim()) {
                addSearchHistory(filters.keyword.trim());
                setHistory(getSearchHistory());
                setSearchFocused(false);
              }
            }}
          />
        </div>
        {searchFocused && !filters.keyword && history.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 border border-border bg-background shadow-md">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">搜索历史</span>
              <button
                type="button"
                onClick={() => {
                  clearSearchHistory();
                  setHistory([]);
                }}
                className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} />
                清除
              </button>
            </div>
            {history.map((term) => (
              <button
                key={term}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  update("keyword", term);
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

      {/* Clear all */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full gap-1 font-mono text-xs text-muted-foreground"
          onClick={reset}
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
          清除全部筛选 ({activeCount})
        </Button>
      )}

      {/* Location */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">地区</Label>
        <Select value={filters.location} onValueChange={(v) => update("location", v)}>
          <SelectTrigger className="mt-1 h-8 font-mono text-xs">
            <SelectValue placeholder="不限" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((state) => (
              <SelectItem key={state.value} value={state.value} className="font-mono text-xs">
                {state.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="或输入 Zipcode"
          className="mt-1.5 h-8 font-mono text-xs"
          maxLength={5}
          value={filters.location.match(/^\d{5}$/) ? filters.location : ""}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 5);
            if (val) update("location", val);
          }}
        />
      </div>

      {/* Brand */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">品牌</Label>
        <Select value={filters.make} onValueChange={(v) => update("make", v)}>
          <SelectTrigger className="mt-1 h-8 font-mono text-xs">
            <SelectValue placeholder="不限" />
          </SelectTrigger>
          <SelectContent>
            {MAKES.map((make) => (
              <SelectItem key={make} value={make} className="font-mono text-xs">
                {MAKES_ZH[make]} {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seller type */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">卖家类型</Label>
        <Select value={filters.sellerType} onValueChange={(v) => update("sellerType", v)}>
          <SelectTrigger className="mt-1 h-8 font-mono text-xs">
            <SelectValue placeholder="不限" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dealer" className="font-mono text-xs">车行</SelectItem>
            <SelectItem value="private" className="font-mono text-xs">个人</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price slider */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[11px] text-muted-foreground">价格范围</Label>
        </div>
        <p className="mt-1 font-mono text-[11px] text-foreground">
          ${Number(filters.minPrice || "0").toLocaleString()} - ${Number(filters.maxPrice || "200000").toLocaleString()}
        </p>
        <Slider
          className="mt-2"
          min={0}
          max={200000}
          step={5000}
          value={[Number(filters.minPrice || "0"), Number(filters.maxPrice || "200000")]}
          onValueChange={([min, max]) => {
            const next = { ...filters, minPrice: String(min), maxPrice: max === 200000 ? "" : String(max) };
            setFilters(next);
            onFilter(next);
          }}
        />
      </div>

      {/* Year slider */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[11px] text-muted-foreground">年份范围</Label>
        </div>
        <p className="mt-1 font-mono text-[11px] text-foreground">
          {filters.minYear || "2000"} - {filters.maxYear || "2026"}
        </p>
        <Slider
          className="mt-2"
          min={2000}
          max={2026}
          step={1}
          value={[Number(filters.minYear || "2000"), Number(filters.maxYear || "2026")]}
          onValueChange={([min, max]) => {
            const next = { ...filters, minYear: min === 2000 ? "" : String(min), maxYear: max === 2026 ? "" : String(max) };
            setFilters(next);
            onFilter(next);
          }}
        />
      </div>

      {/* Fuel type */}
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

      {/* Transmission */}
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

      {/* Drivetrain */}
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

      {/* Max mileage */}
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

      {/* Exterior color */}
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
    </aside>
  );
}
