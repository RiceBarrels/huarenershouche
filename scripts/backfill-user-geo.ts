#!/usr/bin/env bun
/**
 * backfill-user-geo —— 按 auth.sessions 里最近一次会话的 IP,给历史用户补全 IP 地区(public.user_ip_geo)。
 * 上线后的新数据由 analytics_events 触发器按 Vercel 边缘地理头实时写入(source = edge);
 * 本脚本只补此前的老用户(source = backfill),edge 行永不覆盖。只存国家 / 州省 / 城市,不存 IP。
 *
 *   bun scripts/backfill-user-geo.ts                    只补 user_ip_geo 里还没有记录的用户
 *   bun scripts/backfill-user-geo.ts --dry-run          只查不写,打印将写入的结果
 *   bun scripts/backfill-user-geo.ts --all              已有 backfill 行也按最新会话 IP 重算(edge 行仍跳过)
 *   bun scripts/backfill-user-geo.ts --lookup 8.8.8.8   调试:只查 IP 库、不连 Supabase(可重复,或逗号分隔多个)
 *
 * 需要 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,并已在 SQL Editor 执行
 * supabase/analytics.sql(user_ip_geo 表 + 仅 service_role 可调用的 analytics_user_session_ips())。
 *
 * IP 库:DB-IP「IP to City Lite」免费版,每月 1 号更新;下载当月版(未发布则用上月版),
 * 解压后缓存在系统临时目录的 clcauto-dbip/ 下。库里州省只有英文名:美国 / 加拿大映射成
 * ISO 3166-2 代码(NY、ON,与 Vercel x-vercel-ip-country-region 一致),其他国家 region 留空。
 *
 * IP geolocation by DB-IP (https://db-ip.com), CC BY 4.0
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { createGunzip } from "zlib";
import { createClient, type GoTrueAdminApi, type PostgrestError } from "@supabase/supabase-js";
import { Reader, type CityResponse } from "mmdb-lib";
import type { DbUserIpGeo } from "@/lib/types";

const ROOT = join(import.meta.dirname, "..");
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const USAGE = "用法: bun scripts/backfill-user-geo.ts [--dry-run] [--all] | --lookup <ip>[,<ip>…]";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const dryRun = args.includes("--dry-run");
const all = args.includes("--all");
const lookups: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run" || a === "--all") continue;
  const v = a === "--lookup" ? args[++i] : a.startsWith("--lookup=") ? a.slice("--lookup=".length) : undefined;
  if (!v || v.startsWith("--")) {
    console.error(USAGE);
    process.exit(1);
  }
  lookups.push(...v.split(",").map((s) => s.trim()).filter(Boolean));
}

// ---------- DB-IP 库:下载 / 缓存 / 打开 ----------

const DBIP_DIR = join(tmpdir(), "clcauto-dbip");

/** "2026-10"(DB-IP 按 UTC 月份发布) */
function monthTag(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 下载并解压某月版到 dest(先写 .part 再改名,中断不留半截文件);该月未发布(404)返回 false */
async function downloadDbIp(tag: string, dest: string): Promise<boolean> {
  const url = `https://download.db-ip.com/free/dbip-city-lite-${tag}.mmdb.gz`;
  const res = await fetch(url);
  if (res.status === 404) return false;
  if (!res.ok || !res.body) throw new Error(`下载失败 HTTP ${res.status}: ${url}`);
  const size = Number(res.headers.get("content-length")) || 0;
  console.log(`下载 ${url}${size ? `(${(size / 1048576).toFixed(1)} MB)` : ""}…`);
  const part = `${dest}.${process.pid}.part`;
  try {
    await pipeline(Readable.fromWeb(res.body as unknown as NodeReadableStream), createGunzip(), createWriteStream(part));
    renameSync(part, dest);
  } catch (err) {
    rmSync(part, { force: true });
    throw err;
  }
  return true;
}

/** 本地库文件:当月版 → 上月版,已缓存的直接用;下载到新版后清掉其他月份的缓存 */
async function ensureDbIp(): Promise<{ file: string; tag: string }> {
  mkdirSync(DBIP_DIR, { recursive: true });
  const now = new Date();
  const tags = [monthTag(now), monthTag(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)))];
  let lastErr: unknown = null;
  for (const tag of tags) {
    const file = join(DBIP_DIR, `dbip-city-lite-${tag}.mmdb`);
    if (existsSync(file) && statSync(file).size > 0) return { file, tag };
    try {
      if (await downloadDbIp(tag, file)) {
        for (const name of readdirSync(DBIP_DIR)) {
          const p = join(DBIP_DIR, name);
          if (p !== file && /^dbip-city-lite-\d{4}-\d{2}\.mmdb$/.test(name)) rmSync(p, { force: true });
        }
        return { file, tag };
      }
      console.log(`DB-IP ${tag} 版尚未发布(404)`);
    } catch (err) {
      lastErr = err;
      console.warn(err instanceof Error ? err.message : String(err));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("没有可用的 DB-IP 库");
}

async function openDbIp(): Promise<{ reader: Reader<CityResponse>; tag: string }> {
  const { file, tag } = await ensureDbIp();
  try {
    return { reader: new Reader<CityResponse>(readFileSync(file)), tag };
  } catch (err) {
    rmSync(file, { force: true });
    throw new Error(`IP 库文件损坏,已删除缓存,请重跑(${err instanceof Error ? err.message : String(err)})`);
  }
}

// ---------- IP 解析与过滤(mmdb-lib 不校验输入,非法串会走出错误结果,必须先过这里) ----------

/** "1.2.3.4" → [1, 2, 3, 4];非法返回 null */
function parseIpv4(s: string): number[] | null {
  const parts = s.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return parts.map(Number);
}

/** IPv6(支持 :: 压缩与末尾点分 IPv4)→ 16 字节;非法返回 null */
function parseIpv6(s: string): number[] | null {
  let rest = s;
  let tail: number[] = [];
  if (rest.includes(".")) {
    // 末尾点分 IPv4(::ffff:1.2.3.4)先拆成 4 字节,其余按 6 组解析
    const i = rest.lastIndexOf(":");
    const v4 = parseIpv4(rest.slice(i + 1));
    if (!v4) return null;
    tail = v4;
    rest = rest.slice(0, rest[i - 1] === ":" ? i + 1 : i);
  }
  const halves = rest.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const zeros = (tail.length ? 6 : 8) - left.length - right.length;
  if (halves.length === 2 ? zeros < 1 : zeros !== 0) return null;
  const groups = [...left, ...Array<string>(Math.max(zeros, 0)).fill("0"), ...right];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return [...groups.flatMap((g) => [parseInt(g, 16) >> 8, parseInt(g, 16) & 0xff]), ...tail];
}

function parseIp(s: string): number[] | null {
  return s.includes(":") ? parseIpv6(s) : parseIpv4(s);
}

/** 去掉 %zone 与 /掩码(inet::text 会带 /32) */
function cleanIp(raw: string): string {
  return raw.trim().replace(/%.*$/, "").replace(/\/\d{1,3}$/, "");
}

interface Cidr {
  bytes: number[];
  bits: number;
}

function cidr(s: string): Cidr {
  const [addr, bits] = s.split("/");
  const bytes = parseIp(addr);
  if (!bytes) throw new Error(`非法网段 ${s}`);
  return { bytes, bits: Number(bits) };
}

function inCidr(ip: number[], c: Cidr): boolean {
  if (ip.length !== c.bytes.length) return false;
  for (let bit = 0; bit < c.bits; bit += 8) {
    const mask = (0xff << (8 - Math.min(8, c.bits - bit))) & 0xff;
    if ((ip[bit >> 3] & mask) !== (c.bytes[bit >> 3] & mask)) return false;
  }
  return true;
}

// 无法定位的 IPv4(IANA 特殊用途地址):本网 / 私有 / CGNAT / 回环 / 链路本地 / 协议保留 / 文档 /
// 6to4 中继 / 基准测试 / 组播 / 保留与广播
const V4_SPECIAL = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12",
  "192.0.0.0/24", "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15",
  "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
].map(cidr);
// IPv6 只认全球单播 2000::/3(已排除 ::、::1、fc00::/7、fe80::/10、ff00::/8 等),
// 再去掉其中的协议保留(含 Teredo)/ 文档段
const V6_GLOBAL = cidr("2000::/3");
const V6_SPECIAL = ["2001::/23", "2001:db8::/32", "3fff::/20"].map(cidr);
// 内嵌 IPv4 的 IPv6 按内嵌 IPv4 判断与查询:[网段, IPv4 起始字节]
// IPv4 映射 ::ffff:a.b.c.d 与 NAT64 64:ff9b::a.b.c.d 在末 4 字节;6to4 2002:aabb:ccdd:: 在第 2–5 字节
const V6_EMBEDDED_V4: [Cidr, number][] = [
  [cidr("::ffff:0:0/96"), 12],
  [cidr("64:ff9b::/96"), 12],
  [cidr("2002::/16"), 2],
];

/** 规范化成可查库的公网 IP;私有 / 保留 / 非法地址返回 null */
function publicIp(raw: string): string | null {
  const bytes = parseIp(cleanIp(raw));
  if (!bytes) return null;
  if (bytes.length === 4) return V4_SPECIAL.some((c) => inCidr(bytes, c)) ? null : bytes.join(".");
  const embedded = V6_EMBEDDED_V4.find(([c]) => inCidr(bytes, c));
  if (embedded) return publicIp(bytes.slice(embedded[1], embedded[1] + 4).join("."));
  if (!inCidr(bytes, V6_GLOBAL) || V6_SPECIAL.some((c) => inCidr(bytes, c))) return null;
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  return groups.join(":");
}

/** 日志只露网段:73.12.x.x / 2600:1700:abcd:… */
function maskIp(ip: string | null): string {
  if (!ip) return "(无 IP)";
  if (ip.includes(":")) return `${ip.split(":").slice(0, 3).join(":")}:…`;
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : ip;
}

// ---------- 地区映射 ----------

// DB-IP 州省只有英文名(名称已对照 2026-10 版全库核对):美国 / 加拿大映射为 ISO 3166-2 代码(不含国家前缀)
const REGION_CODES: Record<string, Record<string, string>> = {
  US: {
    Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
    Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA",
    Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY",
    Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
    Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
    "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
    Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
    Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
    // 海外属地(DB-IP 一般给独立国家码,以防万一)
    "American Samoa": "AS", Guam: "GU", "Northern Mariana Islands": "MP", "Puerto Rico": "PR",
    "U.S. Virgin Islands": "VI", "United States Virgin Islands": "VI", "United States Minor Outlying Islands": "UM",
  },
  CA: {
    Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL", Newfoundland: "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
    Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC", Saskatchewan: "SK",
    Yukon: "YT", "Yukon Territory": "YT",
  },
};

/** 州省名归一化:去重音(Québec)、小写、& → and、只留字母数字 */
function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const REGION_LOOKUP = new Map<string, string>(
  Object.entries(REGION_CODES).flatMap(([country, names]) =>
    Object.entries(names).map(([name, code]): [string, string] => [`${country}|${normName(name)}`, code])
  )
);

/** 库里有 ISO 代码就用(去掉 "US-" 前缀),否则美国 / 加拿大按名称映射,其他国家为 null */
function regionCode(
  country: string,
  sub: { iso_code?: string; names?: { en?: string } } | undefined
): string | null {
  const iso = sub?.iso_code?.trim().toUpperCase().replace(/^[A-Z]{2}-/, "");
  if (iso && /^[A-Z0-9]{1,3}$/.test(iso)) return iso;
  const name = sub?.names?.en;
  return (name && REGION_LOOKUP.get(`${country}|${normName(name)}`)) || null;
}

/** "Toronto (Old Toronto)" → "Toronto":去掉 DB-IP 附加的街区说明,与 Vercel 城市粒度一致 */
function cityName(raw: string | undefined): string | null {
  const s = raw?.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return s ? s.slice(0, 100) : null;
}

type IpGeo = Pick<DbUserIpGeo, "country" | "region" | "city">;

function lookupGeo(reader: Reader<CityResponse>, ip: string): (IpGeo & { country: string }) | null {
  const rec = reader.get(ip);
  const country = rec?.country?.iso_code?.toUpperCase();
  if (!rec || !country || !/^[A-Z]{2}$/.test(country) || country === "ZZ") return null;
  return { country, region: regionCode(country, rec.subdivisions?.[0]), city: cityName(rec.city?.names?.en) };
}

/** "Flushing, NY · US" */
function geoLabel(geo: IpGeo): string {
  const local = [geo.city, geo.region].filter(Boolean).join(", ");
  return [local, geo.country].filter(Boolean).join(" · ") || "(空)";
}

/** --lookup:打印映射结果与库内原始字段 */
function printLookup(reader: Reader<CityResponse>, raw: string): void {
  const ip = publicIp(raw);
  if (!ip) {
    console.log(JSON.stringify({ ip: raw, skipped: parseIp(cleanIp(raw)) ? "private/reserved" : "invalid" }));
    return;
  }
  const rec = reader.get(ip);
  console.log(
    JSON.stringify({
      ip: raw,
      ...(ip === raw ? {} : { lookup: ip }),
      geo: lookupGeo(reader, ip),
      db: rec
        ? {
            country: rec.country?.iso_code ?? null,
            subdivision: rec.subdivisions?.[0]?.names?.en ?? null,
            city: rec.city?.names?.en ?? null,
          }
        : null,
    })
  );
}

// ---------- Supabase ----------

interface SessionIp {
  user_id: string;
  ip: string | null;
  seen_at: string | null;
}

/** 函数 / 表不存在(SQL 还没执行)时提示先跑 analytics.sql */
function dbError(what: string, error: PostgrestError): Error {
  const missing = ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code);
  return new Error(
    `${what}失败:${error.message}${missing ? "\n→ 请先在 Supabase SQL Editor 执行 supabase/analytics.sql" : ""}`
  );
}

const PAGE = 1000;

/**
 * 全部账号的 id(Auth Admin API 分页)。只用于汇总覆盖率:auth.sessions 在用户登出 / 会话被撤销时就删掉了,
 * 这些用户没有 IP 可补;失败时返回 null(不影响回填本身)。
 */
async function listAllUserIds(admin: GoTrueAdminApi): Promise<string[] | null> {
  const ids: string[] = [];
  try {
    for (let page = 1; ; page++) {
      const { data, error } = await admin.listUsers({ page, perPage: PAGE });
      if (error) return null;
      ids.push(...data.users.map((u) => u.id));
      if (data.users.length < PAGE) return ids;
    }
  } catch {
    return null;
  }
}

/** PostgREST 单次最多返回 max-rows(默认 1000)行:按 range 翻页直到取空 */
async function fetchAll<T>(
  what: string,
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: PostgrestError | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + PAGE - 1);
    if (error) throw dbError(what, error);
    const batch = (data as T[] | null) ?? [];
    if (batch.length === 0) return rows;
    rows.push(...batch);
  }
}

async function main(): Promise<void> {
  if (lookups.length) {
    const { reader, tag } = await openDbIp();
    console.log(`IP 库 DB-IP City Lite ${tag}(IP geolocation by DB-IP, CC BY 4.0)`);
    for (const ip of lookups) printLookup(reader, ip);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`目标库 ${new URL(url).host}${dryRun ? "(--dry-run:只查不写)" : ""}${all ? "(--all)" : ""}`);

  // RPC 已按用户取最近一条有 IP 的会话;这里再按 user_id 去重兜底(重复键会让批量写入报错)
  const sessions = new Map<string, SessionIp>();
  const sessionRows = await fetchAll<SessionIp>("读取 analytics_user_session_ips()", (from, to) =>
    sb.rpc("analytics_user_session_ips").order("user_id").range(from, to)
  );
  for (const s of sessionRows) {
    const prev = sessions.get(s.user_id);
    if (!prev || (Date.parse(s.seen_at ?? "") || 0) > (Date.parse(prev.seen_at ?? "") || 0)) sessions.set(s.user_id, s);
  }
  const existing = new Map<string, DbUserIpGeo>();
  const geoRows = await fetchAll<DbUserIpGeo>("读取 user_ip_geo", (from, to) =>
    sb.from("user_ip_geo").select("user_id,country,region,city,source,updated_at").order("user_id").range(from, to)
  );
  for (const r of geoRows) existing.set(r.user_id, r);

  const stats = { edge: 0, existing: 0, privateIp: 0, unchanged: 0, raced: 0, notFound: 0, inserted: 0, updated: 0, failed: 0 };
  const todo = [...sessions.values()].filter((s) => {
    const prev = existing.get(s.user_id);
    if (prev?.source === "edge") stats.edge++;
    else if (prev && !all) stats.existing++;
    else return true;
    return false;
  });

  const inserts: DbUserIpGeo[] = [];
  const updates: DbUserIpGeo[] = [];
  if (todo.length) {
    const { reader, tag } = await openDbIp();
    console.log(`IP 库 DB-IP City Lite ${tag}(IP geolocation by DB-IP, CC BY 4.0)\n`);
    for (const s of todo) {
      const id = s.user_id.slice(0, 8);
      const ip = s.ip ? publicIp(s.ip) : null;
      if (!ip) {
        stats.privateIp++;
        console.log(`  ${id}  ${maskIp(s.ip).padEnd(20)}  跳过:私有 / 保留 IP`);
        continue;
      }
      const geo = lookupGeo(reader, ip);
      if (!geo) {
        stats.notFound++;
        console.log(`  ${id}  ${maskIp(ip).padEnd(20)}  查不到`);
        continue;
      }
      const prev = existing.get(s.user_id);
      if (prev && prev.country === geo.country && prev.region === geo.region && prev.city === geo.city) {
        stats.unchanged++;
        continue;
      }
      // updated_at 取会话时间而非 now():之后任何边缘事件都比它新,触发器会用 edge 数据覆盖
      const row: DbUserIpGeo = {
        user_id: s.user_id,
        ...geo,
        source: "backfill",
        updated_at: s.seen_at ?? new Date().toISOString(),
      };
      (prev ? updates : inserts).push(row);
      console.log(`  ${id}  ${maskIp(ip).padEnd(20)}  → ${geoLabel(geo)}${prev ? `(原 ${geoLabel(prev)})` : ""}`);
    }
  }

  if (!dryRun) {
    // 新行:ON CONFLICT DO NOTHING —— 读表之后触发器若刚写入 edge 行,不覆盖
    for (let i = 0; i < inserts.length; i += 500) {
      const batch = inserts.slice(i, i + 500);
      const { data, error } = await sb
        .from("user_ip_geo")
        .upsert(batch, { onConflict: "user_id", ignoreDuplicates: true })
        .select("user_id");
      if (error) {
        stats.failed += batch.length;
        console.error(dbError("写入 user_ip_geo", error).message);
        continue;
      }
      stats.inserted += data.length;
      stats.raced += batch.length - data.length;
    }
    // 已有的 backfill 行(--all):只改仍是 backfill 的行
    for (const { user_id, ...patch } of updates) {
      const { data, error } = await sb
        .from("user_ip_geo")
        .update(patch)
        .eq("user_id", user_id)
        .eq("source", "backfill")
        .select("user_id");
      if (error) {
        stats.failed++;
        console.error(dbError("更新 user_ip_geo", error).message);
        continue;
      }
      if (data.length) stats.updated++;
      else stats.raced++;
    }
  }

  const inserted = dryRun ? inserts.length : stats.inserted;
  const updated = dryRun ? updates.length : stats.updated;
  const skipped = stats.edge + stats.existing + stats.privateIp + stats.unchanged + stats.raced;
  console.log(`\n${dryRun ? "[dry-run] " : ""}候选 ${sessions.size}(auth.sessions 里有 IP 的用户)`);
  console.log(`  ${dryRun ? "将写入" : "写入"} ${inserted + updated}(新增 ${inserted},更新 ${updated})`);
  console.log(
    `  跳过 ${skipped}(已有 edge 记录 ${stats.edge} / 已有记录 ${stats.existing}${all ? "" : "(--all 可重算)"}` +
      ` / 私有或保留 IP ${stats.privateIp} / 地区未变 ${stats.unchanged}` +
      `${stats.raced ? ` / 写入时已有新记录 ${stats.raced}` : ""})`
  );
  console.log(`  查不到 ${stats.notFound}`);
  if (stats.failed) {
    console.log(`  失败 ${stats.failed}`);
    process.exitCode = 1;
  }

  // 覆盖率:既没有会话 IP、也还没有地区记录的账号(登出过的用户 auth.sessions 已删,补不了)
  const userIds = await listAllUserIds(sb.auth.admin);
  if (userIds) {
    const uncovered = userIds.filter((id) => !sessions.has(id) && !existing.has(id)).length;
    console.log(
      `\n账号共 ${userIds.length},其中 ${uncovered} 个没有会话 IP 也没有地区记录:` +
        "后台按 profiles.location → 门店地址 → 「未知地区」回退显示,等他们下次登录后浏览网站时由触发器自动补上"
    );
  } else {
    console.log("\n(读取账号列表失败,跳过覆盖率统计)");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
