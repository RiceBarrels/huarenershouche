// GET /api/v1/inventory — key owner 名下全部车(含 sold/pending/removed),
// 筛选 status / external_id,按内容时钟倒序(最近改过的在前),offset 游标分页。需 write:inventory。
// processing_state 的 translation_pending 按页查一次 zh / en 的 i18n_bundle。

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
import {
  INVENTORY_COLUMN_SETS,
  inventoryOrderColumn,
  finalize,
  loadTranslationPending,
  serializeInventoryItem,
  type InventoryCar,
} from "@/lib/api/listing";
import { queryWithColumnFallback } from "@/lib/supabase-compat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:inventory" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;
    const { supabase, lang } = ctx;
    const ownerId = ctx.owner!.id;

    const sp = req.nextUrl.searchParams;
    const limit = intParam(sp, "limit", DEFAULT_PAGE_SIZE, { min: 1, max: MAX_PAGE_SIZE })!;
    const cursor = decodeCursor<{ o: number }>(sp.get("cursor"));
    const offset = Math.max(0, Math.trunc(Number(cursor?.o ?? 0)) || 0);

    const status = sp.get("status");
    const dbStatus = status ? enumToDb("status", status) : null;
    if (status && !dbStatus) {
      return finalize(
        ctx,
        apiError(400, "validation_failed", "Invalid status", [
          { field: "status", issue: `must be one of: ${enumSlugs("status").join(", ")}` },
        ]),
      );
    }
    const externalId = sp.get("external_id");

    // 内容时钟 content_updated_at(i18n-v2.sql)/ 币种与里程单位(car-currency.sql)可能还没建:
    // 按 INVENTORY_COLUMN_SETS 从新到旧重查,没有内容时钟时按 updated_at 排
    const run = (cols: string) => {
      let query = supabase
        .from("cars")
        .select(cols)
        .eq("seller_id", ownerId) // 含手动发帖(external_id 为空),便于发现可 adopt 的车
        .order(inventoryOrderColumn(cols), { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + limit); // 多取一条判断是否还有下一页
      if (dbStatus) query = query.eq("status", dbStatus);
      if (externalId) query = query.eq("external_id", externalId);
      return query;
    };
    const res = await queryWithColumnFallback(run, INVENTORY_COLUMN_SETS);
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as InventoryCar[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const pending = await loadTranslationPending(page.map((c) => c.id));

    return apiJson({
      data: page.map((c) => serializeInventoryItem(c, lang, pending.has(c.id))),
      next_cursor: hasMore ? encodeCursor({ o: offset + limit }) : null,
      lang,
    });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.list"));
  }
}
