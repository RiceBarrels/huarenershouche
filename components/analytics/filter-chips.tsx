"use client";

// 已选筛选条件:一行胶囊「国家: 美国 ✕」+「清除筛选」;没有条件时不渲染。
// 文案由调用方用 dimension-label 的 filterChipLabel() 生成(车辆可覆盖为车名)。

import { X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export interface FilterChip {
  key: string;
  /** 已是「国家: 美国」这样的完整文案 */
  label: string;
}

export function FilterChips({
  chips,
  onRemove,
  onClear,
}: {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClear: () => void;
}): React.JSX.Element | null {
  const { t } = useI18n();
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-0.5 pl-2.5 text-[11px] text-foreground sm:max-w-xs"
        >
          <span className="truncate" title={c.label}>
            {c.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(c.key)}
            aria-label={t("移除筛选:{label}", { label: c.label })}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {t("清除筛选")}
      </button>
    </div>
  );
}
