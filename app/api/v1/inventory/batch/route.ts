// POST /api/v1/inventory/batch — 一次 ≤ BATCH_MAX_ITEMS 条 upsert,顺序处理、逐条返回结果。
// 配额逐条扣:超限的条目单独 429,前面已成功的不回滚。整体总是 200。需 write:inventory。

import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateApi } from "@/lib/api/auth";
import { getQuota, quotaHeaders } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { BATCH_MAX_ITEMS, type ApiContext, type ApiErrorDetail, type QuotaInfo } from "@/lib/api/types";
import { finalize, formatZodError, listingSchema, listingUrl, readJsonBody, upsertListing } from "@/lib/api/listing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

const batchSchema = z.object({
  items: z.array(z.unknown()).min(1).max(BATCH_MAX_ITEMS),
});

interface BatchItemResult {
  external_id: string | null;
  ok: boolean;
  status_code: number;
  id?: string;
  url?: string;
  created?: boolean;
  processing?: string[];
  error?: { code: string; message: string; details?: ApiErrorDetail[]; [k: string]: unknown };
}

export async function POST(req: NextRequest) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:inventory" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;

    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return finalize(ctx, apiError(400, "bad_request", "Body must be a JSON object"));
    }
    const outer = batchSchema.safeParse(body);
    if (!outer.success) {
      return finalize(
        ctx,
        apiError(400, "validation_failed", `items must be an array of 1..${BATCH_MAX_ITEMS}`, formatZodError(outer.error)),
      );
    }

    const results: BatchItemResult[] = [];
    const summary = { created: 0, updated: 0, failed: 0 };
    let quota: QuotaInfo | null = null;

    for (const raw of outer.data.items) {
      const externalId =
        raw && typeof raw === "object" && typeof (raw as { external_id?: unknown }).external_id === "string"
          ? ((raw as { external_id: string }).external_id as string)
          : null;
      const parsed = listingSchema.safeParse(raw);
      if (!parsed.success) {
        summary.failed++;
        results.push({
          external_id: externalId,
          ok: false,
          status_code: 400,
          error: { code: "validation_failed", message: "Item failed validation", details: formatZodError(parsed.error) },
        });
        continue;
      }
      try {
        const r = await upsertListing(ctx, parsed.data, { adopt: false });
        if (r.ok) {
          quota = r.quota;
          if (r.created) summary.created++;
          else summary.updated++;
          results.push({
            external_id: parsed.data.external_id,
            ok: true,
            status_code: r.created ? 201 : 200,
            id: r.id,
            url: listingUrl(r.id),
            created: r.created,
            processing: r.processing,
          });
        } else {
          summary.failed++;
          const errBody = (await r.response.clone().json().catch(() => null)) as {
            error?: BatchItemResult["error"];
            quota?: QuotaInfo;
          } | null;
          if (errBody?.quota) quota = errBody.quota;
          results.push({
            external_id: parsed.data.external_id,
            ok: false,
            status_code: r.response.status,
            error: errBody?.error ?? { code: "internal_error", message: "Unknown error" },
          });
        }
      } catch (err) {
        summary.failed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[api/v1:inventory.batch] ${parsed.data.external_id}: ${message}`);
        results.push({
          external_id: parsed.data.external_id,
          ok: false,
          status_code: 500,
          error: { code: "internal_error", message: "Internal error" },
        });
      }
    }

    quota = quota ?? (await getQuota(ctx));
    // 整批全失败也记一次 errors,便于门户用量图看出问题
    if (summary.failed > 0 && summary.created + summary.updated === 0) {
      await finalize(ctx, apiError(400, "bad_request", "all items failed"));
    }
    return apiJson({ results, summary, quota }, { headers: quotaHeaders(quota) });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.batch"));
  }
}
