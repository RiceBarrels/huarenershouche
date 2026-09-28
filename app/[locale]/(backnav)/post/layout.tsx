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
    title: t("免费发布卖车 - 卖给同城华人"),
    description: t(
      "免费发布二手车信息，卖给同城华人买家。中文交流更放心，几分钟完成发布，快速联系北美本地买家，安全高效卖车。"
    ),
    alternates: localeAlternates(locale, "/post"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
