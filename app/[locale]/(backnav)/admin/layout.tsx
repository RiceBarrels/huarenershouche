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
    title: t("管理后台"),
    description: t("{site}管理后台。", { site: t("常來車網") }),
    robots: { index: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
