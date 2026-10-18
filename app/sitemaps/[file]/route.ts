// /sitemaps/{file}.xml — sitemap 分片(由 /sitemap.xml 列出;命名规则与数据来源见 lib/sitemap.ts)。
// generateStaticParams 返回 [] + revalidate:首次请求时生成并缓存 1 小时(按需 ISR,构建期不查库)。
// 静态导出经 ignoreInStatic.json 隐藏本路由。

import { parseShardName, renderUrlset, shardUrls, xmlResponse } from "@/lib/sitemap";

export const revalidate = 3600;

export function generateStaticParams(): { file: string }[] {
  return [];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
): Promise<Response> {
  const { file } = await params;
  const shard = parseShardName(file);
  const urls = shard ? await shardUrls(shard) : null;
  if (!shard || !urls) {
    return new Response("Not found", { status: 404 });
  }
  return xmlResponse(renderUrlset(shard.locale, urls));
}
