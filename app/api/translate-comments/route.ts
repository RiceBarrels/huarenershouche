// /api/translate-comments — 评论批量按需翻译(社区帖评论 post_comments / 车源评论 comments)。
// 一次请求带一批评论 id:命中 other_i18n 缓存的直接取,未命中的合并成
// 一次模型调用批量翻译,写回各行缓存后统一返回 { id: { content } }。

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sources/service-client";
import { translateTextsInto, isTranslationConfigured } from "@/lib/translate";
import { LOCALES } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// kind → 实际表名(白名单,防任意表注入)
const TABLES: Record<string, string> = {
  post: "post_comments",
  car: "comments",
};

const MAX_IDS = 40; // 单次请求上限
const CHUNK = 25; // 单次模型调用的评论条数上限

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
  const table = TABLES[body.kind ?? ""];
  const locale = typeof body.locale === "string" ? body.locale : null;
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((v): v is string => typeof v === "string"))].slice(0, MAX_IDS)
    : [];
  if (!table || !locale || !(LOCALES as string[]).includes(locale) || ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, content, other_i18n")
    .in("id", ids);
  if (error || !rows?.length) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const result: Record<string, { content: string }> = {};
  const pending: { id: string; content: string; other: object }[] = [];
  for (const row of rows) {
    const cached = (row.other_i18n as Record<string, { content?: string | null }> | null)?.[locale];
    if (cached?.content) {
      result[row.id] = { content: cached.content };
    } else if (typeof row.content === "string" && row.content.trim()) {
      pending.push({ id: row.id, content: row.content, other: (row.other_i18n as object | null) ?? {} });
    }
  }

  if (pending.length > 0 && isTranslationConfigured()) {
    for (let i = 0; i < pending.length; i += CHUNK) {
      const chunk = pending.slice(i, i + CHUNK);
      const translated = await translateTextsInto(
        locale,
        Object.fromEntries(chunk.map((c) => [c.id, c.content]))
      );
      if (!translated) continue; // 本批失败:这批评论回退原文,不影响其余
      await Promise.all(
        chunk.map(async (c) => {
          const v = translated[c.id];
          if (!v) return;
          result[c.id] = { content: v };
          // 写缓存失败不影响返回
          await supabase
            .from(table)
            .update({ other_i18n: { ...c.other, [locale]: { content: v } } })
            .eq("id", c.id);
        })
      );
    }
  }

  return NextResponse.json({ ok: true, i18n: result }, { headers: CORS_HEADERS });
}
