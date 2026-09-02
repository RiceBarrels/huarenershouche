#!/usr/bin/env bun
/**
 * setup-source —— 幂等创建一个转载数据源的配套记录:
 * 系统账号(auth.users)+ profile + listing_sources + 已认证车行门店。
 * 等价于 supabase/listing-sources.sql 第 4 节里的一行,但走 service role,
 * 不用打开 Supabase SQL Editor。
 *
 *   bun scripts/setup-source.ts --key westcoastauto
 *
 * 需要 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY。
 * 新站点:在下方 SITES 加一行(序号与 SQL 文件保持一致,UUID 尾号即序号)。
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

interface SiteSetup {
  seq: number;
  key: string;
  name: string;
  baseUrl: string;
  phone: string;
  address: string;
  zipcode: string;
  lat: number;
  lng: number;
  location: string;
}

// 与 supabase/listing-sources.sql 第 4 节 rows 一一对应
const SITES: SiteSetup[] = [
  {
    seq: 6,
    key: "westcoastauto",
    name: "Westcoast Auto Sales",
    baseUrl: "https://www.westcoastauto.com",
    phone: "(909) 900-0000",
    address: "5180 Holt Blvd, Montclair, CA 91763",
    zipcode: "91763",
    lat: 34.0723,
    lng: -117.6905,
    location: "Montclair, CA",
  },
];

const ROOT = join(import.meta.dir, "..");
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const keyIdx = args.indexOf("--key");
const key = keyIdx >= 0 ? args[keyIdx + 1] : undefined;
const site = SITES.find((s) => s.key === key);
if (!site) {
  console.error(`用法: bun scripts/setup-source.ts --key <${SITES.map((s) => s.key).join("|")}>`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const tail = String(site.seq).padStart(12, "0");
const sysUid = `c0000000-0000-0000-0000-${tail}`;
const sourceId = `d0000000-0000-0000-0000-${tail}`;
const storeId = `e0000000-0000-0000-0000-${tail}`;
const email = `system.${site.key}@clcauto.com`;

// 1. 系统账号(固定 UUID,与 SQL 版一致;已存在则复用)
const { data: existingUser } = await sb.auth.admin.getUserById(sysUid);
if (existingUser?.user) {
  console.log(`系统账号已存在: ${sysUid}`);
} else {
  const { error } = await sb.auth.admin.createUser({
    id: sysUid,
    email,
    email_confirm: true,
    user_metadata: { username: site.name },
  });
  if (error) throw new Error(`创建系统账号失败: ${error.message}`);
  console.log(`已创建系统账号: ${sysUid} (${email})`);
}

// 2. profile:系统账号 + 车行类型
const { error: pErr } = await sb.from("profiles").upsert({
  id: sysUid,
  username: site.name,
  phone: site.phone,
  location: site.location,
  account_type: "dealer",
  is_system: true,
  avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${site.key}`,
});
if (pErr) throw new Error(`写 profile 失败: ${pErr.message}`);

// 3. listing_sources(已存在则不动)
const { data: existingSource } = await sb.from("listing_sources").select("id").eq("key", site.key).maybeSingle();
if (existingSource) {
  console.log(`listing_sources[${site.key}] 已存在 (${existingSource.id})`);
} else {
  const { error } = await sb.from("listing_sources").insert({
    id: sourceId,
    key: site.key,
    name: site.name,
    base_url: site.baseUrl,
    enabled: true,
    system_account_id: sysUid,
  });
  if (error) throw new Error(`写 listing_sources 失败: ${error.message}`);
  console.log(`已创建 listing_sources[${site.key}]`);
}

// 4. 已认证门店(车辆定位跟随此地址;已存在则不动)
const { data: existingStore } = await sb.from("dealer_stores").select("id").eq("owner_id", sysUid).limit(1).maybeSingle();
if (existingStore) {
  console.log(`门店已存在 (${existingStore.id})`);
} else {
  const { error } = await sb.from("dealer_stores").insert({
    id: storeId,
    owner_id: sysUid,
    name: site.name,
    address: site.address,
    zipcode: site.zipcode,
    lat: site.lat,
    lng: site.lng,
    phone: site.phone,
    store_photos: [],
    verification_status: "verified",
    verification_reviewed_at: new Date().toISOString(),
  });
  if (error) throw new Error(`写 dealer_stores 失败: ${error.message}`);
  console.log(`已创建已认证门店: ${site.address}`);
}

console.log(`✅ ${site.name} 数据源就绪 —— 运行 bun scripts/sync-sources.ts --key ${site.key} 拉取车源`);
