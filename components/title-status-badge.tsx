"use client";

// 车源详情的产权状态徽标(cars.title_status,lib/title-status.ts):点一下展开一句白话解释。
// 清白产权用普通石色;重建 / 残值 / 柠檬回购用中性琥珀警示(不做红色大块)。没填(null / 列不存在)不渲染。

import { useId, useState } from "react";
import { ChevronDown, FileCheck2, FileWarning } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { isBrandedTitle, isTitleStatus, TITLE_STATUS_EXPLAIN } from "@/lib/title-status";

export function TitleStatusBadge({ value }: { value: string | null | undefined }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!isTitleStatus(value)) return null;
  const branded = isBrandedTitle(value);
  const Icon = branded ? FileWarning : FileCheck2;

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
          branded
            ? "border-amber-500/30 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span className="text-muted-foreground">{t("产权状态")}</span>
        <span>{t(value)}</span>
        <ChevronDown
          className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        <p id={panelId} className="mt-2 max-w-prose font-mono text-xs leading-relaxed text-muted-foreground">
          {t(TITLE_STATUS_EXPLAIN[value])}
        </p>
      )}
    </div>
  );
}
