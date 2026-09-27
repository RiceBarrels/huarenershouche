import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === "static" && {
    output: "export",
  }),
  // /api/sync 用 sharp 压缩转存车源图片;Turbopack 追踪不到 sharp 按 rpath 加载的 libvips .so,
  // 部署后会报 libvips-cpp.so 缺失 → 显式打包 Linux 原生依赖
  outputFileTracingIncludes: {
    "/api/sync": ["./node_modules/@img/sharp-linux-x64/**/*", "./node_modules/@img/sharp-libvips-linux-x64/**/*"],
  },
  images: {
    ...(process.env.NEXT_OUTPUT === "static" && { unoptimized: true }),
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "nkboeyveppapmxgfjqqb.supabase.co" },
    ],
  },
};

export default nextConfig;
