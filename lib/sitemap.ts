// sitemap 共用构建逻辑:收集全站逻辑 URL(不带语言前缀)+ 按语言渲染子 sitemap。
// /sitemap.xml 是 sitemap index,指向 /sitemaps/{locale}.xml 六个分片——
// 单文件全量(6 语言 × 全部 URL × hreflang)接近 20MB,超 Vercel ISR 上限,必须拆分。

import { SEO_PAGES, SITE_URL } from "@/lib/seo-pages";
import { LOCALES, type Locale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Freq = "daily" | "weekly" | "monthly";

export interface SitemapEntry {
  /** 逻辑路径,不带语言前缀,如 "/car/xxx" */
  path: string;
  lastModified: Date;
  changeFrequency: Freq;
  priority: number;
}

export function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** 收集全站逻辑 URL(静态页 + SEO 落地页 + 车源 + 卖家 + 帖子) */
export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const now = new Date();

  const staticRoutes: SitemapEntry[] = [
    { path: "", changeFrequency: "daily" as Freq, priority: 1.0 },
    { path: "/browse", changeFrequency: "daily" as Freq, priority: 0.9 },
    { path: "/cars", changeFrequency: "daily" as Freq, priority: 0.9 },
    { path: "/post", changeFrequency: "weekly" as Freq, priority: 0.7 },
    { path: "/guide", changeFrequency: "weekly" as Freq, priority: 0.7 },
    { path: "/community", changeFrequency: "daily" as Freq, priority: 0.7 },
    { path: "/qa", changeFrequency: "daily" as Freq, priority: 0.7 },
    { path: "/compare", changeFrequency: "weekly" as Freq, priority: 0.6 },
    { path: "/vin", changeFrequency: "weekly" as Freq, priority: 0.6 },
    { path: "/services", changeFrequency: "weekly" as Freq, priority: 0.6 },
    { path: "/contact", changeFrequency: "monthly" as Freq, priority: 0.5 },
    { path: "/business", changeFrequency: "monthly" as Freq, priority: 0.5 },
    { path: "/terms", changeFrequency: "monthly" as Freq, priority: 0.5 },
  ].map((r) => ({ ...r, lastModified: now }));

  const seoRoutes: SitemapEntry[] = SEO_PAGES.map((p) => ({
    path: `/cars/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily" as Freq,
    priority: p.slug.includes("/") ? 0.6 : 0.8,
  }));

  // 每辆在售车源详情页(核心内容页,SEO 主力)+ 有在售车的卖家主页
  let carRoutes: SitemapEntry[] = [];
  let userRoutes: SitemapEntry[] = [];
  try {
    const { data } = await supabase
      .from("cars")
      .select("id, updated_at, source_id, seller_id")
      .eq("status", "active")
      .eq("owner_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50000);
    carRoutes = (data ?? []).map((c) => ({
      path: `/car/${c.id}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: "daily" as Freq,
      // 用户自发车源权重略高于转载车源
      priority: c.source_id ? 0.7 : 0.8,
    }));

    // 卖家/车行主页:去重 seller_id,lastModified 取其最新车源更新时间
    const sellers = new Map<string, Date>();
    for (const c of data ?? []) {
      if (!c.seller_id) continue;
      const t = c.updated_at ? new Date(c.updated_at) : now;
      const prev = sellers.get(c.seller_id);
      if (!prev || t > prev) sellers.set(c.seller_id, t);
    }
    userRoutes = [...sellers.entries()].map(([id, lastModified]) => ({
      path: `/user/${id}`,
      lastModified,
      changeFrequency: "weekly" as Freq,
      priority: 0.6,
    }));
  } catch {
    // 构建环境无法访问 Supabase 时降级
  }

  // 社区帖子详情页(内容页,SEO 长尾)
  let postRoutes: SitemapEntry[] = [];
  try {
    const { data } = await supabase
      .from("community_posts")
      .select("id, updated_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5000);
    postRoutes = (data ?? []).map((p) => ({
      path: `/community/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly" as Freq,
      priority: 0.6,
    }));
  } catch {
    // 构建环境无法访问 Supabase 时降级为纯静态 sitemap
  }

  return [...staticRoutes, ...seoRoutes, ...carRoutes, ...userRoutes, ...postRoutes];
}

/** 渲染某一语言的子 sitemap(每条带全语言 hreflang 互链),pretty print */
export function renderLocaleSitemap(loc: Locale, entries: SitemapEntry[]): string {
  const blocks = entries.map((entry) => {
    const alternates = [
      ...LOCALES.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l === "zh" ? "zh-CN" : l}" href="${esc(`${SITE_URL}/${l}${entry.path}`)}"/>`
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(`${SITE_URL}/zh${entry.path}`)}"/>`,
    ].join("\n");
    // 翻译树权重略降,避免稀释中文主站
    const priority = loc === "zh" ? entry.priority : Math.max(0.1, entry.priority - 0.2);
    return [
      "  <url>",
      `    <loc>${esc(`${SITE_URL}/${loc}${entry.path}`)}</loc>`,
      alternates,
      `    <lastmod>${entry.lastModified.toISOString()}</lastmod>`,
      `    <changefreq>${entry.changeFrequency}</changefreq>`,
      `    <priority>${priority.toFixed(1)}</priority>`,
      "  </url>",
    ].join("\n");
  });

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    blocks.join("\n") +
    `\n</urlset>\n`
  );
}
