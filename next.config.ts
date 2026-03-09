import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "nkboeyveppapmxgfjqqb.supabase.co" },
    ],
  },
};

export default nextConfig;
