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
    // 字符串 title 会让子页面丢掉根 layout 的品牌后缀模板(B50),这里显式续上
    title: { default: t("用户主页"), template: `%s | ${t("常來車網")}` },
    description: t("查看用户主页与其发布的二手车源。"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
