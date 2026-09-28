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
    title: t("问答 - 买车卖车问题解答"),
    description: t(
      "北美买车卖车常见问题解答：过户流程、保险贷款、验车砍价、维修保养，华人车友互助问答，中文提问中文解答。"
    ),
    alternates: localeAlternates(locale, "/qa"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
