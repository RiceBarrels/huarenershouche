// /api/v1/llms.txt — AI 助手可直接抓取的 Public API 说明(纯文本,与文档页「AI 格式」同一份)。
import { buildAiPrompt } from "@/lib/api/ai-prompt";
import { API_CORS_HEADERS, handleOptions } from "@/lib/api/response";

export const dynamic = "force-static";
export const OPTIONS = handleOptions;

export async function GET() {
  return new Response(buildAiPrompt(), {
    status: 200,
    headers: {
      ...API_CORS_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
