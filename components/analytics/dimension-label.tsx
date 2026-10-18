"use client";

// 排行维度取值的展示(旗帜 / 地区 / 来源首字母方块 / 车辆缩略图…)、维度名、筛选胶囊文案,
// 以及「点排行行 → 应叠加的筛选」。admin 与卖家仪表盘共用。
// 维度值 null = 库里为 NULL(未知 / 直接访问);转成筛选条件时用 "" 表示(SQL 侧 "" 匹配 NULL)。

import { Car, Link2Off, Monitor, Smartphone, Tablet } from "lucide-react";
import type { AnalyticsBreakdownRow, AnalyticsDimension, AnalyticsFilters } from "@/lib/analytics/types";
import { carTitle, type Locale } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { countryFlag, countryName } from "@/lib/analytics/geo";
import { deviceLabel, localeLabel, platformLabel, shortVisitorId } from "@/components/analytics/format";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type TFn = (s: string, v?: Record<string, string | number>) => string;

// 路径用真正的等宽字体(全站 font-mono 已被换成系统无衬线栈)
const MONO: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

/** 编译期保证 switch 覆盖全部取值;运行时遇到未知值返回 null 走兜底 */
function exhaustive(value: never): null {
  void value;
  return null;
}

// ---------- 维度名 ----------

type NameKey = AnalyticsDimension | keyof AnalyticsFilters;

function nameOf(k: NameKey, t: (s: string) => string): string | null {
  switch (k) {
    case "path":
      return t("页面");
    case "route":
      return t("路由");
    case "hostname":
      return t("域名");
    case "referrer_host":
      // 「来源」在 ko / ja 词典里是贷款指南的「贷款机构」,统计界面用专门的 key
      return t("访问来源");
    case "utm_source":
      return t("UTM 来源");
    case "utm_medium":
      return t("UTM 媒介");
    case "utm_campaign":
      return t("UTM 活动");
    case "country":
      return t("国家");
    case "region":
      return t("州/省");
    case "city":
      return t("城市");
    case "device":
      return t("设备");
    case "browser":
      return t("浏览器");
    case "os":
      return t("系统");
    case "platform":
      return t("平台");
    case "locale":
      return t("语言");
    case "car":
    case "car_id":
      return t("车辆");
    case "user_id":
      return t("用户");
    case "visitor_id":
      return t("访客");
    case "visitor_type":
      return t("访客类型");
    case "exclude_admins":
      return t("排除管理员");
    default:
      return exhaustive(k);
  }
}

/** 维度 / 筛选键的显示名:「国家」「访问来源」…;未知键原样返回 */
export function dimensionName(dimension: string, t: (s: string) => string): string {
  return nameOf(dimension as NameKey, t) ?? dimension;
}

// ---------- 筛选胶囊 ----------

/** 筛选值的显示文案("" = 未知 / 直接访问 / 无) */
export function filterValueLabel(
  key: keyof AnalyticsFilters,
  value: string,
  t: TFn,
  locale: Locale
): string {
  switch (key) {
    case "country":
      return value ? countryName(value, locale) : t("未知");
    case "referrer_host":
      return value || t("直接访问");
    case "utm_source":
    case "utm_medium":
    case "utm_campaign":
      return value || t("无");
    case "device":
      return deviceLabel(value || null, t);
    case "platform":
      return platformLabel(value || null, t);
    case "locale":
      return localeLabel(value || null, t);
    case "path":
    case "route":
    case "hostname":
    case "region":
    case "city":
    case "browser":
    case "os":
      return value || t("未知");
    case "car_id":
    case "user_id":
      return value.slice(0, 8);
    case "visitor_id":
      return `#${shortVisitorId(value)}`;
    case "visitor_type":
      return value === "user" ? t("登录用户") : value === "anonymous" ? t("匿名访客") : value;
    case "exclude_admins":
      return value === "true" || value === "1" ? t("是") : t("否");
    default:
      return exhaustive(key) ?? value;
  }
}

/**
 * 筛选胶囊文案:country "US" →「国家: 美国」;referrer_host "" →「访问来源: 直接访问」;
 * car_id →「车辆: <前 8 位>」(调用方可覆盖为车名)。布尔筛选传 String(v)。
 */
export function filterChipLabel(
  key: keyof AnalyticsFilters,
  value: string,
  t: TFn,
  locale: Locale
): string {
  return `${dimensionName(key, t)}: ${filterValueLabel(key, value, t, locale)}`;
}

// ---------- 「查看全部」的本地搜索 ----------

/**
 * 一行排行可被搜到的文字:显示出来的标签 + 库里的原始值(多行拼接,调用方按小写 includes 匹配)。
 * 库里的 p_search 只认原始值,本地搜索补上国家名(Canada / 加拿大)、各语言车名、「直接访问 / 无 / 未知」、设备 / 平台 / 语言名。
 */
export function dimensionSearchText(
  dimension: string,
  row: AnalyticsBreakdownRow,
  t: TFn,
  locale: Locale
): string {
  const key = row.key;
  const parts: (string | null | undefined)[] = [];
  switch (dimension) {
    case "country":
      parts.push(key, key ? countryName(key, locale) : t("未知"));
      break;
    case "region":
      parts.push(key ?? t("未知"), row.country, row.country ? countryName(row.country, locale) : null);
      break;
    case "city":
      parts.push(
        key ? [key, row.region].filter(Boolean).join(", ") : t("未知"),
        row.country,
        row.country ? countryName(row.country, locale) : null
      );
      break;
    case "referrer_host":
      parts.push(key ?? t("直接访问"));
      break;
    case "utm_source":
    case "utm_medium":
    case "utm_campaign":
      parts.push(key ?? t("无"));
      break;
    case "device":
      parts.push(key, deviceLabel(key, t));
      break;
    case "platform":
      parts.push(key, platformLabel(key, t));
      break;
    case "locale":
      parts.push(key, localeLabel(key, t));
      break;
    case "car": {
      const car = row.car ?? null;
      if (car) {
        parts.push(carTitle(car, locale), car.title, car.title_zh, car.make, car.model, car.year ? String(car.year) : null);
      } else {
        parts.push(t("已删除车辆"));
      }
      break;
    }
    default:
      parts.push(key ?? t("未知"));
  }
  return parts.filter(Boolean).join("\n");
}

// ---------- 点排行行 → 筛选 ----------

// 可直接按 key 精确筛选的维度(region / city / car 另行处理)
const TEXT_DIMENSIONS = [
  "path",
  "route",
  "hostname",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "country",
  "device",
  "browser",
  "os",
  "platform",
  "locale",
] as const satisfies readonly (AnalyticsDimension & keyof AnalyticsFilters)[];

type TextDimension = (typeof TEXT_DIMENSIONS)[number];

function isTextDimension(d: string): d is TextDimension {
  return (TEXT_DIMENSIONS as readonly string[]).includes(d);
}

/** 点击排行行 → 应该叠加的筛选(region 行同时设 country+region;city 行设三者;key null → "") */
export function filtersForRow(dimension: string, row: AnalyticsBreakdownRow): Partial<AnalyticsFilters> {
  const value = row.key ?? "";
  // region/city 行的上级字段缺失(undefined)时不加对应筛选,免得误筛成「未知」
  const country = row.country !== undefined ? { country: row.country ?? "" } : {};
  switch (dimension) {
    case "car":
      // car_id 是 uuid,空串会让 SQL 报错;车辆行理论上 key 不会为空
      return row.key ? { car_id: row.key } : {};
    case "region":
      return { ...country, region: value };
    case "city":
      return {
        ...country,
        ...(row.region !== undefined ? { region: row.region ?? "" } : {}),
        city: value,
      };
    default: {
      if (!isTextDimension(dimension)) return {};
      const out: Partial<Record<TextDimension, string>> = {};
      out[dimension] = value;
      return out;
    }
  }
}

// ---------- 取值展示 ----------

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="truncate text-muted-foreground">{children}</span>;
}

function Plain({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="truncate" title={title}>
      {children}
    </span>
  );
}

/** 长路径中间省略:前段先截断,末尾 12 个字符尽量保留(/car/0f19c4…93b8f4948810);极窄时尾段也截断,不压到数值列 */
function PathText({ text }: { text: string }) {
  const tailLen = text.length > 24 ? 12 : 0;
  const head = tailLen ? text.slice(0, -tailLen) : text;
  const tail = tailLen ? text.slice(-tailLen) : "";
  return (
    <span className="flex min-w-0 overflow-hidden text-[11px]" style={MONO} title={text}>
      <span className="min-w-0 truncate">{head}</span>
      {tail && <span className="max-w-full shrink-0 truncate">{tail}</span>}
    </span>
  );
}

function SmallFlag({ code }: { code: string | null | undefined }) {
  if (!code) return null;
  return (
    <span className="shrink-0 text-[10px] text-muted-foreground">· {countryFlag(code) || code.toUpperCase()}</span>
  );
}

function DeviceIcon({ device }: { device: string | null }) {
  const cls = "h-3.5 w-3.5 shrink-0 text-muted-foreground";
  if (device === "desktop") return <Monitor className={cls} strokeWidth={1.5} aria-hidden="true" />;
  if (device === "mobile") return <Smartphone className={cls} strokeWidth={1.5} aria-hidden="true" />;
  if (device === "tablet") return <Tablet className={cls} strokeWidth={1.5} aria-hidden="true" />;
  return <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function CarLabel({ row }: { row: AnalyticsBreakdownRow }) {
  const { t, locale } = useI18n();
  const car = row.car ?? null;
  const title = car
    ? carTitle(car, locale) ||
      [car.year, car.make, car.model].filter(Boolean).join(" ") ||
      (row.key ?? "").slice(0, 8)
    : t("已删除车辆");
  const meta = car
    ? [car.year ? String(car.year) : "", car.price != null ? formatPrice(car.price, car.currency) : ""]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex h-6 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {car?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={car.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Car className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate", !car && "text-muted-foreground")}>{title}</span>
        {meta && <span className="truncate text-[10px] text-muted-foreground">{meta}</span>}
      </span>
    </span>
  );
}

/**
 * 排行行的维度取值:country 旗帜 + 本地化国家名;region "NY · 🇺🇸";city "Flushing, NY · 🇺🇸";
 * referrer_host null →「直接访问」(域名前带首字母方块,不拉外链 favicon);utm_* null →「无」;
 * device/platform/locale 用 format.ts 标签;browser/os null →「未知」;path/route 等宽 + 中间省略;
 * car 缩略图 + 标题 + 年份/价格,车已删除显示「已删除车辆」。
 */
export function DimensionLabel({
  dimension,
  row,
}: {
  dimension: string;
  row: AnalyticsBreakdownRow;
}): React.JSX.Element {
  const { t, locale } = useI18n();
  const key = row.key;

  switch (dimension) {
    case "path":
    case "route":
      return key ? <PathText text={key} /> : <Muted>{t("未知")}</Muted>;

    case "referrer_host":
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-muted text-[9px] leading-none font-medium text-muted-foreground uppercase"
          >
            {key ? key.replace(/^www\./i, "").charAt(0) : <Link2Off className="h-2.5 w-2.5" strokeWidth={1.5} />}
          </span>
          {key ? <Plain title={key}>{key}</Plain> : <Muted>{t("直接访问")}</Muted>}
        </span>
      );

    case "utm_source":
    case "utm_medium":
    case "utm_campaign":
      return key ? <Plain title={key}>{key}</Plain> : <Muted>{t("无")}</Muted>;

    case "country":
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          {key && countryFlag(key) && (
            <span aria-hidden="true" className="shrink-0">
              {countryFlag(key)}
            </span>
          )}
          {key ? <Plain>{countryName(key, locale)}</Plain> : <Muted>{t("未知")}</Muted>}
        </span>
      );

    case "region":
      return (
        <span className="flex min-w-0 items-center gap-1">
          {key ? <Plain>{key}</Plain> : <Muted>{t("未知")}</Muted>}
          <SmallFlag code={row.country} />
        </span>
      );

    case "city": {
      const text = key ? [key, row.region].filter(Boolean).join(", ") : "";
      return (
        <span className="flex min-w-0 items-center gap-1">
          {text ? <Plain title={text}>{text}</Plain> : <Muted>{t("未知")}</Muted>}
          <SmallFlag code={row.country} />
        </span>
      );
    }

    case "device":
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <DeviceIcon device={key} />
          {key ? <Plain>{deviceLabel(key, t)}</Plain> : <Muted>{t("未知")}</Muted>}
        </span>
      );

    case "platform":
      return key ? <Plain>{platformLabel(key, t)}</Plain> : <Muted>{t("未知")}</Muted>;

    case "locale":
      return key ? <Plain>{localeLabel(key, t)}</Plain> : <Muted>{t("未知")}</Muted>;

    case "car":
      return <CarLabel row={row} />;

    case "hostname":
    case "browser":
    case "os":
    default:
      return key ? <Plain title={key}>{key}</Plain> : <Muted>{t("未知")}</Muted>;
  }
}
