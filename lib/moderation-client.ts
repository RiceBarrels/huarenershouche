// 发布成功后触发 AI 审核(/api/moderate,服务端 DeepSeek 判定)。
// 任何失败都静默放行:审核挂了绝不能挡住用户发布。

import { apiOrigin } from "@/lib/capacitor";

export type ModerationTarget = "car" | "post" | "car_comment" | "post_comment";

export async function requestModeration(
  targetType: ModerationTarget,
  targetId: string
): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const res = await fetch(`${apiOrigin()}/api/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
    });
    if (!res.ok) return { blocked: false };
    const json = (await res.json()) as { ok?: boolean; blocked?: boolean; reason?: string };
    return json?.ok && json.blocked
      ? { blocked: true, reason: json.reason }
      : { blocked: false };
  } catch {
    return { blocked: false };
  }
}
