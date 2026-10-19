// /api/translate-message — 私信消息按需翻译(私密内容,绝不进公开的 i18n 管线 / i18n_bundle)。
// POST {messageId, target},Authorization: Bearer <Supabase access token>(网页与 Capacitor 原生壳都带)。
// - 请求者必须是该消息所属会话的一方(本人,或认领了该车行账号的人),且不能是发送方:只译别人发给自己的消息 → 否则 403;
// - 原文已是目标语言 / 无语言信号(表情、链接)→ 直接返回原文(same),不调模型、不计额度;
// - 命中 message_translations 缓存 → 不调模型、不计额度;
// - 否则计一次额度(每人每小时 60 次,手动与自动共用 → 429),调模型(lib/chat-translate-server.ts),成功后写缓存。
// 没配 OPENROUTER_API_KEY 或 I18N_DRAIN_DISABLED=1 → 503 {error:"unavailable"}(客户端据此本会话隐藏翻译 UI)。
// supabase/message-translations.sql 未执行时:跳过缓存,限流退回单实例内存计数。

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sources/service-client";
import { dbLocale } from "@/lib/i18n";
import { isSiteLocale } from "@/lib/i18n/content-langs";
import { detectLang } from "@/lib/i18n/detect";
import { isMissingColumnError } from "@/lib/supabase-compat";
import type { TranslateMessageErrorCode, TranslateMessageResponse } from "@/lib/chat-translate-shared";
import {
  CHAT_TRANSLATE_MAX_CHARS,
  chatTranslateEnabled,
  hitChatTranslateLimit,
  readCachedTranslation,
  translateChatText,
  writeCachedTranslation,
} from "@/lib/chat-translate-server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Capacitor 原生壳与站点不同源,放开 CORS(鉴权靠 Bearer token,不用 cookie)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODEL_BUDGET_MS = 25_000; // 模型调用截止(start + 25 s,maxDuration 30)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function fail(status: number, error: TranslateMessageErrorCode, headers: Record<string, string> = {}) {
  return NextResponse.json({ ok: false, error }, { status, headers: { ...CORS_HEADERS, ...headers } });
}

function done(body: Omit<TranslateMessageResponse, "ok">) {
  const payload: TranslateMessageResponse = { ok: true, ...body };
  return NextResponse.json(payload, { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

interface ProfileRow {
  id: string;
  banned?: boolean | null;
  claimed_by?: string | null;
}

/** 请求者本人 + 会话双方的资料;claimed_by / banned 列缺失(对应 SQL 未执行)时退回只取 id */
async function loadProfiles(
  service: ReturnType<typeof createServiceClient>,
  ids: string[],
): Promise<ProfileRow[]> {
  const full = await service.from("profiles").select("id, banned, claimed_by").in("id", ids);
  if (!full.error) return (full.data as ProfileRow[] | null) ?? [];
  if (!isMissingColumnError(full.error)) throw full.error;
  const basic = await service.from("profiles").select("id").in("id", ids);
  if (basic.error) throw basic.error;
  return (basic.data as ProfileRow[] | null) ?? [];
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  if (!chatTranslateEnabled()) return fail(503, "unavailable");

  let body: { messageId?: unknown; target?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const messageId = typeof body.messageId === "string" && UUID_RE.test(body.messageId) ? body.messageId : null;
  // zh-hant 界面按 zh 翻译与缓存(message_translations.locale 只认数据库语言)
  const target = isSiteLocale(body.target) ? dbLocale(body.target) : null;
  if (!messageId || !target) return fail(400, "bad_request");

  const token = bearerToken(req);
  if (!token) return fail(401, "unauthorized");

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return fail(503, "unavailable");
  }

  try {
    const { data: userData, error: userErr } = await service.auth.getUser(token);
    const uid = userData?.user?.id;
    if (userErr || !uid) return fail(401, "unauthorized");

    const { data: msg, error: msgErr } = await service
      .from("messages")
      .select("id, conversation_id, sender_id, content")
      .eq("id", messageId)
      .maybeSingle();
    if (msgErr) throw msgErr;
    if (!msg) return fail(404, "not_found");
    const message = msg as { id: string; conversation_id: string; sender_id: string; content: string | null };

    const { data: conv, error: convErr } = await service
      .from("conversations")
      .select("buyer_id, seller_id")
      .eq("id", message.conversation_id)
      .maybeSingle();
    if (convErr) throw convErr;
    if (!conv) return fail(404, "not_found");
    const { buyer_id, seller_id } = conv as { buyer_id: string; seller_id: string };

    // 请求者能代表的会话一方:本人,或认领了该账号(与 RLS can_act_as 同口径)
    const profiles = await loadProfiles(service, [...new Set([uid, buyer_id, seller_id])]);
    if (profiles.find((p) => p.id === uid)?.banned) return fail(403, "forbidden");
    const actingAs = [buyer_id, seller_id].filter(
      (pid) => pid === uid || profiles.find((p) => p.id === pid)?.claimed_by === uid,
    );
    // 不是会话一方,或这条消息是自己(或自己代表的账号)发的 → 不译
    if (actingAs.length === 0 || actingAs.includes(message.sender_id)) return fail(403, "forbidden");

    const content = (message.content ?? "").trim();
    if (content.length > CHAT_TRANSLATE_MAX_CHARS) return fail(413, "too_long");

    // 同语言 / 无语言信号:返回原文。判不准的短拉丁文交给模型(模型照抄回来时同样按 same 返回)
    const detected = detectLang(content);
    if (!content || detected.lang === "und" || (detected.lang === target && !detected.ambiguous)) {
      return done({
        text: message.content ?? "",
        sourceLang: detected.lang === "und" ? null : detected.lang,
        cached: false,
        same: true,
      });
    }

    const cached = await readCachedTranslation(service, messageId, target);
    if (cached) return done({ text: cached.text, sourceLang: cached.sourceLang, cached: true, same: false });

    const limit = await hitChatTranslateLimit(service, uid);
    if (!limit.allowed) return fail(429, "rate_limited", { "Retry-After": String(limit.retryAfterSec) });

    const result = await translateChatText(content, target, start + MODEL_BUDGET_MS);
    if (!result.ok) return fail(result.error === "unavailable" ? 503 : 502, result.error);
    if (result.same) {
      return done({ text: message.content ?? "", sourceLang: result.sourceLang, cached: false, same: true });
    }
    await writeCachedTranslation(service, messageId, target, result.text, result.sourceLang);
    return done({ text: result.text, sourceLang: result.sourceLang, cached: false, same: false });
  } catch (err) {
    const detail = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
    console.error(`[translate-message] ${detail}`);
    return fail(502, "failed");
  }
}
