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
  // 条款正文只有中文(canonical 回 /zh),标签页标题与摘要仍按界面语言显示
  return {
    title: t("使用条款"),
    description: t("{site}使用条款与服务协议。", { site: t("常來車網") }),
    alternates: localeAlternates(locale, "/terms", { zhOnly: true }),
    robots: { index: false, follow: true },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
