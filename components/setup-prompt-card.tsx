"use client";

// 首页顶部的一次性偏好卡片:老用户 / 未登录访客都能看到,点进 /account/setup;
// 点 × 记为 skipped。完成或跳过过(clc_prefs.setupDone)就再也不出现。
// 偏好只在本机,挂载前不渲染,避免 SSR 先出卡片再闪掉。

import { SlidersHorizontal, X, ChevronRight } from "lucide-react";
import Link from "@/components/localized-navigation";
import { useI18n } from "@/components/i18n-provider";
import { usePreferences, usePreferencesReady } from "@/components/use-preferences";
import { trackSetupAnswer } from "@/lib/analytics/client";
import { shouldShowSetupCard } from "@/lib/preferences";

export function SetupPromptCard({ className = "" }: { className?: string }) {
  const { t, locale } = useI18n();
  const { prefs, update } = usePreferences();
  const mounted = usePreferencesReady();

  if (!mounted || !shouldShowSetupCard(prefs)) return null;

  return (
    <div className={`mx-auto w-full max-w-6xl px-4 ${className}`}>
      <div className="flex items-center gap-3 rounded-[0.3rem] border border-border bg-card px-3 py-2.5">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <Link href="/account/setup" className="flex min-w-0 flex-1 items-center gap-1 font-mono text-[13px]">
          <span className="min-w-0 flex-1">
            <span className="font-medium text-foreground">{t("回答三个问题,让找车更顺手")}</span>
            <span className="ml-1.5 text-muted-foreground">{t("约 30 秒")}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </Link>
        <button
          type="button"
          aria-label={t("关闭")}
          className="shrink-0 p-1 text-muted-foreground active:opacity-60"
          onClick={() => {
            update({ setupDone: "skipped" });
            trackSetupAnswer("setup:skipped", locale);
          }}
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
