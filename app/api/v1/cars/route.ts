// GET /api/v1/cars — 公共车源列表(仅 active 且未 owner_hidden)。
// 匿名可访问(按 IP 限流、脱敏),带 read:cars key 放宽限流并允许 seller_id 筛选。
// 参数与分页语义见 lib/api/filters.ts;字段形状见 lib/api/serialize.ts。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import {
  applyCarQueryFilters,
  applyCarSortAndPage,
  paginateCarRows,
  parseCarPageParams,
} from "@/lib/api/filters";
import { CAR_SUMMARY_SELECT, serializeCarSummary, type ApiCarRow } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApi(req, { allowAnonymous: true, scope: "read:cars" });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const anonymous = ctx.key == null;
    const sp = req.nextUrl.searchParams;

    const { params, errors: pageErrors } = parseCarPageParams(sp);
    const base = ctx.supabase
      .from("cars")
      .select(CAR_SUMMARY_SELECT)
      .eq("status", "active")
      .eq("owner_hidden", false);
    const { query: filtered, errors: filterErrors } = applyCarQueryFilters(base, sp, { anonymous });
    const errors = [...pageErrors, ...filterErrors];
    if (errors.length) return apiError(400, "validation_failed", "Invalid query parameters", errors);

    const { data, error } = await applyCarSortAndPage(filtered, params);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as ApiCarRow[];
    const { page, next_cursor } = paginateCarRows(rows, params);
    return apiJson({
      data: page.map((car) => serializeCarSummary(car, { lang: ctx.lang, redact: anonymous })),
      next_cursor,
      lang: ctx.lang,
    });
  } catch (err) {
    return apiInternalError(err, "cars.list");
  }
}
