// /api/v1/keys/[id] — 开发者门户:重命名(PATCH)/ 吊销(DELETE)自己的 key。
// 吊销只置 revoked_at,不物理删除(保留用量记录;cars.api_key_id 也不受影响)。

import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateUser } from "@/lib/api/auth";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

const patchSchema = z.object({
  name: z.string().trim().min(1, "required").max(60, "max 60 characters").optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticateUser(req);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return apiError(404, "not_found", "API key not found.");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiError(400, "bad_request", "Request body must be JSON.");
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(
      400,
      "validation_failed",
      "Invalid request body.",
      parsed.error.issues.map((i) => ({ field: i.path.join(".") || "body", issue: i.message })),
    );
  }
  if (parsed.data.name == null) {
    return apiError(400, "validation_failed", "Nothing to update.", [{ field: "name", issue: "required" }]);
  }

  try {
    const { data, error } = await supabase
      .from("api_keys")
      .update({ name: parsed.data.name })
      .eq("id", id)
      .eq("owner_id", userId)
      .select("id, name, prefix, scopes, expires_at, revoked_at, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return apiError(404, "not_found", "API key not found.");
    return apiJson({ key: data });
  } catch (err) {
    return apiInternalError(err, "keys.PATCH");
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticateUser(req);
  if (!auth.ok) return auth.response;
  const { supabase, userId } = auth;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return apiError(404, "not_found", "API key not found.");

  try {
    const { data: existing, error: findErr } = await supabase
      .from("api_keys")
      .select("id, revoked_at")
      .eq("id", id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!existing) return apiError(404, "not_found", "API key not found.");
    // 已吊销:幂等返回成功
    if (existing.revoked_at) return apiJson({ ok: true });

    const { error: updErr } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", userId);
    if (updErr) throw new Error(updErr.message);
    return apiJson({ ok: true });
  } catch (err) {
    return apiInternalError(err, "keys.DELETE");
  }
}
