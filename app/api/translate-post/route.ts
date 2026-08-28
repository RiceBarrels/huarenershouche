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

const MAX_BATCH = 12; // 列表卡片批量翻译上限(每帖一次模型调用,防单请求过重)

export async function POST(req: NextRequest) {
  let body: { postId?: string; postIds?: unknown; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const postId = typeof body.postId === "string" ? body.postId : null;
  const postIds = Array.isArray(body.postIds)
    ? [...new Set(body.postIds.filter((v): v is string => typeof v === "string"))].slice(0, MAX_BATCH)
    : null;
  const locale = typeof body.locale === "string" ? body.locale : null;
  if ((!postId && !postIds?.length) || !locale || !(LOCALES as string[]).includes(locale)) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ---- 批量模式(社区列表卡片):返回 { i18n: { [postId]: { title, content } } } ----
  if (postIds?.length) {
    const supabase = createServiceClient();
    const { data: rows, error } = await supabase
      .from("community_posts")
      .select("id, title, content, other_i18n")
      .in("id", postIds)
      .eq("status", "active");
    if (error || !rows?.length) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    const result: Record<string, { title?: string | null; content?: string | null }> = {};
    const pending: typeof rows = [];
    for (const row of rows) {
      const cached = (row.other_i18n as Record<string, { title?: string | null; content?: string | null }> | null)?.[locale];
      if (cached?.content || cached?.title) result[row.id] = cached;
      else pending.push(row);
    }
    if (pending.length > 0 && isTranslationConfigured()) {
      // 帖子正文可能很长,逐帖翻译;3 路并发平衡时延与限流
      const CONCURRENCY = 3;
      for (let i = 0; i < pending.length; i += CONCURRENCY) {
        await Promise.all(
          pending.slice(i, i + CONCURRENCY).map(async (row) => {
            const translated = await translatePostInto(locale, {
              title: row.title || null,
              content: row.content || null,
            });
            if (!translated?.content && !translated?.title) return;
            result[row.id] = translated;
            await supabase
              .from("community_posts")
              .update({ other_i18n: { ...((row.other_i18n as object | null) ?? {}), [locale]: translated } })
              .eq("id", row.id);
          })
        );
      }
    }
    return NextResponse.json({ ok: true, i18n: result }, { headers: CORS_HEADERS });
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
