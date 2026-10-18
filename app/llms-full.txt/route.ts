// /llms-full.txt — llms.txt 全文 + 全部 /cars/* 分类落地页链接。
import { buildLlmsFullTxt } from "@/lib/llms";

// 静态导出（Capacitor / output: "export"）下必须是纯静态
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return new Response(buildLlmsFullTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
