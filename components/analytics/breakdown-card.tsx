"use client";

// 通用排行卡片:顶部 tab 切维度(只有 1 个 tab 时只显示标题;放不下时换行);行背景条按比例(序列色 ~12%),
// 文字在上层用正文色,右侧数值列 tabular-nums。admin 与卖家仪表盘共用。
// 数据:每个 tab 的结果按 reloadKey 缓存(切回不重拉,reloadKey 变化即失效);重拉时保留上一帧并降低不透明度;
// 过期响应按每个维度的自增序号丢弃。「查看全部」弹窗拉 200 行 + 防抖搜索:不带搜索词已拉全(≤ 200 项)时
// 在本地按显示的文字 + 原始值匹配(国家名、各语言车名、「直接访问」库里搜不到),否则走 p_search。

import { useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, RotateCw, Search } from "lucide-react";
import type { AnalyticsBreakdown, AnalyticsBreakdownRow } from "@/lib/analytics/types";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/components/analytics/format";
import { estimateTextWidth } from "@/components/analytics/chart-utils";
import { VIZ_VARS } from "@/components/analytics/time-series-chart";
import { DimensionLabel, dimensionSearchText } from "@/components/analytics/dimension-label";

export interface BreakdownTab {
  dimension: string;
  label: string;
}

interface Column {
  key: "visitors" | "pageviews";
  label: string;
}

type RenderLabel = (dimension: string, row: AnalyticsBreakdownRow) => React.ReactNode;
type OnSelect = (dimension: string, row: AnalyticsBreakdownRow) => void;
type Loader = (dimension: string, limit: number, search: string | null) => Promise<AnalyticsBreakdown>;

interface Entry {
  /** 这份结果对应的请求键;与当前键不一致 = 过期(重拉中,显示为上一帧) */
  key: string;
  data: AnalyticsBreakdown | null;
  error: string | null;
}

const DIALOG_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 300;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// 表头整行最多占这么宽(约 10 个拉丁字母 / 6 个汉字);更长的多词译文("Visitantes únicos")折成两行,
// 按最长的一个词估宽 —— 否则一个表头就把数值列撑到 110px,手机上车名只剩「2021 Toyota Ca…」
const HEADER_MAX_W = 64;

function headerWidth(label: string): number {
  const full = estimateTextWidth(label, 10);
  if (full <= HEADER_MAX_W) return full;
  return Math.max(0, ...label.split(/\s+/).map((word) => estimateTextWidth(word, 10)));
}

/** 数值列宽(px):按本页最长数字(12px)与表头(10px)估算,表头与各行共用 —— 对齐且不白占标签的位置 */
function columnWidths(rows: AnalyticsBreakdownRow[], cols: Column[], locale: Locale): number[] {
  return cols.map((c) => {
    let w = headerWidth(c.label);
    for (const r of rows) w = Math.max(w, estimateTextWidth(formatNumber(r[c.key] || 0, locale), 12));
    return Math.max(28, w + 6);
  });
}

export function BreakdownCard({
  tabs,
  load,
  reloadKey,
  renderLabel,
  onSelect,
  columns,
  emptyText,
  limit = 10,
  className,
}: {
  /** 1 个 tab 时只显示标题 */
  tabs: BreakdownTab[];
  load: Loader;
  /** 变化即重新拉取(范围 + 筛选序列化) */
  reloadKey: string;
  /** 默认 <DimensionLabel>;行可点击时渲染在 <button> 里,只放行内元素(span) */
  renderLabel?: RenderLabel;
  /** 点行 */
  onSelect?: OnSelect;
  /** 默认 [{ visitors, t("访客") }];背景条按第一列 */
  columns?: Column[];
  emptyText?: string;
  /** 默认 10;「查看全部」弹窗拉 200 + 搜索框(防抖) */
  limit?: number;
  className?: string;
}): React.JSX.Element {
  const { t, locale } = useI18n();
  const uid = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const activeTab = tabs.find((x) => x.dimension === picked) ?? tabs[0];
  const active = activeTab?.dimension ?? "";
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState({ open: false, seq: 0 });
  const cacheKey = `${reloadKey}|${limit}`;
  const cols: Column[] = columns && columns.length > 0 ? columns : [{ key: "visitors", label: t("访客") }];

  // 每个维度:最近一次请求的序号(丢弃过期响应)、正在拉取的请求键(StrictMode 双调用 / 来回切 tab 不重复请求)
  const seqRef = useRef<Record<string, number>>({});
  const inflightRef = useRef<Record<string, string>>({});

  const fetchTab = useEffectEvent((dim: string, key: string) => {
    if (inflightRef.current[dim] === key) return;
    // 新一轮:作废该维度之前所有未返回的请求
    const seq = (seqRef.current[dim] ?? 0) + 1;
    seqRef.current[dim] = seq;
    const cached = entries[dim];
    if (cached && cached.key === key && !cached.error) {
      inflightRef.current[dim] = "";
      return;
    }
    inflightRef.current[dim] = key;
    Promise.resolve()
      .then(() => load(dim, limit, null))
      .then(
        (data) => {
          if (seqRef.current[dim] !== seq) return;
          inflightRef.current[dim] = "";
          setEntries((prev) => ({ ...prev, [dim]: { key, data, error: null } }));
        },
        (err: unknown) => {
          if (seqRef.current[dim] !== seq) return;
          inflightRef.current[dim] = "";
          setEntries((prev) => ({
            ...prev,
            [dim]: { key, data: prev[dim]?.data ?? null, error: errorMessage(err) },
          }));
        }
      );
  });

  useEffect(() => {
    if (active) fetchTab(active, cacheKey);
  }, [active, cacheKey, retry]);

  function onRetry() {
    // 标记为过期(显示上一帧 / 骨架)并触发重拉
    setEntries((prev) => {
      const cur = prev[active];
      return cur ? { ...prev, [active]: { ...cur, key: "", error: null } } : prev;
    });
    setRetry((n) => n + 1);
  }

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((x) => x.dimension === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setPicked(tabs[next].dimension);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  const entry = active ? entries[active] : undefined;
  const fresh = entry?.key === cacheKey;
  const data = entry?.data ?? null;
  const error = fresh ? (entry?.error ?? null) : null;
  const refetching = !fresh;
  const panelId = `${uid}-panel`;
  const activeIndex = Math.max(0, tabs.findIndex((x) => x.dimension === active));
  const widths = data ? columnWidths(data.rows, cols, locale) : [];

  let content: React.ReactNode;
  if (error) {
    content = <ErrorState message={error} onRetry={onRetry} />;
  } else if (data && data.rows.length > 0) {
    content = (
      <BreakdownRows
        dimension={active}
        rows={data.rows}
        cols={cols}
        widths={widths}
        locale={locale}
        renderLabel={renderLabel}
        onSelect={onSelect}
      />
    );
  } else if (data) {
    content = <p className="py-8 text-center text-xs text-muted-foreground">{emptyText ?? t("暂无数据")}</p>;
  } else {
    content = <SkeletonRows count={Math.min(limit, 5)} />;
  }

  return (
    <section className={cn(VIZ_VARS, "flex min-w-0 flex-col rounded-xl bg-card p-3", className)}>
      {tabs.length > 1 ? (
        <div
          role="tablist"
          onKeyDown={onTabKeyDown}
          // 放不下就换行,不做横向滚动:窄屏 + 较长的译文(en/es/fr/ja)下末尾的 tab 不会被裁掉或整个藏到右边
          className="-mx-1 flex min-w-0 flex-wrap gap-x-0.5 gap-y-1 px-1"
        >
          {tabs.map((tab, i) => {
            const on = tab.dimension === active;
            return (
              <button
                key={tab.dimension}
                id={`${uid}-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={panelId}
                tabIndex={on ? 0 : -1}
                onClick={() => setPicked(tab.dimension)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  on ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        <h3 id={`${uid}-tab-0`} className="truncate px-1 py-1 text-xs font-medium">
          {activeTab?.label}
        </h3>
      )}

      {data && data.rows.length > 0 && !error && <ColumnHeader cols={cols} widths={widths} />}

      <div
        id={panelId}
        role={tabs.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={`${uid}-tab-${activeIndex}`}
        aria-busy={refetching || undefined}
        className={cn(
          "mt-1 flex-1 transition-opacity duration-150",
          refetching && data && !error && "opacity-50"
        )}
      >
        {content}
      </div>

      {data && !error && data.total_keys > data.rows.length && (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => setDialog((d) => ({ open: true, seq: d.seq + 1 }))}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t("查看全部")}
            <span className="tabular-nums">{formatNumber(data.total_keys, locale)}</span>
            <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 每次打开换 key 重新挂载:搜索框清空、按当前 tab 重新拉 */}
      <ViewAllDialog
        key={dialog.seq}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        dimension={active}
        title={activeTab?.label ?? ""}
        load={load}
        reloadKey={reloadKey}
        cols={cols}
        renderLabel={renderLabel}
        onSelect={onSelect}
      />
    </section>
  );
}

function ColumnHeader({ cols, widths }: { cols: Column[]; widths: number[] }) {
  // 长表头按词折行(列宽按最长的词估,见 headerWidth),底部对齐
  return (
    <div aria-hidden="true" className="mt-1.5 flex items-end gap-2 px-2 text-[10px] leading-tight text-muted-foreground">
      <span className="flex-1" />
      {cols.map((c, i) => (
        <span key={c.key} className="shrink-0 text-right" style={{ width: widths[i] }} title={c.label}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function BreakdownRows({
  dimension,
  rows,
  cols,
  widths,
  locale,
  renderLabel,
  onSelect,
}: {
  dimension: string;
  rows: AnalyticsBreakdownRow[];
  cols: Column[];
  widths: number[];
  locale: Locale;
  renderLabel?: RenderLabel;
  onSelect?: OnSelect;
}) {
  const first = cols[0].key;
  const max = rows.reduce((m, r) => Math.max(m, r[first] || 0), 0);
  return (
    <ul className="space-y-0.5">
      {rows.map((row, i) => {
        const v = row[first] || 0;
        // 背景条:该行第一列 / 本页最大值;非 0 时至少露出一点
        const pct = max > 0 && v > 0 ? Math.max(1.5, (v / max) * 100) : 0;
        const inner = (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-[color:var(--viz)] opacity-[0.12]"
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex min-w-0 flex-1 items-center overflow-hidden">
              {renderLabel ? renderLabel(dimension, row) : <DimensionLabel dimension={dimension} row={row} />}
            </span>
            {cols.map((c, ci) => (
              <span
                key={c.key}
                className="relative shrink-0 text-right whitespace-nowrap tabular-nums"
                style={{ width: widths[ci] }}
              >
                <span className="sr-only">{c.label} </span>
                {formatNumber(row[c.key] || 0, locale)}
              </span>
            ))}
          </>
        );
        const cls = "relative flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs";
        return (
          <li key={`${i}|${row.key ?? ""}|${row.country ?? ""}|${row.region ?? ""}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(dimension, row)}
                className={cn(
                  cls,
                  "transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                )}
              >
                {inner}
              </button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const SKELETON_WIDTHS = [92, 74, 58, 46, 36, 30, 24, 20, 16, 12];

function SkeletonRows({ count }: { count: number }) {
  return (
    <div aria-hidden="true" className="space-y-1.5 py-0.5">
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <Skeleton
          key={i}
          className="h-6 rounded-md"
          style={{ width: `${SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}%` }}
        />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
      <p className="text-xs text-foreground">{t("加载失败")}</p>
      <p className="line-clamp-2 max-w-full text-[10px] break-all text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <RotateCw className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
        {t("重试")}
      </button>
    </div>
  );
}

function ViewAllDialog({
  open,
  onOpenChange,
  dimension,
  title,
  load,
  reloadKey,
  cols,
  renderLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: string;
  title: string;
  load: Loader;
  reloadKey: string;
  cols: Column[];
  renderLabel?: RenderLabel;
  onSelect?: OnSelect;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<Entry | null>(null);
  // 不带搜索词的那份结果(本地搜索的数据源)
  const [base, setBase] = useState<Entry | null>(null);
  const [retry, setRetry] = useState(0);
  const seqRef = useRef(0);
  const inflightRef = useRef("");
  const baseKey = `${reloadKey}|${dimension}|`;
  const requestKey = `${reloadKey}|${dimension}|${search}`;
  // 不带搜索词时已拉全(≤ 200 项):在本地按显示的文字 + 原始值匹配,不再请求。
  // p_search 在库里只能匹配原始值(国家代码、库里的车名),搜不到「Canada / 加拿大」、韩文车名、「直接访问」
  const baseData = base?.key === baseKey && !base.error ? base.data : null;
  const local = !!search && !!baseData && baseData.rows.length >= baseData.total_keys;

  // 输入防抖
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchRows = useEffectEvent((key: string) => {
    if (inflightRef.current === key) return;
    const seq = ++seqRef.current;
    if (result && result.key === key && !result.error) {
      inflightRef.current = "";
      return;
    }
    inflightRef.current = key;
    const q = search;
    Promise.resolve()
      .then(() => load(dimension, DIALOG_LIMIT, q || null))
      .then(
        (data) => {
          if (seqRef.current !== seq) return;
          inflightRef.current = "";
          setResult({ key, data, error: null });
          if (!q) setBase({ key, data, error: null });
        },
        (err: unknown) => {
          if (seqRef.current !== seq) return;
          inflightRef.current = "";
          setResult({ key, data: null, error: errorMessage(err) });
        }
      );
  });

  useEffect(() => {
    if (open && dimension && !local) fetchRows(requestKey);
  }, [open, dimension, requestKey, retry, local]);

  let shown: Entry | null = result;
  if (local && baseData) {
    const needle = search.toLowerCase();
    const rows = baseData.rows.filter((row) =>
      dimensionSearchText(dimension, row, t, locale).toLowerCase().includes(needle)
    );
    shown = { key: requestKey, data: { rows, total_keys: rows.length }, error: null };
  }
  const fresh = shown?.key === requestKey;
  const data = shown?.data ?? null;
  const error = fresh ? (shown?.error ?? null) : null;
  const loading = !fresh;
  const widths = data ? columnWidths(data.rows, cols, locale) : [];

  let body: React.ReactNode;
  if (error) {
    body = (
      <ErrorState
        message={error}
        onRetry={() => {
          setResult(null);
          setRetry((n) => n + 1);
        }}
      />
    );
  } else if (data && data.rows.length > 0) {
    body = (
      <BreakdownRows
        dimension={dimension}
        rows={data.rows}
        cols={cols}
        widths={widths}
        locale={locale}
        renderLabel={renderLabel}
        onSelect={
          onSelect
            ? (d, row) => {
                onSelect(d, row);
                onOpenChange(false);
              }
            : undefined
        }
      />
    );
  } else if (data) {
    body = (
      <p className="py-10 text-center text-xs text-muted-foreground">
        {search ? t("未找到结果") : t("暂无数据")}
      </p>
    );
  } else {
    body = <SkeletonRows count={8} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(VIZ_VARS, "flex max-h-[85vh] flex-col gap-3 font-mono sm:max-w-lg")}
        onOpenAutoFocus={(e) => {
          // 触屏设备不自动聚焦搜索框(否则键盘一弹出就挡住半个列表),改为聚焦弹窗本身
          if (window.matchMedia?.("(pointer: coarse)").matches) {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
          }
        }}
      >
        <DialogHeader className="gap-1 pr-8">
          <DialogTitle className="text-left text-sm">{title}</DialogTitle>
          <DialogDescription className="text-left text-[11px]">
            {error
              ? t("加载失败")
              : data
                ? data.rows.length < data.total_keys
                  ? t("共 {total} 项,显示前 {n} 项", {
                      total: formatNumber(data.total_keys, locale),
                      n: formatNumber(data.rows.length, locale),
                    })
                  : t("共 {n} 项", { n: formatNumber(data.total_keys, locale) })
                : t("加载中...")}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("搜索...")}
            aria-label={t("搜索")}
            className="h-9 pl-8 md:text-xs"
          />
        </div>
        {data && data.rows.length > 0 && !error && <ColumnHeader cols={cols} widths={widths} />}
        <div
          aria-busy={loading || undefined}
          className={cn(
            "-mx-1 min-h-0 flex-1 overflow-y-auto px-1 transition-opacity duration-150",
            loading && data && !error && "opacity-50"
          )}
        >
          {body}
        </div>
      </DialogContent>
    </Dialog>
  );
}
