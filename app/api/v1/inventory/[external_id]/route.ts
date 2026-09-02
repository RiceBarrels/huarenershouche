// /api/v1/inventory/{external_id} — 单条库存(需 write:inventory)。
// PUT:幂等 upsert,201 新建 / 200 更新,?adopt=true 接管同 VIN 的手动帖;
// DELETE:?reason=sold(默认)| removed;GET:单条详情。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { quotaHeaders } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import type { ApiContext } from "@/lib/api/types";
import {
  INVENTORY_COLS,
  finalize,
  formatZodError,
  listingSchema,
  listingUrl,
  readJsonBody,
  removeListing,
  serializeInventoryItem,
  upsertListing,
  validationResponse,
  type InventoryCar,
} from "@/lib/api/listing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

type Params = { params: Promise<{ external_id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:inventory" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;
    const { external_id } = await params;

    const { data, error } = await ctx.supabase
      .from("cars")
      .select(INVENTORY_COLS)
      .eq("seller_id", ctx.owner!.id)
      .eq("external_id", external_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return finalize(ctx, apiError(404, "not_found", `No listing with external_id "${external_id}"`));

    return apiJson({ data: serializeInventoryItem(data as unknown as InventoryCar, ctx.lang), lang: ctx.lang });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.get"));
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:inventory" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;
    const { external_id } = await params;

    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return finalize(ctx, apiError(400, "bad_request", "Body must be a JSON object"));
    }
    // 路径参数为准,body 里的 external_id 忽略
    const parsed = listingSchema.safeParse({ ...(body as Record<string, unknown>), external_id });
    if (!parsed.success) return finalize(ctx, validationResponse(formatZodError(parsed.error)));

    const adopt = req.nextUrl.searchParams.get("adopt") === "true";
    const result = await upsertListing(ctx, parsed.data, { adopt });
    if (!result.ok) return finalize(ctx, result.response);

    return apiJson(
      {
        id: result.id,
        external_id: parsed.data.external_id,
        url: listingUrl(result.id),
        status: result.status,
        created: result.created,
        processing: result.processing,
        quota: result.quota,
      },
      { status: result.created ? 201 : 200, headers: quotaHeaders(result.quota) },
    );
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.put"));
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:inventory" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;
    const { external_id } = await params;

    const reasonRaw = req.nextUrl.searchParams.get("reason") ?? "sold";
    if (reasonRaw !== "sold" && reasonRaw !== "removed") {
      return finalize(
        ctx,
        apiError(400, "validation_failed", "Invalid reason", [{ field: "reason", issue: "must be sold or removed" }]),
      );
    }
    const result = await removeListing(ctx, external_id, reasonRaw);
    if (!result.ok) return finalize(ctx, result.response);

    return apiJson(
      { id: result.id, external_id, status: result.status, quota: result.quota },
      { headers: quotaHeaders(result.quota) },
    );
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.delete"));
  }
}
