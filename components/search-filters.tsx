"use client";

import { X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/components/i18n-provider";
import { brandLabel } from "@/lib/i18n";
import { MAKES, MAKES_ZH, HOT_MAKES, getBrandLogoUrl } from "@/lib/mock-data";
import { BODY_STYLE_OPTIONS } from "@/lib/body-style";
import { LOAN_FILTER_LABEL } from "@/lib/dealer-financing";
import { trackFilterChipClick } from "@/lib/analytics/client";

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
MILEAGE_STOPS.push(999999); // unlimited
function mileageToIndex(miles: number): number {
  for (let i = MILEAGE_STOPS.length - 1; i >= 0; i--) {
    if (miles >= MILEAGE_STOPS[i]) return i;
  }
  return MILEAGE_STOPS.length - 1;
}
function formatMileageLabel(
  miles: number,
  t: (text: string, vars?: Record<string, string | number>) => string
): string {
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

// 车况与保障开关（更多条件）
export const CONDITION_TOGGLES: {
  key: "noAccident" | "oneOwner" | "hasCarfax" | "cleanTitle" | "financing" | "hasVideo" | "hasPrice";
  label: string;
}[] = [
  { key: "noAccident", label: "无事故" },
  { key: "oneOwner", label: "一手车主" },
  { key: "hasCarfax", label: "有Carfax报告" },
  // 只命中 cars.title_status = 清白产权(未填的不算),见 lib/title-status.ts
  { key: "cleanTitle", label: "仅清白产权" },
  // 卖家门店标了「支持ITIN贷款」或「无信用记录可贷」,见 lib/dealer-financing.ts(打开时记一次点击统计)
  { key: "financing", label: LOAN_FILTER_LABEL },
  { key: "hasVideo", label: "带视频" },
  { key: "hasPrice", label: "排除电议" },
];

// 带数量的动态选项（车型 / 车辆配置），由 browse 页统计车源后传入
export interface CountOption {
  /** 筛选值(写进 URL / filters 的就是它) */
  name: string;
  count: number;
  /** 当前界面语言的展示文案(配置按 i18n 词表本地化);缺省时显示 t(name) */
  label?: string;
}

/** 已选配置值的展示文案:统计选项里有同名项(忽略大小写)就用它的 label,否则走词典 */
export function featureOptionLabel(
  value: string,
  options: CountOption[] | undefined,
  t: (text: string, vars?: Record<string, string | number>) => string
): string {
  const key = value.trim().toLowerCase();
  const opt = options?.find((o) => o.name.trim().toLowerCase() === key);
  return opt?.label ?? t(opt?.name ?? value.trim());
}

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

// 月供预算预设（全站口径：0 首付 / 6.5% APR / 60 期）
export const PAYMENT_PRESETS = ["200", "300", "400", "500", "700"];

// 上架时间选项（单选）
export const LISTED_WITHIN_OPTIONS = [
  { value: "", label: "不限" },
  { value: "1", label: "24小时内" },
  { value: "3", label: "3天内" },
  { value: "7", label: "7天内" },
  { value: "30", label: "30天内" },
];

export interface Filters {
  keyword: string;
  make: string;
  model: string;
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
  features: string;
  maxDistance: string;
  bodyStyle: string;
  maxPayment: string;
  dealRating: string;
  priceDropped: string;
  listedWithin: string;
  noAccident: string;
  oneOwner: string;
  hasCarfax: string;
  cleanTitle: string;
  /** "true" = 只看卖家门店支持 ITIN / 无信用记录贷款的车(lib/dealer-financing.ts) */
  financing: string;
  hasVideo: string;
  hasPrice: string;
}

export const INITIAL_FILTERS: Filters = {
  keyword: "",
  make: "",
  model: "",
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
  features: "",
  maxDistance: "50",
  bodyStyle: "",
  maxPayment: "",
  dealRating: "",
  priceDropped: "",
  listedWithin: "",
  noAccident: "",
  oneOwner: "",
  hasCarfax: "",
  cleanTitle: "",
  financing: "",
  hasVideo: "",
  hasPrice: "",
};

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

// 大小写不敏感 + trim 的多选切换（车型名可能来自 URL，大小写不定）
export function toggleInListCI(current: string, value: string): string {
  const items = current ? current.split(",").filter(Boolean) : [];
  const idx = items.findIndex(
    (v) => v.trim().toLowerCase() === value.trim().toLowerCase()
  );
  if (idx >= 0) {
    items.splice(idx, 1);
  } else {
    items.push(value);
  }
  return items.join(",");
}

export function isInListCI(list: string, value: string): boolean {
  if (!list) return false;
  return list
    .split(",")
    .some((v) => v.trim().toLowerCase() === value.trim().toLowerCase());
}

// --- iOS 风格共享样式(筛选侧栏 / 移动筛选抽屉共用) ---
// 选中态:brand 绿实心胶囊;未选中:systemGray6 式半透明填充
export const PILL_ON = "bg-brand font-medium text-primary-foreground";
export const PILL_OFF =
  "bg-black/[0.05] hover:bg-black/[0.08] active:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]";
// 输入框 / 分组容器的 iOS 填充底色
export const IOS_FILL = "bg-black/[0.05] dark:bg-white/[0.08]";

/* 桌面侧栏分组:标题在卡外(iOS 分组表头),内容装进白色圆角卡。
   active 时标题旁亮一个小圆点:侧栏很长,滚动中也能一眼看出哪些分组已有选中条件 */
function Section({ title, active, children }: { title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <p className="flex items-center gap-1.5 px-4 pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {title}
        {/* 浅色下薄荷绿太浅,提示点用 brand-ink;深色反之用 brand */}
        {active && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-ink/70 dark:bg-brand" />}
      </p>
      <div className="rounded-[22px] bg-card p-3.5">{children}</div>
    </section>
  );
}

// --- Compact pill select for desktop sidebar ---
function SidebarPillSelect({
  options,
  value,
  onChange,
  insensitive,
}: {
  /** label 为词典 key(显示 t(label));text 为已本地化的文案,有则原样显示 */
  options: { value: string; label: string; text?: string; color?: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  /** 大小写不敏感匹配（车型名 / 配置标签） */
  insensitive?: boolean;
}) {
  const { t } = useI18n();
  const selected = (v: string) => (insensitive ? isInListCI(value, v) : isInList(value, v));
  const toggle = (v: string) => (insensitive ? toggleInListCI(value, v) : toggleInList(value, v));
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      <button
        type="button"
        className={`rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${!value ? PILL_ON : PILL_OFF}`}
        onClick={() => onChange("")}
      >
        {t("不限")}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${selected(opt.value) ? PILL_ON : PILL_OFF}`}
          onClick={() => onChange(toggle(opt.value))}
        >
          {opt.color && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-border"
              style={{ backgroundColor: opt.color }}
            />
          )}
          {opt.text ?? t(opt.label)}
          {opt.count !== undefined && <span className="opacity-60">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchFilters({
  onFilter,
  initialFilters,
  modelOptions,
  featureOptions,
}: {
  onFilter: (filters: Filters) => void;
  initialFilters?: Filters;
  /** 车型选项（仅单品牌选中时非空），browse 页统计传入 */
  modelOptions?: CountOption[];
  /** 车辆配置标签选项（带数量），browse 页统计传入 */
  featureOptions?: CountOption[];
}) {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<Filters>(initialFilters || INITIAL_FILTERS);
  // Zipcode 输入的本地缓冲(未满 5 位时不写入 filters)
  const [zip, setZip] = useState(() =>
    /^\d{5}$/.test((initialFilters || INITIAL_FILTERS).location)
      ? (initialFilters || INITIAL_FILTERS).location
      : ""
  );
  useEffect(() => {
    if (initialFilters) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 父组件(URL/清空)改了筛选条件时同步到本地状态
      setFilters(initialFilters);
      if (/^\d{5}$/.test(initialFilters.location)) {
        setZip(initialFilters.location);
      } else if (!initialFilters.location) {
        // 外部清空(如「清空所有筛选」)时同步清掉;输入中的不完整值保留
        setZip((z) => (/^\d{5}$/.test(z) ? "" : z));
      }
    }
  }, [initialFilters]);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== "keyword"
  ).length;

  const isElectric = filters.fuelType === "纯电"; // only hide when exclusively electric

  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    // Clear transmission when switching to electric
    if (key === "fuelType" && value === "纯电") {
      next.transmission = "";
    }
    if (key === "financing" && value === "true") trackFilterChipClick("financing", locale);
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
    /* space-y-6:分组标题在卡外,组间距略大于卡内间距才能形成清晰的分组节奏 */
    <aside className="w-full space-y-6">
      {/* 关键词搜索已上移到全站导航栏搜索框(输入后带 ?q= 进入本页) */}

      {/* Clear all — iOS 红色操作胶囊 */}
      {activeCount > 0 && (
        <button
          type="button"
          className="flex h-9 w-full items-center justify-center gap-1 rounded-full bg-card font-mono text-xs font-medium text-destructive transition-opacity hover:opacity-80 active:opacity-60"
          onClick={reset}
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
          {t("清除全部筛选 ({n})", { n: activeCount })}
        </button>
      )}

      {/* Location — zipcode + distance */}
      {/* 距离默认值 "50" 不算"已选",避免提示点常亮失去意义 */}
      <Section title={t("位置")} active={!!filters.location || (!!filters.maxDistance && filters.maxDistance !== INITIAL_FILTERS.maxDistance)}>
        <div className="flex items-center gap-2">
          <input
            placeholder={t("输入 Zipcode")}
            className={`h-9 min-w-0 flex-1 rounded-xl px-3 font-mono text-xs outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
            maxLength={5}
            inputMode="numeric"
            value={zip}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 5);
              setZip(val);
              if (val.length === 5) update("location", val);
              else if (filters.location) update("location", "");
            }}
          />
          {zip && (
            <button
              type="button"
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setZip("");
                update("location", "");
              }}
            >
              {t("清除")}
            </button>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
          {/^\d{5}$/.test(filters.location)
            ? t("以 Zip {zip} 为中心按距离筛选", { zip: filters.location })
            : t("不填则以自动定位的位置计算距离")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">{t("距离")}</span>
          {["", "10", "25", "50", "100", "200"].map((v) => (
            <button
              key={v}
              type="button"
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors ${filters.maxDistance === v ? PILL_ON : PILL_OFF}`}
              onClick={() => update("maxDistance", v)}
            >
              {v === "" ? t("不限") : `≤${v}mi`}
            </button>
          ))}
        </div>
      </Section>

      {/* Brand */}
      <Section title={t("品牌")} active={!!filters.make}>
        <div className="grid grid-cols-3 gap-1.5">
          {HOT_MAKES.map((make) => {
            const logo = getBrandLogoUrl(make);
            const selected = isInList(filters.make, make);
            return (
              <button
                key={make}
                type="button"
                className={`flex flex-col items-center gap-1 rounded-2xl p-2 transition-colors ${selected ? "bg-brand/30 text-brand-ink" : `${IOS_FILL} hover:opacity-80`}`}
                onClick={() => update("make", toggleInList(filters.make, make))}
              >
                <span className="flex h-6 w-6 items-center justify-center">
                  {logo ? (
                    <img src={logo} alt={make} className="h-5 w-5 object-contain" />
                  ) : null}
                </span>
                <span className="font-mono text-[10px] leading-tight">{t(MAKES_ZH[make])}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t("全部品牌")}</p>
        <div className={`max-h-[280px] overflow-y-auto rounded-2xl ${IOS_FILL}`}>
          <button
            type="button"
            className={`flex w-full items-center justify-between px-3 py-1.5 font-mono text-[11px] transition-colors hover:bg-muted ${!filters.make ? "bg-brand/30 font-medium text-brand-ink" : ""}`}
            onClick={() => update("make", "")}
          >
            <span>{t("不限")}</span>
            {!filters.make && <Check className="h-3 w-3 text-brand-ink" strokeWidth={2} />}
          </button>
          {MAKES.map((make) => {
            const logo = getBrandLogoUrl(make);
            return (
              <button
                key={make}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-1.5 font-mono text-[11px] transition-colors hover:bg-muted ${isInList(filters.make, make) ? "bg-brand/30 font-medium text-brand-ink" : ""}`}
                onClick={() => update("make", toggleInList(filters.make, make))}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {logo ? <img src={logo} alt="" className="h-4 w-4 object-contain" /> : null}
                </span>
                <span className="flex-1 text-left">{brandLabel(make, MAKES_ZH[make], t, locale)}</span>
                {isInList(filters.make, make) && <Check className="h-3 w-3 shrink-0 text-brand-ink" strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Model — only shown when exactly one make is selected */}
      {modelOptions && modelOptions.length > 0 && (
        <Section title={t("车型")} active={!!filters.model}>
          <SidebarPillSelect
            options={modelOptions.map((o) => ({ value: o.name, label: o.name, count: o.count }))}
            value={filters.model}
            onChange={(v) => update("model", v)}
            insensitive
          />
        </Section>
      )}

      {/* Body style */}
      <Section title={t("车身类型")} active={!!filters.bodyStyle}>
        <SidebarPillSelect
          options={BODY_STYLE_OPTIONS}
          value={filters.bodyStyle}
          onChange={(v) => update("bodyStyle", v)}
        />
      </Section>

      {/* Seller type */}
      <Section title={t("卖家类型")} active={!!filters.sellerType}>
        <SidebarPillSelect
          options={[
            { value: "dealer", label: "车行" },
            { value: "private", label: "个人" },
          ]}
          value={filters.sellerType}
          onChange={(v) => update("sellerType", v)}
        />
      </Section>

      {/* Price slider + input */}
      <Section title={t("价格范围")} active={!!(filters.minPrice || filters.maxPrice)}>
        <div className="flex items-center gap-1.5">
          <input
            className={`h-9 w-full min-w-0 rounded-xl px-3 font-mono text-[11px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
            placeholder={t("最低")}
            inputMode="numeric"
            value={filters.minPrice}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              const next = { ...filters, minPrice: v };
              setFilters(next);
              onFilter(next);
            }}
          />
          <span className="font-mono text-[11px] text-muted-foreground">-</span>
          <input
            className={`h-9 w-full min-w-0 rounded-xl px-3 font-mono text-[11px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
            placeholder={t("最高")}
            inputMode="numeric"
            value={filters.maxPrice}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              const next = { ...filters, maxPrice: v };
              setFilters(next);
              onFilter(next);
            }}
          />
        </div>
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
        {/* 价格筛选的数字是美元(加元车源按 lib/currency.ts 固定汇率折算后比较),写明免得加拿大用户当成加元 */}
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">{t("按美元筛选，加元车源已折算")}</p>
      </Section>

      {/* Monthly payment budget */}
      <Section title={t("月供预算")} active={!!filters.maxPayment}>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors ${!filters.maxPayment ? PILL_ON : PILL_OFF}`}
            onClick={() => update("maxPayment", "")}
          >
            {t("不限")}
          </button>
          {PAYMENT_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors ${filters.maxPayment === v ? PILL_ON : PILL_OFF}`}
              onClick={() => update("maxPayment", v)}
            >
              {t("≤${n}/月", { n: v })}
            </button>
          ))}
        </div>
        <input
          className={`mt-2 h-9 w-full rounded-xl px-3 font-mono text-[11px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
          placeholder={t("自定义月供 ($/月)")}
          inputMode="numeric"
          value={filters.maxPayment}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            update("maxPayment", val);
          }}
        />
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
          {t("按 0 首付 / 6.5% APR / 60 期估算")}
        </p>
      </Section>

      {/* Year slider + input */}
      <Section title={t("年份范围")} active={!!(filters.minYear || filters.maxYear)}>
        <div className="flex items-center gap-1.5">
          <input
            className={`h-9 w-full min-w-0 rounded-xl px-3 font-mono text-[11px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
            placeholder={t("最早")}
            inputMode="numeric"
            maxLength={4}
            value={filters.minYear}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              const next = { ...filters, minYear: v };
              setFilters(next);
              onFilter(next);
            }}
          />
          <span className="font-mono text-[11px] text-muted-foreground">-</span>
          <input
            className={`h-9 w-full min-w-0 rounded-xl px-3 font-mono text-[11px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
            placeholder={t("最新")}
            inputMode="numeric"
            maxLength={4}
            value={filters.maxYear}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              const next = { ...filters, maxYear: v };
              setFilters(next);
              onFilter(next);
            }}
          />
        </div>
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
      </Section>

      {/* Fuel type */}
      <Section title={t("燃油类型")} active={!!filters.fuelType}>
        <SidebarPillSelect options={FUEL_OPTIONS} value={filters.fuelType} onChange={(v) => update("fuelType", v)} />
      </Section>

      {/* Transmission — hidden when exclusively electric */}
      {!isElectric && (
        <Section title={t("变速箱")} active={!!filters.transmission}>
          <SidebarPillSelect options={TRANSMISSION_OPTIONS} value={filters.transmission} onChange={(v) => update("transmission", v)} />
        </Section>
      )}

      {/* Drivetrain */}
      <Section title={t("驱动方式")} active={!!filters.drivetrain}>
        <SidebarPillSelect options={DRIVETRAIN_OPTIONS} value={filters.drivetrain} onChange={(v) => update("drivetrain", v)} />
      </Section>

      {/* Mileage slider with breakpoints */}
      <Section title={t("最高里程")} active={!!filters.maxMileage}>
        <p className="font-mono text-[11px] text-foreground">
          {formatMileageLabel(MILEAGE_STOPS[mileageIdx], t)}
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
      </Section>

      {/* Exterior color */}
      <Section title={t("外观颜色")} active={!!filters.exteriorColor}>
        <SidebarPillSelect options={COLOR_OPTIONS} value={filters.exteriorColor} onChange={(v) => update("exteriorColor", v)} />
      </Section>

      {/* Interior color */}
      <Section title={t("内饰颜色")} active={!!filters.interiorColor}>
        <SidebarPillSelect options={INTERIOR_COLOR_OPTIONS} value={filters.interiorColor} onChange={(v) => update("interiorColor", v)} />
      </Section>

      {/* Features — top tags with counts, AND semantics */}
      {featureOptions && featureOptions.length > 0 && (
        <Section title={t("车辆配置")} active={!!filters.features}>
          {/* 显示 label(词表本地化)缺省走词典;筛选值仍是 name,与 cars.features 忽略大小写比对 */}
          <SidebarPillSelect
            options={featureOptions.map((o) => ({ value: o.name, label: o.name, text: o.label, count: o.count }))}
            value={filters.features}
            onChange={(v) => update("features", v)}
            insensitive
          />
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{t("需同时满足所选配置")}</p>
        </Section>
      )}

      {/* More conditions — iOS 列表行 + brand 绿勾选 */}
      <Section
        title={t("更多条件")}
        active={
          !!(
            filters.dealRating ||
            filters.priceDropped ||
            filters.listedWithin ||
            filters.noAccident ||
            filters.oneOwner ||
            filters.hasCarfax ||
            filters.cleanTitle ||
            filters.financing ||
            filters.hasVideo ||
            filters.hasPrice
          )
        }
      >
        <div className="space-y-1">
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-full px-3 py-2 font-mono text-[11px] transition-colors ${filters.dealRating === "good" ? "bg-brand/30 font-medium text-brand-ink" : PILL_OFF}`}
            onClick={() => update("dealRating", filters.dealRating === "good" ? "" : "good")}
          >
            <span>{t("只看好价")}</span>
            {filters.dealRating === "good" && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-full px-3 py-2 font-mono text-[11px] transition-colors ${filters.priceDropped === "true" ? "bg-brand/30 font-medium text-brand-ink" : PILL_OFF}`}
            onClick={() => update("priceDropped", filters.priceDropped === "true" ? "" : "true")}
          >
            <span>{t("只看降价")}</span>
            {filters.priceDropped === "true" && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
          {CONDITION_TOGGLES.map((tg) => (
            <button
              key={tg.key}
              type="button"
              className={`flex w-full items-center justify-between rounded-full px-3 py-2 font-mono text-[11px] transition-colors ${filters[tg.key] === "true" ? "bg-brand/30 font-medium text-brand-ink" : PILL_OFF}`}
              onClick={() => update(tg.key, filters[tg.key] === "true" ? "" : "true")}
            >
              <span>{t(tg.label)}</span>
              {filters[tg.key] === "true" && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
          ))}
        </div>
        <p className="mt-3 px-1 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t("上架时间")}</p>
        <div className="flex flex-wrap gap-1.5">
          {LISTED_WITHIN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors ${filters.listedWithin === opt.value ? PILL_ON : PILL_OFF}`}
              onClick={() => update("listedWithin", opt.value)}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
      </Section>
    </aside>
  );
}
