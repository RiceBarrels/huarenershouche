// POST /api/v1/inventory/reconcile — 全量对账:body 传当前在售 external_id 列表,
// 在售且不在列表里的车下架(removed)。dry_run=true 只返回会下架哪些。
// 逐条扣配额,首次超限即停止(已下架的不回滚)。需 write:inventory。

import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateApi } from "@/lib/api/auth";
import { quotaHeaders } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import type { ApiContext } from "@/lib/api/types";
import { finalize, formatZodError, readJsonBody, reconcileInventory } from "@/lib/api/listing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

/** 空列表必须显式确认(否则一次手滑清空全部在售) */
const reconcileSchema = z.object({
  active_external_ids: z.array(z.string().trim().min(1).max(64)).max(5000),
  dry_run: z.boolean().optional().default(false),
  confirm_empty: z.boolean().optional().default(false),
});

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
    const parsed = reconcileSchema.safeParse(body);
    if (!parsed.success) {
      return finalize(ctx, apiError(400, "validation_failed", "Invalid body", formatZodError(parsed.error)));
    }
    const { active_external_ids, dry_run, confirm_empty } = parsed.data;
    if (active_external_ids.length === 0 && !dry_run && !confirm_empty) {
      return finalize(
        ctx,
        apiError(400, "validation_failed", "Empty active_external_ids would remove every active listing", [
          { field: "active_external_ids", issue: "empty; pass confirm_empty=true if intentional" },
        ]),
      );
    }

    const result = await reconcileInventory(ctx, active_external_ids, dry_run);
    const pick = (i: { id: string; external_id: string }) => ({ id: i.id, external_id: i.external_id });
    if (result.dryRun) {
      return apiJson({ dry_run: true, would_remove: result.items.map(pick), quota: result.quota });
    }
    return apiJson(
      {
        dry_run: false,
        removed: result.items.filter((i) => i.ok).map(pick),
        failed: result.items.filter((i) => !i.ok).map((i) => ({ ...pick(i), error: i.error })),
        quota: result.quota,
      },
      { headers: quotaHeaders(result.quota) },
    );
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.reconcile"));
  }
}
