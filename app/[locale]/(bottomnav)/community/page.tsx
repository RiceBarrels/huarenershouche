// 社区信息流(网页端)— server 壳:客户端信息流(洗牌 + 个性化插卡,按访客状态渲染,不做 SSR)
// + 服务端渲染的「最新帖子」索引(爬虫据此发现帖子页)。ISR 每 5 分钟刷新索引。
// 静态导出(Capacitor)由 build:static 换成 page.static.tsx(只有客户端信息流)。

import { Suspense } from "react";
import type { Locale } from "@/lib/i18n";
import { isSiteLocale } from "@/lib/i18n/content-langs";
import { LatestPostsIndex } from "@/components/content/latest-posts-index";
import CommunityFeed from "./community-feed";

export const revalidate = 300;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const L: Locale = isSiteLocale(locale) ? locale : "zh";
  return (
    <>
      {/* useSearchParams(?q= / ?topic=)需要 Suspense 边界;预渲染时信息流在此客户端渲染,
          占位撑满一屏,索引不会在信息流挂载前闪到页面顶部 */}
      <Suspense fallback={<div className="min-h-screen" />}>
        <CommunityFeed />
      </Suspense>
      <LatestPostsIndex locale={L} />
    </>
  );
}
