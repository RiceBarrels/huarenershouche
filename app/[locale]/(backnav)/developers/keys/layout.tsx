import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/translate";

// key 管理是私人页面,不进搜索引擎
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    title: t("API Key"),
    robots: { index: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
