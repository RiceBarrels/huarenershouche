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
    title: t("商家入驻 - 车行免费入驻"),
    description: t(
      "车行商家免费入驻常來車網，发布库存车源，直接触达北美华人买家，中文平台助力车行获客。"
    ),
    alternates: localeAlternates(locale, "/business"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
