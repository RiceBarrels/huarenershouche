"use client";

// 语言树内的 404(notFound() 抛出时渲染):带完整导航壳与词典,
// 未匹配路径由 [...missing] 兜底路由转到这里。

import Link from "@/components/localized-navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useI18n } from "@/components/i18n-provider";

export default function LocaleNotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <p className="text-7xl font-bold tracking-tighter text-foreground md:text-8xl">
          4<span className="text-brand-ink">0</span>4
        </p>
        <div className="mt-4 h-1 w-10 bg-brand" aria-hidden="true" />
        <h1 className="mt-6 text-base font-semibold text-foreground">{t("页面不存在")}</h1>
        <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          {t("你访问的页面可能已被移除，或链接有误。")}
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 items-center bg-primary px-5 text-xs text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("返回首页")}
          </Link>
          <Link
            href="/browse"
            className="flex h-9 items-center border border-border px-5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {t("浏览车源")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
