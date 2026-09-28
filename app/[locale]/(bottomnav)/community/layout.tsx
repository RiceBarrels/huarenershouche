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
    title: t("社区 - 华人汽车交流"),
    description: t(
      "北美华人汽车社区，分享买车卖车经验、用车心得与维修保养技巧，和同城车友中文交流，避坑省钱。"
    ),
    alternates: localeAlternates(locale, "/community"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
