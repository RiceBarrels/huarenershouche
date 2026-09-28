import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "使用条款",
    description: "常來車網使用条款与服务协议。",
    alternates: localeAlternates(locale, "/terms", { zhOnly: true }),
    robots: { index: false, follow: true },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
