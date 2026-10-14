"use client";

// 时间范围分段控件(24 小时 / 7 天 / 30 天 / 90 天):radiogroup 语义,左右方向键切换并移动焦点。

import { useRef, type KeyboardEvent } from "react";
import { RANGE_PRESETS, type RangePreset } from "@/lib/analytics/admin";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/** 预设的显示名(分段控件与「30 天 · 国家: 美国」这类范围说明共用) */
export function presetLabel(p: RangePreset, t: (s: string) => string): string {
  switch (p) {
    case "24h":
      return t("24 小时");
    case "7d":
      return t("7 天");
    case "30d":
      return t("30 天");
    case "90d":
      return t("90 天");
  }
}

export function RangeTabs({
  value,
  onChange,
  options = RANGE_PRESETS,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
  options?: RangePreset[];
}): React.JSX.Element {
  const { t } = useI18n();
  const groupRef = useRef<HTMLDivElement>(null);
  const current = options.indexOf(value);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (options.length === 0) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = current < 0 ? options.length - 1 : (current - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next]);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={t("时间范围")}
      onKeyDown={onKeyDown}
      className="inline-flex shrink-0 items-center rounded-full bg-muted p-0.5"
    >
      {options.map((o, i) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            // roving tabindex:只有选中项可 Tab 进入;值不在选项里时第一项可聚焦
            tabIndex={on || (current < 0 && i === 0) ? 0 : -1}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              on ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {presetLabel(o, t)}
          </button>
        );
      })}
    </div>
  );
}
