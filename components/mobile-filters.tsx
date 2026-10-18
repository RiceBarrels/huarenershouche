"use client";

import { useState } from "react";
import {
  MapPin, Car, CarFront, DollarSign, Gauge, Palette, ChevronRight, X, Check, Users, BadgePercent, ListChecks,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  DrawerNested, DrawerContent, DrawerTrigger, DrawerClose,
} from "@/components/ui/drawer";
import { MAKES, MAKES_ZH, HOT_MAKES, getBrandLogoUrl } from "@/lib/mock-data";
import { match } from "pinyin-pro";
import { useI18n } from "@/components/i18n-provider";
import { interpolate, brandLabel, brandShortLabel, type Locale } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { IOSSwitch } from "@/components/ios-settings";

// Re-export types and constants from search-filters
import {
  PAYMENT_PRESETS, LISTED_WITHIN_OPTIONS, CONDITION_TOGGLES, INITIAL_FILTERS,
  isInListCI, toggleInListCI, featureOptionLabel,
  PILL_ON, PILL_OFF, IOS_FILL,
} from "@/components/search-filters";
import type { Filters, CountOption } from "@/components/search-filters";
import { BODY_STYLE_OPTIONS, bodyStyleLabel, type BodyStyle } from "@/lib/body-style";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

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
function formatMileageLabel(miles: number, t: TFn): string {
  if (miles >= 999999) return t("不限");
  if (miles >= 10000) return t("{n}万mi", { n: (miles / 10000).toFixed(0) });
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
// t/locale 为可选参数以兼容旧调用方(不传则维持中文输出)
export function getLocationLabel(filters: Filters, t: TFn = interpolate): string {
  if (!filters.location) return t("不限");
  if (/^\d{5}$/.test(filters.location)) return `Zip ${filters.location}`;
  return filters.location;
}

export function getBrandLabel(filters: Filters, t: TFn = interpolate, locale: Locale = "zh"): string {
  if (!filters.make) return t("不限");
  const items = filters.make.split(",");
  const labels = items.map((m) => brandShortLabel(m, MAKES_ZH[m], t, locale));
  return labels.length <= 2
    ? labels.join(t("、"))
    : t("{first}等{n}个", { first: labels[0], n: labels.length });
}

function getPriceYearLabel(filters: Filters, t: TFn): string {
  const parts: string[] = [];
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : "$0";
    const max = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : t("不限");
    parts.push(`${min}-${max}`);
  }
  if (filters.maxPayment) parts.push(t("月供≤${n}", { n: filters.maxPayment }));
  if (filters.minYear || filters.maxYear) {
    const min = filters.minYear || "2000";
    const max = filters.maxYear || "2026";
    parts.push(t("{min}-{max}年", { min, max }));
  }
  return parts.length > 0 ? parts.join(" · ") : t("不限");
}

function getModelLabel(filters: Filters, t: TFn): string {
  if (!filters.model) return t("不限");
  const items = filters.model.split(",").filter(Boolean).map((m) => m.trim());
  return items.length <= 2
    ? items.join(t("、"))
    : t("{first}等{n}个", { first: items[0], n: items.length });
}

function getFeaturesLabel(filters: Filters, t: TFn, options?: CountOption[]): string {
  if (!filters.features) return t("不限");
  // 已选配置按统计选项的本地化 label 展示(筛选值本身不变)
  const items = filters.features
    .split(",")
    .filter((v) => v.trim())
    .map((v) => featureOptionLabel(v, options, t));
  return items.length <= 2
    ? items.join(t("、"))
    : t("{first}等{n}项", { first: items[0], n: items.length });
}

function getBodyStyleSummary(filters: Filters, t: TFn): string {
  if (!filters.bodyStyle) return t("不限");
  const items = filters.bodyStyle.split(",").filter(Boolean);
  const labels = items.map((v) => t(bodyStyleLabel(v as BodyStyle)));
  return labels.length <= 3
    ? labels.join("/")
    : t("{first}等{n}类", { first: labels[0], n: labels.length });
}

function getMoreLabel(filters: Filters, t: TFn): string {
  const parts: string[] = [];
  if (filters.dealRating) parts.push(filters.dealRating === "great" ? t("只看超值好价") : t("只看好价"));
  if (filters.priceDropped === "true") parts.push(t("已降价"));
  if (filters.listedWithin) {
    parts.push(filters.listedWithin === "1" ? t("24小时内上架") : t("{n}天内上架", { n: filters.listedWithin }));
  }
  for (const tog of CONDITION_TOGGLES) {
    if (filters[tog.key] === "true") parts.push(t(tog.label));
  }
  return parts.length > 0 ? parts.join(" · ") : t("不限");
}

function getSpecsLabel(filters: Filters, t: TFn): string {
  const parts: string[] = [];
  const summarize = (list: string, tail: string) => {
    const items = list.split(",").map((v) => t(v));
    return items.length <= 2
      ? items.join("/")
      : t(tail, { first: items[0], n: items.length });
  };
  if (filters.fuelType) parts.push(summarize(filters.fuelType, "{first}等{n}种"));
  if (filters.transmission) parts.push(summarize(filters.transmission, "{first}等{n}种"));
  if (filters.drivetrain) parts.push(summarize(filters.drivetrain, "{first}等{n}种"));
  if (filters.exteriorColor) {
    parts.push(t("外{colors}", { colors: summarize(filters.exteriorColor, "{first}等{n}色") }));
  }
  if (filters.interiorColor) {
    parts.push(t("内{colors}", { colors: summarize(filters.interiorColor, "{first}等{n}色") }));
  }
  return parts.length > 0 ? parts.join(" · ") : t("不限");
}

function getSellerLabel(filters: Filters, t: TFn): string {
  if (!filters.sellerType) return t("不限");
  return filters.sellerType === "dealer" ? t("车行") : t("个人");
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

// --- iOS 胶囊按钮公共样式(选中 brand 绿实心 / 未选中 systemGray6 填充) ---
function pillCls(on: boolean): string {
  return `rounded-full px-3.5 py-2 font-mono text-[13px] transition-colors ${on ? PILL_ON : PILL_OFF}`;
}

// --- iOS 填充式输入框(替代 ui/Input,抽屉白底上用半透明填充) ---
function FilterInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full min-w-0 rounded-2xl px-4 font-mono text-[15px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL} ${className}`}
    />
  );
}

// --- 小节标题(如「价格范围」「距离范围」) ---
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[13px] font-semibold">{children}</p>;
}

// --- iOS 开关行:label + 绿色开关,inset 分隔线,末行无线 ---
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="group/row flex w-full items-center pl-4">
      <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-4 group-last/row:border-0">
        <span className="min-w-0 flex-1 truncate font-mono text-[15px]">{label}</span>
        <IOSSwitch checked={checked} onChange={onChange} />
      </div>
    </div>
  );
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
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={pillCls(!value)}
        onClick={() => {
          triggerHaptic();
          onChange("");
        }}
      >
        {t("不限")}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={pillCls(isInList(value, opt.value))}
          onClick={() => {
            triggerHaptic();
            onChange(toggleInList(value, opt.value));
          }}
        >
          {t(opt.label)}
        </button>
      ))}
    </div>
  );
}

// --- Pill selector with counts (model / features) ---
function CountPillSelect({
  options,
  value,
  onChange,
  insensitive,
  labelOf,
}: {
  options: CountOption[];
  value: string;
  onChange: (v: string) => void;
  /** 大小写不敏感匹配（车型名 / 配置标签） */
  insensitive?: boolean;
  /** 选项展示文案,缺省显示 name(车型名原样);筛选值始终是 name */
  labelOf?: (opt: CountOption) => string;
}) {
  const { t } = useI18n();
  const selected = (name: string) => (insensitive ? isInListCI(value, name) : isInList(value, name));
  const toggle = (name: string) => (insensitive ? toggleInListCI(value, name) : toggleInList(value, name));
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={pillCls(!value)}
        onClick={() => {
          triggerHaptic();
          onChange("");
        }}
      >
        {t("不限")}
      </button>
      {options.map((opt) => (
        <button
          key={opt.name}
          type="button"
          className={`flex items-center gap-1.5 ${pillCls(selected(opt.name))}`}
          onClick={() => {
            triggerHaptic();
            onChange(toggle(opt.name));
          }}
        >
          {labelOf ? labelOf(opt) : opt.name}
          <span className="opacity-60">{opt.count}</span>
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
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={pillCls(!value)}
        onClick={() => {
          triggerHaptic();
          onChange("");
        }}
      >
        {t("不限")}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`flex items-center gap-1.5 ${pillCls(isInList(value, opt.value))}`}
          onClick={() => {
            triggerHaptic();
            onChange(toggleInList(value, opt.value));
          }}
        >
          <span
            className="inline-block h-3 w-3 rounded-full border border-border"
            style={{ backgroundColor: opt.color }}
          />
          {t(opt.label)}
        </button>
      ))}
    </div>
  );
}

// --- Category row in main drawer: iOS 设置行(彩色线条图标 + 单行 label/value + chevron) ---
function FilterRow({
  icon,
  color,
  label,
  value,
  active,
  children,
}: {
  icon: React.ReactNode;
  /** 图标线条颜色(如 text-blue-500),iOS 设置风格彩色图标 */
  color: string;
  label: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <DrawerNested>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="group/row flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-accent"
        >
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${color}`}>
            {icon}
          </span>
          <span className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-4 group-last/row:border-0">
            <span className="shrink-0 font-mono text-[15px]">{label}</span>
            <span className={`min-w-0 flex-1 truncate text-right font-mono text-[13px] ${active ? "text-brand-ink" : "text-muted-foreground"}`}>
              {value}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
          </span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        {/* iOS sheet 头:居中标题 + 右侧「完成」 */}
        <div className="relative flex items-center justify-center px-4 pb-3 pt-5">
          <span className="font-mono text-[17px] font-semibold">{label}</span>
          <DrawerClose asChild>
            <button
              type="button"
              className="absolute right-4 font-mono text-[15px] font-medium text-brand-ink active:opacity-60"
            >
              {t("完成")}
            </button>
          </DrawerClose>
        </div>
        <div className="overflow-y-auto px-4 pb-6">
          {children}
        </div>
      </DrawerContent>
    </DrawerNested>
  );
}

// --- Location drawer content: 只按 Zipcode + 距离范围筛选 ---
export function LocationDrawerContent({
  filters,
  onUpdate,
}: {
  filters: Filters;
  onUpdate: (key: keyof Filters, value: string) => void;
}) {
  const { t } = useI18n();
  const [zip, setZip] = useState(
    /^\d{5}$/.test(filters.location) ? filters.location : ""
  );

  return (
    <div>
      {/* Zip code input */}
      <div className="flex items-center gap-2">
        <FilterInput
          placeholder={t("输入 Zip Code")}
          className="flex-1"
          inputMode="numeric"
          maxLength={5}
          value={zip}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 5);
            setZip(val);
            if (val.length === 5) onUpdate("location", val);
            else if (filters.location) onUpdate("location", "");
          }}
        />
        {zip && (
          <button
            type="button"
            className="shrink-0 font-mono text-[13px] text-brand-ink active:opacity-60"
            onClick={() => {
              setZip("");
              onUpdate("location", "");
            }}
          >
            {t("清除")}
          </button>
        )}
      </div>
      <p className="mt-1.5 px-1 font-mono text-[11px] text-muted-foreground">
        {/^\d{5}$/.test(filters.location)
          ? t("以 Zip {zip} 为中心按距离筛选", { zip: filters.location })
          : t("不填则以自动定位的位置计算距离")}
      </p>

      {/* 距离范围 */}
      <div className="mt-5">
        <SectionTitle>{t("距离范围")}</SectionTitle>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {["", "10", "25", "50", "100", "200"].map((v) => (
            <button
              key={v}
              type="button"
              className={pillCls(filters.maxDistance === v)}
              onClick={() => {
                triggerHaptic();
                onUpdate("maxDistance", v);
              }}
            >
              {v === "" ? t("不限") : `≤${v} mi`}
            </button>
          ))}
        </div>
        <FilterInput
          className="mt-2.5"
          placeholder={t("自定义距离 (miles)")}
          inputMode="numeric"
          value={filters.maxDistance}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            onUpdate("maxDistance", val);
          }}
        />
      </div>
    </div>
  );
}

// --- Brand drawer content with search ---
function BrandItem({ make, selected, onToggle }: { make: string; selected: boolean; onToggle: () => void }) {
  const { t, locale } = useI18n();
  const logo = getBrandLogoUrl(make);
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 font-mono text-[13px] transition-colors ${selected ? "bg-brand/30 font-medium text-brand-ink" : "active:bg-muted/60"}`}
      onClick={() => {
        triggerHaptic();
        onToggle();
      }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {logo ? (
          <img src={logo} alt={make} className="h-6 w-6 object-contain" />
        ) : (
          <Car className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </span>
      <span className="flex-1 text-left">{brandLabel(make, MAKES_ZH[make], t, locale)}</span>
      {selected && <Check className="h-4 w-4 shrink-0 text-brand-ink" strokeWidth={2} />}
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
  const { t, locale } = useI18n();
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
              className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-mono text-xs font-medium text-primary-foreground transition-colors active:opacity-80"
              onClick={() => {
                triggerHaptic();
                onUpdate("make", toggleInList(filters.make, make));
              }}
            >
              {getBrandLogoUrl(make) && (
                <img src={getBrandLogoUrl(make)!} alt="" className="h-3.5 w-3.5 object-contain brightness-0 invert" />
              )}
              {brandShortLabel(make, MAKES_ZH[make], t, locale)}
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          ))}
          <button
            type="button"
            className="px-2 py-1.5 font-mono text-xs text-muted-foreground active:text-foreground"
            onClick={() => onUpdate("make", "")}
          >
            {t("清除")}
          </button>
        </div>
      )}

      <FilterInput
        placeholder={t("搜索品牌...")}
        value={brandSearch}
        onChange={(e) => setBrandSearch(e.target.value)}
      />

      {/* Hot brands grid */}
      {!isSearching && !showAll && (
        <>
          <p className="px-1 font-mono text-[13px] font-semibold">{t("热门品牌")}</p>
          <div className="grid grid-cols-4 gap-2">
            {HOT_MAKES.map((make) => {
              const logo = getBrandLogoUrl(make);
              const selected = isInList(filters.make, make);
              return (
                <button
                  key={make}
                  type="button"
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] p-2.5 transition-colors ${selected ? "bg-brand/30 text-brand-ink" : PILL_OFF}`}
                  onClick={() => {
                    triggerHaptic();
                    onUpdate("make", toggleInList(filters.make, make));
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center">
                    {logo ? (
                      <img src={logo} alt={make} className="h-7 w-7 object-contain" />
                    ) : (
                      <Car className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="font-mono text-[10px] leading-tight">{t(MAKES_ZH[make])}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-1 rounded-full py-2.5 font-mono text-[13px] text-muted-foreground transition-colors active:text-foreground ${IOS_FILL}`}
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={() => setShowAll(true)}
          >
            {t("全部品牌")}
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
              className={`mb-2 rounded-full px-3.5 py-2 font-mono text-[13px] text-muted-foreground transition-colors active:text-foreground ${IOS_FILL}`}
              onClick={() => setShowAll(false)}
            >
              {t("← 返回热门")}
            </button>
          )}
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 font-mono text-[13px] transition-colors ${!filters.make ? "bg-brand/30 font-medium text-brand-ink" : "active:bg-muted/60"}`}
            onClick={() => {
              triggerHaptic();
              onUpdate("make", "");
            }}
          >
            <span>{t("不限品牌")}</span>
            {!filters.make && <Check className="h-4 w-4 text-brand-ink" strokeWidth={2} />}
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
  modelOptions,
  featureOptions,
}: {
  filters: Filters;
  onFilter: (filters: Filters) => void;
  activeCount: number;
  /** 车型选项（仅单品牌选中时非空），browse 页统计传入 */
  modelOptions?: CountOption[];
  /** 车辆配置标签选项（带数量），browse 页统计传入 */
  featureOptions?: CountOption[];
}) {
  const { t, locale } = useI18n();
  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    if (key === "fuelType" && value === "纯电") {
      next.transmission = "";
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
        icon={<MapPin className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-blue-500"
        label={t("地区")}
        value={getLocationLabel(filters, t)}
        active={!!filters.location}
      >
        <LocationDrawerContent filters={filters} onUpdate={update} />
      </FilterRow>

      {/* Brand */}
      <FilterRow
        icon={<Car className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-red-500"
        label={t("品牌")}
        value={getBrandLabel(filters, t, locale)}
        active={!!filters.make}
      >
        <BrandDrawerContent filters={filters} onUpdate={update} />
      </FilterRow>

      {/* Model — only shown when exactly one make is selected */}
      {modelOptions && modelOptions.length > 0 && (
        <FilterRow
          icon={<CarFront className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          color="text-teal-500"
          label={t("车型")}
          value={getModelLabel(filters, t)}
          active={!!filters.model}
        >
          <CountPillSelect
            options={modelOptions}
            value={filters.model}
            onChange={(v) => update("model", v)}
            insensitive
          />
        </FilterRow>
      )}

      {/* Body style */}
      <FilterRow
        icon={<CarFront className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-indigo-500"
        label={t("车身类型")}
        value={getBodyStyleSummary(filters, t)}
        active={!!filters.bodyStyle}
      >
        <PillSelect
          options={BODY_STYLE_OPTIONS}
          value={filters.bodyStyle}
          onChange={(v) => update("bodyStyle", v)}
        />
      </FilterRow>

      {/* Price, monthly payment & Year */}
      <FilterRow
        icon={<DollarSign className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-green-600"
        label={t("价格 / 月供")}
        value={getPriceYearLabel(filters, t)}
        active={!!(filters.minPrice || filters.maxPrice || filters.maxPayment || filters.minYear || filters.maxYear)}
      >
        <div className="space-y-6">
          {/* Price */}
          <div>
            <SectionTitle>{t("价格范围")}</SectionTitle>
            <div className="mt-2.5 flex items-center gap-2">
              <FilterInput
                placeholder={t("最低价")}
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  onFilter({ ...filters, minPrice: v });
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">-</span>
              <FilterInput
                placeholder={t("最高价")}
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  onFilter({ ...filters, maxPrice: v });
                }}
              />
            </div>
            <Slider
              className="mt-4"
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

          {/* Monthly payment budget */}
          <div>
            <SectionTitle>{t("月供预算")}</SectionTitle>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                className={pillCls(!filters.maxPayment)}
                onClick={() => {
                  triggerHaptic();
                  update("maxPayment", "");
                }}
              >
                {t("不限")}
              </button>
              {PAYMENT_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={pillCls(filters.maxPayment === v)}
                  onClick={() => {
                    triggerHaptic();
                    update("maxPayment", v);
                  }}
                >
                  {t("≤${n}/月", { n: v })}
                </button>
              ))}
            </div>
            <FilterInput
              className="mt-2.5"
              placeholder={t("自定义月供 ($/月)")}
              inputMode="numeric"
              value={filters.maxPayment}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                update("maxPayment", val);
              }}
            />
            <p className="mt-1.5 px-1 font-mono text-[11px] text-muted-foreground">
              {t("按 0 首付 / 6.5% APR / 60 期估算")}
            </p>
          </div>

          {/* Year */}
          <div>
            <SectionTitle>{t("年份范围")}</SectionTitle>
            <div className="mt-2.5 flex items-center gap-2">
              <FilterInput
                placeholder={t("最早年份")}
                inputMode="numeric"
                maxLength={4}
                value={filters.minYear}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  onFilter({ ...filters, minYear: v });
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">-</span>
              <FilterInput
                placeholder={t("最新年份")}
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
              className="mt-4"
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
        icon={<Gauge className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-orange-500"
        label={t("最高里程")}
        value={filters.maxMileage ? t("≤{n}万mi", { n: (Number(filters.maxMileage) / 10000).toFixed(0) }) : t("不限")}
        active={!!filters.maxMileage}
      >
        <div>
          <SectionTitle>{t("最高里程")}</SectionTitle>
          <p className={`mt-1.5 font-mono text-[13px] ${filters.maxMileage ? "text-brand-ink" : "text-muted-foreground"}`}>
            {formatMileageLabel(MILEAGE_STOPS[mileageIdx], t)}
          </p>
          <Slider
            className="mt-4"
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
        icon={<Palette className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-purple-500"
        label={t("车辆参数")}
        value={getSpecsLabel(filters, t)}
        active={!!(filters.fuelType || filters.transmission || filters.drivetrain || filters.exteriorColor || filters.interiorColor)}
      >
        <div className="space-y-5">
          {/* Fuel */}
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-semibold">{t("燃油类型")}</p>
            <PillSelect options={FUEL_OPTIONS} value={filters.fuelType} onChange={(v) => update("fuelType", v)} />
          </div>

          {/* Transmission — hidden when exclusively electric */}
          {!isElectric && (
            <div>
              <p className="mb-2.5 font-mono text-[13px] font-semibold">{t("变速箱")}</p>
              <PillSelect options={TRANSMISSION_OPTIONS} value={filters.transmission} onChange={(v) => update("transmission", v)} />
            </div>
          )}

          {/* Drivetrain */}
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-semibold">{t("驱动方式")}</p>
            <PillSelect options={DRIVETRAIN_OPTIONS} value={filters.drivetrain} onChange={(v) => update("drivetrain", v)} />
          </div>

          {/* Exterior Color */}
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-semibold">{t("外观颜色")}</p>
            <ColorPillSelect options={COLOR_OPTIONS} value={filters.exteriorColor} onChange={(v) => update("exteriorColor", v)} />
          </div>

          {/* Interior Color */}
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-semibold">{t("内饰颜色")}</p>
            <ColorPillSelect options={INTERIOR_COLOR_OPTIONS} value={filters.interiorColor} onChange={(v) => update("interiorColor", v)} />
          </div>
        </div>
      </FilterRow>

      {/* Seller type */}
      <FilterRow
        icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-sky-500"
        label={t("卖家类型")}
        value={getSellerLabel(filters, t)}
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

      {/* Features — top tags with counts, AND semantics */}
      {featureOptions && featureOptions.length > 0 && (
        <FilterRow
          icon={<ListChecks className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          color="text-amber-500"
          label={t("车辆配置")}
          value={getFeaturesLabel(filters, t, featureOptions)}
          active={!!filters.features}
        >
          <div>
            <CountPillSelect
              options={featureOptions}
              value={filters.features}
              onChange={(v) => update("features", v)}
              insensitive
              labelOf={(o) => o.label ?? t(o.name)}
            />
            <p className="mt-2 px-1 font-mono text-[11px] text-muted-foreground">{t("需同时满足所选配置")}</p>
          </div>
        </FilterRow>
      )}

      {/* More conditions: deal rating / price drop / history & assurance / listed within */}
      <FilterRow
        icon={<BadgePercent className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        color="text-pink-500"
        label={t("更多条件")}
        value={getMoreLabel(filters, t)}
        active={!!(filters.dealRating || filters.priceDropped || filters.listedWithin || filters.noAccident || filters.oneOwner || filters.hasCarfax || filters.cleanTitle || filters.hasVideo || filters.hasPrice)}
      >
        <div className="space-y-5">
          {/* Deal rating & price dropped toggles — iOS 分组开关卡 */}
          <div className={`overflow-hidden rounded-[22px] ${IOS_FILL}`}>
            <ToggleRow
              label={t("只看好价（好价及以上）")}
              checked={filters.dealRating === "good"}
              onChange={(v) => update("dealRating", v ? "good" : "")}
            />
            <ToggleRow
              label={t("只看降价车源")}
              checked={filters.priceDropped === "true"}
              onChange={(v) => update("priceDropped", v ? "true" : "")}
            />
            {CONDITION_TOGGLES.map((tog) => (
              <ToggleRow
                key={tog.key}
                label={t(tog.label)}
                checked={filters[tog.key] === "true"}
                onChange={(v) => update(tog.key, v ? "true" : "")}
              />
            ))}
          </div>

          {/* Listed within */}
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-semibold">{t("上架时间")}</p>
            <div className="flex flex-wrap gap-2">
              {LISTED_WITHIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={pillCls(filters.listedWithin === opt.value)}
                  onClick={() => {
                    triggerHaptic();
                    update("listedWithin", opt.value);
                  }}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FilterRow>

      {/* Reset — iOS 红色操作按钮 */}
      {activeCount > 0 && (
        <div className="px-4 pt-4">
          <button
            type="button"
            className={`flex h-12 w-full items-center justify-center rounded-full font-mono text-[15px] font-medium text-destructive transition-opacity active:opacity-70 ${IOS_FILL}`}
            onClick={() => {
              triggerHaptic();
              onFilter({ ...INITIAL_FILTERS, keyword: filters.keyword });
            }}
          >
            {t("清除全部筛选 ({n})", { n: activeCount })}
          </button>
        </div>
      )}
    </div>
  );
}
