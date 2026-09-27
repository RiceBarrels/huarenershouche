// AI 内容审核 —— 服务端专用(经 OpenRouter 调用 DeepSeek,纯文本)。
// 绝不要在客户端组件里 import:OPENROUTER_API_KEY 必须留在服务端。
//
// moderateContent() 把文本交给模型按社区规范判定(模型不支持图片时图片被忽略);
// 只在明确违规时返回 violation=true,拿不准一律放行(误杀比漏杀伤害大)。
// 未配置 OPENROUTER_API_KEY 或调用失败时返回 null:调用方视为放行。

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// 2026-09 起全站统一用 DeepSeek V4 Flash。该模型只收文本:图片不送审,
// 纯图片无文字的内容直接放行。要恢复图片审核可换 deepseek-v4-flash-vision-exp 并把下面开关打开。
export const MODERATION_MODEL = "deepseek/deepseek-v4-flash-0731";
const MODERATION_SUPPORTS_IMAGES = false;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;
const MAX_IMAGES = 3;
const MAX_TEXT_CHARS = 6000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ModerationKind = "car" | "post" | "car_comment" | "post_comment";

export interface ModerationVerdict {
  violation: boolean;
  categories: string[];
  reason: string | null;
}

export function isModerationConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

const KIND_LABELS: Record<ModerationKind, string> = {
  car: "二手车车辆列表(卖家发布)",
  post: "社区帖子",
  car_comment: "车辆页评论",
  post_comment: "社区帖子评论",
};

const SYSTEM_PROMPT = `你是北美华人二手车平台「常來車網」的内容审核员。根据以下社区规范判定用户提交的内容是否违规:

1. illegal — 违法内容:毒品、武器、赃车或无合法手续的车辆、伪造证件/里程表、其他违法交易
2. scam — 诈骗:钓鱼链接、假冒官方、明显的定金/转账诈骗套路、传销或资金盘
3. sexual — 色情或露骨性暗示内容
4. violence — 暴力、血腥、恐吓、鼓励自残
5. hate — 仇恨言论、种族/地域歧视、对他人的骚扰或严重人身攻击
6. privacy — 未经同意曝光他人隐私(住址、证件、电话等人肉信息)
7. spam — 与二手车/汽车生活完全无关的垃圾广告、刷屏、恶意导流

判定原则:只拦截明确违规的内容。正常的买卖车、议价、吐槽、批评、争论、留联系方式卖自己的车都不算违规。拿不准时一律 violation=false。

只输出一个原始 JSON 对象,无 markdown、无代码块、无多余文字:
{"violation": true|false, "categories": ["scam"], "reason": "一句简体中文说明"}
violation=false 时 categories 为空数组、reason 为 null。`;

// 从模型返回里提取 JSON 对象(容忍 ```json 代码块或前后多余文字)
function extractJson(text: string | null | undefined): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);

export async function moderateContent(
  kind: ModerationKind,
  text: string,
  imageUrls: string[] = []
): Promise<ModerationVerdict | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const trimmed = text.trim().slice(0, MAX_TEXT_CHARS);
  const images = MODERATION_SUPPORTS_IMAGES
    ? imageUrls.filter((u) => u && !isVideoUrl(u)).slice(0, MAX_IMAGES)
    : [];
  if (!trimmed && images.length === 0) return null;
  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    { type: "text", text: `内容类型:${KIND_LABELS[kind]}\n\n内容:\n${trimmed || "(无文字,仅图片)"}` },
    ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODERATION_MODEL,
          // 关闭默认推理:审核只需分类,推理会把延迟拉到数十秒(见 lib/translate.ts ROUTING)
          reasoning: { enabled: false },
          provider: { sort: "throughput" },
          max_tokens: 500,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        return null;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const parsed = extractJson(json.choices?.[0]?.message?.content);
      if (!parsed || typeof parsed.violation !== "boolean") return null;
      return {
        violation: parsed.violation,
        categories: Array.isArray(parsed.categories)
          ? parsed.categories.filter((c): c is string => typeof c === "string").slice(0, 5)
          : [],
        reason: typeof parsed.reason === "string" && parsed.reason.trim() ? parsed.reason.trim() : null,
      };
    } catch {
      await sleep(800 * (attempt + 1));
    }
  }
  return null;
}
