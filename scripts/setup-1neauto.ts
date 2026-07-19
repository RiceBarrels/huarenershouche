#!/usr/bin/env bun
/**
 * setup-1neauto —— 幂等创建 1neAuto 数据源(系统账号 + profile + listing_sources)。
 * 直接对 .env.local 指向的库执行(service role)。跑一次即可,之后用同步引擎拉车。
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) throw new Error("缺少 SUPABASE 环境变量");
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const KEY = "1neauto";
const EMAIL = "system.1neauto@clcauto.com";
const NAME = "1neAuto";
const BASE_URL = "https://1neauto.com";

// 已存在则直接退出
const { data: existing } = await sb.from("listing_sources").select("id, system_account_id").eq("key", KEY).maybeSingle();
if (existing) {
  console.log(`listing_sources[${KEY}] 已存在 (system_account_id=${existing.system_account_id}),跳过。`);
  process.exit(0);
}

// 建系统账号(新数据源,直接创建;若已存在则从分页里找)
let uid: string | null = null;
const { data: created, error: cErr } = await sb.auth.admin.createUser({
  email: EMAIL,
  email_confirm: true,
  user_metadata: { username: NAME },
});
if (created?.user) {
  uid = created.user.id;
  console.log("已创建系统账号:", uid);
} else {
  console.log("createUser 未成功(可能已存在):", cErr?.message, "—— 尝试分页查找");
  for (let page = 1; page <= 30 && !uid; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 50 });
    if (error) throw new Error(`listUsers 失败: ${error.message}`);
    const u = data.users.find((x) => x.email === EMAIL);
    if (u) uid = u.id;
    if (data.users.length < 50) break;
  }
  if (!uid) throw new Error("无法创建或找到系统账号");
  console.log("复用已有系统账号:", uid);
}

// profile(系统账号、车行类型)
const { error: pErr } = await sb.from("profiles").upsert({
  id: uid,
  username: NAME,
  location: "New York, NY",
  account_type: "dealer",
  is_system: true,
  avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${KEY}`,
});
if (pErr) throw new Error(`写 profile 失败: ${pErr.message}`);

// listing_sources
const { error: sErr } = await sb.from("listing_sources").insert({
  key: KEY,
  name: NAME,
  base_url: BASE_URL,
  enabled: true,
  system_account_id: uid,
});
if (sErr) throw new Error(`写 listing_sources 失败: ${sErr.message}`);

console.log(`✅ 1neAuto 数据源已就绪 (key=${KEY}, system_account_id=${uid})`);
