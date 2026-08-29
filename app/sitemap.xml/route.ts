// /sitemap.xml — sitemap index,指向按语言拆分的六个子 sitemap。
// 全量单文件(6 语言 × 全部 URL × hreflang)接近 20MB 会撞
// Vercel ISR 响应上限(FALLBACK_BODY_TOO_LARGE),必须分片。

import { SITE_URL } from "@/lib/seo-pages";
import { LOCALES } from "@/lib/i18n";

// 静态导出（Capacitor / output: "export"）下必须是纯静态
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const lastmod = new Date().toISOString();
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    LOCALES.map((loc) =>
      [
        "  <sitemap>",
        `    <loc>${SITE_URL}/sitemaps/${loc}.xml</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        "  </sitemap>",
      ].join("\n")
    ).join("\n") +
    `\n</sitemapindex>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
