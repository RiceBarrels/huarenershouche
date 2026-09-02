// GET /api/v1/dealers — 已认证门店列表。可选 location(地址子串 / 邮编前缀),
// offset 游标分页(门店表小)。附门店主人的沟通语言与在售车数;匿名脱敏 phone/wechat。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { apiError, apiInternalError, apiJson, handleOptions, intParam } from "@/lib/api/response";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/api/types";
import {
  collectRows,
  escapeLike,
  offsetCursor,
  parseOffsetCursor,
  quoteOrValue,
  type CarFilterQuery,
} from "@/lib/api/filters";
import { serializeDealer } from "@/lib/api/serialize";
import type { DbDealerStore } from "@/lib/types";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApi(req, { allowAnonymous: true, scope: "read:dealers" });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const anonymous = ctx.key == null;
    const sp = req.nextUrl.searchParams;

    const limit = intParam(sp, "limit", DEFAULT_PAGE_SIZE, { min: 1, max: MAX_PAGE_SIZE }) ?? DEFAULT_PAGE_SIZE;
    const { offset, error: cursorErr } = parseOffsetCursor(sp);
    if (cursorErr) return apiError(400, "validation_failed", "Invalid query parameters", [cursorErr]);

    let q = ctx.supabase
      .from("dealer_stores")
      .select("*")
      .eq("verification_status", "verified")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    const location = sp.get("location")?.trim();
    if (location) {
      const like = escapeLike(location);
      q = q.or(`address.ilike.${quoteOrValue(`%${like}%`)},zipcode.ilike.${quoteOrValue(`${like}%`)}`);
    }
    const { data, error } = await q.range(offset, offset + limit);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as DbDealerStore[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const ownerIds = Array.from(new Set(page.map((s) => s.owner_id)));

    const languages = new Map<string, string[]>();
    const activeCounts = new Map<string, number>();
    if (ownerIds.length) {
      const carRowsPromise = collectRows<{ seller_id: string }>(
        () =>
          ctx.supabase
            .from("cars")
            .select("seller_id")
            .eq("status", "active")
            .eq("owner_hidden", false)
            // .in() 的条件类型会把 TS 推导压爆(TS2589),这里只需要 builder 的 range/then
            .in("seller_id", ownerIds) as unknown as CarFilterQuery,
        5000,
      );
      const { data: profiles, error: profErr } = await ctx.supabase
        .from("profiles")
        .select("id, languages")
        .in("id", ownerIds);
      if (profErr) throw new Error(profErr.message);
      const carRows = await carRowsPromise;
      for (const p of (profiles ?? []) as { id: string; languages: string[] | null }[]) {
        languages.set(p.id, p.languages ?? []);
      }
      for (const c of carRows) activeCounts.set(c.seller_id, (activeCounts.get(c.seller_id) ?? 0) + 1);
    }

    return apiJson({
      data: page.map((store) =>
        serializeDealer(store, {
          lang: ctx.lang,
          redact: anonymous,
          languages: languages.get(store.owner_id) ?? [],
          active_count: activeCounts.get(store.owner_id) ?? 0,
        }),
      ),
      next_cursor: hasMore ? offsetCursor(offset + limit) : null,
      lang: ctx.lang,
    });
  } catch (err) {
    return apiInternalError(err, "dealers.list");
  }
}
