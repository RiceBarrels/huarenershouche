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
    title: t("联系我们"),
    description: t(
      "联系常來車網团队：问题反馈、商务合作或使用帮助，我们为北美华人用户提供中文服务。"
    ),
    alternates: localeAlternates(locale, "/contact"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
