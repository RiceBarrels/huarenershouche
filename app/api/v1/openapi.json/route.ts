// GET /api/v1/openapi.json:机器可读的 OpenAPI 3.1 规范(来源 lib/api/openapi.ts)。
// 纯静态内容,可长缓存;CORS 与其他 v1 端点一致。

import { apiJson, handleOptions } from "@/lib/api/response";
import { buildOpenApi } from "@/lib/api/openapi";

export const dynamic = "force-static";

export function GET() {
  return apiJson(buildOpenApi(), { headers: { "Cache-Control": "public, max-age=3600" } });
}

export const OPTIONS = handleOptions;
