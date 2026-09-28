import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo-pages";
import Home from "./home-page";

// 首页本体是 client component,canonical/hreflang 放在这层 server 壳里。
// 不能放 [locale]/layout:layout 级 canonical 会被所有没写 canonical 的子页继承。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates(locale, "/") };
}

export default function Page() {
  return <Home />;
}
