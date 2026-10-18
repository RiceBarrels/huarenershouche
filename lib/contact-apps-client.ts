// 卖家即时通讯联系方式的客户端读写(浏览器 / 原生壳)。纯规则见 lib/contact-apps.ts。
//
// 数据在 public.profile_contact_apps(supabase/contact-apps.sql),anon / authenticated 没有表权限:
// - 读:RPC get_contact_apps(target),必须已登录(未登录返回 null),一次一个账号;
// - 写:只能经 /api/contact-apps(服务端校验 + 鉴权 + 限流 + AI 审核后用 service role 写入),客户端没有直写路径。
// 代码先于 SQL 上线:RPC 不存在 → available = false,调用方隐藏填写入口 / 不显示按钮;
// 接口回 not_ready(表不存在)→ unavailable,调用方静默跳过,不影响发布等主流程。

import { supabase } from "@/lib/supabase";
import { apiOrigin } from "@/lib/capacitor";
import { parseContactApps, type ContactApps } from "@/lib/contact-apps";

export interface LoadedContactApps {
  /** false = SQL 还没执行或读取失败:不展示该功能 */
  available: boolean;
  apps: ContactApps;
}

/** 取某账号的联系方式(只在已登录时调用;公开载荷里永远不带) */
export async function loadContactApps(profileId: string): Promise<LoadedContactApps> {
  try {
    const { data, error } = await supabase.rpc("get_contact_apps", { target: profileId });
    if (error) return { available: false, apps: {} };
    return { available: true, apps: parseContactApps(data) };
  } catch {
    return { available: false, apps: {} };
  }
}

export type SaveContactAppsResult =
  | { status: "saved" }
  /** 未通过审核:服务端没写入新值,并已清空该账号的联系方式 */
  | { status: "blocked" }
  /** SQL 未执行:静默跳过 */
  | { status: "unavailable" }
  /** 送审过于频繁(每人每小时上限),没有保存 */
  | { status: "rate_limited" }
  | { status: "error"; message: string };

/**
 * 整体覆盖写入(apps 须已经 normalizeContactApps 规范化;{} = 清空),服务端审核通过后才落库。
 * profileId 用当前操作身份 actingId:切换成车行时写到车行账号(服务端按 claimed_by 复核)。
 */
export async function saveContactApps(profileId: string, apps: ContactApps): Promise<SaveContactAppsResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { status: "error", message: "unauthorized" };
    const res = await fetch(`${apiOrigin()}/api/contact-apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ profileId, apps }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; status?: string; error?: string } | null;
    if (res.ok && json?.ok) return json.status === "blocked" ? { status: "blocked" } : { status: "saved" };
    if (json?.error === "not_ready") return { status: "unavailable" };
    if (res.status === 429) return { status: "rate_limited" };
    return { status: "error", message: json?.error ?? `HTTP ${res.status}` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
