"use client";

import { useState } from "react";
import {
  MapPin, Car, DollarSign, Gauge, Palette, ChevronRight, X, Check, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DrawerNested, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose,
} from "@/components/ui/drawer";
import { MAKES, MAKES_ZH, HOT_MAKES, getBrandLogoUrl } from "@/lib/mock-data";
import Image from "next/image";
import { match } from "pinyin-pro";
import { Input } from "@/components/ui/input";

// Re-export types and constants from search-filters
import { US_STATES } from "@/components/search-filters";
import type { Filters } from "@/components/search-filters";

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
MILEAGE_STOPS.push(999999);
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

// Summary text for each filter category
function getLocationLabel(filters: Filters): string {
  if (!filters.location) return "不限";
  // Find matching state or sub-region label
  for (const state of US_STATES) {
    if (state.value === filters.location) return state.label.split(" ")[0];
    if (state.subRegions) {
      const sub = state.subRegions.find((s) => s.value === filters.location);
      if (sub) return sub.label.split(" ")[0];
    }
  }
  return filters.location;
}

function getBrandLabel(filters: Filters): string {
  if (!filters.make) return "不限";
  const items = filters.make.split(",");
  const labels = items.map((m) => MAKES_ZH[m] || m);
  return labels.length <= 2 ? labels.join("、") : `${labels[0]}等${labels.length}个`;
}

function getPriceYearLabel(filters: Filters): string {
  const parts: string[] = [];
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : "$0";
    const max = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : "不限";
    parts.push(`${min}-${max}`);
  }
  if (filters.minYear || filters.maxYear) {
    const min = filters.minYear || "2000";
    const max = filters.maxYear || "2026";
    parts.push(`${min}-${max}年`);
  }
  return parts.length > 0 ? parts.join(" · ") : "不限";
}

function getSpecsLabel(filters: Filters): string {
  const parts: string[] = [];
  if (filters.fuelType) {
    const items = filters.fuelType.split(",");
    parts.push(items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}种`);
  }
  if (filters.transmission) {
    const items = filters.transmission.split(",");
    parts.push(items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}种`);
  }
  if (filters.drivetrain) {
    const items = filters.drivetrain.split(",");
    parts.push(items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}种`);
  }
  if (filters.cylinders) {
    const items = filters.cylinders.split(",");
    parts.push(items.map((c) => c + "缸").join("/"));
  }
  if (filters.exteriorColor) {
    const items = filters.exteriorColor.split(",");
    parts.push("外" + (items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}色`));
  }
  if (filters.interiorColor) {
    const items = filters.interiorColor.split(",");
    parts.push("内" + (items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}色`));
  }
  return parts.length > 0 ? parts.join(" · ") : "不限";
}

function getColorLabel(filters: Filters): string {
  const parts: string[] = [];
  if (filters.exteriorColor) {
    const items = filters.exteriorColor.split(",");
    parts.push("外" + (items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}色`));
  }
  if (filters.interiorColor) {
    const items = filters.interiorColor.split(",");
    parts.push("内" + (items.length <= 2 ? items.join("/") : `${items[0]}等${items.length}色`));
  }
  return parts.length > 0 ? parts.join(" · ") : "不限";
}

function getSellerLabel(filters: Filters): string {
  if (!filters.sellerType) return "不限";
  return filters.sellerType === "dealer" ? "车行" : "个人";
}

// --- Multi-select helpers ---
function toggleInList(current: string, value: string): string {
  const items = current ? current.split(",") : [];
  const idx = items.indexOf(value);
  if (idx >= 0) {
    items.splice(idx, 1);
  } else {
    items.push(value);
  }
  return items.join(",");
}

function isInList(list: string, value: string): boolean {
  if (!list) return false;
  return list.split(",").includes(value);
}

// --- Pill selector for multi-select options ---
function PillSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`border px-3 py-1.5 font-mono text-xs transition-colors ${!value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
        onClick={() => onChange("")}
      >
        不限
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`border px-3 py-1.5 font-mono text-xs transition-colors ${isInList(value, opt.value) ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
          onClick={() => onChange(toggleInList(value, opt.value))}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// --- Color pill selector (multi-select) ---
function ColorPillSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; color: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`border px-3 py-1.5 font-mono text-xs transition-colors ${!value ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
        onClick={() => onChange("")}
      >
        不限
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs transition-colors ${isInList(value, opt.value) ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
          onClick={() => onChange(toggleInList(value, opt.value))}
        >
          <span
            className="inline-block h-3 w-3 rounded-full border border-border"
            style={{ backgroundColor: opt.color }}
          />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// --- Category row in main drawer ---
function FilterRow({
  icon,
  label,
  value,
  active,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <DrawerNested>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors active:bg-muted"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted/50">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-medium">{label}</p>
            <p className={`truncate font-mono text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {value}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <DrawerClose asChild>
            <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </DrawerClose>
          <span className="font-mono text-sm font-semibold">{label}</span>
          <div className="h-8 w-8" />
        </div>
        <div className="overflow-y-auto px-4 pb-6">
          {children}
        </div>
      </DrawerContent>
    </DrawerNested>
  );
}

// --- Location drawer content with nested sub-region drawer ---
function LocationDrawerContent({
  filters,
  onUpdate,
}: {
  filters: Filters;
  onUpdate: (key: keyof Filters, value: string) => void;
}) {
  const [zip, setZip] = useState(
    /^\d{5}$/.test(filters.location) ? filters.location : ""
  );

  return (
    <div className="space-y-1">
      {/* Zip code input */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="输入 Zip Code"
            className="h-9 flex-1 font-mono text-xs"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 5);
              setZip(val);
              if (val.length === 5) {
                onUpdate("location", val);
              }
            }}
          />
          {zip && (
            <button
              type="button"
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setZip("");
                onUpdate("location", "");
              }}
            >
              清除
            </button>
          )}
        </div>
        {/^\d{5}$/.test(filters.location) && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            当前按 Zip {filters.location} 筛选
          </p>
        )}
      </div>

      <div className="mx-3 h-px bg-border" />

      <button
        type="button"
        className={`flex w-full items-center justify-between px-3 py-2.5 font-mono text-xs transition-colors ${!filters.location ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
        onClick={() => { setZip(""); onUpdate("location", ""); }}
      >
        <span>不限</span>
        {!filters.location && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
      </button>
      {US_STATES.map((state) =>
        state.subRegions ? (
          <DrawerNested key={state.value}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2.5 font-mono text-xs transition-colors ${filters.location === state.value || filters.location?.startsWith(state.value + "-") ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
              >
                <span>{state.label}</span>
                <div className="flex items-center gap-1">
                  {(filters.location === state.value || filters.location?.startsWith(state.value + "-")) && (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle className="font-mono text-sm">{state.label}</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6">
                <div className="space-y-1">
                  <DrawerClose asChild>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2.5 font-mono text-xs transition-colors ${filters.location === state.value ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
                      onClick={() => onUpdate("location", state.value)}
                    >
                      <span>全部{state.label.split(" ")[0]}</span>
                      {filters.location === state.value && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                    </button>
                  </DrawerClose>
                  {state.subRegions.map((sub) => (
                    <DrawerClose key={sub.value} asChild>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between px-3 py-2.5 font-mono text-xs transition-colors ${filters.location === sub.value ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
                        onClick={() => onUpdate("location", sub.value)}
                      >
                        <span>{sub.label}</span>
                        {filters.location === sub.value && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                      </button>
                    </DrawerClose>
                  ))}
                </div>
              </div>
            </DrawerContent>
          </DrawerNested>
        ) : (
          <button
            key={state.value}
            type="button"
            className={`flex w-full items-center justify-between px-3 py-2.5 font-mono text-xs transition-colors ${filters.location === state.value ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
            onClick={() => onUpdate("location", state.value)}
          >
            <span>{state.label}</span>
            {filters.location === state.value && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
        )
      )}
    </div>
  );
}

// --- Brand drawer content with search ---
function BrandItem({ make, selected, onToggle }: { make: string; selected: boolean; onToggle: () => void }) {
  const logo = getBrandLogoUrl(make);
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 px-3 py-2.5 font-mono text-xs transition-colors ${selected ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
      onClick={onToggle}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {logo ? (
          <img src={logo} alt={make} className="h-6 w-6 object-contain" />
        ) : (
          <Car className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </span>
      <span className="flex-1 text-left">{MAKES_ZH[make]} {make}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
    </button>
  );
}

export function BrandDrawerContent({
  filters,
  onUpdate,
}: {
  filters: Filters;
  onUpdate: (key: keyof Filters, value: string) => void;
}) {
  const [brandSearch, setBrandSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const selectedMakes = filters.make ? filters.make.split(",") : [];

  const filteredMakes = MAKES.filter((make) => {
    if (!brandSearch) return true;
    const kw = brandSearch.toLowerCase();
    const zh = MAKES_ZH[make] || "";
    return make.toLowerCase().includes(kw) || zh.includes(kw) || match(zh, kw) !== null;
  });

  const isSearching = !!brandSearch;
  const displayMakes = isSearching ? filteredMakes : showAll ? [...MAKES].filter((m) => m !== "Other") : [];

  return (
    <div className="space-y-3">
      {/* Selected brands */}
      {selectedMakes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMakes.map((make) => (
            <button
              key={make}
              type="button"
              className="flex items-center gap-1 border border-foreground bg-foreground px-2 py-1 font-mono text-[11px] text-background transition-colors"
              onClick={() => onUpdate("make", toggleInList(filters.make, make))}
            >
              {getBrandLogoUrl(make) && (
                <img src={getBrandLogoUrl(make)!} alt="" className="h-3.5 w-3.5 object-contain brightness-0 invert" />
              )}
              {MAKES_ZH[make] || make}
              <X className="h-2.5 w-2.5" strokeWidth={2} />
            </button>
          ))}
          <button
            type="button"
            className="px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => onUpdate("make", "")}
          >
            清除
          </button>
        </div>
      )}

      <Input
        placeholder="搜索品牌..."
        className="font-mono text-xs"
        value={brandSearch}
        onChange={(e) => setBrandSearch(e.target.value)}
      />

      {/* Hot brands grid */}
      {!isSearching && !showAll && (
        <>
          <p className="font-mono text-[11px] text-muted-foreground">热门品牌</p>
          <div className="grid grid-cols-4 gap-2">
            {HOT_MAKES.map((make) => {
              const logo = getBrandLogoUrl(make);
              const selected = isInList(filters.make, make);
              return (
                <button
                  key={make}
                  type="button"
                  className={`flex flex-col items-center gap-1.5 border p-2.5 transition-colors ${selected ? "border-foreground bg-muted" : "border-border hover:border-foreground/30"}`}
                  onClick={() => onUpdate("make", toggleInList(filters.make, make))}
                >
                  <span className="flex h-8 w-8 items-center justify-center">
                    {logo ? (
                      <img src={logo} alt={make} className="h-7 w-7 object-contain" />
                    ) : (
                      <Car className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="font-mono text-[10px] leading-tight">{MAKES_ZH[make]}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 border border-border py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={() => setShowAll(true)}
          >
            全部品牌
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* All brands list */}
      {(isSearching || showAll) && (
        <div className="space-y-0.5">
          {!isSearching && (
            <button
              type="button"
              className="mb-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowAll(false)}
            >
              ← 返回热门
            </button>
          )}
          <button
            type="button"
            className={`flex w-full items-center justify-between px-3 py-2.5 font-mono text-xs transition-colors ${!filters.make ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
            onClick={() => onUpdate("make", "")}
          >
            <span>不限品牌</span>
            {!filters.make && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
          {displayMakes.map((make) => (
            <BrandItem
              key={make}
              make={make}
              selected={isInList(filters.make, make)}
              onToggle={() => onUpdate("make", toggleInList(filters.make, make))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// === Main component ===
export function MobileFilterDrawer({
  filters,
  onFilter,
  activeCount,
}: {
  filters: Filters;
  onFilter: (filters: Filters) => void;
  activeCount: number;
}) {
  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    if (key === "fuelType" && value === "纯电") {
      next.transmission = "";
      next.cylinders = "";
    }
    onFilter(next);
  }

  const isElectricOnly = filters.fuelType === "纯电";

  const priceMinIdx = priceToIndex(Number(filters.minPrice || "0"));
  const priceMaxIdx = filters.maxPrice ? priceToIndex(Number(filters.maxPrice)) : PRICE_STOPS.length - 1;
  const yearMin = Number(filters.minYear || "1999");
  const yearMax = Number(filters.maxYear || "2026");
  const mileageIdx = filters.maxMileage
    ? mileageToIndex(Number(filters.maxMileage))
    : MILEAGE_STOPS.length - 1;
  const isElectric = isElectricOnly;

  return (
    <div>
      {/* Location */}
      <FilterRow
        icon={<MapPin className="h-4 w-4" strokeWidth={1.5} />}
        label="地区"
        value={getLocationLabel(filters)}
        active={!!filters.location}
      >
        <LocationDrawerContent filters={filters} onUpdate={update} />
        {/* Distance */}
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-mono text-xs font-medium">距离范围</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["", "10", "25", "50", "100", "200"].map((v) => (
              <button
                key={v}
                type="button"
                className={`border px-3 py-1.5 font-mono text-xs transition-colors ${filters.maxDistance === v ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30"}`}
                onClick={() => update("maxDistance", v)}
              >
                {v === "" ? "不限" : `≤${v} mi`}
              </button>
            ))}
          </div>
          <Input
            className="mt-2 h-9 font-mono text-xs"
            placeholder="自定义距离 (miles)"
            inputMode="numeric"
            value={filters.maxDistance}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              update("maxDistance", val);
            }}
          />
        </div>
      </FilterRow>

      {/* Brand */}
      <FilterRow
        icon={<Car className="h-4 w-4" strokeWidth={1.5} />}
        label="品牌"
        value={getBrandLabel(filters)}
        active={!!filters.make}
      >
        <BrandDrawerContent filters={filters} onUpdate={update} />
      </FilterRow>

      {/* Price & Year */}
      <FilterRow
        icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />}
        label="价格 / 年份"
        value={getPriceYearLabel(filters)}
        active={!!(filters.minPrice || filters.maxPrice || filters.minYear || filters.maxYear)}
      >
        <div className="space-y-6">
          {/* Price */}
          <div>
            <p className="font-mono text-xs font-medium">价格范围</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                className="h-9 font-mono text-xs"
                placeholder="最低价"
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  onFilter({ ...filters, minPrice: v });
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">-</span>
              <Input
                className="h-9 font-mono text-xs"
                placeholder="最高价"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  onFilter({ ...filters, maxPrice: v });
                }}
              />
            </div>
            <Slider
              className="mt-3"
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
                onFilter(next);
              }}
            />
          </div>

          {/* Year */}
          <div>
            <p className="font-mono text-xs font-medium">年份范围</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                className="h-9 font-mono text-xs"
                placeholder="最早年份"
                inputMode="numeric"
                maxLength={4}
                value={filters.minYear}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  onFilter({ ...filters, minYear: v });
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">-</span>
              <Input
                className="h-9 font-mono text-xs"
                placeholder="最新年份"
                inputMode="numeric"
                maxLength={4}
                value={filters.maxYear}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  onFilter({ ...filters, maxYear: v });
                }}
              />
            </div>
            <Slider
              className="mt-3"
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
                onFilter(next);
              }}
            />
          </div>
        </div>
      </FilterRow>

      {/* Mileage */}
      <FilterRow
        icon={<Gauge className="h-4 w-4" strokeWidth={1.5} />}
        label="最高里程"
        value={filters.maxMileage ? `≤${(Number(filters.maxMileage) / 10000).toFixed(0)}万mi` : "不限"}
        active={!!filters.maxMileage}
      >
        <div>
          <p className="font-mono text-xs font-medium">最高里程</p>
          <p className="mt-1 font-mono text-[11px] text-foreground">
            {formatMileageLabel(MILEAGE_STOPS[mileageIdx])}
          </p>
          <Slider
            className="mt-3"
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
              onFilter(next);
            }}
          />
        </div>
      </FilterRow>

      {/* Vehicle Specs */}
      <FilterRow
        icon={<Palette className="h-4 w-4" strokeWidth={1.5} />}
        label="车辆参数"
        value={getSpecsLabel(filters)}
        active={!!(filters.fuelType || filters.drivetrain || filters.exteriorColor || filters.interiorColor)}
      >
        <div className="space-y-5">
          {/* Fuel */}
          <div>
            <p className="mb-2 font-mono text-xs font-medium">燃油类型</p>
            <PillSelect options={FUEL_OPTIONS} value={filters.fuelType} onChange={(v) => update("fuelType", v)} />
          </div>

          {/* Drivetrain */}
          <div>
            <p className="mb-2 font-mono text-xs font-medium">驱动方式</p>
            <PillSelect options={DRIVETRAIN_OPTIONS} value={filters.drivetrain} onChange={(v) => update("drivetrain", v)} />
          </div>

          {/* Exterior Color */}
          <div>
            <p className="mb-2 font-mono text-xs font-medium">外观颜色</p>
            <ColorPillSelect options={COLOR_OPTIONS} value={filters.exteriorColor} onChange={(v) => update("exteriorColor", v)} />
          </div>

          {/* Interior Color */}
          <div>
            <p className="mb-2 font-mono text-xs font-medium">内饰颜色</p>
            <ColorPillSelect options={INTERIOR_COLOR_OPTIONS} value={filters.interiorColor} onChange={(v) => update("interiorColor", v)} />
          </div>
        </div>
      </FilterRow>

      {/* Seller type */}
      <FilterRow
        icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
        label="卖家类型"
        value={getSellerLabel(filters)}
        active={!!filters.sellerType}
      >
        <PillSelect
          options={[
            { value: "dealer", label: "车行" },
            { value: "private", label: "个人" },
          ]}
          value={filters.sellerType}
          onChange={(v) => update("sellerType", v)}
        />
      </FilterRow>

      {/* Reset */}
      {activeCount > 0 && (
        <div className="px-4 pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1 font-mono text-xs text-muted-foreground"
            onClick={() => {
              onFilter({
                keyword: filters.keyword,
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
              });
            }}
          >
            <X className="h-3 w-3" strokeWidth={1.5} />
            清除全部筛选 ({activeCount})
          </Button>
        </div>
      )}
    </div>
  );
}
