// GET /api/v1/inventory — key owner 名下全部车(含 sold/pending/removed),
// 筛选 status / external_id,offset 游标分页。需 write:inventory。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { enumSlugs, enumToDb } from "@/lib/api/enums";
import {
  apiError,
  apiInternalError,
  apiJson,
  decodeCursor,
  encodeCursor,
  handleOptions,
  intParam,
} from "@/lib/api/response";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type ApiContext } from "@/lib/api/types";
import { INVENTORY_COLS, finalize, serializeInventoryItem, type InventoryCar } from "@/lib/api/listing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:inventory" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;

    const sp = req.nextUrl.searchParams;
    const limit = intParam(sp, "limit", DEFAULT_PAGE_SIZE, { min: 1, max: MAX_PAGE_SIZE })!;
    const cursor = decodeCursor<{ o: number }>(sp.get("cursor"));
    const offset = Math.max(0, Math.trunc(Number(cursor?.o ?? 0)) || 0);

    let query = ctx.supabase
      .from("cars")
      .select(INVENTORY_COLS)
      .eq("seller_id", ctx.owner!.id) // 含手动发帖(external_id 为空),便于发现可 adopt 的车
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit); // 多取一条判断是否还有下一页

    const status = sp.get("status");
    if (status) {
      const dbStatus = enumToDb("status", status);
      if (!dbStatus) {
        return finalize(
          ctx,
          apiError(400, "validation_failed", "Invalid status", [
            { field: "status", issue: `must be one of: ${enumSlugs("status").join(", ")}` },
          ]),
        );
      }
      query = query.eq("status", dbStatus);
    }
    const externalId = sp.get("external_id");
    if (externalId) query = query.eq("external_id", externalId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as InventoryCar[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return apiJson({
      data: page.map((c) => serializeInventoryItem(c, ctx!.lang)),
      next_cursor: hasMore ? encodeCursor({ o: offset + limit }) : null,
      lang: ctx.lang,
    });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.list"));
  }
}
