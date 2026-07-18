import type { MetadataRoute } from "next";
import { SEO_PAGES, SITE_URL } from "@/lib/seo-pages";
import { supabase } from "@/lib/supabase";

// 静态导出（Capacitor / output: "export"）下必须是纯静态 sitemap
// （社区帖子在 build 时从 Supabase 拉取,随每次部署刷新）
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/browse", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/cars", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/post", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/guide", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/community", changeFrequency: "daily" as const, priority: 0.7 },
    { path: "/qa", changeFrequency: "daily" as const, priority: 0.7 },
    { path: "/compare", changeFrequency: "weekly" as const, priority: 0.6 },
    { path: "/vin", changeFrequency: "weekly" as const, priority: 0.6 },
    { path: "/services", changeFrequency: "weekly" as const, priority: 0.6 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/business", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/terms", changeFrequency: "monthly" as const, priority: 0.5 },
  ].map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const seoRoutes: MetadataRoute.Sitemap = SEO_PAGES.map((p) => ({
    url: `${SITE_URL}/cars/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: p.slug.includes("/") ? 0.6 : 0.8,
  }));

  // 社区帖子详情页(内容页,SEO 长尾)
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("community_posts")
      .select("id, updated_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5000);
    postRoutes = (data ?? []).map((p) => ({
      url: `${SITE_URL}/community/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // 构建环境无法访问 Supabase 时降级为纯静态 sitemap
  }

  return [...staticRoutes, ...seoRoutes, ...postRoutes];
}
