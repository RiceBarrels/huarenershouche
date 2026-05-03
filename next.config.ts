import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === "static" && {
    output: "export",
  }),
  images: {
    ...(process.env.NEXT_OUTPUT === "static" && { unoptimized: true }),
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "nkboeyveppapmxgfjqqb.supabase.co" },
    ],
  },
};

export default nextConfig;
