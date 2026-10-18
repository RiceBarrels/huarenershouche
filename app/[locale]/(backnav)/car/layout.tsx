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
    // 带 template:纯字符串 title 会让子页面(/car/[id])丢掉上层「%s | 品牌」模板
    title: { default: t("二手车详情"), template: `%s | ${t("常來車網")}` },
    description: t("查看二手车详细信息：车况、里程、价格、配置与卖家联系方式，北美华人卖家直售，中文沟通更放心。"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
