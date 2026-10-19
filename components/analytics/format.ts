// 访问统计后台的共享格式化工具(数字 / 百分比 / 环比 / 相对时间 / 维度取值的本地化标签)。

import { dateLocale, type Locale } from "@/lib/i18n";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

/** 1,284 */
export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(dateLocale(locale)).format(n);
}

/** 12.9K / 1.2M(< 1000 原样) */
export function formatCompact(n: number, locale: Locale): string {
  if (Math.abs(n) < 1000) return formatNumber(n, locale);
  return new Intl.NumberFormat(dateLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** 0.4231 → "42.3%";null → "—" */
export function formatPercent(ratio: number | null | undefined, locale: Locale): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return new Intl.NumberFormat(dateLocale(locale), {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(ratio);
}

/**
 * 与上一周期对比:pct 为相对变化(0.12 = +12%);上一周期为 0 时 pct = null(无从比较)。
 * dir 为数值方向,是否「变好」由调用方按指标判断(跳出率下降是好事)。
 */
export function delta(
  cur: number | null | undefined,
  prev: number | null | undefined
): { pct: number | null; dir: "up" | "down" | "flat" } {
  const c = cur ?? 0;
  const p = prev ?? 0;
  if (c === p) return { pct: 0, dir: "flat" };
  if (p === 0) return { pct: null, dir: c > p ? "up" : "down" };
  return { pct: (c - p) / Math.abs(p), dir: c > p ? "up" : "down" };
}

/**
 * 上一周期 [from - (to - from), from)(同 SQL 的 v_prev_from)是否落在开始采集之后。
 * 统计刚上线的头几周上一周期只采到一部分甚至为空,环比会虚高(流量持平也显示 ↑200%),这时不显示对比。
 * dataSince = overview 的 data_since(全站最早一条事件);缺失 / 无法解析时按完整处理。
 * 留 5% 跨度的余量:180 天保留期清理后最早一条约在 now - 180 天,恰是 90 天预设上一周期的起点
 * (加上清理时刻、流量空档的出入),严格比较会让 90 天永远不显示环比。
 */
export function prevPeriodComplete(
  range: { from: Date; to: Date },
  dataSince: string | null | undefined
): boolean {
  if (!dataSince) return true;
  const since = Date.parse(dataSince);
  if (!Number.isFinite(since)) return true;
  const from = range.from.getTime();
  const span = range.to.getTime() - from;
  return since <= from - span + span * 0.05;
}

/** 区间起点早于开始采集的时间时(统计上线不久),返回开始采集的时间(ms),否则 null —— 界面据此提示「自 X 起开始统计」 */
export function collectingSince(range: { from: Date }, dataSince: string | null | undefined): number | null {
  if (!dataSince) return null;
  const since = Date.parse(dataSince);
  return Number.isFinite(since) && since > range.from.getTime() ? since : null;
}

/** 「10月12日」/ "Oct 12"(提示开始统计的日期) */
export function shortDate(ms: number, locale: Locale): string {
  return new Date(ms).toLocaleDateString(dateLocale(locale), { month: "short", day: "numeric" });
}

/** 刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期 */
export function relativeTime(iso: string, t: TFn, locale: Locale, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("刚刚");
  if (min < 60) return t("{n} 分钟前", { n: min });
  const hr = Math.floor(min / 60);
  // 48 小时内按小时:「{n} 天前」在 en / es / fr 只有复数译文,n = 1 会成「1 days ago」「Il y a 1 jours」
  if (hr < 48) return t("{n} 小时前", { n: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t("{n} 天前", { n: day });
  return new Date(iso).toLocaleDateString(dateLocale(locale));
}

/** 完整时间(tooltip / 时间线) */
export function formatDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocale(locale), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** visitor_id 前 6 位,匿名访客的短标识 */
export function shortVisitorId(visitorId: string): string {
  return visitorId.replace(/-/g, "").slice(0, 6);
}

/** 匿名访客展示名:「匿名访客 #3f9a1c」 */
export function anonymousLabel(visitorId: string, t: TFn): string {
  return t("匿名访客 #{id}", { id: shortVisitorId(visitorId) });
}

export function deviceLabel(device: string | null | undefined, t: TFn): string {
  switch (device) {
    case "desktop":
      return t("桌面");
    case "mobile":
      return t("手机");
    case "tablet":
      return t("平板");
    default:
      return t("未知");
  }
}

export function platformLabel(platform: string | null | undefined, t: TFn): string {
  switch (platform) {
    case "web":
      return t("网页");
    case "ios":
      return "iOS App";
    case "android":
      return "Android App";
    default:
      return t("未知");
  }
}

// 界面语言名用各自语言书写(与语言选择器一致,不翻译)
const LOCALE_NATIVE_NAMES: Record<string, string> = {
  zh: "简体中文",
  "zh-hant": "繁體中文",
  en: "English",
  ko: "한국어",
  ja: "日本語",
  es: "Español",
  fr: "Français",
};

/** 界面语言代码 → 该语言自称(中文 / English / 한국어 …),未知代码原样返回 */
export function localeLabel(code: string | null | undefined, t: TFn): string {
  if (!code) return t("未知");
  return LOCALE_NATIVE_NAMES[code] ?? code;
}
