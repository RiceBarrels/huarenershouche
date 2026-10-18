"use client";

// 内容翻译标注(X 式):「[译] 已从中文翻译 · 显示原文」。
// - 有译文:来源语言标签 + 原文 / 译文切换;originalUncertain(旧版系统保存的原文,可能被机器处理过)
//   且正在看原文时追加一句说明;
// - 译文生成中(仅挂载后,SSR 永不输出):弱化的「翻译中…」;
// - 其余(无需翻译 / 放弃翻译 / 未知)不渲染。
// 卡片整体是 Link 时传 stopPropagation,点切换不会触发跳转。

import type { JSX } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { LocalizedView } from "@/hooks/use-localized";
import { translatedFromKey } from "@/lib/i18n/content-langs";
import { cn } from "@/lib/utils";

export function TranslationNotice({
  view,
  className,
  stopPropagation = false,
  originalUncertain = false,
}: {
  view: LocalizedView<string>;
  className?: string;
  stopPropagation?: boolean;
  originalUncertain?: boolean;
}): JSX.Element | null {
  const { t } = useI18n();

  if (view.translated) {
    const fromKey = translatedFromKey(view.sourceLang);
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[11px] leading-snug text-muted-foreground",
          className,
        )}
      >
        <Languages className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
        {fromKey && (
          <>
            <span>{t(fromKey)}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <button
          type="button"
          onClick={(e) => {
            if (stopPropagation) {
              e.preventDefault();
              e.stopPropagation();
            }
            view.toggleOriginal();
          }}
          className="rounded-[0.3rem] text-brand-ink underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-ink/50"
        >
          {view.showOriginal ? t("显示翻译") : t("显示原文")}
        </button>
        {originalUncertain && view.showOriginal && (
          <p className="basis-full text-[10px] leading-relaxed">
            {t("该原文由旧版系统保存，可能经过机器处理")}
          </p>
        )}
      </div>
    );
  }

  if (view.pending) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 font-mono text-[11px] leading-snug text-muted-foreground/70",
          className,
        )}
      >
        <Languages className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
        <span>{t("翻译中…")}</span>
      </div>
    );
  }

  return null;
}
