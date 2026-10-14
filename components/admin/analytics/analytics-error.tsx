"use client";

// 访问统计各区块的错误提示:SQL 还没执行(函数/表不存在)时提示去跑 supabase/analytics.sql,
// 其他错误直接显示 message。

import { AlertTriangle, DatabaseZap } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { AnalyticsNotInstalledError } from "@/lib/analytics/admin";

/** 是否是「统计 SQL 未执行」(按 name 兜底:HMR 后类实例可能对不上) */
export function isAnalyticsNotInstalled(error: unknown): boolean {
  return (
    error instanceof AnalyticsNotInstalledError ||
    (error instanceof Error && error.name === "AnalyticsNotInstalledError")
  );
}

export function AnalyticsErrorNotice({
  error,
  className = "",
}: {
  error: unknown;
  className?: string;
}) {
  const { t } = useI18n();
  const notInstalled = isAnalyticsNotInstalled(error);
  const Icon = notInstalled ? DatabaseZap : AlertTriangle;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-[11px] text-muted-foreground ${className}`}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      <p className="min-w-0 break-words">
        {notInstalled
          ? t("统计数据表尚未建立:请在 Supabase SQL Editor 执行 supabase/analytics.sql")
          : error instanceof Error && error.message
            ? error.message
            : t("加载失败")}
      </p>
    </div>
  );
}
