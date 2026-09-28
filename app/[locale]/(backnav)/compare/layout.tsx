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
    title: t("车辆对比 - 二手车参数对比"),
    description: t(
      "多辆二手车参数对比：价格、里程、年份、配置一目了然，帮你在北美华人二手车源中快速做出选择。"
    ),
    alternates: localeAlternates(locale, "/compare"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
