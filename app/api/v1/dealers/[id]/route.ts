// GET /api/v1/dealers/{id} — 单家已认证门店 + 在售车(最新 50 台)+ 在售总数。
// 未认证 / 不存在一律 404。匿名请求脱敏 phone/wechat/contact_apps。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { isUuid } from "@/lib/api/filters";
import {
  CAR_SUMMARY_SELECT,
  LEGACY_CAR_SUMMARY_SELECT,
  serializeCarSummary,
  serializeDealer,
  type ApiCarRow,
} from "@/lib/api/serialize";
import { fetchContactApps } from "@/lib/api/contact-apps";
import { isMissingColumnError } from "@/lib/supabase-compat";
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
    // 内容时钟 content_updated_at(i18n-v2.sql)还没建时 CAR_SUMMARY_SELECT 报缺列,用旧列集重查一次
    const dealerCars = (select: string) =>
      ctx.supabase
        .from("cars")
        .select(select)
        .eq("seller_id", store.owner_id)
        .eq("status", "active")
        .eq("owner_hidden", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(DEALER_CARS_LIMIT);

    const [{ data: profile, error: profErr }, firstCars, { count, error: countErr }, contactApps] = await Promise.all([
      ctx.supabase.from("profiles").select("languages").eq("id", store.owner_id).maybeSingle(),
      dealerCars(CAR_SUMMARY_SELECT),
      visibleCars().eq("seller_id", store.owner_id).eq("status", "active").eq("owner_hidden", false),
      // 门店主人的即时通讯账号只给带 key 的请求(列不存在时为空)
      anonymous ? null : fetchContactApps(ctx.supabase, [store.owner_id]),
    ]);
    if (profErr) throw new Error(profErr.message);
    let carsRes = firstCars;
    if (carsRes.error && isMissingColumnError(carsRes.error)) carsRes = await dealerCars(LEGACY_CAR_SUMMARY_SELECT);
    if (carsRes.error) throw new Error(carsRes.error.message);
    if (countErr) throw new Error(countErr.message);

    const rows = (carsRes.data ?? []) as unknown as ApiCarRow[];
    const active_count = count ?? rows.length;
    const opts = { lang: ctx.lang, redact: anonymous };
    return apiJson({
      data: {
        ...serializeDealer(store, {
          ...opts,
          languages: (profile as { languages?: string[] | null } | null)?.languages ?? [],
          active_count,
          contactApps: contactApps?.get(store.owner_id),
        }),
        cars: rows.map((car) => serializeCarSummary(car, opts)),
      },
      lang: ctx.lang,
    });
  } catch (err) {
    return apiInternalError(err, "dealers.detail");
  }
}
