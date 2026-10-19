import type { NextConfig } from "next";

// build:static(Capacitor 原生包)设 NEXT_OUTPUT=static:纯静态导出,没有服务端
const isStatic = process.env.NEXT_OUTPUT === "static";
// 与 lib/i18n LOCALE_STORAGE_KEY 同名(这里不 import 应用代码)
const LOCALE_COOKIE = "clc_locale";

const nextConfig: NextConfig = {
  ...(isStatic && {
    output: "export",
  }),
  // metadata(canonical / hreflang / robots / og:locale)对所有 UA 都阻塞输出在 <head>:
  // 默认只有名单里的 bot 如此,Googlebot 等会拿到流式 metadata(渲染在 <body> 的隐藏容器里)
  htmlLimitedBots: /.*/,
  // web 端根 layout 是 app/[locale]/layout.tsx,没有 app/layout.tsx 与 app/page.tsx:
  // 未匹配的路由由 app/global-not-found.tsx 渲染,/ 跳 /zh(vercel.json 线上同样兜底)。
  // 静态导出换入 *.static.tsx(唯一根 layout + app/not-found.tsx),两者都不需要
  ...(!isStatic && {
    experimental: {
      globalNotFound: true,
    },
    async redirects() {
      // 与 vercel.json 同序:首选语言为繁体(zh-TW / zh-HK / zh-MO / zh-Hant)且没选过语言 → /zh-hant;
      // 选过繁体(clc_locale cookie,见 rememberLocaleCookie)→ /zh-hant;其余 → /zh
      return [
        {
          source: "/",
          has: [{ type: "header", key: "accept-language", value: "^\\s*[zZ][hH][-_](?:[tT][wW]|[hH][kK]|[mM][oO]|[hH][aA][nN][tT]).*" }],
          missing: [{ type: "cookie", key: LOCALE_COOKIE }],
          destination: "/zh-hant",
          permanent: false,
        },
        { source: "/", has: [{ type: "cookie", key: LOCALE_COOKIE, value: "zh-hant" }], destination: "/zh-hant", permanent: false },
        { source: "/", destination: "/zh", permanent: false },
      ];
    },
  }),
  // /api/sync 用 sharp 压缩转存车源图片;Turbopack 追踪不到 sharp 按 rpath 加载的 libvips .so,
  // 部署后会报 libvips-cpp.so 缺失 → 显式打包 Linux 原生依赖
  outputFileTracingIncludes: {
    "/api/sync": ["./node_modules/@img/sharp-linux-x64/**/*", "./node_modules/@img/sharp-libvips-linux-x64/**/*"],
  },
  images: {
    ...(isStatic && { unoptimized: true }),
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "nkboeyveppapmxgfjqqb.supabase.co" },
    ],
  },
};

export default nextConfig;
