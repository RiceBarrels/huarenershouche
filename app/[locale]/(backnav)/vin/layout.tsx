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
    title: t("VIN 查询 - 免费查召回与安全评级"),
    description: t(
      "免费 VIN 查询工具：查询车辆召回记录与 NHTSA 安全评级，买二手车前先查车况，北美华人买车必备的中文查询工具。"
    ),
    alternates: localeAlternates(locale, "/vin"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
