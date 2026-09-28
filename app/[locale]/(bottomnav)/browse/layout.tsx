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
    title: t("买车 - 搜索全美华人二手车源"),
    description: t(
      "浏览北美华人二手车源，按品牌、价格、里程、地区筛选。全美各城市华人卖家直售，中文沟通更放心，快速找到心仪的二手车。"
    ),
    alternates: localeAlternates(locale, "/browse"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
