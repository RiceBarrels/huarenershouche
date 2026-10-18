// Public API:卖家即时通讯联系方式(public.profile_contact_apps)批量读取。
// 只在带 key 的请求里调用(匿名请求一律给 null,与 phone / wechat 同一脱敏规则,见 serialize.ts)。
// ctx.supabase 为 service role(该表对 anon / authenticated 无表权限)。
// 表还不存在(supabase/contact-apps.sql 未执行)或查询失败时返回空 Map,序列化成 {},绝不让详情 / 门店接口报错。

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseContactApps, type ContactApps } from "@/lib/contact-apps";

let warnedOnce = false;

/** 表 / 列不存在(42P01、PGRST205、42703、PGRST204):SQL 未执行,静默降级 */
function isMissingRelationError(err: { code?: string; message?: string }): boolean {
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    err.code === "42703" ||
    err.code === "PGRST204" ||
    /does not exist|could not find the table/i.test(err.message ?? "")
  );
}

export async function fetchContactApps(
  supabase: SupabaseClient,
  profileIds: readonly string[],
): Promise<Map<string, ContactApps>> {
  const out = new Map<string, ContactApps>();
  const ids = Array.from(new Set(profileIds.filter(Boolean)));
  if (ids.length === 0) return out;
  try {
    const { data, error } = await supabase.from("profile_contact_apps").select("profile_id, apps").in("profile_id", ids);
    if (error) {
      if (!isMissingRelationError(error) && !warnedOnce) {
        warnedOnce = true;
        console.warn(`[api/v1] contact_apps lookup failed: ${error.message}`);
      }
      return out;
    }
    for (const row of (data ?? []) as { profile_id: string; apps?: unknown }[]) {
      out.set(row.profile_id, parseContactApps(row.apps));
    }
  } catch {
    /* 同上:降级为空 */
  }
  return out;
}
