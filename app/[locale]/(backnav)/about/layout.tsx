import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    title: t("关于我们"),
    description: t(
      "常來車網是一个面向北美的非营利多语言二手车交易平台：免费发布与浏览车源，广告收入仅用于维持服务器与数据库等必要开支。"
    ),
    alternates: localeAlternates(locale, "/about"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
