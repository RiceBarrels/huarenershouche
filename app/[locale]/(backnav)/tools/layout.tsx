import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/translate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    title: t("实用工具"),
    description: t("买车养车实用小工具:月供计算、油费估算、停车定位等。"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
