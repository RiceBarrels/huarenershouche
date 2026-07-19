// /api/translate — 车辆文案双语翻译(登录用户可用)。
// 客户端发布车辆时调用,拿到补全后的中英字段再写库。

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sources/service-client";
import { localizeListing } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function POST(req: NextRequest) {
  // 仅允许已登录用户调用(防止匿名滥用付费翻译)
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string | null;
    title_zh?: string | null;
    description?: string | null;
    description_zh?: string | null;
    features?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok
  }

  const localized = await localizeListing({
    title: body.title ?? null,
    title_zh: body.title_zh ?? null,
    description: body.description ?? null,
    description_zh: body.description_zh ?? null,
    features: Array.isArray(body.features) ? body.features.map((f) => String(f)) : [],
  });

  return NextResponse.json({ ok: true, localized });
}
