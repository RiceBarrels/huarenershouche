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
    title: t("购车指南 - 北美买车攻略"),
    description: t(
      "北美买车攻略大全：新手购车流程、二手车验车要点、DMV 过户、保险与贷款指南，专为华人整理的中文购车指南。"
    ),
    alternates: localeAlternates(locale, "/guide"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
