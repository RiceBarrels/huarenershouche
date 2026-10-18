// 静态导出(Capacitor)版社区页:build:static 构建时换入为 page.tsx。
// 原生壳没有服务端:不带 ISR、不带服务端数据(最新帖子索引只服务网页端爬虫),只有客户端信息流。

import { Suspense } from "react";
import CommunityFeed from "./community-feed";

export default function Page() {
  // useSearchParams(?q= 话题直达搜索)需要 Suspense 边界
  return (
    <Suspense>
      <CommunityFeed />
    </Suspense>
  );
}
