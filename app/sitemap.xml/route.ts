// /sitemap.xml — sitemap index:各语言静态页分片 + zh 落地页分片 + 按 sitemap_counts 算出的内容分片
// (分片命名与数据来源见 lib/sitemap.ts)。ISR 每小时重新生成;静态导出经 ignoreInStatic.json 隐藏本路由。

import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { contentShardFiles, renderIndex, staticShardFiles, xmlResponse } from "@/lib/sitemap";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const files = staticShardFiles();
  try {
    files.push(...(await contentShardFiles()));
  } catch (err) {
    // 构建期预渲染拿不到数据(RPC / env / 网络):先只发静态页 + 落地页,ISR 一小时内补齐;
    // 运行期重新生成失败则抛出,Next 继续返回上一份完整的 index
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw err;
    console.warn(`[sitemap] index built without content shards: ${err instanceof Error ? err.message : String(err)}`);
  }
  return xmlResponse(renderIndex(files));
}
