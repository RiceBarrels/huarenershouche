// /api/moderate — 发布 / 编辑后的快速通道:审核 + 立即翻译这一条内容。
// 客户端(网页与原生)在车辆 / 帖子 / 评论 / 问答 / 评价写库成功后调用;服务端按 id 取库里当前要审的全部文字送审
// (lib/i18n-pipeline/moderation.ts),结论按审核 hash 落库,同一版本只审一次。
// 影子模式(默认)只记录、不屏蔽;执行模式(moderation_enforce)违规内容由数据库屏蔽,这里返回 blocked=true。
// 未被屏蔽时用 after() 在响应之后立刻翻译这一条(drainEntity),其余交给每 2 分钟一次的 /api/i18n/drain;
// 与内容无关的审核失败(没配 key、审核预算用完、作者本小时送审次数已满、限流、上游故障…)时不做:翻译前还得先审,
// 交给 cron 重试。
// 审核绝不影响发布主流程:未配置、失败、SQL 未执行一律放行;同一 IP 每分钟最多 30 次(限流不可用时放行)。

import { after, NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { clientIp } from "@/lib/analytics/server";
import { moderateEntity } from "@/lib/i18n-pipeline/moderation";
import { drainEntity } from "@/lib/i18n-pipeline/worker";
import type { ModerationKind } from "@/lib/moderate";
import { createServiceClient } from "@/lib/sources/service-client";

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

const KINDS: ModerationKind[] = [
  "car",
  "post",
  "car_comment",
  "post_comment",
  "qa_question",
  "qa_answer",
  "dealer_review",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_LIMIT_PER_MIN = 30;
const MODERATION_BUDGET_MS = 25_000; // 审核同步完成的截止(start + 25 s)
const DRAIN_BUDGET_MS = 55_000; // after() 里翻译的截止(start + 55 s,maxDuration 60)

const pass = (extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, blocked: false, ...extra }, { headers: CORS_HEADERS });

export async function POST(req: NextRequest) {
  const start = Date.now();
  let body: { targetType?: string; targetId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const targetType = KINDS.includes(body.targetType as ModerationKind) ? (body.targetType as ModerationKind) : null;
  const targetId = typeof body.targetId === "string" && UUID_RE.test(body.targetId) ? body.targetId : null;
  if (!targetType || !targetId) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: CORS_HEADERS });
  }

  // 匿名可调:按 IP 限流(api_rate_hit 不可用时 checkRateLimit 自身放行;建不了 service client 也放行)
  try {
    const limit = await checkRateLimit(
      createServiceClient(),
      `moderate:${clientIp(req.headers) ?? "unknown"}`,
      RATE_LIMIT_PER_MIN,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  } catch (err) {
    console.warn(`[moderate] rate limit unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }

  const result = await moderateEntity(targetType, targetId, start + MODERATION_BUDGET_MS);
  if (result.verdict === "blocked") {
    return NextResponse.json(
      { ok: true, blocked: true, reason: result.reason ?? null, categories: result.categories ?? [] },
      { headers: CORS_HEADERS },
    );
  }
  // missing = 已删除或当前不公开:没有可翻译的;审核因与内容无关的原因没做成时不立刻再来一遍;
  // I18N_DRAIN_DISABLED=1(与 /api/i18n/drain 共用的紧急开关)时不翻译
  const unavailable = result.verdict === "error" && result.failure?.systemic === true;
  if (result.verdict !== "missing" && !unavailable && process.env.I18N_DRAIN_DISABLED !== "1") {
    after(async () => {
      try {
        await drainEntity(targetType, targetId, start + DRAIN_BUDGET_MS);
      } catch (err) {
        console.error(`[moderate] drain ${targetType} ${targetId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }
  return pass(result.verdict === "error" || result.verdict === "missing" ? { skipped: true } : {});
}
