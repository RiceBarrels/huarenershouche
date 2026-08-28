// /api/translate-post — 社区帖子按需 AI 翻译(X 式「已翻译 · 显示原文」)。
// 帖子只有原文(多为中文),非中文界面(en/ko)首次浏览时翻译并缓存进
// community_posts.other_i18n;命中缓存直接返回,不重复花翻译费。

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sources/service-client";
import { translatePostInto, isTranslationConfigured } from "@/lib/translate";
import { LOCALES } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Capacitor 原生壳与站点不同源,放开 CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: { postId?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const postId = typeof body.postId === "string" ? body.postId : null;
  const locale = typeof body.locale === "string" ? body.locale : null;
  if (!postId || !locale || locale === "zh" || !(LOCALES as string[]).includes(locale)) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const supabase = createServiceClient();
  const { data: post, error } = await supabase
    .from("community_posts")
    .select("id, title, content, other_i18n")
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !post) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const cached = (post.other_i18n as Record<string, { content?: string | null }> | null)?.[locale];
  if (cached?.content) {
    return NextResponse.json({ ok: true, i18n: cached, cached: true }, { headers: CORS_HEADERS });
  }

  if (!isTranslationConfigured()) {
    return NextResponse.json(
      { ok: false, error: "translation_not_configured" },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const translated = await translatePostInto(locale, {
    title: post.title || null,
    content: post.content || null,
  });
  if (!translated?.content && !translated?.title) {
    return NextResponse.json(
      { ok: false, error: "translation_failed" },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const merged = { ...((post.other_i18n as object | null) ?? {}), [locale]: translated };
  // 写缓存失败不影响本次返回(下个用户会再翻一次)
  await supabase.from("community_posts").update({ other_i18n: merged }).eq("id", postId);

  return NextResponse.json({ ok: true, i18n: translated, cached: false }, { headers: CORS_HEADERS });
}
