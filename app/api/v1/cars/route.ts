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
import {
  CAR_SUMMARY_SELECT,
  LEGACY_CAR_SUMMARY_SELECT,
  serializeCarSummary,
  type ApiCarRow,
} from "@/lib/api/serialize";
import { isMissingColumnError } from "@/lib/supabase-compat";

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
    // 内容时钟 content_updated_at(i18n-v2.sql)还没建时整条查询报缺列:legacy 用旧列集重查,
    // updated_since 退回 updated_at。参数校验与 legacy 无关,只看第一次构建的结果
    const build = (legacy: boolean) =>
      applyCarQueryFilters(
        ctx.supabase
          .from("cars")
          .select(legacy ? LEGACY_CAR_SUMMARY_SELECT : CAR_SUMMARY_SELECT)
          .eq("status", "active")
          .eq("owner_hidden", false),
        sp,
        { anonymous, legacy },
      );
    const first = build(false);
    const errors = [...pageErrors, ...first.errors];
    if (errors.length) return apiError(400, "validation_failed", "Invalid query parameters", errors);

    let res = await applyCarSortAndPage(first.query, params);
    if (res.error && isMissingColumnError(res.error)) res = await applyCarSortAndPage(build(true).query, params);
    if (res.error) throw new Error(res.error.message);

    const rows = (res.data ?? []) as unknown as ApiCarRow[];
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
