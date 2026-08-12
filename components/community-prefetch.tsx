"use client";

import { useEffect } from "react";
import { prefetchCommunityFeed } from "@/lib/community-feed-cache";

// 站点入口预取社区 feed(写入 session + localStorage),进社区页秒开
export function CommunityPrefetch() {
  useEffect(() => {
    // 稍等首屏渲染完再预取,不抢首屏带宽
    const t = setTimeout(() => {
      prefetchCommunityFeed();
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
