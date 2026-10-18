// /api/translate-comments — 旧版原生 App 的兼容接口(只读,绝不调用模型)。
// 旧版本按需请求一批评论(社区帖评论 kind=post / 车源评论 kind=car)在某个语种下的正文。
// 现在只读 i18n_bundle,返回已有校验过译文(ok)的评论 { id: { content } };缺席的评论由旧客户端回退显示原文。

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isSiteLocale } from "@/lib/i18n/content-langs";
import type { BundleRow } from "@/lib/i18n/content/types";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_IDS = 40; // 单次请求上限
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: { kind?: string; ids?: unknown; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  // kind → 翻译管线的实体类型(白名单)
  const entity = body.kind === "post" ? "post_comment" : body.kind === "car" ? "car_comment" : null;
  const locale = isSiteLocale(body.locale) ? body.locale : null;
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((v): v is string => typeof v === "string" && UUID_RE.test(v)))].slice(0, MAX_IDS)
    : [];
  if (!entity || !locale || ids.length === 0) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: CORS_HEADERS });
  }

  // i18n_bundle 只返回公开评论;RPC 失败(含 SQL 未执行)时按「还没有译文」返回空表
  const { data, error } = await supabase.rpc("i18n_bundle", { p_entity: entity, p_ids: ids, p_locale: locale });
  const result: Record<string, { content: string }> = {};
  for (const row of error ? [] : ((data as BundleRow[] | null) ?? [])) {
    const content = row.s === "ok" ? row.f?.content : undefined;
    if (content) result[row.id] = { content };
  }
  return NextResponse.json({ ok: true, i18n: result }, { headers: CORS_HEADERS });
}
