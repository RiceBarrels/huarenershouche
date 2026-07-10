import type { MetadataRoute } from "next";
import { SEO_PAGES, SITE_URL } from "@/lib/seo-pages";

// 静态导出（Capacitor / output: "export"）下必须是纯静态 sitemap
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticRoutes, ...seoRoutes];
}
