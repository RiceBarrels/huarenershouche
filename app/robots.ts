import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-pages";

// 静态导出（Capacitor / output: "export"）下必须是纯静态 robots
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 路径级 i18n 后私有页在 /zh、/en 前缀下;无前缀旧路径 301 到 /zh,一并禁掉
      disallow: [
        "/account",
        "/messages",
        "/admin",
        "/login",
        "/register",
        "/verify-email",
        "/post",
        "/community/new",
      ].flatMap((p) => [p, `/zh${p}`, `/en${p}`, `/ko${p}`]),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
