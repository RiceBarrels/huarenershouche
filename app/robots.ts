import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-pages";
import { LOCALES } from "@/lib/i18n";

// 静态导出（Capacitor / output: "export"）下必须是纯静态 robots
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 路径级 i18n 后私有页在各语言前缀下(LOCALES 注册表,加语言自动跟随);
      // 无前缀旧路径 301 到 /zh,一并禁掉
      disallow: [
        "/account",
        "/messages",
        "/admin",
        "/login",
        "/register",
        "/verify-email",
        "/post",
        "/community/new",
      ].flatMap((p) => [p, ...LOCALES.map((loc) => `/${loc}${p}`)]),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
