"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";

// 语言名用各自语言书写(不翻译),切错语言时用户也能认出自己的语言
const OPTIONS: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

/** 语言二选一,样式与 ThemeOptions 对齐,Popover 和设置页共用 */
export function LanguageOptions({ onSelect }: { onSelect?: () => void }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className="space-y-0.5">
      {OPTIONS.map((opt) => {
        const selected = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setLocale(opt.value);
              onSelect?.();
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted active:bg-muted ${
              selected ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {opt.label}
            {selected && (
              <Check className="ml-auto h-4 w-4 text-brand-ink" strokeWidth={2} />
            )}
          </button>
        );
      })}
    </div>
  );
}
