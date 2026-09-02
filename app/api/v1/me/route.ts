// GET /api/v1/me — 当前 key 摘要、owner、已认证门店、配额档位与今日余量。任何有效 key 可用,不检查 scope。

import type { NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api/auth";
import { getQuota } from "@/lib/api/quota";
import { apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { finalize } from "@/lib/api/listing";
import type { ApiContext } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req);
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;
    const key = ctx.key!;
    const owner = ctx.owner!;

    const quota = await getQuota(ctx);
    return apiJson({
      key: {
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        scopes: key.scopes,
        rate_limit_per_min: key.rate_limit_per_min,
      },
      owner: {
        id: owner.id,
        username: owner.username,
        account_type: owner.account_type,
        languages: owner.languages,
      },
      tier: ctx.tier,
      stores: ctx.stores.map((s) => ({ id: s.id, name: s.name, address: s.address, lat: s.lat, lng: s.lng })),
      quota,
    });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "me"));
  }
}
