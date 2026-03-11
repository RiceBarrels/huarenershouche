"use client";

import { Search, X, Clock, Trash2, ChevronRight } from "lucide-react";
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

// --- Price breakpoints ---
const PRICE_STOPS = [
  0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,
  25000, 30000, 45000, 50000, 60000, 70000, 80000, 90000, 100000,
  150000, 200000,
];
function priceToIndex(price: number): number {
  for (let i = PRICE_STOPS.length - 1; i >= 0; i--) {
    if (price >= PRICE_STOPS[i]) return i;
  }
  return 0;
}
function formatPriceLabel(price: number): string {
  if (price >= 200000) return "不限";
  if (price >= 10000) return `$${(price / 1000).toFixed(0)}k`;
  return `$${price.toLocaleString()}`;
}

// --- Mileage breakpoints ---
const MILEAGE_STOPS: number[] = [];
for (let i = 0; i <= 300000; i += 10000) MILEAGE_STOPS.push(i);
MILEAGE_STOPS.push(999999); // unlimited
function mileageToIndex(miles: number): number {
  for (let i = MILEAGE_STOPS.length - 1; i >= 0; i--) {
    if (miles >= MILEAGE_STOPS[i]) return i;
  }
  return MILEAGE_STOPS.length - 1;
}
function formatMileageLabel(miles: number): string {
  if (miles >= 999999) return "不限";
  if (miles >= 10000) return `${(miles / 10000).toFixed(0)}万mi`;
  return `${miles.toLocaleString()} mi`;
}

// --- All 50 states + DC with sub-regions for major ones ---
interface StateOption {
  value: string;
  label: string;
  subRegions?: { value: string; label: string }[];
}

const US_STATES: StateOption[] = [
  {
    value: "CA", label: "加州 California",
    subRegions: [
      { value: "CA-LA", label: "洛杉矶 Los Angeles" },
      { value: "CA-SF", label: "旧金山 San Francisco" },
      { value: "CA-SD", label: "圣地亚哥 San Diego" },
      { value: "CA-SJ", label: "圣何塞 San Jose" },
      { value: "CA-SAC", label: "萨克拉门托 Sacramento" },
      { value: "CA-OC", label: "橙县 Orange County" },
      { value: "CA-IE", label: "内陆帝国 Inland Empire" },
      { value: "CA-other", label: "其他地区" },
    ],
  },
  {
    value: "NY", label: "纽约 New York",
    subRegions: [
      { value: "NY-NYC", label: "纽约市 NYC" },
      { value: "NY-LI", label: "长岛 Long Island" },
      { value: "NY-UP", label: "上州 Upstate" },
    ],
  },
  {
    value: "TX", label: "德州 Texas",
    subRegions: [
      { value: "TX-HOU", label: "休斯顿 Houston" },
      { value: "TX-DAL", label: "达拉斯 Dallas" },
      { value: "TX-AUS", label: "奥斯汀 Austin" },
      { value: "TX-SA", label: "圣安东尼奥 San Antonio" },
      { value: "TX-other", label: "其他地区" },
    ],
  },
  {
    value: "FL", label: "佛州 Florida",
    subRegions: [
      { value: "FL-MIA", label: "迈阿密 Miami" },
      { value: "FL-ORL", label: "奥兰多 Orlando" },
      { value: "FL-TPA", label: "坦帕 Tampa" },
      { value: "FL-other", label: "其他地区" },
    ],
  },
  {
    value: "IL", label: "伊利诺伊 Illinois",
    subRegions: [
      { value: "IL-CHI", label: "芝加哥 Chicago" },
      { value: "IL-other", label: "其他地区" },
    ],
  },
  {
    value: "WA", label: "华盛顿 Washington",
    subRegions: [
      { value: "WA-SEA", label: "西雅图 Seattle" },
      { value: "WA-other", label: "其他地区" },
    ],
  },
  {
    value: "MA", label: "麻省 Massachusetts",
    subRegions: [
      { value: "MA-BOS", label: "波士顿 Boston" },
      { value: "MA-other", label: "其他地区" },
    ],
  },
  {
    value: "NJ", label: "新泽西 New Jersey" },
  { value: "PA", label: "宾州 Pennsylvania",
    subRegions: [
      { value: "PA-PHL", label: "费城 Philadelphia" },
      { value: "PA-PIT", label: "匹兹堡 Pittsburgh" },
      { value: "PA-other", label: "其他地区" },
    ],
  },
  { value: "GA", label: "乔治亚 Georgia",
    subRegions: [
      { value: "GA-ATL", label: "亚特兰大 Atlanta" },
      { value: "GA-other", label: "其他地区" },
    ],
  },
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
  { value: "AL", label: "阿拉巴马 Alabama" },
  { value: "AK", label: "阿拉斯加 Alaska" },
  { value: "AR", label: "阿肯色 Arkansas" },
  { value: "DE", label: "特拉华 Delaware" },
  { value: "DC", label: "华盛顿特区 D.C." },
  { value: "ID", label: "爱达荷 Idaho" },
  { value: "IN", label: "印第安纳 Indiana" },
  { value: "IA", label: "爱荷华 Iowa" },
  { value: "KS", label: "堪萨斯 Kansas" },
  { value: "KY", label: "肯塔基 Kentucky" },
  { value: "LA", label: "路易斯安那 Louisiana" },
  { value: "ME", label: "缅因 Maine" },
  { value: "MS", label: "密西西比 Mississippi" },
  { value: "MO", label: "密苏里 Missouri" },
  { value: "MT", label: "蒙大拿 Montana" },
  { value: "NE", label: "内布拉斯加 Nebraska" },
  { value: "NH", label: "新罕布什尔 New Hampshire" },
  { value: "NM", label: "新墨西哥 New Mexico" },
  { value: "ND", label: "北达科他 North Dakota" },
  { value: "OK", label: "俄克拉荷马 Oklahoma" },
  { value: "RI", label: "罗德岛 Rhode Island" },
  { value: "SC", label: "南卡 South Carolina" },
  { value: "SD", label: "南达科他 South Dakota" },
  { value: "TN", label: "田纳西 Tennessee" },
  { value: "UT", label: "犹他 Utah" },
  { value: "VT", label: "佛蒙特 Vermont" },
  { value: "WV", label: "西弗吉尼亚 West Virginia" },
  { value: "WI", label: "威斯康星 Wisconsin" },
  { value: "WY", label: "怀俄明 Wyoming" },
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

const CYLINDER_OPTIONS = [
  { value: "3", label: "3缸" },
  { value: "4", label: "4缸" },
  { value: "5", label: "5缸" },
  { value: "6", label: "6缸" },
  { value: "8", label: "8缸" },
  { value: "10", label: "10缸" },
  { value: "12", label: "12缸" },
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

const INTERIOR_COLOR_OPTIONS = [
  { value: "黑", label: "黑色", color: "#1a1a1a" },
  { value: "白", label: "白色", color: "#ffffff" },
  { value: "灰", label: "灰色", color: "#808080" },
  { value: "米", label: "米色", color: "#e8d5b7" },
  { value: "棕", label: "棕色", color: "#78350f" },
  { value: "红", label: "红色", color: "#dc2626" },
  { value: "蓝", label: "蓝色", color: "#2563eb" },
];

export interface Filters {
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
}

export const INITIAL_FILTERS: Filters = {
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
};

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
  const [expandedState, setExpandedState] = useState<string | null>(null);
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

  const isElectric = filters.fuelType === "纯电";

  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    // Clear transmission and cylinders when switching to electric
    if (key === "fuelType" && value === "纯电") {
      next.transmission = "";
      next.cylinders = "";
    }
    setFilters(next);
    onFilter(next);
  }

  function reset() {
    setFilters(INITIAL_FILTERS);
    onFilter(INITIAL_FILTERS);
  }

  // Price slider indices
  const priceMinIdx = priceToIndex(Number(filters.minPrice || "0"));
  const priceMaxIdx = filters.maxPrice ? priceToIndex(Number(filters.maxPrice)) : PRICE_STOPS.length - 1;

  // Year values
  const yearMin = Number(filters.minYear || "1999");
  const yearMax = Number(filters.maxYear || "2026");

  // Mileage slider index
  const mileageIdx = filters.maxMileage
    ? mileageToIndex(Number(filters.maxMileage))
    : MILEAGE_STOPS.length - 1;

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

      {/* Location — state with sub-regions */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">地区</Label>
        {!expandedState ? (
          <>
            <div className="mt-1 max-h-[200px] overflow-y-auto border border-border">
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted ${!filters.location ? "bg-muted font-medium" : ""}`}
                onClick={() => update("location", "")}
              >
                不限
              </button>
              {US_STATES.map((state) => (
                <button
                  key={state.value}
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted ${filters.location === state.value ? "bg-muted font-medium" : ""}`}
                  onClick={() => {
                    if (state.subRegions) {
                      setExpandedState(state.value);
                    } else {
                      update("location", state.value);
                    }
                  }}
                >
                  <span>{state.label}</span>
                  {state.subRegions && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </button>
              ))}
            </div>
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
          </>
        ) : (
          <div className="mt-1 max-h-[200px] overflow-y-auto border border-border">
            <button
              type="button"
              className="flex w-full items-center gap-1 border-b border-border px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setExpandedState(null)}
            >
              ← 返回
            </button>
            {/* Select entire state */}
            <button
              type="button"
              className={`flex w-full items-center px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted ${filters.location === expandedState ? "bg-muted font-medium" : ""}`}
              onClick={() => {
                update("location", expandedState);
                setExpandedState(null);
              }}
            >
              全部{US_STATES.find((s) => s.value === expandedState)?.label.split(" ")[0]}
            </button>
            {US_STATES.find((s) => s.value === expandedState)?.subRegions?.map((sub) => (
              <button
                key={sub.value}
                type="button"
                className={`flex w-full items-center px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted ${filters.location === sub.value ? "bg-muted font-medium" : ""}`}
                onClick={() => {
                  update("location", sub.value);
                  setExpandedState(null);
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
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

      {/* Price slider with custom breakpoints */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">价格范围</Label>
        <p className="mt-1 font-mono text-[11px] text-foreground">
          {formatPriceLabel(PRICE_STOPS[priceMinIdx])} - {formatPriceLabel(PRICE_STOPS[priceMaxIdx])}
        </p>
        <Slider
          className="mt-2"
          min={0}
          max={PRICE_STOPS.length - 1}
          step={1}
          value={[priceMinIdx, priceMaxIdx]}
          onValueChange={([minIdx, maxIdx]) => {
            const minVal = PRICE_STOPS[minIdx];
            const maxVal = PRICE_STOPS[maxIdx];
            const next = {
              ...filters,
              minPrice: minVal === 0 ? "" : String(minVal),
              maxPrice: maxIdx === PRICE_STOPS.length - 1 ? "" : String(maxVal),
            };
            setFilters(next);
            onFilter(next);
          }}
        />
      </div>

      {/* Year slider — 1999 = "2000年以前" */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">年份范围</Label>
        <p className="mt-1 font-mono text-[11px] text-foreground">
          {yearMin <= 1999 ? "2000年以前" : yearMin} - {yearMax >= 2026 ? "2026" : yearMax}
        </p>
        <Slider
          className="mt-2"
          min={1999}
          max={2026}
          step={1}
          value={[yearMin, yearMax]}
          onValueChange={([min, max]) => {
            const next = {
              ...filters,
              minYear: min <= 1999 ? "" : String(min),
              maxYear: max >= 2026 ? "" : String(max),
            };
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

      {/* Transmission — hidden when electric */}
      {!isElectric && (
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
      )}

      {/* Cylinders — hidden when electric */}
      {!isElectric && (
        <div>
          <Label className="font-mono text-[11px] text-muted-foreground">气缸数</Label>
          <Select value={filters.cylinders} onValueChange={(v) => update("cylinders", v)}>
            <SelectTrigger className="mt-1 h-8 font-mono text-xs">
              <SelectValue placeholder="不限" />
            </SelectTrigger>
            <SelectContent>
              {CYLINDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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

      {/* Mileage slider with breakpoints */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">最高里程</Label>
        <p className="mt-1 font-mono text-[11px] text-foreground">
          {formatMileageLabel(MILEAGE_STOPS[mileageIdx])}
        </p>
        <Slider
          className="mt-2"
          min={0}
          max={MILEAGE_STOPS.length - 1}
          step={1}
          value={[mileageIdx]}
          onValueChange={([idx]) => {
            const val = MILEAGE_STOPS[idx];
            const next = {
              ...filters,
              maxMileage: idx === MILEAGE_STOPS.length - 1 ? "" : String(val),
            };
            setFilters(next);
            onFilter(next);
          }}
        />
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

      {/* Interior color */}
      <div>
        <Label className="font-mono text-[11px] text-muted-foreground">内饰颜色</Label>
        <Select value={filters.interiorColor} onValueChange={(v) => update("interiorColor", v)}>
          <SelectTrigger className="mt-1 h-8 font-mono text-xs">
            <SelectValue placeholder="不限" />
          </SelectTrigger>
          <SelectContent>
            {INTERIOR_COLOR_OPTIONS.map((opt) => (
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
