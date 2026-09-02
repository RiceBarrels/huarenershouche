// /api/moderate — 发布后 AI 审核(Gemini 经 OpenRouter,见 lib/moderate.ts)。
// 客户端在车辆/帖子/评论 insert 成功后调用;服务端按 id 从库里重新取内容送审,
// 判定违规则先写 ai_moderation 记录、再自动屏蔽
// (cars→removed / community_posts→hidden / 评论→blocked),
// 管理后台「AI 审核」tab 复核:恢复或确认(supabase/ai-moderation.sql)。
// 审核绝不影响发布主流程:未配置、失败、表不存在一律放行。

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sources/service-client";
import {
  moderateContent,
  isModerationConfigured,
  MODERATION_MODEL,
  type ModerationKind,
} from "@/lib/moderate";

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

const KINDS: ModerationKind[] = ["car", "post", "car_comment", "post_comment"];

const pass = (extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, blocked: false, ...extra }, { headers: CORS_HEADERS });

export async function POST(req: NextRequest) {
  let body: { targetType?: string; targetId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const targetType = KINDS.includes(body.targetType as ModerationKind)
    ? (body.targetType as ModerationKind)
    : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : null;
  if (!targetType || !targetId) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (!isModerationConfigured()) return pass({ skipped: true });

  const supabase = createServiceClient();

  // 按类型取待审文本 + 图片(评论无图)
  let text = "";
  let images: string[] = [];
  let userId: string | null = null;
  if (targetType === "car") {
    const { data } = await supabase
      .from("cars")
      .select("id, seller_id, title, title_zh, description, description_zh, features, image_url, images, status")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return pass({ skipped: true });
    userId = data.seller_id;
    text = [
      data.title_zh || data.title,
      data.description_zh,
      data.description,
      (data.features as string[] | null)?.join(" · "),
    ]
      .filter(Boolean)
      .join("\n\n");
    images = [data.image_url, ...((data.images as string[] | null) ?? [])].filter(
      (u): u is string => Boolean(u)
    );
  } else if (targetType === "post") {
    const { data } = await supabase
      .from("community_posts")
      .select("id, user_id, title, content, tags, images, status")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return pass({ skipped: true });
    userId = data.user_id;
    text = [data.title, data.content, (data.tags as string[] | null)?.join(" #")]
      .filter(Boolean)
      .join("\n\n");
    images = ((data.images as string[] | null) ?? []).filter(Boolean);
  } else {
    const table = targetType === "car_comment" ? "comments" : "post_comments";
    const { data } = await supabase
      .from(table)
      .select("id, user_id, content")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return pass({ skipped: true });
    userId = data.user_id;
    text = data.content ?? "";
  }

  const verdict = await moderateContent(targetType, text, images);
  if (!verdict || !verdict.violation) return pass();

  // 先落 ai_moderation 记录:记录失败(如 SQL 未执行)则不屏蔽,
  // 避免内容被拦却没有任何管理员可见的痕迹
  const { error: flagError } = await supabase.from("ai_moderation").upsert(
    {
      target_type: targetType,
      target_id: targetId,
      user_id: userId,
      content: text.slice(0, 4000),
      categories: verdict.categories,
      reason: verdict.reason,
      model: MODERATION_MODEL,
      status: "pending",
    },
    { onConflict: "target_type,target_id" }
  );
  if (flagError) {
    console.error("[moderate] flag insert failed:", flagError.message);
    return pass({ skipped: true });
  }

  if (targetType === "car") {
    await supabase.from("cars").update({ status: "removed" }).eq("id", targetId);
  } else if (targetType === "post") {
    await supabase.from("community_posts").update({ status: "hidden" }).eq("id", targetId);
  } else {
    const table = targetType === "car_comment" ? "comments" : "post_comments";
    await supabase.from(table).update({ status: "blocked" }).eq("id", targetId);
  }

  return NextResponse.json(
    { ok: true, blocked: true, reason: verdict.reason, categories: verdict.categories },
    { headers: CORS_HEADERS }
  );
}
