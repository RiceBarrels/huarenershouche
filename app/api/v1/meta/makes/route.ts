// GET /api/v1/meta/makes — 公开车源的品牌/车型/数量聚合 + 枚举目录(slug + 按 lang 的 label)。
// v0 在 TS 里聚合(最多扫 5000 行 make/model),CDN 缓存 5 分钟。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { collectRows, type CarFilterQuery } from "@/lib/api/filters";
import { enumCatalog } from "@/lib/api/enums";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

const MAX_SCAN_ROWS = 5000;

interface MakeAgg {
  make: string;
  count: number;
  models: { model: string; count: number }[];
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApi(req, { allowAnonymous: true, scope: "read:cars" });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;

    const rows = await collectRows<{ make: string | null; model: string | null }>(
      // postgrest-js 链式泛型在这里会触发 TS2589,与 dealers/route.ts 同样按结构接口断言
      () =>
        ctx.supabase
          .from("cars")
          .select("make, model")
          .eq("status", "active")
          .eq("owner_hidden", false) as unknown as CarFilterQuery,
      MAX_SCAN_ROWS,
    );

    // make → model → count(make/model 按 trim 后原样分组,不做大小写归并,和 browse 筛选同源)
    const agg = new Map<string, { count: number; models: Map<string, number> }>();
    for (const row of rows) {
      const make = row.make?.trim();
      if (!make) continue;
      const entry = agg.get(make) ?? { count: 0, models: new Map<string, number>() };
      entry.count += 1;
      const model = row.model?.trim();
      if (model) entry.models.set(model, (entry.models.get(model) ?? 0) + 1);
      agg.set(make, entry);
    }
    const data: MakeAgg[] = Array.from(agg.entries())
      .map(([make, { count, models }]) => ({
        make,
        count,
        models: Array.from(models.entries())
          .map(([model, c]) => ({ model, count: c }))
          .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model)),
      }))
      .sort((a, b) => b.count - a.count || a.make.localeCompare(b.make));

    return apiJson(
      { data, enums: enumCatalog(ctx.lang), lang: ctx.lang },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch (err) {
    return apiInternalError(err, "meta.makes");
  }
}
