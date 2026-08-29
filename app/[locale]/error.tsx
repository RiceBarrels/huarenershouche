"use client";

// 语言树内的错误边界:页面渲染抛错时替换页面内容,可重试。
// Provider 在 [locale]/layout 上,仍可用词典;错误详情打到控制台便于排查。

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import Link from "@/components/localized-navigation";
import { useI18n } from "@/components/i18n-provider";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 font-mono">
      <p className="text-5xl font-bold tracking-tighter text-foreground">
        5<span className="text-brand-ink">0</span>0
      </p>
      <div className="mt-4 h-1 w-10 bg-brand" aria-hidden="true" />
      <h1 className="mt-6 text-base font-semibold text-foreground">{t("页面出错了")}</h1>
      <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        {t("页面加载出了点问题，请重试。")}
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">{error.digest}</p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-9 items-center gap-1.5 bg-primary px-5 text-xs text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          {t("重试")}
        </button>
        <Link
          href="/"
          className="flex h-9 items-center border border-border px-5 text-xs text-foreground transition-colors hover:bg-muted"
        >
          {t("返回首页")}
        </Link>
      </div>
    </div>
  );
}
