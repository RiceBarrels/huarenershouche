// /llms.txt — 给 AI 助手/爬虫的站点说明(https://llmstxt.org),内容由 lib/llms.ts 从注册表生成。
import { buildLlmsTxt } from "@/lib/llms";

// 静态导出（Capacitor / output: "export"）下必须是纯静态
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
