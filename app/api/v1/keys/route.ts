// /api/v1/keys — 开发者门户:列出 / 创建自己的 API key。
// 鉴权用登录 session(Authorization: Bearer <supabase access token>),服务端 service role 读写,
// 响应永远不含 key_hash;明文只在 POST 创建响应里出现一次。

import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateUser, buildOwnerContext } from "@/lib/api/auth";
import { generateApiKey } from "@/lib/api/keys";
import { getQuota } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { API_SCOPES, MAX_KEYS_PER_OWNER, type ApiContext } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

/** 列表列(刻意不含 key_hash) */
const API_KEY_PUBLIC_COLUMNS =
  "id, owner_id, name, prefix, scopes, ip_allowlist, rate_limit_per_min, expires_at, revoked_at, last_used_at, request_count, created_at";

const createSchema = z.object({
  name: z.string().trim().min(1, "required").max(60, "max 60 characters"),
  scopes: z.array(z.enum(API_SCOPES)).min(1, "at least one scope").optional(),
  expires_in_days: z.number().int().min(1).max(3650).optional(),
});

function zodDetails(err: z.ZodError) {
  return err.issues.map((i) => ({ field: i.path.join(".") || "body", issue: i.message }));
}

export async function GET(req: NextRequest) {
  const auth = await authenticateUser(req);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;
  try {
    const ownerCtx = await buildOwnerContext(supabase, userId);
    if (!ownerCtx) return apiError(401, "unauthorized", "Profile not found.");

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select(API_KEY_PUBLIC_COLUMNS)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ctx: ApiContext = {
      supabase,
      key: null,
      owner: ownerCtx.owner,
      tier: ownerCtx.tier,
      stores: ownerCtx.stores,
      ip: null,
      lang: "zh",
    };
    const quota = await getQuota(ctx);
    return apiJson({ keys: keys ?? [], tier: ownerCtx.tier, quota });
  } catch (err) {
    return apiInternalError(err, "keys.GET");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateUser(req);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiError(400, "bad_request", "Request body must be JSON.");
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(400, "validation_failed", "Invalid request body.", zodDetails(parsed.error));
  }
  const { name, expires_in_days } = parsed.data;
  const scopes = Array.from(new Set(parsed.data.scopes ?? ["read:cars", "read:dealers"]));

  try {
    const { count, error: countErr } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .is("revoked_at", null);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) >= MAX_KEYS_PER_OWNER) {
      return apiError(
        409,
        "conflict",
        `You already have ${MAX_KEYS_PER_OWNER} active API keys. Revoke one before creating another.`,
      );
    }

    const generated = generateApiKey();
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 86_400_000).toISOString()
      : null;

    const { data: row, error: insertErr } = await supabase
      .from("api_keys")
      .insert({
        owner_id: userId,
        name,
        prefix: generated.prefix,
        key_hash: generated.hash,
        scopes,
        expires_at: expiresAt,
      })
      .select("id, name, prefix, scopes, expires_at, created_at")
      .single();
    if (insertErr || !row) throw new Error(insertErr?.message ?? "insert returned no row");

    return apiJson(
      {
        key: generated.plain,
        id: row.id,
        name: row.name,
        prefix: row.prefix,
        scopes: row.scopes,
        expires_at: row.expires_at,
        created_at: row.created_at,
      },
      { status: 201 },
    );
  } catch (err) {
    return apiInternalError(err, "keys.POST");
  }
}
