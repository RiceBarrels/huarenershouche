// /sitemaps/{locale}.xml — 按语言拆分的子 sitemap(由 /sitemap.xml index 指向)。
// 每个约为全量的 1/6,避开 Vercel ISR 的 ~19MB 响应上限。

import { LOCALES, BUILD_LOCALES, type Locale } from "@/lib/i18n";
import { collectSitemapEntries, renderLocaleSitemap } from "@/lib/sitemap";

// 静态导出（Capacitor / output: "export"）下必须是纯静态
export const dynamic = "force-static";

export function generateStaticParams() {
  return BUILD_LOCALES.map((loc) => ({ locale: `${loc}.xml` }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> }
): Promise<Response> {
  const { locale: file } = await params;
  const loc = file.replace(/\.xml$/, "") as Locale;
  if (!LOCALES.includes(loc)) {
    return new Response("Not found", { status: 404 });
  }
  const entries = await collectSitemapEntries();
  return new Response(renderLocaleSitemap(loc, entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
