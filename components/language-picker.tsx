"use client";

// 卖家沟通语言多选(胶囊 chip 组)。label 用各语言自称,不经翻译。
// 用于:个人资料设置 / 车行入驻 / 管理后台用户编辑。

import { Check } from "lucide-react";
import { SELLER_LANGUAGES, normalizeLanguages } from "@/lib/i18n/languages";
import { triggerHaptic } from "@/lib/haptics";

export function LanguagePicker({
  value,
  onChange,
  size = "md",
  className = "",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const selected = new Set(value);
  const chip = size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-[13px]";
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {SELLER_LANGUAGES.map((l) => {
        const on = selected.has(l.code);
        return (
          <button
            key={l.code}
            type="button"
            aria-pressed={on}
            onClick={() => {
              triggerHaptic();
              const next = new Set(selected);
              if (on) next.delete(l.code);
              else next.add(l.code);
              onChange(normalizeLanguages([...next]));
            }}
            className={`inline-flex items-center gap-1 rounded-full font-mono font-medium transition-colors active:scale-[0.97] ${chip} ${
              on
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/70"
            }`}
          >
            {on && <Check className="h-3 w-3" strokeWidth={2} />}
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

/** 只读展示:「中文(普通话) · English」 */
export function languageList(codes: string[] | null | undefined): string {
  if (!codes || codes.length === 0) return "";
  return normalizeLanguages(codes)
    .map((c) => SELLER_LANGUAGES.find((l) => l.code === c)?.label ?? c)
    .join(" · ");
}
