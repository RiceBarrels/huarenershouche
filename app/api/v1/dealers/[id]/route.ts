// GET /api/v1/dealers/{id} — 单家已认证门店 + 在售车(最新 50 台)+ 在售总数。
// 未认证 / 不存在一律 404。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { isUuid } from "@/lib/api/filters";
import { CAR_SUMMARY_SELECT, serializeCarSummary, serializeDealer, type ApiCarRow } from "@/lib/api/serialize";
import type { DbDealerStore } from "@/lib/types";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

const DEALER_CARS_LIMIT = 50;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateApi(req, { allowAnonymous: true, scope: "read:dealers" });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const anonymous = ctx.key == null;

    const { id } = await params;
    if (!isUuid(id)) return apiError(404, "not_found", "Dealer not found");

    const { data: storeRow, error: storeErr } = await ctx.supabase
      .from("dealer_stores")
      .select("*")
      .eq("id", id)
      .eq("verification_status", "verified")
      .maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    if (!storeRow) return apiError(404, "not_found", "Dealer not found");
    const store = storeRow as DbDealerStore;

    const visibleCars = () =>
      ctx.supabase.from("cars").select("id", { count: "exact", head: true });

    const [{ data: profile, error: profErr }, { data: cars, error: carsErr }, { count, error: countErr }] =
      await Promise.all([
        ctx.supabase.from("profiles").select("languages").eq("id", store.owner_id).maybeSingle(),
        ctx.supabase
          .from("cars")
          .select(CAR_SUMMARY_SELECT)
          .eq("seller_id", store.owner_id)
          .eq("status", "active")
          .eq("owner_hidden", false)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(DEALER_CARS_LIMIT),
        visibleCars().eq("seller_id", store.owner_id).eq("status", "active").eq("owner_hidden", false),
      ]);
    if (profErr) throw new Error(profErr.message);
    if (carsErr) throw new Error(carsErr.message);
    if (countErr) throw new Error(countErr.message);

    const rows = (cars ?? []) as unknown as ApiCarRow[];
    const active_count = count ?? rows.length;
    const opts = { lang: ctx.lang, redact: anonymous };
    return apiJson({
      data: {
        ...serializeDealer(store, {
          ...opts,
          languages: (profile as { languages?: string[] | null } | null)?.languages ?? [],
          active_count,
        }),
        cars: rows.map((car) => serializeCarSummary(car, opts)),
      },
      lang: ctx.lang,
    });
  } catch (err) {
    return apiInternalError(err, "dealers.detail");
  }
}
