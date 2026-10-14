// 访问统计图表的纯函数(无 DOM / React 依赖,可单测):
// y 轴整数刻度、指针 → 最近的桶、x 轴标签抽稀、桶时间(本地 wall time)解析与格式化、文字宽度粗估。

import { dateLocale, type Locale } from "@/lib/i18n";

export type ChartBucket = "hour" | "day";

/**
 * y 轴刻度:从 0 起的整数刻度,步长取 1/2/5×10^k,共 3–4 条(2–3 段),顶刻度 ≥ max。
 * 全 0 / 负数 / NaN 按 0 处理 → [0, 1, 2]。
 */
export function niceTicks(max: number): number[] {
  const m = Number.isFinite(max) && max > 0 ? max : 0;
  let step = 1;
  if (m > 0) {
    const raw = m / 3;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    // 候选含 10×pow,log10 的浮点误差不会漏掉合适步长
    step = [1, 2, 5, 10].map((f) => f * pow).find((s) => s >= raw) ?? 10 * pow;
    step = Math.max(1, Math.round(step));
  }
  const segments = Math.max(2, Math.ceil(m / step - 1e-9));
  return Array.from({ length: segments + 1 }, (_, i) => i * step);
}

/** 第 i 个桶的 x 坐标:均匀铺满绘图区 [x0, x0 + plotW];只有一个桶时居中 */
export function pointX(i: number, n: number, x0: number, plotW: number): number {
  if (n <= 1) return x0 + plotW / 2;
  return x0 + (i / (n - 1)) * plotW;
}

/** 指针 x(与 pointX 同一坐标系)→ 最近的桶下标;没有点时返回 -1 */
export function nearestIndex(x: number, x0: number, plotW: number, n: number): number {
  if (n <= 0) return -1;
  if (n === 1 || plotW <= 0 || !Number.isFinite(x)) return n === 1 ? 0 : n - 1;
  const i = Math.round(((x - x0) / plotW) * (n - 1));
  return Math.min(n - 1, Math.max(0, i));
}

export interface WallTime {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

/** "2026-10-05T14:00:00" → 各字段(按字面解析,不做时区换算);格式不对返回 null */
export function parseWallTime(t: string): WallTime | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(t);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0 };
}

// 小时桶按整点对齐(0/6/12/18 点…);天桶从最新一天往前数
const HOUR_STEPS = [1, 2, 3, 4, 6, 8, 12, 24];
const DAY_STEPS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90];

/**
 * x 轴标签抽稀:按可用宽度算最小步长(相邻标签至少隔 labelW + gap),取整到常用步长。
 * 小时桶只在「小时数是步长整数倍」的桶上标(00:00 / 06:00 …);天桶从最后一桶往前每 step 天一个,
 * 保证今天总有标签。返回升序下标。
 */
export function xLabelIndices(
  ts: string[],
  plotW: number,
  labelW: number,
  bucket: ChartBucket,
  gap = 20
): number[] {
  const n = ts.length;
  if (n === 0 || plotW <= 0) return [];
  if (n === 1) return [0];
  const slot = plotW / (n - 1);
  const rawStep = Math.max(1, Math.ceil((labelW + gap) / slot));
  if (bucket === "hour") {
    const step = HOUR_STEPS.find((s) => s >= rawStep);
    if (step !== undefined) {
      const out: number[] = [];
      for (let i = 0; i < n; i++) {
        const w = parseWallTime(ts[i]);
        if (w && w.mi === 0 && w.h % step === 0) out.push(i);
      }
      // 小时对不上(解析失败/非整点)时退回等距
      if (out.length > 0) return out;
    }
  }
  const step = (bucket === "day" ? DAY_STEPS.find((s) => s >= rawStep) : undefined) ?? rawStep;
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= step) out.push(i);
  return out.reverse();
}

/** 粗估文字宽度(px):CJK/全角按 1em,其余按 0.62em(系统字体 10–11px 下够用) */
export function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    w += c >= 0x2e80 ? fontSize : fontSize * 0.62;
  }
  return Math.ceil(w);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dateFmt(locale: Locale, kind: "tick" | "day" | "dayWeek"): Intl.DateTimeFormat {
  const cacheKey = `${locale}|${kind}`;
  let f = fmtCache.get(cacheKey);
  if (!f) {
    // 桶时间已是本地 wall time:按 UTC 构造 + 按 UTC 格式化,避免浏览器时区再偏移一次
    const opts: Intl.DateTimeFormatOptions =
      kind === "tick"
        ? { month: "2-digit", day: "2-digit", timeZone: "UTC" }
        : kind === "day"
          ? { month: "short", day: "numeric", timeZone: "UTC" }
          : { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" };
    f = new Intl.DateTimeFormat(dateLocale(locale), opts);
    fmtCache.set(cacheKey, f);
  }
  return f;
}

/** x 轴短标签:小时桶 "14:00";天桶按界面语言的月/日 "10/05" */
export function formatBucketTick(t: string, bucket: ChartBucket, locale: Locale): string {
  const w = parseWallTime(t);
  if (!w) return t;
  if (bucket === "hour") return `${pad2(w.h)}:${pad2(w.mi)}`;
  return dateFmt(locale, "tick").format(Date.UTC(w.y, w.mo - 1, w.d));
}

/** tooltip / 表格用的完整标签:天桶「10月5日周日」/ "Sun, Oct 5";小时桶「10月5日 14:00」 */
export function formatBucketFull(t: string, bucket: ChartBucket, locale: Locale): string {
  const w = parseWallTime(t);
  if (!w) return t;
  const date = Date.UTC(w.y, w.mo - 1, w.d);
  if (bucket === "hour") return `${dateFmt(locale, "day").format(date)} ${pad2(w.h)}:${pad2(w.mi)}`;
  return dateFmt(locale, "dayWeek").format(date);
}
