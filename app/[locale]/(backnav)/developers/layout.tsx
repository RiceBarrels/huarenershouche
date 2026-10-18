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
    title: t("开发者 / API"),
    description: t("{site} Public API:只读车源与车行数据接口、车行库存自动上传,API key 管理与用量。", { site: t("常來車網") }),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
