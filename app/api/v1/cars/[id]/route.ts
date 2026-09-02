// GET /api/v1/cars/{id} — 车源详情。不可见(不存在 / 非 active / owner_hidden)一律 404,
// 不区分原因。车行卖家附带第一家已认证门店;匿名请求脱敏 phone/wechat/VIN。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { isUuid } from "@/lib/api/filters";
import { CAR_DETAIL_SELECT, serializeCarDetail, type ApiCarRow } from "@/lib/api/serialize";
import type { DbDealerStore } from "@/lib/types";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateApi(req, { allowAnonymous: true, scope: "read:cars" });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const anonymous = ctx.key == null;

    const { id } = await params;
    if (!isUuid(id)) return apiError(404, "not_found", "Car not found");

    const { data, error } = await ctx.supabase
      .from("cars")
      .select(CAR_DETAIL_SELECT)
      .eq("id", id)
      .eq("status", "active")
      .eq("owner_hidden", false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return apiError(404, "not_found", "Car not found");
    const car = data as unknown as ApiCarRow;

    let store: DbDealerStore | null = null;
    if (car.profiles?.account_type === "dealer") {
      const { data: stores, error: storeErr } = await ctx.supabase
        .from("dealer_stores")
        .select("*")
        .eq("owner_id", car.seller_id)
        .eq("verification_status", "verified")
        .order("created_at", { ascending: true })
        .limit(1);
      if (storeErr) throw new Error(storeErr.message);
      store = (stores?.[0] as DbDealerStore | undefined) ?? null;
    }

    return apiJson({
      data: serializeCarDetail(car, { lang: ctx.lang, redact: anonymous, store }),
      lang: ctx.lang,
    });
  } catch (err) {
    return apiInternalError(err, "cars.detail");
  }
}
