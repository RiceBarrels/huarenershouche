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
    title: t("汽车服务 - 保险、贷款、过户"),
    description: t(
      "北美华人汽车服务一站式平台：汽车保险、购车贷款、过户代办等中文服务，买车卖车更省心。"
    ),
    alternates: localeAlternates(locale, "/services"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
