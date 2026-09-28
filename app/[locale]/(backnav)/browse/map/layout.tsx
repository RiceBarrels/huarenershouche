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
    title: t("地图找车 - 在地图上浏览附近车源"),
    description: t(
      "在地图上浏览北美华人二手车源，按品牌、价格、里程、地区筛选，一眼看到附近在售的车。"
    ),
    alternates: localeAlternates(locale, "/browse/map"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
