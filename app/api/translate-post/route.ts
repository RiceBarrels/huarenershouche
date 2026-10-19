// /api/translate-post — 旧版原生 App 的兼容接口(只读,绝不调用模型)。
// 旧版本按需请求帖子(详情页单篇 postId,列表一批 postIds)在某个语种下的标题 / 正文。
// 现在只读 i18n_bundle,只返回已有校验过译文(ok)的帖子;原文已是该语种、不需要翻译的字段用原文补齐。
// 单篇没有译文时返回 translation_pending;批量里缺席的帖子由旧客户端标记为「显示原文」。

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { dbLocale, type Locale } from "@/lib/i18n";
import { isSiteLocale } from "@/lib/i18n/content-langs";
import type { BundleRow } from "@/lib/i18n/content/types";

export const dynamic = "force-dynamic";

// Capacitor 原生壳与站点不同源,放开 CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BATCH = 12; // 旧版列表卡片一批最多 12 篇
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PostI18n = { title: string | null; content: string | null };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** 已有译文的帖子 → { title, content };i18n_bundle 只返回公开帖子,RPC 失败(含 SQL 未执行)时为空 */
async function translatedPosts(ids: string[], locale: Locale): Promise<Record<string, PostI18n>> {
  const { data, error } = await supabase.rpc("i18n_bundle", { p_entity: "post", p_ids: ids, p_locale: dbLocale(locale) });
  const rows = error ? [] : ((data as BundleRow[] | null) ?? []).filter((r) => r.s === "ok" && r.f);
  if (rows.length === 0) return {};

  // 只翻了部分字段(如标题本来就是该语种)的帖子,另一个字段取原文
  const partial = rows.filter((r) => !r.f?.title || !r.f?.content).map((r) => r.id);
  const originals = new Map<string, { title: string | null; content: string | null }>();
  if (partial.length > 0) {
    const { data: posts } = await supabase.from("community_posts").select("id, title, content").in("id", partial);
    for (const p of posts ?? []) originals.set(p.id, { title: p.title, content: p.content });
  }
  const out: Record<string, PostI18n> = {};
  for (const r of rows) {
    const original = originals.get(r.id);
    out[r.id] = { title: r.f?.title || original?.title || null, content: r.f?.content || original?.content || null };
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: { postId?: string; postIds?: unknown; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const postId = typeof body.postId === "string" && UUID_RE.test(body.postId) ? body.postId : null;
  const postIds = Array.isArray(body.postIds)
    ? [...new Set(body.postIds.filter((v): v is string => typeof v === "string" && UUID_RE.test(v)))].slice(0, MAX_BATCH)
    : null;
  const locale = isSiteLocale(body.locale) ? body.locale : null;
  if ((!postId && !postIds?.length) || !locale) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: CORS_HEADERS });
  }

  // ---- 批量模式(社区列表卡片):{ i18n: { [postId]: { title, content } } },只含已有译文的帖子 ----
  if (postIds?.length) {
    return NextResponse.json({ ok: true, i18n: await translatedPosts(postIds, locale) }, { headers: CORS_HEADERS });
  }

  const single = postId ? (await translatedPosts([postId], locale))[postId] : undefined;
  if (!single) {
    return NextResponse.json({ ok: false, error: "translation_pending" }, { headers: CORS_HEADERS });
  }
  return NextResponse.json({ ok: true, i18n: single }, { headers: CORS_HEADERS });
}
