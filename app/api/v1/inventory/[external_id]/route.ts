// /api/v1/inventory/{external_id} — 单条库存(需 write:inventory)。
// PUT:幂等 upsert,201 新建 / 200 更新,?adopt=true 接管同 VIN 的手动帖;
// DELETE:?reason=sold(默认)| removed;GET:单条详情(形状同 GET /inventory 的列表项)。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { quotaHeaders } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import type { ApiContext } from "@/lib/api/types";
import {
  INVENTORY_COLUMN_SETS,
  finalize,
  formatZodError,
  listingSchema,
  listingUrl,
  loadTranslationPending,
  readJsonBody,
  removeListing,
  serializeInventoryItem,
  upsertListing,
  validationResponse,
  type InventoryCar,
} from "@/lib/api/listing";
import { queryWithColumnFallback } from "@/lib/supabase-compat";

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
    const { supabase, lang } = ctx;
    const ownerId = ctx.owner!.id;
    const { external_id } = await params;

    // 内容时钟 content_updated_at(i18n-v2.sql)/ 币种与里程单位(car-currency.sql)可能还没建:
    // 按 INVENTORY_COLUMN_SETS 从新到旧重查(没有内容时钟时 updated_at 即行时钟)
    const run = (cols: string) =>
      supabase
        .from("cars")
        .select(cols)
        .eq("seller_id", ownerId)
        .eq("external_id", external_id)
        .maybeSingle();
    const res = await queryWithColumnFallback(run, INVENTORY_COLUMN_SETS);
    if (res.error) throw new Error(res.error.message);
    if (!res.data) return finalize(ctx, apiError(404, "not_found", `No listing with external_id "${external_id}"`));

    const car = res.data as unknown as InventoryCar;
    const pending = await loadTranslationPending([car.id]);
    return apiJson({ data: serializeInventoryItem(car, lang, pending.has(car.id)), lang });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.get"));
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  // 后台审核 / 翻译截止 = 请求开始 + 55 s(maxDuration 60),鉴权与读 body 的耗时也算在内
  const start = Date.now();
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
    const result = await upsertListing(ctx, parsed.data, { adopt, startedAt: start });
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
