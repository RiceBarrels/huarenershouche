#!/usr/bin/env bun
/**
 * setup-source —— 幂等创建一个转载数据源的配套记录:
 * 系统账号(auth.users)+ profile + listing_sources + 已认证车行门店。
 * 等价于 supabase/listing-sources.sql 第 4 节里的一行,但走 service role,
 * 不用打开 Supabase SQL Editor。
 *
 *   bun scripts/setup-source.ts --key westcoastauto
 *   bun scripts/setup-source.ts --all      (全部站点,幂等)
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
  // 2026-09 全美华人车行调研批量接入
  {
    seq: 7,
    key: "topline168",
    name: "Topline Automotive",
    baseUrl: "https://www.topline168.com",
    phone: "(626) 572-8888",
    address: "840 E Garvey Ave, Monterey Park, CA 91755",
    zipcode: "91755",
    lat: 34.0627,
    lng: -118.1153,
    location: "Monterey Park, CA",
  },
  {
    seq: 8,
    key: "yesnewyork",
    name: "Yes Auto Inc",
    baseUrl: "https://www.yesnewyork.com",
    phone: "(718) 685-0168",
    address: "74-02 Queens Blvd, Elmhurst, NY 11373",
    zipcode: "11373",
    lat: 40.7397,
    lng: -73.8886,
    location: "Elmhurst, NY",
  },
  {
    seq: 10,
    key: "nysrauto",
    name: "SR Auto Group 纽约SR车行",
    baseUrl: "https://nysrauto.com",
    phone: "(516) 962-9399",
    address: "202-10 Northern Blvd, Bayside, NY 11361",
    zipcode: "11361",
    lat: 40.7624,
    lng: -73.7838,
    location: "Bayside, NY",
  },
  {
    seq: 11,
    key: "hautodeal",
    name: "East West Trust 华诚车行",
    baseUrl: "https://hautodeal.com",
    phone: "(909) 524-2699",
    address: "2700 N San Gabriel Blvd, Rosemead, CA 91770",
    zipcode: "91770",
    lat: 34.0608,
    lng: -118.0905,
    location: "Rosemead, CA",
  },
  {
    seq: 12,
    key: "fengauto",
    name: "Feng Auto Sales 亚洲车行",
    baseUrl: "https://fengauto.com",
    phone: "(773) 523-3388",
    address: "3290 S Archer Ave, Chicago, IL 60608",
    zipcode: "60608",
    lat: 41.8344,
    lng: -87.6722,
    location: "Chicago, IL",
  },
  {
    seq: 14,
    key: "sdautofinders",
    name: "San Diego Auto Finders",
    baseUrl: "https://www.sandiegoautofinders.com",
    phone: "(858) 279-6862",
    address: "4606 Convoy St, San Diego, CA 92111",
    zipcode: "92111",
    lat: 32.8233,
    lng: -117.1553,
    location: "San Diego, CA",
  },
  {
    seq: 17,
    key: "fjmotorgroup",
    name: "FJ Motor Group",
    baseUrl: "https://www.fjmotorgroup.com",
    phone: "(626) 787-6160",
    address: "7850 Garvey Ave, Rosemead, CA 91770",
    zipcode: "91770",
    lat: 34.0626,
    lng: -118.0878,
    location: "Rosemead, CA",
  },
  {
    seq: 18,
    key: "kopautoinc",
    name: "KOP Auto Inc. 靠谱汽车",
    baseUrl: "https://www.kopautoinc.com",
    phone: "(626) 542-3861",
    address: "10503 Garvey Ave, El Monte, CA 91733",
    zipcode: "91733",
    lat: 34.0636,
    lng: -118.0421,
    location: "El Monte, CA",
  },
  {
    seq: 19,
    key: "automaxsd",
    name: "Auto Max Inc.",
    baseUrl: "https://www.automaxsd.com",
    phone: "(619) 666-8383",
    address: "7990 Dagget St, San Diego, CA 92111",
    zipcode: "92111",
    lat: 32.8253,
    lng: -117.1475,
    location: "San Diego, CA",
  },
  {
    seq: 20,
    key: "nyautodepot",
    name: "纽约百车汇 New York Auto Depot",
    baseUrl: "https://www.nyautodepot.com",
    phone: "(631) 888-6331",
    address: "1849 Morris Ave, Union, NJ 07083",
    zipcode: "07083",
    lat: 40.6962,
    lng: -74.2638,
    location: "Union, NJ",
  },
  {
    seq: 21,
    key: "txdautogroup",
    name: "TXD Auto Group",
    baseUrl: "https://www.txdautogroup.com",
    phone: "(713) 900-9460",
    address: "9243 Clay Rd, Houston, TX 77080",
    zipcode: "77080",
    lat: 29.8286,
    lng: -95.5268,
    location: "Houston, TX",
  },
  {
    seq: 23,
    key: "autocac",
    name: "CAC Auto Group 友车哒",
    baseUrl: "https://autocac.com",
    phone: "(765) 471-0700",
    address: "3617 US Hwy 52 S, Lafayette, IN 47905",
    zipcode: "47905",
    lat: 40.379,
    lng: -86.843,
    location: "Lafayette, IN",
  },
  {
    seq: 28,
    key: "idealmotorgroup",
    name: "Ideal Motor Group",
    baseUrl: "https://idealmotorgroup.com",
    phone: "(626) 285-6628",
    address: "650 E Las Tunas Dr, San Gabriel, CA 91776",
    zipcode: "91776",
    lat: 34.1037,
    lng: -118.0955,
    location: "San Gabriel, CA",
  },
  {
    seq: 29,
    key: "lansdale",
    name: "Lansdale Speed Motor 速达车行",
    baseUrl: "https://www.lansdalespeed.com",
    phone: "(267) 222-8391",
    address: "1107 N Broad St, Lansdale, PA 19446",
    zipcode: "19446",
    lat: 40.253,
    lng: -75.294,
    location: "Lansdale, PA",
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
const all = args.includes("--all");
const selected = all ? SITES : SITES.filter((s) => s.key === key);
if (selected.length === 0) {
  console.error(`用法: bun scripts/setup-source.ts --all | --key <${SITES.map((s) => s.key).join("|")}>`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function setupSite(site: SiteSetup): Promise<void> {
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
}

for (const site of selected) await setupSite(site);
