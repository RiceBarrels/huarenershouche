"use client";

// 卖家访问统计的错误提示:统计还没上线(SQL 未执行,函数 / 表不存在)→「访问统计即将上线」;
// 库内无权(seller_analytics_* raise 'forbidden' 42501)→「无权查看该账号的访问统计」;
// 其他错误 →「加载失败」+ 重试(原始信息小字附后,便于反馈排查)。

import { AlertTriangle, Clock, Lock, RotateCw } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { AnalyticsNotInstalledError } from "@/lib/analytics/admin";
import { cn } from "@/lib/utils";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export type SellerErrorKind = "not_installed" | "forbidden" | "other";

export function sellerErrorKind(error: unknown): SellerErrorKind {
  // 按 name 兜底:HMR 后类实例可能对不上
  if (
    error instanceof AnalyticsNotInstalledError ||
    (error instanceof Error && error.name === "AnalyticsNotInstalledError")
  ) {
    return "not_installed";
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  // seller.ts 只透传 message:库内 raise 'forbidden';未登录调用时 PostgREST 报 permission denied
  if (/\bforbidden\b|permission denied/i.test(message)) return "forbidden";
  return "other";
}

/** 排行卡片等自带错误态的组件用:把「未上线 / 无权」换成卖家看得懂的话,其他错误保留原文 */
export function sellerErrorText(error: unknown, t: TFn): string {
  switch (sellerErrorKind(error)) {
    case "not_installed":
      return t("访问统计即将上线");
    case "forbidden":
      return t("无权查看该账号的访问统计");
    default:
      return error instanceof Error && error.message ? error.message : t("加载失败");
  }
}

export function SellerAnalyticsNotice({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  /** 仅「其他错误」显示重试 */
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const kind = sellerErrorKind(error);
  const Icon = kind === "not_installed" ? Clock : kind === "forbidden" ? Lock : AlertTriangle;
  const text =
    kind === "not_installed"
      ? t("访问统计即将上线")
      : kind === "forbidden"
        ? t("无权查看该账号的访问统计")
        : t("加载失败");
  const detail = kind === "other" && error instanceof Error ? error.message : "";

  return (
    <div
      role={kind === "other" ? "alert" : "status"}
      className={cn("flex flex-col items-center gap-1.5 rounded-xl bg-card px-4 py-8 text-center", className)}
    >
      <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-xs text-foreground">{text}</p>
      {detail && (
        <p className="line-clamp-2 max-w-full text-[10px] break-all text-muted-foreground">{detail}</p>
      )}
      {kind === "other" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <RotateCw className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          {t("重试")}
        </button>
      )}
    </div>
  );
}
