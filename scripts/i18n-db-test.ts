#!/usr/bin/env bun
/**
 * i18n-db-test — 内容翻译 v2 的数据库回归测试(supabase/i18n-v2*.sql + browse-cars.sql;规格 §0.2、§10.1 R0 门禁)。
 * 用 PGlite(PostgreSQL 17.5,进程内内存库)加载线上 schema 存根 scripts/fixtures/live-schema-stub.sql
 * (anon / authenticated / service_role 角色、RLS 策略、Supabase 默认授权、request.jwt.claims),执行迁移后
 * 按 PostgREST 的方式(SET LOCAL ROLE + request.jwt.claims)逐条验证不变量。不连任何真实数据库,不调用模型。
 *
 * 套件(各用一个全新的 PGlite):
 *   main      迁移 / 写入守卫 / 队列 CAS / 审核(审核键 mod_hash、审核队列、独立预算、每位作者的每日额度、
 *             30 分钟失败窗口)/ 认领人改动与同步复原的信任 / 停放的刷新行 / 译文标记恢复 / 词表 / 搜索 / 内容时钟 /
 *             临时语言检测 / sitemap(混合语言帖子)/ 原文哈希向量 / 重跑上一版迁移(310 项)
 *   browse    browse-cars.sql:观察模式沿用旧分组、强制模式按词表归并孪生词,选项计数 = 筛选结果;列表行不带原文;
 *             「仅清白产权」筛选(title-status.sql,与 lib/car-filters.ts 同一规则);
 *             加元 / 公里车源的价格 / 里程筛选与排序按折合美元 / 英里(car-currency.sql,与 lib/currency.ts 同一换算);
 *             「可贷款(无信用/ITIN)」筛选按卖家门店标签(dealer-financing.sql,与 lib/dealer-financing.ts 同一规则);
 *             车况清单 CHECK(car-condition.sql,与 lib/car-condition.ts normalizeCarCondition 同一规则)(38 项)
 *   rollback  i18n-v2-rollback.sql 紧急摘除 → 旧写法 / 认领人 / 标签编辑 → 重新挂载 → sweep 修复(不可信、链接行重建)
 *             → 快速回滚的审核停放 → i18n-v2-cleanup.sql
 *   parity    SQL i18n_norm_tag / hashtag_tokens 与 lib/i18n/hashtags.ts 逐样本一致(URL 与空白样本另核对期望值)
 *   verify    演练 R3 → R4 → R6 后执行一次 i18n-v2-verify.sql,断言每条门禁
 *   replies   i18n-v2-data.sql 第 5b 步:历史评论正文里的「回复 @name：」前缀迁入 reply_to_*(B33)
 *
 * Usage:
 *   bun scripts/i18n-db-test.ts        (= bun run i18n:db-test)
 *       全部通过打印 ALL PASS;否则打印失败数并以退出码 1 结束。
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PGlite } from "@electric-sql/pglite";
import { HASHTAG_SPLIT_RE, extractHashtags, normTag } from "../lib/i18n/hashtags";
import { CLEAN_TITLE } from "../lib/title-status";
import { carMileageMi, carPriceUsd } from "../lib/currency";
import { hasLoanFinancing } from "../lib/dealer-financing";
import { normalizeCarCondition } from "../lib/car-condition";

const ROOT = join(import.meta.dir, "..");
const readSql = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const STUB = readSql("scripts/fixtures/live-schema-stub.sql");
const SCHEMA = readSql("supabase/i18n-v2.sql");
const DATA = readSql("supabase/i18n-v2-data.sql");
const BROWSE = readSql("supabase/browse-cars.sql");
const TITLE_STATUS = readSql("supabase/title-status.sql");
const CAR_CURRENCY = readSql("supabase/car-currency.sql");
const DEALER_FINANCING = readSql("supabase/dealer-financing.sql");
const CAR_CONDITION = readSql("supabase/car-condition.sql");
const VERIFY = readSql("supabase/i18n-v2-verify.sql");
const ROLLBACK = readSql("supabase/i18n-v2-rollback.sql");
const CLEANUP = readSql("supabase/i18n-v2-cleanup.sql");

const LOCALES = ["zh", "en", "ko", "ja", "es", "fr"];
const U1 = "11111111-1111-1111-1111-111111111111"; // seller
const U2 = "22222222-2222-2222-2222-222222222222"; // other user
const A1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // admin
const S1 = "55555555-5555-5555-5555-555555555555"; // system dealer
const SRC = "99999999-9999-9999-9999-999999999999"; // listing source
const C1 = "c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1"; // user car (zh)
const C2 = "c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2"; // syndicated car (en)
const P1 = "d1d1d1d1-0000-0000-0000-000000000001";
const P2 = "d2d2d2d2-0000-0000-0000-000000000002";
const PC1 = "e1e1e1e1-0000-0000-0000-000000000001";

// ---------- RPC 返回行(规格 §2.6;只声明测试读到的列) ----------
interface ClaimRow {
  src_hash: string; mod_hash: string; needs_moderation: boolean; locales: string[]; lease_token: string;
  field_langs: Record<string, string> | null; meta: { trusted: boolean; moderate_outputs: boolean };
}
/** i18n_moderation_input 的一行 */
interface ModInputRow {
  src_hash: string; mod_hash: string; moderation: string; moderated: boolean; mod_payload: Record<string, unknown>;
}
interface TermClaimRow { group_id: string; alias_norm: string; lease_token: string; trusted: boolean }
interface TopicChip { slug: string | null; label: string }
interface FeatureChip { label: string }
interface BundleRow { s: string; f: Record<string, string> | null; al: string[] | null }
interface SitemapRow { id: string; locales: string[]; x_default: string }
interface CompleteResult { stale: boolean; hidden?: boolean; applied?: string[] }

// ---------- 断言与计数 ----------
interface Tally { name: string; passed: number; failed: number }
const tallies: Tally[] = [];
let tally: Tally = { name: "", passed: 0, failed: 0 };

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    tally.passed++;
    console.log("  ok  ", name);
  } else {
    tally.failed++;
    console.log("  FAIL", name, detail === undefined ? "" : JSON.stringify(detail));
  }
}

function crashed(where: string, e: unknown) {
  tally.failed++;
  console.log("  FAIL", `${where} threw:`, e instanceof Error ? e.message : String(e));
}

/** 一个小节:抛错记一次失败,后续小节照常执行 */
async function section(title: string, body: () => Promise<void>) {
  console.log(`\n${title}`);
  try {
    await body();
  } catch (e) {
    crashed(title, e);
  }
}

async function suite(name: string, body: () => Promise<void>) {
  tally = { name, passed: 0, failed: 0 };
  tallies.push(tally);
  console.log(`\n===== ${name} =====`);
  try {
    await body();
  } catch (e) {
    crashed(name, e);
  }
}

/** 全新的 PGlite + 线上 schema 存根;用完即关 */
async function fresh(body: (db: PGlite) => Promise<void>) {
  const db = new PGlite();
  try {
    await db.exec(STUB);
    await body(db);
  } finally {
    await db.close();
  }
}

type ApiRole = "anon" | "authenticated" | "service_role";
/** 失败时 code / constraint = PGlite DatabaseError 的 SQLSTATE 与约束名 */
interface Res<T> { ok: boolean; error?: string; code?: string; constraint?: string; rows: T[] }

function client(db: PGlite) {
  /** 超级用户直连(无 JWT) */
  async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    return (await db.query<T>(text, params)).rows;
  }
  /** PostgREST 式请求:SET LOCAL ROLE + request.jwt.claims;role = null 为无 JWT 的会话(SQL editor / pg_cron) */
  async function as<T = Record<string, unknown>>(role: ApiRole | null, sub: string | null, text: string): Promise<Res<T>> {
    const claims = role ? JSON.stringify({ role, ...(sub ? { sub } : {}) }) : "";
    try {
      await db.exec("begin");
      if (role) await db.exec(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
      const res = await db.query<T>(text);
      await db.exec("commit");
      return { ok: true, rows: res.rows };
    } catch (e) {
      await db.exec("rollback").catch(() => {});
      const pg = e instanceof Error ? (e as Error & { code?: string; constraint?: string }) : null;
      return { ok: false, error: pg ? pg.message : String(e), code: pg?.code, constraint: pg?.constraint, rows: [] };
    }
  }
  return { q, as };
}

/** 迁移前的账号:卖家 U1、其他用户 U2、管理员 A1、转载系统账号 S1(转载源 SRC 的 system_account_id) */
async function seedAccounts(db: PGlite) {
  await db.exec(`
insert into auth.users(id) values ('${U1}'),('${U2}'),('${A1}'),('${S1}');
insert into public.profiles(id, username, role, is_system) values
 ('${U1}','seller','user',false),('${U2}','other','user',false),('${A1}','admin','admin',false),('${S1}','dealer','user',true);
insert into public.listing_sources(id, key, name, base_url, system_account_id)
values ('${SRC}','westcoast','West Coast Auto','https://westcoast.example','${S1}');`);
}

/** 账号 + i18n-v2.sql + i18n-v2-data.sql(观察模式 + 影子审核) */
async function migrated(db: PGlite) {
  await seedAccounts(db);
  await db.exec(SCHEMA);
  await db.exec(DATA);
}

/** 6 个语言的完成结果:en 原文即英文(skipped),其余 ok */
function okResults(text: string): string {
  return JSON.stringify(LOCALES.map((l) => l === "en"
    ? { locale: l, outcome: "skipped" }
    : { locale: l, outcome: "ok", fields: { description: `${l}: ${text}` }, source_lang: "en", model: "m", prompt_version: 1 }));
}

/** 运维文档里的一条 SQL(i18n-v2-rollback.sql 头部注释):从以 start 开头的那行起,到以分号结尾的行止,去掉注释前缀 */
function documentedSql(file: string, start: string): string {
  const lines = file.split("\n").filter((l) => l.startsWith("--")).map((l) => l.replace(/^--\s*/, ""));
  const from = lines.findIndex((l) => l.startsWith(start));
  if (from < 0) throw new Error(`documented statement not found: ${start}`);
  const to = lines.findIndex((l, i) => i >= from && l.trimEnd().endsWith(";"));
  return lines.slice(from, to + 1).join("\n");
}

// =====================================================================
// main:test-final(310 项)
// =====================================================================
async function mainSuite(db: PGlite) {
  const { q, as } = client(db);

  // ---- 迁移前就存在的旧数据 ----
  await db.exec(`
insert into auth.users(id) values ('${U1}'),('${U2}'),('${A1}'),('${S1}');
insert into public.profiles(id, username, role, is_system) values
 ('${U1}','seller','user',false),('${U2}','other','user',false),('${A1}','admin','admin',false),('${S1}','dealer','user',true);
insert into public.listing_sources(id, key, name, base_url, system_account_id) values ('${SRC}','westcoast','West Coast Auto','https://westcoast.example','${S1}');
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh,
  seller_name, description, description_zh, features, other_i18n)
values ('${C1}','${U1}','2019 Toyota Camry','2019 丰田 凯美瑞',2019,'Toyota','Camry',15000,60000,'Flushing, NY','法拉盛',
  'seller','Perfect condition, one owner','车况完美，一手车主',array['倒车影像','Backup Camera'],
  '{"ko":{"title":"2019 Toyota Camry","description":"车况完美"},"en":{"title":"x","description":"AI english"}}');
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh,
  seller_name, description, description_zh, features, source_id)
values ('${C2}','${S1}','2020 Tesla Model 3','2020 特斯拉 Model 3',2020,'Tesla','Model 3',25000,30000,'San Diego, CA','圣地亚哥',
  'dealer','Clean title. Long range. Call 626-555-0199.','清洁产权。长续航。',array['Autopilot','Heated Seats','座椅加热'],
  '${SRC}');
insert into public.community_posts(id, user_id, type, title, content, tags, other_i18n)
values ('${P1}','${U1}','discussion','特斯拉保险怎么买','求推荐 #Model3 保险',array['特斯拉','保险'],
  '{"ko":{"title":"特斯拉保险怎么买","content":"求推荐 #Model3 保险"}}');
insert into public.post_comments(id, post_id, user_id, content) values ('${PC1}','${P1}','${U2}','我用的 Geico');
`);

  await db.exec(SCHEMA);
  await db.exec(DATA);
  console.log("migration applied");

  await section("[1] migration / observe mode", async () => {
    const cars = await q<{ id: string; description_original: string; features_original: string[]; content_updated_at: Date }>(
      "select id, description_original, features_original, content_updated_at from public.cars order by id");
    const c1 = cars.find((c) => c.id === C1)!, c2 = cars.find((c) => c.id === C2)!;
    check("user car original = description_zh", c1.description_original === "车况完美，一手车主", c1);
    check("syndicated original = description", c2.description_original.startsWith("Clean title"), c2);
    check("features_original backfilled", c1.features_original.length === 2, c1.features_original);
    const src = await q<{ n: string }>("select count(*)::text n from i18n.sources");
    check("sources for all entities (2 cars, 1 post, 1 comment)", src[0].n === "4", src);
    const tr = await q<{ n: string }>("select count(*)::text n from i18n.translations where state='pending'");
    check("6 locale rows pending per entity", tr[0].n === "24", tr);
    const mod = await q<{ moderation: string }>("select moderation from i18n.sources where entity='car' and entity_id=$1", [C1]);
    check("existing content grandfathered (moderation skipped)", mod[0].moderation === "skipped", mod);
    const tags = await q<{ alias_norm: string }>("select alias_norm from i18n.post_tags where post_id=$1 order by pos", [P1]);
    check("post tags + inline hashtag linked", tags.map((t) => t.alias_norm).join(",") === "特斯拉,保险,model3", tags);
  });

  await section("[2] owners cannot reach translations (schema private)", async () => {
    const r = await as("authenticated", U1, "select * from i18n.translations");
    check("authenticated select i18n.translations denied", !r.ok && /permission denied/.test(r.error ?? ""), r.error);
    const r2 = await as("authenticated", U1, `select public.i18n_complete('car','${C1}',gen_random_uuid(),'x',null,'[]')`);
    check("authenticated cannot call pipeline RPC", !r2.ok && /permission denied/.test(r2.error ?? ""), r2.error);
    const r3 = await as("anon", null, "select public.i18n_claim(1,60,null,null)");
    check("anon cannot claim", !r3.ok, r3.error);
  });

  await section("[3] observe mode: legacy owner write maps to original, no coercion", async () => {
    const r = await as("authenticated", U1, `update public.cars set description_zh='车况良好,有小刮痕' where id='${C1}'`);
    check("owner legacy update ok", r.ok, r.error);
    const c = await q<{ description_original: string; description_zh: string }>(
      "select description_original, description_zh from public.cars where id=$1", [C1]);
    check("description_original follows legacy write", c[0].description_original === "车况良好,有小刮痕", c);
    const st = await q<{ state: string; n: string }>(
      "select state, count(*)::text n from i18n.translations where entity='car' and entity_id=$1 group by state", [C1]);
    check("translations reset to pending", st.length === 1 && st[0].state === "pending", st);
    const m = await q<{ moderation: string }>("select moderation from i18n.sources where entity='car' and entity_id=$1", [C1]);
    check("edit requires re-moderation", m[0].moderation === "pending", m);
  });

  await section("[4] enforce mode guards", async () => {
    await as(null, null, `select public.i18n_admin_set('enforce','true'::jsonb)`);
    const r = await as("authenticated", U1,
      `update public.cars set other_i18n='{"zh":{"description":"SCAM"}}', content_updated_at='2000-01-01' where id='${C1}'`);
    check("owner update statement succeeds (coerced, not rejected)", r.ok, r.error);
    // content_updated_at 以 ::text 读回:PGlite 把 timestamptz 解析成 Date,String(Date) 不以年份开头
    const c = await q<{ other_i18n: unknown; cu: string }>("select other_i18n, content_updated_at::text cu from public.cars where id=$1", [C1]);
    check("other_i18n not writable by owner", JSON.stringify(c[0].other_i18n).indexOf("SCAM") < 0, c[0].other_i18n);
    check("content_updated_at not writable by owner", !c[0].cu.startsWith("2000"), c[0].cu);
    const r2 = await as("authenticated", U1, `update public.cars set description_zh='我改了描述' where id='${C1}'`);
    const c2 = await q<{ description_original: string; description: string; description_zh: string; title_zh: string; features: string[] }>(
      "select description_original, description, description_zh, title_zh, features from public.cars where id=$1", [C1]);
    check("enforce: legacy write -> original", r2.ok && c2[0].description_original === "我改了描述", c2);
    check("enforce: projections mirror original until pipeline", c2[0].description === "我改了描述" && c2[0].description_zh === "我改了描述", c2);
    await as("service_role", null, `select public.i18n_seed_title_maps('{"Toyota":"丰田","Tesla":"特斯拉"}','{"Toyota":{"Camry":"凯美瑞"}}')`);
    await as("authenticated", U1, `update public.cars set trim='SE' where id='${C1}'`);
    const t = await q<{ title: string; title_zh: string }>("select title, title_zh from public.cars where id=$1", [C1]);
    check("deterministic titles", t[0].title === "2019 Toyota Camry SE" && t[0].title_zh === "2019 丰田 凯美瑞 SE", t);
  });

  await section("[5] counters do not touch content timestamps or the queue", async () => {
    const before = await q<{ cu: string; ua: string }>("select content_updated_at::text cu, updated_at::text ua from public.cars where id=$1", [C2]);
    const trBefore = await q<{ ua: string }>("select max(updated_at)::text ua from i18n.translations where entity_id=$1", [C2]);
    await as("anon", null, `select public.increment_views('${C2}')`);
    const after = await q<{ cu: string; ua: string; v: number }>(
      "select content_updated_at::text cu, updated_at::text ua, views_count v from public.cars where id=$1", [C2]);
    const trAfter = await q<{ ua: string }>("select max(updated_at)::text ua from i18n.translations where entity_id=$1", [C2]);
    check("views counted", after[0].v === 1, after);
    check("content_updated_at unchanged by view", before[0].cu === after[0].cu, { before, after });
    check("queue untouched by view", trBefore[0].ua === trAfter[0].ua, { trBefore, trAfter });
  });

  await section("[6] worker claim / complete / CAS / projection", async () => {
    const claim = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(10, 120, 'car', array['${C2}']::uuid[])`);
    check("claim ok", claim.ok, claim.error);
    const row = claim.rows[0];
    check("claimed syndicated car with 6 locales, no moderation needed", !!row && row.locales.length === 6 && row.needs_moderation === false, row);
    check("syndicated text written by sync is trusted (meta.trusted, no output moderation)",
      row.meta.trusted === true && row.meta.moderate_outputs === true, row.meta);
    const again = await as("service_role", null, `select * from public.i18n_claim(10, 120, 'car', array['${C2}']::uuid[])`);
    check("second claim gets nothing (lease)", again.ok && again.rows.length === 0, again);
    const results = JSON.stringify([
      { locale: "en", outcome: "skipped" },
      { locale: "zh", outcome: "ok", fields: { description: "清洁产权。长续航。致电 626-555-0199。" }, source_lang: "en", model: "m", prompt_version: 1 },
      { locale: "ko", outcome: "ok", fields: { description: "무사고 이력. 롱레인지. 626-555-0199로 전화하세요." }, source_lang: "en", model: "m", prompt_version: 1 },
      { locale: "ja", outcome: "failed", error: "wrong_language" },
    ]);
    const done = await as("service_role", null,
      `select public.i18n_complete('car','${C2}','${row.lease_token}','${row.src_hash}','{"field_langs":{"description":"en"},"primary_lang":"en"}','${results}','{"calls":3}')`);
    check("complete ok", done.ok, done.error);
    const st = await q<{ locale: string; state: string; lease_token: string | null }>(
      "select locale, state, lease_token from i18n.translations where entity='car' and entity_id=$1 order by locale", [C2]);
    check("states after complete", JSON.stringify(st.map((s) => [s.locale, s.state])) ===
      JSON.stringify([["en", "skipped"], ["es", "pending"], ["fr", "pending"], ["ja", "failed"], ["ko", "ok"], ["zh", "ok"]]), st);
    check("unreported locales released (es/fr lease cleared)", st.every((s) => s.lease_token === null), st);
    const proj = await q<{ description: string; description_zh: string }>("select description, description_zh from public.cars where id=$1", [C2]);
    check("projection: en = original, zh = translation",
      proj[0].description.startsWith("Clean title") && proj[0].description_zh.startsWith("清洁产权"), proj);
    const bundle = await as<BundleRow>("anon", null, `select * from public.i18n_bundle('car', array['${C2}']::uuid[], 'ko')`);
    const b = bundle.rows[0];
    check("anon bundle ko ok", !!b && b.s === "ok" && (b.f?.description ?? "").startsWith("무사고"), b);
    const ben = await as<BundleRow>("anon", null, `select * from public.i18n_bundle('car', array['${C2}']::uuid[], 'en')`);
    check("anon bundle en = source (no translation needed)", ben.rows[0].s === "source", ben.rows);
    const al = (b.al ?? []).join(",");
    check("available locales = zh,en,ko (fixed order)", al === "zh,en,ko", al);
    const budget = await q<{ calls: number }>("select calls from i18n.budget");
    check("budget counted", budget[0]?.calls === 3, budget);
  });

  await section("[7] stale completion is discarded after a concurrent edit", async () => {
    // service_role 读不到 i18n.sources(私有 schema,这条语句失败、不改数据);源哈希改用审核输入 RPC 取
    await as("service_role", null,
      `select public.i18n_record_moderation('car','${C1}',(select src_hash from i18n.sources where entity_id='${C1}'),'pass')`);
    const inp = await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('car','${C1}')`);
    const h = inp.rows[0].mod_hash;
    const rec = await as<{ i18n_record_moderation: string }>("service_role", null,
      `select public.i18n_record_moderation('car','${C1}','${h}','pass')`);
    check("moderation recorded", rec.ok && rec.rows[0].i18n_record_moderation === "pass", rec);
    const claim = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(10, 120, 'car', array['${C1}']::uuid[])`);
    const row = claim.rows[0];
    check("claim user car", !!row && row.needs_moderation === false, row);
    await as("authenticated", U1, `update public.cars set description_original='发动机故障,仅售零件' where id='${C1}'`);
    const res = JSON.stringify([{ locale: "ko", outcome: "ok", fields: { description: "완벽한 상태" }, source_lang: "zh", model: "m", prompt_version: 1 }]);
    const done = await as<{ r: CompleteResult }>("service_role", null,
      `select public.i18n_complete('car','${C1}','${row.lease_token}','${row.src_hash}',null,'${res}','{"calls":1}') as r`);
    const r = done.rows[0].r;
    check("completion reports stale", r.stale === true, r);
    const ko = await q<{ state: string; fields: unknown }>("select state, fields from i18n.translations where entity_id=$1 and locale='ko'", [C1]);
    check("old translation never stored for new text", ko[0].state === "pending" && ko[0].fields === null, ko);
  });

  await section("[8] visibility: hidden entities are neither served nor translated", async () => {
    const r = await as("authenticated", U1, `update public.cars set status='removed' where id='${C1}'`);
    check("owner can remove own car", r.ok, r.error);
    const st = await q<{ state: string }>("select distinct state from i18n.translations where entity_id=$1", [C1]);
    check("translations on hold", st.length === 1 && st[0].state === "hold", st);
    const b = await as("anon", null, `select * from public.i18n_bundle('car', array['${C1}']::uuid[], 'ko')`);
    check("bundle omits non-public entity", b.ok && b.rows.length === 0, b.rows);
    const r2 = await as("authenticated", U1, `update public.cars set status='active' where id='${C1}'`);
    const st2 = await q<{ state: string }>("select distinct state from i18n.translations where entity_id=$1", [C1]);
    check("owner relist (owner-removed) allowed -> pending", r2.ok && st2.length === 1 && st2[0].state === "pending", { r2, st2 });
  });

  await section("[9] B10: moderation removal cannot be undone by owner or sync", async () => {
    await as(null, null, `select public.i18n_admin_set('moderation_enforce','true'::jsonb)`);
    const inp = await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('car','${C1}')`);
    const h = inp.rows[0].mod_hash;
    await as("service_role", null, `select public.i18n_record_moderation('car','${C1}','${h}','blocked','{scam}','诈骗','m','text','${U1}')`);
    const c = await q<{ status: string; removal_reason: string }>("select status, removal_reason from public.cars where id=$1", [C1]);
    check("blocked -> removed (moderation)", c[0].status === "removed" && c[0].removal_reason === "moderation", c);
    const am = await q<{ n: string }>("select count(*)::text n from public.ai_moderation where target_id=$1", [C1]);
    check("ai_moderation flag written", am[0].n === "1", am);
    const r = await as("authenticated", U1, `update public.cars set status='active' where id='${C1}'`);
    check("owner relist rejected", !r.ok && /listing_blocked/.test(r.error ?? ""), r.error);
    const r2 = await as("service_role", null, `update public.cars set status='active', mileage=60001 where id='${C1}'`);
    const c2 = await q<{ status: string; mileage: number }>("select status, mileage from public.cars where id=$1", [C1]);
    check("sync/API reactivation silently ignored", r2.ok && c2[0].status === "removed" && c2[0].mileage === 60001, c2);
    const r3 = await as("authenticated", A1, `update public.cars set status='active' where id='${C1}'`);
    const c3 = await q<{ status: string; removal_reason: string | null }>("select status, removal_reason from public.cars where id=$1", [C1]);
    check("admin restore allowed", r3.ok && c3[0].status === "active" && c3[0].removal_reason === null, { r3, c3 });
  });

  await section("[10] topics: deterministic brands + LLM terms, cross-language search", async () => {
    const seed = await as("service_role", null,
      `select public.i18n_seed_term('topic','tesla','{"zh":"特斯拉","en":"Tesla","ko":"테슬라","ja":"テスラ","es":"Tesla","fr":"Tesla"}','brand',array['tesla'])`);
    check("brand seed ok (duplicate labels across locales)", seed.ok, seed.error);
    for (const q2 of ["#테슬라", "#tesla", "#テスラ", "#特斯拉"]) {
      const r = await as<{ id: string }>("anon", null, `select id from public.search_posts('${q2}')`);
      check(`search ${q2} finds the 特斯拉-tagged post`, r.ok && r.rows.some((x) => x.id === P1), r);
    }
    const claim = await as<TermClaimRow>("service_role", null, "select * from public.i18n_claim_terms(10, 60)");
    const rows = claim.rows;
    const ins = rows.find((r) => r.alias_norm === "保险");
    check("unresolved alias 保险 claimed (used by a public post)", !!ins, rows);
    await as("service_role", null,
      `select public.i18n_complete_term('topic','保险','${ins!.lease_token}','ok','insurance','{"zh":"保险","en":"Insurance","ko":"보험","ja":"保険","es":"Seguro","fr":"Assurance"}','m',null,'zh')`);
    const r1 = await as("authenticated", U2,
      `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${P2}','${U2}','discussion','보험 질문','#보험 추천해주세요', '{}')`);
    check("korean post inserted", r1.ok, r1.error);
    const r0 = await as<{ id: string }>("anon", null, `select id from public.search_posts('#보험')`);
    const ids0 = r0.rows.map((x) => x.id).sort();
    check("#보험 before resolution: exact alias (ko post) + topic label match (zh post)", JSON.stringify(ids0) === JSON.stringify([P1, P2].sort()), ids0);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${P2}'`);
    const cl2 = await as<TermClaimRow>("service_role", null, "select * from public.i18n_claim_terms(20, 60)");
    const ko = cl2.rows.find((r) => r.alias_norm === "보험");
    check("ko spelling claimed in its own post's group", !!ko && ko.group_id === P2, cl2.rows);
    await as("service_role", null,
      `select public.i18n_complete_term('topic','보험','${ko!.lease_token}','ok','insurance','{"zh":"保险","en":"Insurance","ko":"보험","ja":"保険","es":"Seguro","fr":"Assurance"}','m',null,'ko')`);
    const r2 = await as<{ id: string }>("anon", null, `select id from public.search_posts('#insurance')`);
    const ids = r2.rows.map((x) => x.id).sort();
    check("#insurance finds zh-tagged and ko-hashtagged posts after slug-equality join", JSON.stringify(ids) === JSON.stringify([P1, P2].sort()), ids);
    const r3 = await as("anon", null, `select id from public.search_posts(null, null, 'insurance')`);
    check("topic slug search", r3.rows.length === 2, r3.rows);
    const r4 = await as("anon", null, `select id from public.search_posts('100%_''); drop table x; --')`);
    check("free text with wildcards/quotes is safe", r4.ok && r4.rows.length === 0, r4);
    const b = await as<{ x: { topics: TopicChip[] } }>("anon", null, `select x from public.i18n_bundle('post', array['${P1}']::uuid[], 'ko')`);
    const topics = b.rows[0].x.topics;
    check("topic chips localized for ko", topics.map((t) => t.label).join(",") === "테슬라,보험,Model3", topics);
  });

  await section("[11] features: glossary labels, dedupe twins, compat projection", async () => {
    const fseed = await as("service_role", null,
      `select public.i18n_seed_term('feature','backup-camera','{"zh":"倒车影像","en":"Backup Camera","ko":"후방 카메라","ja":"バックカメラ","es":"Cámara de reversa","fr":"Caméra de recul"}','dictionary',array['倒车摄像头'])`);
    check("feature seed ok", fseed.ok, fseed.error);
    await as("authenticated", U1, `update public.cars set features_original=array['倒车影像','Backup Camera','Sunroof'] where id='${C1}'`);
    const b = await as<{ x: { features: FeatureChip[] } }>("anon", null, `select x from public.i18n_bundle('car', array['${C1}']::uuid[], 'ja')`);
    const feats = b.rows[0].x.features;
    check("twins de-duplicated and labelled in ja", feats.map((f) => f.label).join(",") === "バックカメラ,Sunroof", feats);
    const c = await q<{ features: string[] }>("select features from public.cars where id=$1", [C1]);
    check("features projection = originals ∪ zh/en labels", JSON.stringify(c[0].features) === JSON.stringify(["倒车影像", "Backup Camera", "Sunroof"]), c[0].features);
  });

  await section("[12] sweep repairs trigger-bypassing writes", async () => {
    await db.exec(`set session_replication_role = replica; update public.community_posts set content='绕过触发器的修改' where id='${P1}'; set session_replication_role = origin;`);
    const before = await q<{ state: string }>("select distinct state from i18n.translations where entity='post' and entity_id=$1", [P1]);
    const n = await q<{ n: number }>("select i18n.sweep() n");
    const after = await q<{ state: string; n: string }>(
      "select state, count(*)::text n from i18n.translations where entity='post' and entity_id=$1 group by state", [P1]);
    check("sweep found the drift", n[0].n >= 1, { n, before });
    check("rows reset to pending", after.length === 1 && after[0].state === "pending" && after[0].n === "6", after);
  });

  await section("[13] comments: owners cannot unblock; children follow parent visibility", async () => {
    await as("service_role", null, `select public.i18n_record_moderation('post_comment','${PC1}',(select 'x'),'pass')`);
    await as("authenticated", A1, `update public.community_posts set status='hidden' where id='${P1}'`);
    const st = await q<{ state: string }>("select distinct state from i18n.translations where entity='post_comment' and entity_id=$1", [PC1]);
    check("comment translations on hold when post hidden", st.length === 1 && st[0].state === "hold", st);
    await as("authenticated", A1, `update public.community_posts set status='active' where id='${P1}'`);
    const st2 = await q<{ state: string }>("select distinct state from i18n.translations where entity='post_comment' and entity_id=$1", [PC1]);
    check("comment translations re-pended when post visible", st2.length === 1 && st2[0].state === "pending", st2);
    await as("authenticated", A1, `update public.post_comments set status='blocked' where id='${PC1}'`);
    await db.exec(`create policy pc_owner_upd on public.post_comments for update to authenticated using (auth.uid() = user_id)`);
    const r = await as("authenticated", U2, `update public.post_comments set status='active' where id='${PC1}'`);
    const c = await q<{ status: string }>("select status from public.post_comments where id=$1", [PC1]);
    check("owner cannot unblock own comment even with an UPDATE policy", r.ok && c[0].status === "blocked", { r, c });
  });

  await section("[14] sitemap entries and cascades", async () => {
    const r = await as<SitemapRow>("service_role", null, "select * from public.sitemap_entries('car', 'ko', 0, 1000)");
    check("sitemap_entries ko car rows", r.ok, r.error);
    const c2 = r.rows.find((x) => x.id === C2);
    check("sitemap availability for C2 (en,ko,zh) + x-default = source en", c2?.locales.join(",") === "zh,en,ko" && c2?.x_default === "en", c2);
    const fr = await as<SitemapRow>("service_role", null, "select * from public.sitemap_entries('car', 'fr', 0, 1000)");
    check("C2 not in fr shard (not translated)", fr.ok && !fr.rows.some((x) => x.id === C2), fr.rows);
    const cnt = await as("service_role", null, "select * from public.sitemap_counts('ko')");
    check("sitemap_counts: 5 kinds (car, post, qa, user, topic)", cnt.ok && cnt.rows.length === 5, cnt);
    const anonCnt = await as("anon", null, "select * from public.sitemap_counts('ko')");
    check("sitemap RPCs are service-role only (no anon full scans)", !anonCnt.ok && /permission denied/.test(anonCnt.error ?? ""), anonCnt.error);
    const anonEnt = await as("authenticated", U2, "select * from public.sitemap_entries('car','ko',0,10)");
    check("sitemap_entries denied for authenticated", !anonEnt.ok, anonEnt.error);
    await as("authenticated", U1, `delete from public.cars where id='${C1}'`);
    const n = await q<{ n: string }>("select count(*)::text n from i18n.translations where entity_id=$1", [C1]);
    check("delete cascades to sources/translations", n[0].n === "0", n);
  });

  await section("[15] idempotent re-run of both migration files", async () => {
    // 迁移之后新写入、还没审核的内容:重跑数据迁移既不能把它当旧内容放行,也不能改它的队列优先级
    const PF = "d0d0d0d0-0000-0000-0000-0000000000f5";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PF}','${U2}','discussion','新帖','迁移之后发的')`);
    let ok = true, err = "";
    try {
      await db.exec(SCHEMA);
      await db.exec(DATA);
    } catch (e) {
      ok = false;
      err = e instanceof Error ? e.message : String(e);
    }
    check("i18n-v2.sql + data re-run without error", ok, err);
    const en = await q<{ enforce: string }>("select value::text enforce from i18n.settings where key='enforce'");
    check("re-run keeps operator settings (enforce stays true)", en[0].enforce === "true", en);
    const pf = await q<{ moderation: string; prio: number }>(`select s.moderation,
        (select max(t.priority)::int from i18n.translations t where t.entity_id = s.entity_id) prio
      from i18n.sources s where s.entity_id = $1`, [PF]);
    check("a data re-run neither grandfathers new content (moderation stays pending) nor re-prioritizes it",
      pf[0].moderation === "pending" && pf[0].prio === 0, pf);
  });

  await section("[16] new UGC must be moderated before it is translated", async () => {
    const P3 = "d3d3d3d3-0000-0000-0000-000000000003";
    await as("authenticated", U2,
      `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${P3}','${U2}','showoff','My new car','Picked it up today 🎉', '{}')`);
    const c = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5, 60, 'post', array['${P3}']::uuid[])`);
    const row = c.rows[0];
    check("claim flags needs_moderation for fresh UGC", !!row && row.needs_moderation === true, row);
    const res = JSON.stringify(row.locales.map((l) => ({ locale: l, outcome: "retry", error: "awaiting moderation" })));
    const d = await as("service_role", null, `select public.i18n_complete('post','${P3}','${row.lease_token}','${row.src_hash}',null,'${res}','{}') r`);
    check("retry outcome accepted", d.ok, d.error);
    const st = await q<{ state: string; attempts: number }>("select state, attempts from i18n.translations where entity_id=$1 and locale='ko'", [P3]);
    check("retry does not consume an attempt", st[0].state === "pending" && st[0].attempts === 0, st);
  });

  await section("[17] lease expiry consumes attempts; exhausted rows go dead; failures back off", async () => {
    const P4 = "d4d4d4d4-0000-0000-0000-000000000004";
    await db.exec(`insert into public.community_posts(id,user_id,type,title,content) values ('${P4}','${U1}','discussion','测试','测试内容')`);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${P4}'`);
    for (let i = 0; i < 6; i++) {
      const c = await as("service_role", null, `select * from public.i18n_claim(5, 60, 'post', array['${P4}']::uuid[])`);
      if (c.rows.length === 0) break;
      // 模拟 worker 崩溃:租约过期、到了下次重试时间
      await db.exec(`update i18n.translations set lease_until = now() - interval '1 second', next_attempt_at = now() - interval '1 second' where entity_id='${P4}'`);
    }
    await as("service_role", null, `select * from public.i18n_claim(5, 60, 'post', array['${P4}']::uuid[])`);
    const st = await q<{ state: string; attempts: number }>("select distinct state, attempts from i18n.translations where entity_id=$1", [P4]);
    check("after max attempts rows are dead (no infinite re-billing)", st.length === 1 && st[0].state === "dead" && st[0].attempts === 6, st);
    const b = await as<{ s: string }>("anon", null, `select s from public.i18n_bundle('post', array['${P4}']::uuid[], 'en')`);
    check("dead rows read as unavailable (render original, no spinner)", b.rows[0].s === "unavailable", b.rows);
    const r = await as("service_role", null, `select public.i18n_admin_requeue('post', array['${P4}']::uuid[])`);
    const st2 = await q<{ state: string; attempts: number }>("select distinct state, attempts from i18n.translations where entity_id=$1", [P4]);
    check("admin/service requeue resets dead rows", r.ok && st2.length === 1 && st2[0].state === "pending" && st2[0].attempts === 0, { r, st2 });
    const c = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5, 60, 'post', array['${P4}']::uuid[])`);
    const row = c.rows[0];
    await as("service_role", null,
      `select public.i18n_complete('post','${P4}','${row.lease_token}','${row.src_hash}',null,'[{"locale":"ko","outcome":"failed","error":"echo"}]','{"calls":1}')`);
    const f = await q<{ state: string; due_s: number }>(
      "select state, extract(epoch from next_attempt_at - now())::int due_s from i18n.translations where entity_id=$1 and locale='ko'", [P4]);
    check("failure is negative-cached with backoff", f[0].state === "failed" && f[0].due_s >= 50, f);
  });

  await section("[18] legacy import + refresh keeps serving until a better translation lands", async () => {
    const inp = await as<{ src_hash: string }>("service_role", null, `select * from public.i18n_moderation_input('post','${P2}')`);
    const h = inp.rows[0].src_hash;
    const imp = await as<{ r: boolean }>("service_role", null,
      `select public.i18n_import_legacy('post','${P2}','zh','${h}','{"title":"保险问题","content":"#보험 求推荐"}','ko','{"title":"ko","content":"ko"}',true) r`);
    check("legacy import applied", imp.ok && imp.rows[0].r === true, imp);
    const wrong = await as<{ r: boolean }>("service_role", null,
      `select public.i18n_import_legacy('post','${P2}','ja','deadbeef','{"title":"x"}','ko',null,false) r`);
    check("legacy import with wrong hash is rejected", wrong.rows[0].r === false, wrong);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${P2}'`);
    const c = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5, 60, 'post', array['${P2}']::uuid[])`);
    const row = c.rows[0];
    check("refresh row is claimable while still ok", row.locales.includes("zh"), row);
    const b1 = await as<{ s: string }>("anon", null, `select s, f from public.i18n_bundle('post', array['${P2}']::uuid[], 'zh')`);
    check("still served during refresh lease", b1.rows[0].s === "ok", b1.rows);
    await as("service_role", null,
      `select public.i18n_complete('post','${P2}','${row.lease_token}','${row.src_hash}',null,'[{"locale":"zh","outcome":"failed","error":"wrong_language"}]','{}')`);
    const z = await q<{ state: string; fields: Record<string, string>; refresh: boolean }>(
      "select state, fields, refresh from i18n.translations where entity_id=$1 and locale='zh'", [P2]);
    check("failed refresh keeps the legacy text", z[0].state === "ok" && z[0].fields.title === "保险问题" && z[0].refresh === true, z);
  });

  await section("[19] API v1 / sync identical re-write is a no-op; zh original projects en", async () => {
    const C3 = "c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3";
    await as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, features_original, api_key_id)
      values ('${C3}','${S1}','x','x',2018,'Toyota','Camry',9000,90000,'LA','洛杉矶','dealer','一手车 Camry 保养记录齐全', array['倒车影像'], null)`);
    const t1 = await q<{ ua: string }>("select max(updated_at)::text ua from i18n.translations where entity_id=$1", [C3]);
    const re = await as("service_role", null,
      `update public.cars set description_original='一手车 Camry 保养记录齐全', features_original=array['倒车影像'], last_seen_at=now() where id='${C3}'`);
    const t2 = await q<{ ua: string }>("select max(updated_at)::text ua from i18n.translations where entity_id=$1", [C3]);
    check("identical re-PUT leaves translations untouched (B12)", re.ok && t1[0].ua === t2[0].ua, { t1, t2 });
    const cc = await q<{ title_zh: string; description: string; description_zh: string }>(
      "select title_zh, description, description_zh from public.cars where id=$1", [C3]);
    check("model name kept verbatim in the original (no applyModelZh rewrite)", cc[0].description_zh === "一手车 Camry 保养记录齐全", cc);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${C3}'`);
    const c = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5, 60, 'car', array['${C3}']::uuid[])`);
    const row = c.rows[0];
    await as("service_role", null,
      `select public.i18n_complete('car','${C3}','${row.lease_token}','${row.src_hash}','{"field_langs":{"description":"zh"},"primary_lang":"zh"}','[{"locale":"zh","outcome":"skipped"},{"locale":"en","outcome":"ok","fields":{"description":"One owner, Camry, full service records"},"source_lang":"zh","model":"m","prompt_version":1}]','{"calls":1}')`);
    const p = await q<{ description: string; description_zh: string }>("select description, description_zh from public.cars where id=$1", [C3]);
    check("zh original: description_zh = original, description = en translation",
      p[0].description_zh.startsWith("一手车") && p[0].description.startsWith("One owner"), p);
    const legacy = await as("service_role", null, `update public.cars set description='Old sync code wrote English' where id='${C3}'`);
    const l2 = await q<{ description_original: string; description: string; description_zh: string }>(
      "select description_original, description, description_zh from public.cars where id=$1", [C3]);
    check("enforce: legacy service write becomes the new original, projections reset",
      legacy.ok && l2[0].description_original === "Old sync code wrote English" && l2[0].description_zh === "Old sync code wrote English", l2);
  });

  await section("[20] term jobs only for tags used by public content", async () => {
    const P5 = "d5d5d5d5-0000-0000-0000-000000000005";
    await db.exec(`insert into public.community_posts(id,user_id,type,title,content,tags,status) values ('${P5}','${U1}','discussion','spam','buy now',array['spamtag-xyz'],'hidden')`);
    const c = await as<{ alias_norm: string }>("service_role", null, "select alias_norm from public.i18n_claim_terms(50, 60)");
    check("hidden post's tag not sent to the LLM", c.ok && !c.rows.some((r) => r.alias_norm === "spamtag-xyz".replace(/-/g, "")), c.rows);
  });

  await section("[21] moderation block during an active lease stores nothing", async () => {
    const P6 = "d6d6d6d6-0000-0000-0000-000000000006";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${P6}','${U2}','discussion','加微信 xyz','私聊')`);
    const c = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5, 60, 'post', array['${P6}']::uuid[])`);
    const row = c.rows[0];
    await as("service_role", null, `select public.i18n_record_moderation('post','${P6}','${row.mod_hash}','blocked','{spam}','导流','m','t','${U2}')`);
    const d = await as<{ r: CompleteResult }>("service_role", null,
      `select public.i18n_complete('post','${P6}','${row.lease_token}','${row.src_hash}',null,'[{"locale":"en","outcome":"ok","fields":{"title":"Add WeChat xyz","content":"DM me"},"source_lang":"zh","model":"m","prompt_version":1}]','{}') r`);
    const r = d.rows[0].r;
    const st = await q<{ state: string; fields: unknown }>("select state, fields from i18n.translations where entity_id=$1 and locale='en'", [P6]);
    check("complete reports hidden and stores nothing", r.hidden === true && st[0].state === "hold" && st[0].fields === null, { r, st });
    const ps = await q<{ status: string }>("select status from public.community_posts where id=$1", [P6]);
    check("post hidden by moderation", ps[0].status === "hidden", ps);
  });

  await section("[22] localized term labels for facets", async () => {
    const r = await as<{ raw: string; key: string; label: string }>("anon", null,
      `select * from public.i18n_term_labels('feature', array['倒车影像','Backup Camera','Heated Seats'], 'ko')`);
    const rows = r.rows;
    check("labels resolve across languages to one key",
      r.ok && rows[0].key === "t:backup-camera" && rows[1].key === "t:backup-camera" && rows[0].label === "후방 카메라", rows);
    check("unknown term falls back to raw", rows[2].label === "Heated Seats" && rows[2].key.startsWith("r:"), rows[2]);
  });

  await section("[N1] content clock baseline survives the data migration (B16)", () => fresh(async (db2) => {
    await db2.exec(`insert into auth.users(id) values ('${U1}'); insert into public.profiles(id, username) values ('${U1}','s');
      insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name,
        description, description_zh, features, created_at)
      values ('${C1}','${U1}','t','t',2019,'Toyota','Camry',1,1,'a','b','s','hello world','你好世界',
        array(select 'Tag ' || g from generate_series(1,115) g) || array['倒车影像'], '2024-01-01T00:00:00Z');`);
    await db2.exec(SCHEMA);
    await db2.exec(DATA);
    const r = (await db2.query<{ cu: string; n: number; unc: boolean }>(
      "select content_updated_at::text cu, cardinality(features_original) n, original_uncertain unc from public.cars")).rows[0];
    check("content_updated_at = created_at, not migration time", r.cu.startsWith("2024-01-01"), r);
    check("all 116 feature originals kept (no 60-tag truncation)", r.n === 116, r);
    check("user car with both AI columns flagged original_uncertain", r.unc === true, r);
    await db2.exec(`select public.i18n_admin_set('enforce','true'::jsonb)`);
    const r2 = (await db2.query<{ cu: string }>("select content_updated_at::text cu from public.cars")).rows[0];
    check("enforce flip (reprojection) does not move the content clock", r2.cu.startsWith("2024-01-01"), r2);
  }));

  await section("[N2] ai_moderation: only the pipeline creates verdicts; admins review only", async () => {
    const C9 = "c9c9c9c9-c9c9-c9c9-c9c9-c9c9c9c9c9c9";
    await db.exec(`insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original)
      values ('${C9}','${U1}','x','x',2018,'Honda','Accord',1,1,'a','b','s','测试车')`);
    const old = await as("service_role", null, `insert into public.ai_moderation(target_type,target_id,content,status) values ('car','${C9}','x','pending')
      on conflict (target_type,target_id) do update set status='pending'`);
    check("old /api/moderate upsert (service role) fails -> fail-open pass", !old.ok && /ai_moderation_pipeline_only/.test(old.error ?? ""), old.error);
    const inp = await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('car','${C9}')`);
    const h = inp.rows[0].mod_hash;
    await as(null, null, `select public.i18n_admin_set('moderation_enforce','false'::jsonb)`);
    const sh = await as<{ v: string }>("service_role", null, `select public.i18n_record_moderation('car','${C9}','${h}','blocked','{spam}','r','m','t','${U1}') v`);
    check("shadow mode: blocked verdict recorded as flagged", sh.ok && sh.rows[0].v === "flagged", sh);
    const c = await q<{ status: string }>("select status from public.cars where id=$1", [C9]);
    check("shadow mode: content stays visible", c[0].status === "active", c);
    const am = await q<{ status: string; id: string }>("select status, id from public.ai_moderation where target_id=$1", [C9]);
    check("shadow mode: ai_moderation row status=shadow", am[0]?.status === "shadow", am);
    const cl = await as<{ needs_moderation: boolean }>("service_role", null, `select needs_moderation from public.i18n_claim(5,60,'car',array['${C9}']::uuid[])`);
    check("shadow-flagged content proceeds to translation", cl.rows[0]?.needs_moderation === false, cl.rows);
    const rv = await as("authenticated", A1, `update public.ai_moderation set status='confirmed', reviewed_at=now() where id='${am[0].id}'`);
    check("admin may review (status)", rv.ok, rv.error);
    const bad = await as("authenticated", A1, `update public.ai_moderation set content='edited' where id='${am[0].id}'`);
    check("admin may not rewrite the verdict", !bad.ok, bad.error);
    await as(null, null, `select public.i18n_admin_set('moderation_enforce','true'::jsonb)`);
  });

  await section("[N3] bundle state and availability agree for every locale; source locale always available", async () => {
    const P7 = "d7d7d7d7-0000-0000-0000-000000000007";
    await as("authenticated", U2,
      `insert into public.community_posts(id,user_id,type,title,content) values ('${P7}','${U2}','discussion','求助','My car makes a strange noise when braking')`);
    const det = await as<{ entity: string; entity_id: string; src_hash: string }>("service_role", null, `select * from public.i18n_detection_queue(1000)`);
    const item = det.rows.find((x) => x.entity_id === P7)!;
    check("detection queue lists the new post", !!item, det.rows);
    const items = JSON.stringify([{ entity: "post", entity_id: P7, src_hash: item.src_hash, field_langs: { title: "zh", content: "en" }, primary_lang: "en" }]);
    const rec = await as<{ n: number }>("service_role", null, `select public.i18n_record_detection('${items}'::jsonb) n`);
    check("detection recorded without a lease", rec.ok && rec.rows[0].n === 1, rec);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${P7}'`);
    const rows: Record<string, { s: string; al: string[] }> = {};
    for (const l of LOCALES) {
      const b = await as<{ s: string; al: string[] }>("anon", null, `select s, al from public.i18n_bundle('post', array['${P7}']::uuid[], '${l}')`);
      rows[l] = b.rows[0];
    }
    check("mixed-language post: no locale is 'source' before translation (B31)", Object.values(rows).every((r) => r.s === "pending"), rows);
    check("before translation only the source-language page (pl = en) is available: it shows the original (F019)",
      Object.values(rows).every((r) => JSON.stringify(r.al) === '["en"]'), rows);
    const cl = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5,60,'post',array['${P7}']::uuid[],array['zh','en'])`);
    const row = cl.rows[0];
    check("claim with p_locales leases only zh,en", row.locales.join(",") === "en,zh", row.locales);
    await as("service_role", null, `select public.i18n_complete('post','${P7}','${row.lease_token}','${row.src_hash}',null,
      '[{"locale":"zh","outcome":"ok","fields":{"content":"我的车刹车时有异响"},"source_lang":"en","model":"m","prompt_version":1},
        {"locale":"en","outcome":"ok","fields":{"title":"Help"},"source_lang":"zh","model":"m","prompt_version":1}]','{}')`);
    const agree: string[] = [];
    for (const l of LOCALES) {
      const b = await as<{ s: string; al: string[] }>("anon", null, `select s, al from public.i18n_bundle('post', array['${P7}']::uuid[], '${l}')`);
      const r = b.rows[0];
      if ((["ok", "source"].includes(r.s) || l === "en") !== r.al.includes(l)) agree.push(l);
    }
    check("s in (ok,source) or locale = pl <=> locale in al, for all 6 locales", agree.length === 0, agree);
    const zh = await as<{ f: Record<string, string>; sl: string; fl: Record<string, string> }>("anon", null,
      `select f, sl, fl from public.i18n_bundle('post', array['${P7}']::uuid[], 'zh')`);
    const z = zh.rows[0];
    check("zh bundle carries only the translated field (content); title shown as original", JSON.stringify(Object.keys(z.f)) === '["content"]', z);
  });

  await section("[N4] legacy '回复 @name：' prefix moves into reply_to_* (B33, old native builds)", async () => {
    const P8 = "d8d8d8d8-0000-0000-0000-000000000008";
    await db.exec(`insert into public.community_posts(id,user_id,type,title,content) values ('${P8}','${U1}','discussion','t','c')`);
    await as("authenticated", U2, `insert into public.post_comments(post_id,user_id,content) values ('${P8}','${U2}','first')`);
    const r = await as<{ content: string; reply_to_name: string; reply_to_user_id: string }>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content) values ('${P8}','${U1}','回复 @other：Thanks, that helps') returning content, reply_to_name, reply_to_user_id`);
    const row = r.rows[0];
    check("prefix stripped from stored content", r.ok && row.content === "Thanks, that helps", r);
    check("reply target captured", row.reply_to_name === "other" && row.reply_to_user_id === U2, row);
  });

  await section("[N4b] reply_to_name is derived by the trigger, never the client's value (F004)", async () => {
    const P8 = "d8d8d8d8-0000-0000-0000-000000000008";
    type Reply = { id: string; content: string; reply_to_name: string | null; reply_to_user_id: string | null };
    const spam = "免费送车！加微信 cheapcarz 先付定金 ".repeat(120);
    const a = await as<Reply>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content,reply_to_name) values ('${P8}','${U1}','同意','${spam}') returning *`);
    check("client reply_to_name without a prefix or reply_to_user_id is stored NULL", a.ok && a.rows[0].reply_to_name === null, a.error ?? a.rows[0]);
    const b = await as<Reply>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content,reply_to_user_id,reply_to_name) values ('${P8}','${U1}','好的','${U2}','官方客服') returning *`);
    check("reply_to_name = username of reply_to_user_id", b.ok && b.rows[0].reply_to_name === "other" && b.rows[0].reply_to_user_id === U2, b.error ?? b.rows[0]);
    const c = await as<Reply>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content,reply_to_name) values ('${P8}','${U1}','回复 @other：收到','ADMIN 官方客服 加微信 xyz') returning *`);
    check("legacy prefix: the parsed name wins over the client value", c.ok && c.rows[0].reply_to_name === "other" && c.rows[0].content === "收到", c.error ?? c.rows[0]);
    const u = await as<Reply>("authenticated", A1,
      `update public.post_comments set reply_to_name='改过的名字', content='好的!' where id='${b.rows[0].id}' returning *`);
    check("UPDATE without a prefix keeps the stored reply_to_name", u.ok && u.rows[0].reply_to_name === "other", u.error ?? u.rows[0]);
    // 前缀里的名字不是本帖任何评论者 / 不是 reply_to_user_id 的用户名:前缀留在正文里,和正文一起送审
    const d = await as<Reply>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content) values ('${P8}','${U1}','回复 @加微信cheapcarz先付定金送车：同意') returning *`);
    const dIn = d.ok ? await q<{ mod_payload: { content?: string } }>(
      "select mod_payload from public.i18n_moderation_input('post_comment', $1)", [d.rows[0].id]) : [];
    check("legacy prefix naming nobody in the thread stays in the content (moderated), reply_to_* NULL",
      d.ok && d.rows[0].content === "回复 @加微信cheapcarz先付定金送车：同意" && d.rows[0].reply_to_name === null &&
        d.rows[0].reply_to_user_id === null && dIn[0]?.mod_payload.content === d.rows[0].content, { d: d.error ?? d.rows[0], dIn });
    const e = await as<Reply>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content,reply_to_user_id) values ('${P8}','${U1}','回复 @官方客服：收到','${U2}') returning *`);
    check("legacy prefix with another name than reply_to_user_id's username stays in the content; name = that username",
      e.ok && e.rows[0].content === "回复 @官方客服：收到" && e.rows[0].reply_to_name === "other" && e.rows[0].reply_to_user_id === U2,
      e.error ?? e.rows[0]);
    const f = await as<Reply>("authenticated", A1,
      `update public.post_comments set content='回复 @other：同意!' where id='${a.rows[0].id}' returning *`);
    check("UPDATE whose content carries a prefix of a thread commenter moves it into reply_to_*",
      f.ok && f.rows[0].content === "同意!" && f.rows[0].reply_to_name === "other" && f.rows[0].reply_to_user_id === U2,
      f.error ?? f.rows[0]);
    // 前缀里的人后来才在本帖评论:只改计数的 UPDATE 不重新解析正文(正文、reply_to_* 都不变)
    const g = await as<Reply>("authenticated", U1,
      `insert into public.post_comments(post_id,user_id,content) values ('${P8}','${U1}','回复 @admin：好') returning *`);
    await as("authenticated", A1, `insert into public.post_comments(post_id,user_id,content) values ('${P8}','${A1}','我来了')`);
    const g2 = await as<Reply>("authenticated", A1,
      `update public.post_comments set likes_count = 1 where id='${g.rows[0]?.id}' returning *`);
    check("an UPDATE that leaves the content alone never re-parses a prefix",
      g.ok && g.rows[0].content === "回复 @admin：好" && g2.ok && g2.rows[0]?.content === "回复 @admin：好" &&
        g2.rows[0].reply_to_name === null && g2.rows[0].reply_to_user_id === null, { g: g.error ?? g.rows[0], g2: g2.error ?? g2.rows[0] });
    let capped = "";
    try {
      await db.exec(`select set_config('i18n.writer','pipeline',false);
        insert into public.post_comments(post_id,user_id,content,reply_to_name) values ('${P8}','${U1}','x','${"名".repeat(41)}')`);
    } catch (e) {
      capped = e instanceof Error ? e.message : String(e);
    } finally {
      await db.exec(`select set_config('i18n.writer','',false)`);
    }
    check("reply_to_name length CHECK (<= 40) applies even to writers the trigger does not derive for",
      /post_comments_reply_to_name_len/.test(capped), capped);
  });

  await section("[N5] glossary: per-entity groups, slug-equality join only, label-widened search, display rule (R4)", async () => {
    const P9 = "d9d9d9d9-0000-0000-0000-000000000009";
    await as("authenticated", U2,
      `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${P9}','${U2}','discussion','自動車保険','#車の保険 のおすすめは？',array['車の保険'])`);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${P9}'`);
    const cl = await as<TermClaimRow>("service_role", null, `select * from public.i18n_claim_terms(20, 60)`);
    const mine = cl.rows.filter((r) => r.group_id === P9);
    check("one group = one post's aliases, single lease token, untrusted",
      mine.length >= 1 && new Set(mine.map((r) => r.lease_token)).size === 1 && mine.every((r) => r.trusted === false), mine);
    const a = mine.find((r) => r.alias_norm === "車の保険")!;
    const t = await as<{ id: number }>("service_role", null, `select public.i18n_complete_term('topic','車の保険','${a.lease_token}','ok','car-insurance',
      '{"zh":"汽车保险","en":"Car insurance","ko":"자동차 보험","ja":"自動車保険","es":"Seguro de auto","fr":"Assurance auto"}','m',null,'ja') id`);
    const ins = await q<{ id: string }>("select id::text from i18n.terms where kind='topic' and slug='insurance'");
    const ci = await q<{ id: string }>("select id::text from i18n.terms where kind='topic' and slug='car-insurance'");
    check("different slug -> its own topic (no label-driven auto-merge)", t.ok && ci.length === 1 && ci[0].id !== ins[0].id, { t: t.rows, ins, ci });
    const al = await q<{ n: string }>("select count(*)::text n from i18n.term_aliases a join i18n.terms t on t.id=a.term_id where t.slug='car-insurance'");
    check("LLM labels never become aliases (only the leased spelling is linked)", al[0].n === "1", al);
    const s1 = await as<{ id: string }>("anon", null, `select id from public.search_posts('#Assurance auto')`);
    check("#Assurance auto (fr label) finds the ja-tagged post via labels", s1.rows.some((x) => x.id === P9), s1.rows);
    const s2 = await as<{ id: string }>("anon", null, `select id from public.search_posts('#자동차 보험')`);
    check("#자동차 보험 (ko label) finds it too", s2.rows.some((x) => x.id === P9), s2.rows);
    const lab = async (l: string) => (await as<{ x: { topics: TopicChip[] } }>("anon", null,
      `select x from public.i18n_bundle('post', array['${P9}']::uuid[], '${l}')`)).rows[0].x.topics[0];
    const ja = await lab("ja"), zh = await lab("zh"), en = await lab("en");
    check("display: tag already in the UI language shows verbatim (ja)", ja.label === "車の保険" && ja.slug === "car-insurance", ja);
    check("display: other locales show the topic label", zh.label === "汽车保险" && en.label === "Car insurance", { zh, en });
    const tg = await as<{ j: { label: string; post_count: number; canonical_slug: string } }>("anon", null, `select public.topic_get('insurance','ja') j`);
    const j = tg.rows[0].j;
    check("topic_get: localized label + post count", j.label === "保険" && j.post_count === 2 && j.canonical_slug === "insurance", j);
  });

  await section("[N6] hashtag tokens stop at full-width punctuation", async () => {
    const r = await q<{ t: string }>("select i18n.hashtag_tokens('好车 #特斯拉，真不错 #Model3! #保险。完') t");
    check("tokens", r.map((x) => x.t).join("|") === "特斯拉|Model3|保险", r);
    const n = await q<{ a: string; b: string; c: string | null }>(
      "select public.i18n_norm_tag('#CR-V') a, public.i18n_norm_tag('＃Model 3') b, public.i18n_norm_tag('  ') c");
    check("norm_tag: CR-V -> crv, ＃Model 3 -> model3, blank -> null", n[0].a === "crv" && n[0].b === "model3" && n[0].c === null, n);
    const an = await as<{ n: string }>("anon", null, "select public.i18n_norm_tag('#Tesla') n");
    check("anon can call public.i18n_norm_tag (no i18n schema access needed)", an.ok && an.rows[0].n === "tesla", an);
    const eq = await q<{ bad: string }>(`select count(*)::text bad from unnest(array['#CR-V','＃Model 3','  特斯拉 ','#テスラ','#테슬라','TESLA','Backup_Camera','倒车·影像','Ｍｏｄｅｌ３','#','','a.b-c d','ÉCOLE','#ß',
       E'\\t#特斯拉', E'\\u3000#特斯拉', E'\\u00a0#保险', E'Model\\ufeffY', E'Model\\u0085Y', E'\\ufeff\\u202f']) x
       where public.i18n_norm_tag(x) is distinct from i18n.norm_tag(x)`);
    check("public.i18n_norm_tag == i18n.norm_tag on the parity samples", eq[0].bad === "0", eq);
  });

  await section("[N7] B10 data migration: removed cars of banned sellers become admin removals", () => fresh(async (db3) => {
    await db3.exec(`insert into auth.users(id) values ('${U1}'); insert into public.profiles(id, username, banned) values ('${U1}','s', true);
      insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, status)
      values ('${C1}','${U1}','t','t',2019,'Toyota','Camry',1,1,'a','b','s','removed');`);
    await db3.exec(SCHEMA);
    await db3.exec(DATA);
    const r = (await db3.query<{ rr: string }>("select removal_reason rr from public.cars")).rows[0];
    check("removal_reason = admin", r.rr === "admin", r);
  }));

  await section("[N8] original_uncertain: owner edit clears it, owner cannot set it", async () => {
    const C10 = "cacacaca-caca-caca-caca-cacacacacaca";
    await db.exec(`select set_config('i18n.writer','pipeline',false);
      insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, original_uncertain)
      values ('${C10}','${U1}','x','x',2018,'Honda','Fit',1,1,'a','b','s','AI 文本', true);
      select set_config('i18n.writer','',false);`);
    const r0 = await as("authenticated", U1, `update public.cars set mileage=2 where id='${C10}'`);
    const c0 = await q<{ u: boolean }>("select original_uncertain u from public.cars where id=$1", [C10]);
    check("unrelated owner edit keeps the flag", r0.ok && c0[0].u === true, c0);
    const r1 = await as("authenticated", U1, `update public.cars set original_uncertain=false where id='${C10}'`);
    const c1 = await q<{ u: boolean; o: string }>("select original_uncertain u, description_original o from public.cars where id=$1", [C10]);
    check("owner confirms the wording (unchanged text, sends false) -> cleared", r1.ok && c1[0].u === false && c1[0].o === "AI 文本", c1);
    const r2 = await as("authenticated", U1, `update public.cars set original_uncertain=true where id='${C10}'`);
    const c2 = await q<{ u: boolean }>("select original_uncertain u from public.cars where id=$1", [C10]);
    check("owner cannot set the flag", r2.ok && c2[0].u === false, c2);
    await db.exec(`select set_config('i18n.writer','pipeline',false); update public.cars set original_uncertain=true where id='${C10}'; select set_config('i18n.writer','',false);`);
    await as("authenticated", U1, `update public.cars set description_original='卖家自己写的原文' where id='${C10}'`);
    const c3 = await q<{ u: boolean }>("select original_uncertain u from public.cars where id=$1", [C10]);
    check("owner re-save of the original clears it", c3[0].u === false, c3);
  });

  await section("[N9] grants: pipeline/detection/usage/admin RPCs are not callable by anon", async () => {
    for (const text of [
      "select * from public.i18n_claim_terms(1,60)",
      "select public.i18n_record_detection('[]'::jsonb)",
      "select public.i18n_add_usage(1)",
      "select * from public.i18n_detection_queue(1)",
      "select public.i18n_admin_restore_moderation(now())",
      "select * from public.i18n_moderation_queue(1,60)",
      "select * from public.i18n_budget_state()",
      "select public.i18n_admin_requeue_terms()",
      `select public.i18n_admin_restore_translation('${P1}')`,
    ]) {
      const r = await as("anon", null, text);
      check(`anon denied: ${text.slice(0, 50)}`, !r.ok, r.error);
    }
    const r2 = await as("authenticated", U2, "select public.i18n_admin_restore_moderation(now())");
    check("non-admin authenticated cannot bulk-restore", !r2.ok && /forbidden/.test(r2.error ?? ""), r2.error);
    for (const text of ["select * from public.i18n_moderation_queue(1,60)", "select * from public.i18n_budget_state()"]) {
      const r = await as("authenticated", U2, text);
      check(`authenticated denied (service only): ${text.slice(0, 50)}`, !r.ok && /permission denied/.test(r.error ?? ""), r.error);
    }
  });

  await section("[N10] bulk restore of AI moderation decisions", async () => {
    const before = await q<{ n: string }>("select count(*)::text n from public.ai_moderation where status='pending'");
    const r = await as<{ n: number }>("authenticated", A1, "select public.i18n_admin_restore_moderation(now() - interval '1 day') n");
    const ps = await q<{ status: string }>("select status from public.community_posts where id='d6d6d6d6-0000-0000-0000-000000000006'");
    check("admin bulk restore re-activates moderated content",
      r.ok && Number(r.rows[0].n) === Number(before[0].n) && ps[0].status === "active", { r: r.rows, before, ps });
  });

  await section("[N11] owners cannot mark their car as syndicated to skip moderation (critic gap 3)", async () => {
    const C11 = "cbcbcbcb-cbcb-cbcb-cbcb-cbcbcbcbcbcb";
    const ins = await as<{ source_id: string | null; source_listing_id: string | null }>("authenticated", U1,
      `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, source_id, source_listing_id)
      values ('${C11}','${U1}','x','x',2018,'Honda','Civic',1,1,'a','b','s','我的车', '${SRC}', 'stock-1') returning source_id, source_listing_id`);
    const ir = ins.rows[0];
    check("browser INSERT cannot set source_id / source_listing_id", ins.ok && ir.source_id === null && ir.source_listing_id === null, ins);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${C11}'`);
    const up = await as("authenticated", U1, `update public.cars set source_id='${SRC}', description_original='BUY NOW scam text call 555' where id='${C11}'`);
    const c = await q<{ source_id: string | null }>("select source_id from public.cars where id=$1", [C11]);
    check("owner UPDATE of source_id is coerced back", up.ok && c[0].source_id === null, c);
    const src = await q<{ moderation: string; trusted: boolean }>("select moderation, trusted from i18n.sources where entity='car' and entity_id=$1", [C11]);
    check("edited text needs moderation and is untrusted", src[0].moderation === "pending" && src[0].trusted === false, src);
    const cl = await as<{ needs_moderation: boolean; meta: { trusted: boolean } }>("service_role", null,
      `select needs_moderation, meta from public.i18n_claim(6,120,'car',array['${C11}']::uuid[])`);
    const r = cl.rows[0];
    check("claim: needs_moderation=true, meta.trusted=false", !!r && r.needs_moderation === true && r.meta.trusted === false, r);
  });

  await section("[N11b] identity-only UPDATEs are coerced too, in observe and enforce mode (F001)", async () => {
    const C11 = "cbcbcbcb-cbcb-cbcb-cbcb-cbcbcbcbcbcb";
    const KEY = "abababab-0000-0000-0000-0000000000ab";
    await db.exec(`insert into public.api_keys(id) values ('${KEY}')`);
    const updates: Array<[string, string]> = [
      ["{source_id}", `source_id='${SRC}'`],
      ["{source_id, source_listing_id}", `source_id='${SRC}', source_listing_id='stock-2'`],
      ["{source_id, source_listing_id, phone}", `source_id='${SRC}', source_listing_id='stock-2', phone='604-555-0100'`],
      ["{api_key_id, external_id}", `api_key_id='${KEY}', external_id='ext-2'`],
    ];
    for (const enforce of [false, true]) {
      await as(null, null, `select public.i18n_admin_set('enforce','${enforce}'::jsonb)`);
      for (const [label, set] of updates) {
        const r = await as("authenticated", U1, `update public.cars set ${set} where id='${C11}'`);
        const c = await q<{ source_id: string | null; source_listing_id: string | null; api_key_id: string | null; external_id: string | null }>(
          "select source_id, source_listing_id, api_key_id, external_id from public.cars where id=$1", [C11]);
        check(`${enforce ? "enforce" : "observe"} mode: owner UPDATE ${label} keeps the identity columns`,
          r.ok && c[0].source_id === null && c[0].source_listing_id === null && c[0].api_key_id === null && c[0].external_id === null,
          { r: r.error, c });
      }
    }
    const ph = await q<{ phone: string }>("select phone from public.cars where id=$1", [C11]);
    check("the owner's own columns in the same UPDATE still apply (phone)", ph[0].phone === "604-555-0100", ph);
    // 转载槽位被别的账号占着(v2 之前就存在的劫持):同步以 service 身份改写也不算可信
    const C13 = "cececece-cece-cece-cece-cececececece";
    await db.exec(`insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original)
      values ('${C13}','${U1}','x','x',2020,'Honda','Fit',1,1,'a','b','s','我的车');
      set session_replication_role = replica;
      update public.cars set source_id='${SRC}', source_listing_id='stock-13' where id='${C13}';
      set session_replication_role = origin;`);
    const sync = await as("service_role", null, `update public.cars set description_original='Dealer text for stock 13. Clean title.' where id='${C13}'`);
    const s = await q<{ trusted: boolean; moderation: string }>("select trusted, moderation from i18n.sources where entity='car' and entity_id=$1", [C13]);
    check("a sync write to a slot held by another account is untrusted and moderated",
      sync.ok && s[0].trusted === false && s[0].moderation === "pending", s);
  });

  await section("[N12] claimant edits of a syndicated car are moderated; a sync write is trusted again only over moderated or restored text", async () => {
    const CL = "cccccccc-0000-0000-0000-00000000000c";
    const C12 = "cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd";
    await db.exec(`insert into auth.users(id) values ('${CL}'); insert into public.profiles(id, username) values ('${CL}','claimant');
      update public.profiles set claimed_by='${CL}' where id='${S1}';`);
    await as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description, source_id, source_listing_id)
      values ('${C12}','${S1}','x','x',2021,'Kia','Soul',1,1,'a','b','dealer','Dealer text, clean title.','${SRC}','stock-12')`);
    const s0 = await q<{ moderation: string; trusted: boolean }>("select moderation, trusted from i18n.sources where entity_id=$1", [C12]);
    check("sync insert of a syndicated car: trusted + moderation skipped", s0[0].moderation === "skipped" && s0[0].trusted === true, s0);
    const e = await as("authenticated", CL, `update public.cars set description_original='Claimant rewrote this. Call 555-0100 now!' where id='${C12}'`);
    const s1 = await q<{ moderation: string; trusted: boolean }>("select moderation, trusted from i18n.sources where entity_id=$1", [C12]);
    check("claimant edit (RLS claimant_manage_cars) -> pending + untrusted", e.ok && s1[0].moderation === "pending" && s1[0].trusted === false, { e, s1 });
    const cl = await as<{ needs_moderation: boolean; meta: { trusted: boolean } }>("service_role", null,
      `select needs_moderation, meta from public.i18n_claim(6,120,'car',array['${C12}']::uuid[])`);
    const r = cl.rows[0];
    check("claim after claimant edit: moderated + output-moderated", !!r && r.needs_moderation === true && r.meta.trusted === false, r);
    await as("service_role", null, `update public.cars set description_original='Dealer text, clean title.' where id='${C12}'`);
    const s2 = await q<{ moderation: string; trusted: boolean }>("select moderation, trusted from i18n.sources where entity_id=$1", [C12]);
    check("next sync write restores trusted dealer text", s2[0].moderation === "skipped" && s2[0].trusted === true, s2);
    // 认领人改了款型 + 配置(没审),同步只改写描述 + 配置:款型仍是认领人写的,新版本不可信、整体送审
    await as("authenticated", CL, `update public.cars set trim='加微信 claimtrim', features_original=array['Sunroof','x'] where id='${C12}'`);
    await as("service_role", null, `update public.cars set description_original='Dealer text v2.', features_original=array['Sunroof'] where id='${C12}'`);
    const s3 = await q<{ moderation: string; trusted: boolean }>("select moderation, trusted from i18n.sources where entity_id=$1", [C12]);
    const in3 = await as<{ moderated: boolean; mod_hash: string; mod_payload: { trim?: string } }>("service_role", null,
      `select moderated, mod_hash, mod_payload from public.i18n_moderation_input('car','${C12}')`);
    const q3 = await as<{ entity_id: string }>("service_role", null, "select entity_id from public.i18n_moderation_queue(50, 90)");
    check("sync rewrite over an unmoderated claimant trim stays untrusted + pending, and is queued for moderation",
      s3[0].moderation === "pending" && s3[0].trusted === false && in3.rows[0]?.moderated === false &&
        in3.rows[0].mod_payload.trim === "加微信 claimtrim" && q3.rows.some((x) => x.entity_id === C12), { s3, in3: in3.rows, q3: q3.rows });
    // 这一版审过(pass)之后,同步的下一次改写重新可信
    await as("service_role", null, `select public.i18n_record_moderation('car','${C12}','${in3.rows[0].mod_hash}','pass')`);
    await as("service_role", null, `update public.cars set description_original='Dealer text v3.' where id='${C12}'`);
    const s4 = await q<{ moderation: string; trusted: boolean }>("select moderation, trusted from i18n.sources where entity_id=$1", [C12]);
    check("once that version passed moderation, the next sync write is trusted again",
      s4[0].moderation === "skipped" && s4[0].trusted === true, s4);
  });

  await section("[N13] one post's glossary result cannot relabel or capture another post's tags (critic gap 4)", async () => {
    const PA = "dadadada-0000-0000-0000-00000000000a", PB = "dbdbdbdb-0000-0000-0000-00000000000b";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PA}','${U2}','discussion','victim','my post',array['新款凯美瑞'])`);
    await as("authenticated", U1, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PB}','${U1}','discussion','attacker','junk',array['xyzjunk'])`);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id in ('${PA}','${PB}')`);
    const ct = await as<TermClaimRow>("service_role", null, `select * from public.i18n_claim_terms(20, 60)`);
    const att = ct.rows.find((r) => r.alias_norm === "xyzjunk")!;
    check("attacker alias claimed in the attacker's own group", !!att && att.group_id === PB, ct.rows);
    await as("service_role", null, `select public.i18n_complete_term('topic','xyzjunk','${att.lease_token}','ok','scam-topic','{"zh":"新款凯美瑞","en":"Scam","ko":"사기","ja":"詐欺","es":"Estafa","fr":"Arnaque"}','m',null,'en')`);
    const v = await q<{ state: string; term_id: string | null }>("select state, term_id::text from i18n.term_aliases where alias_norm='新款凯美瑞'");
    check("victim alias untouched (still pending, unlinked)", v[0].state === "pending" && v[0].term_id === null, v);
    const b = await as<{ x: { topics: TopicChip[] } }>("anon", null, `select x from public.i18n_bundle('post', array['${PA}']::uuid[], 'ko')`);
    const topic = b.rows[0].x.topics[0];
    check("victim chip shows its own raw tag, no foreign slug", topic.label === "新款凯美瑞" && topic.slug === null, topic);
    const g = await q<{ n: string }>("select count(*)::text n from i18n.term_aliases a join i18n.terms t on t.id=a.term_id where t.slug='scam-topic'");
    check("no global aliases minted from LLM labels", g[0].n === "1", g);
    const later = "dcdcdcdc-0000-0000-0000-00000000000c";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${later}','${U2}','discussion','t','#사기 조심하세요','{}')`);
    const b2 = await as<{ x: { topics: TopicChip[] } }>("anon", null, `select x from public.i18n_bundle('post', array['${later}']::uuid[], 'zh')`);
    const t2 = b2.rows[0].x.topics[0];
    check("a later post tagged with an attacker label is NOT auto-resolved to the attacker's topic", t2.slug === null && t2.label === "사기", t2);
  });

  await section("[N14] free text still matches raw (unresolved) tags", async () => {
    const PM = "dddddddd-0000-0000-0000-00000000000d";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PM}','${U2}','showoff','周末','看看我的车',array['改装'])`);
    const r = await as<{ id: string }>("anon", null, `select id from public.search_posts('改装')`);
    check("typing 改装 finds the post tagged 改装 before glossary resolution", r.rows.some((x) => x.id === PM), r.rows);
  });

  await section("[N15] bundle.pl (primary language) and sitemap x-default agree for mixed-language posts", async () => {
    const P7 = "d7d7d7d7-0000-0000-0000-000000000007";
    const b = await as<{ sl: string; pl: string; al: string[] }>("anon", null, `select sl, pl, al from public.i18n_bundle('post', array['${P7}']::uuid[], 'zh')`);
    const r = b.rows[0];
    check("zh row: sl = language the shown translation came from, pl = primary (en)", r.sl === "en" && r.pl === "en", r);
    const e = await as<{ id: string; x_default: string }>("service_role", null, `select id, x_default from public.sitemap_entries('post','zh',0,1000)`);
    const row = e.rows.find((x) => x.id === P7);
    check("sitemap x_default = pl", row?.x_default === "en", row);
  });

  await section("[N17] rejected unsafe machine output is reviewable; restore requeues the locale", async () => {
    const PR = "dededede-0000-0000-0000-00000000000e";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PR}','${U2}','discussion','普通标题','普通内容')`);
    await db.exec(`update i18n.sources set moderation='pass', moderated_hash=mod_hash where entity_id='${PR}'`);
    const c = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5,60,'post',array['${PR}']::uuid[],array['ko'])`);
    const row = c.rows[0];
    const res = JSON.stringify([{ locale: "ko", outcome: "rejected", error: "unsafe_output", text: "위험한 출력", categories: ["scam"], reason: "output looks like a scam", model: "m" }]);
    await as("service_role", null, `select public.i18n_complete('post','${PR}','${row.lease_token}','${row.src_hash}',null,'${res}','{}')`);
    const am = await q<{ status: string; context: { entity: string; locales: string[] }; user_id: string }>(
      "select status, context, user_id from public.ai_moderation where target_type='translation' and target_id=$1", [PR]);
    check("ai_moderation translation row with entity + locales context",
      am.length === 1 && am[0].context.entity === "post" && am[0].context.locales.join() === "ko" && am[0].user_id === U2, am);
    const st = await q<{ state: string }>("select state from i18n.translations where entity_id=$1 and locale='ko'", [PR]);
    check("locale rejected (original shown)", st[0].state === "rejected", st);
    const rr = await as("authenticated", A1, "select public.i18n_admin_restore_moderation(now() - interval '1 hour', 'translation') n");
    const st2 = await q<{ state: string }>("select state from i18n.translations where entity_id=$1 and locale='ko'", [PR]);
    check("admin restore of a translation flag requeues the locale", rr.ok && st2[0].state === "pending", { rr, st2 });
  });

  await section("[N18] legacy stash survives the enforce flip (critic gap 5)", async () => {
    const lp = await as<{ entity_id: string; legacy: { description_zh: string }; payload: { description: string } }>("service_role", null,
      `select entity_id, legacy, payload from public.i18n_legacy_page('car', null, 100)`);
    const c2 = lp.rows.find((x) => x.entity_id === C2);
    check("stash keeps the pre-migration description_zh", c2?.legacy.description_zh === "清洁产权。长续航。", c2);
    const now = await q<{ dz: string }>("select description_zh dz from public.cars where id=$1", [C2]);
    check("(cars.description_zh itself was re-projected by enforce)", typeof now[0].dz === "string", now);
    const an = await as("anon", null, `select * from public.i18n_legacy_page('car', null, 1)`);
    check("legacy stash is service-only", !an.ok, an.error);
  });

  await section("[N19] moderate_outputs comes from i18n.settings via claim meta", async () => {
    await as(null, null, `select public.i18n_admin_set('moderate_outputs','false'::jsonb)`);
    const PO = "dfdfdfdf-0000-0000-0000-00000000000f";
    await db.exec(`insert into public.community_posts(id,user_id,type,title,content) values ('${PO}','${U1}','discussion','标题','内容')`);
    const c = await as<{ meta: { moderate_outputs: boolean } }>("service_role", null, `select meta from public.i18n_claim(5,60,'post',array['${PO}']::uuid[])`);
    check("meta.moderate_outputs=false after admin_set", c.rows[0]?.meta.moderate_outputs === false, c.rows);
    await as(null, null, `select public.i18n_admin_set('moderate_outputs','true'::jsonb)`);
  });

  await section("[N20] the moderation key covers make / model / trim / features / tags (F050, F002, F008, F024, F046)", () => fresh(async (db5) => {
    const { q, as } = client(db5);
    await migrated(db5);
    const CN = "c5c5c5c5-0000-0000-0000-000000000001", CD = "c5c5c5c5-0000-0000-0000-000000000002";
    const CS = "c5c5c5c5-0000-0000-0000-000000000003", PT = "d5d5d5d5-0000-0000-0000-000000000001";
    const QT = "a5a5a5a5-0000-0000-0000-000000000001", CL = "cccccccc-0000-0000-0000-00000000000c";
    const input = async (e: string, id: string) =>
      (await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('${e}','${id}')`)).rows[0];
    const record = async (e: string, id: string, hash: string, verdict = "pass") =>
      (await as<{ v: string }>("service_role", null, `select public.i18n_record_moderation('${e}','${id}','${hash}','${verdict}') v`)).rows[0]?.v;
    const queue = async () =>
      (await as<{ entity: string; entity_id: string; mod_hash: string }>("service_role", null, "select * from public.i18n_moderation_queue(50, 90)")).rows;
    const states = async (id: string) =>
      (await q<{ s: string }>("select string_agg(distinct state, ',') s from i18n.translations where entity_id=$1", [id]))[0].s;

    // 1. /post 不填描述:型号 / 版本 / 配置都是自由文本,照样要审
    const ins = await as("authenticated", U1, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, trim, price, mileage, location, location_zh, seller_name, features_original)
      values ('${CN}','${U1}','x','x',2019,'Toyota','Camry','WeChat abc123',1,1,'a','b','s',array['加微信 abc123 出售假驾照','  '])`);
    const i1 = await input("car", CN);
    check("description-less car: moderation pending, not settled", ins.ok && i1.moderation === "pending" && i1.moderated === false, { ins, i1 });
    check("mod_payload = make / model / trim / non-empty feature tags (no description key)",
      i1.mod_payload.make === "Toyota" && i1.mod_payload.model === "Camry" && i1.mod_payload.trim === "WeChat abc123" &&
        JSON.stringify(i1.mod_payload.features) === JSON.stringify(["加微信 abc123 出售假驾照"]) && !("description" in i1.mod_payload),
      i1.mod_payload);
    check("nothing to translate (every locale skipped), so no translation claim carries it",
      (await states(CN)) === "skipped" &&
        (await as("service_role", null, `select * from public.i18n_claim(6,120,'car',array['${CN}']::uuid[])`)).rows.length === 0);
    const q1 = await queue();
    check("i18n_moderation_queue hands it out with its mod_hash", q1.some((r) => r.entity_id === CN && r.mod_hash === i1.mod_hash), q1);
    check("leased: the next queue call does not hand it out again", !(await queue()).some((r) => r.entity_id === CN));
    check("a verdict keyed to the translation hash is stale", (await record("car", CN, i1.src_hash)) === "stale");
    const v1 = await record("car", CN, i1.mod_hash);
    const l1 = await q<{ lease: string | null }>("select mod_lease_until::text lease from i18n.sources where entity_id=$1", [CN]);
    check("verdict recorded on mod_hash; the queue lease is released", v1 === "pass" && (await input("car", CN)).moderated && l1[0].lease === null, { v1, l1 });

    // 2. 只改配置 / 版本 / 型号:重新审核,译文不动
    const edits: Array<[string, string]> = [
      ["features-only", "features_original=array['倒车影像','加微信 cheapcarz 低价收定金']"],
      ["trim-only", "trim='SE 加微信 abc'"],
      ["model-only", "model='Camry 加微信'"],
    ];
    for (const [label, set] of edits) {
      const before = await input("car", CN);
      await as("authenticated", U1, `update public.cars set ${set} where id='${CN}'`);
      const after = await input("car", CN);
      check(`${label} edit: moderation pending again, translation hash unchanged`,
        after.moderation === "pending" && !after.moderated && after.mod_hash !== before.mod_hash && after.src_hash === before.src_hash,
        { before, after });
      await record("car", CN, after.mod_hash);
    }
    const kept = await input("car", CN);
    await as("authenticated", U1, `update public.cars set price=2, mileage=3 where id='${CN}'`);
    const k2 = await input("car", CN);
    check("price / mileage edits keep the verdict (not moderated text)", k2.moderated && k2.mod_hash === kept.mod_hash, k2);

    // 3. 有描述的车:claim 带 mod_hash,needs_moderation 跟着 mod_hash 走,译文行不因配置改动重置
    await as("authenticated", U1, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original)
      values ('${CD}','${U1}','x','x',2018,'Honda','Accord',1,1,'a','b','s','一手车 保养记录齐全')`);
    const d0 = await input("car", CD);
    await record("car", CD, d0.mod_hash);
    const c1 = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6,120,'car',array['${CD}']::uuid[])`)).rows[0];
    check("claim returns the verdict key (mod_hash) and no moderation once settled",
      !!c1 && c1.mod_hash === d0.mod_hash && c1.needs_moderation === false, c1);
    await db5.exec(`update i18n.translations set lease_token = null, lease_until = null where entity_id='${CD}'`);
    const tr0 = await q<{ ua: string }>("select max(updated_at)::text ua from i18n.translations where entity_id=$1", [CD]);
    await as("authenticated", U1, `update public.cars set features_original=array['天窗'] where id='${CD}'`);
    const tr1 = await q<{ ua: string }>("select max(updated_at)::text ua from i18n.translations where entity_id=$1", [CD]);
    const c2 = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6,120,'car',array['${CD}']::uuid[])`)).rows[0];
    check("features-only edit: claim needs moderation again for the new mod_hash, translations untouched",
      tr0[0].ua === tr1[0].ua && !!c2 && c2.needs_moderation === true && c2.mod_hash !== d0.mod_hash && c2.src_hash === c1.src_hash,
      { tr0, tr1, c2 });
    // 绕过触发器只改了配置:claim 发现审核键漂移,自愈(不可信、待审)后本轮不领取
    await db5.exec(`update i18n.translations set lease_token = null, lease_until = null where entity_id='${CD}';
      set session_replication_role = replica;
      update public.cars set features_original=array['天窗','加微信 bypass'] where id='${CD}';
      set session_replication_role = origin;`);
    const c3 = await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6,120,'car',array['${CD}']::uuid[])`);
    const healed = await input("car", CD);
    check("claim self-heals a moderation-payload drift (trigger bypass): re-keyed, pending, not leased this round",
      c3.ok && c3.rows.length === 0 && healed.mod_hash !== c2.mod_hash && healed.moderation === "pending" &&
        JSON.stringify(healed.mod_payload.features) === JSON.stringify(["天窗", "加微信 bypass"]), { c3: c3.rows, healed });

    // 4. 帖子 / 提问只改标签
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PT}','${U2}','discussion','保险','求推荐',array['保险'])`);
    await record("post", PT, (await input("post", PT)).mod_hash);
    const pt0 = await input("post", PT);
    await as("authenticated", U2, `update public.community_posts set tags=array['保险','加微信cheapcarz收定金'] where id='${PT}'`);
    const pt1 = await input("post", PT);
    check("post tags-only edit: moderation pending, translation hash unchanged, tags in mod_payload",
      pt0.moderated && !pt1.moderated && pt1.moderation === "pending" && pt1.src_hash === pt0.src_hash &&
        JSON.stringify(pt1.mod_payload.tags) === JSON.stringify(["保险", "加微信cheapcarz收定金"]), { pt0, pt1 });
    await as("authenticated", U2, `insert into public.qa_questions(id,user_id,title,content,tags) values ('${QT}','${U2}','怎么过户','刚到加州',array['过户'])`);
    await record("qa_question", QT, (await input("qa_question", QT)).mod_hash);
    await as("authenticated", U2, `update public.qa_questions set tags=array['过户','加微信 xyz'] where id='${QT}'`);
    const qt = await input("qa_question", QT);
    check("question tags-only edit: moderation pending", qt.moderation === "pending" && !qt.moderated, qt);

    // 5. 认领人只改转载车的配置:失去可信,标签审核前不进词表
    await db5.exec(`insert into auth.users(id) values ('${CL}'); insert into public.profiles(id, username) values ('${CL}','claimant');
      update public.profiles set claimed_by='${CL}' where id='${S1}';`);
    await as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, features_original, source_id, source_listing_id)
      values ('${CS}','${S1}','x','x',2021,'Kia','Soul',1,1,'a','b','dealer','Dealer text, clean title.',array['Sunroof'],'${SRC}','stock-5')`);
    const s0 = await q<{ trusted: boolean; moderation: string }>("select trusted, moderation from i18n.sources where entity_id=$1", [CS]);
    check("sync insert by the source's system account: trusted, moderation skipped", s0[0].trusted && s0[0].moderation === "skipped", s0);
    await as("authenticated", CL, `update public.cars set features_original=array['Sunroof','加微信 dealer888 先付定金'] where id='${CS}'`);
    const s1 = await q<{ trusted: boolean; moderation: string }>("select trusted, moderation from i18n.sources where entity_id=$1", [CS]);
    const t1 = await as<TermClaimRow>("service_role", null, "select * from public.i18n_claim_terms(20, 60)");
    check("claimant features-only edit: untrusted + pending; its tags wait for the verdict",
      !s1[0].trusted && s1[0].moderation === "pending" && !t1.rows.some((r) => r.group_id === CS), { s1, t1: t1.rows });
    await record("car", CS, (await input("car", CS)).mod_hash);
    const t2 = await as<TermClaimRow>("service_role", null, "select * from public.i18n_claim_terms(20, 60)");
    const mine = t2.rows.filter((r) => r.group_id === CS);
    check("after the verdict the group is claimed untrusted (labels get moderated)", mine.length > 0 && mine.every((r) => !r.trusted), t2.rows);
  }));

  await section("[N21] moderation queue + its own daily budget (C1, F005)", () => fresh(async (db6) => {
    const { q, as } = client(db6);
    await migrated(db6);
    const PA = "d6d6d6d6-0000-0000-0000-00000000000a", PB = "d6d6d6d6-0000-0000-0000-00000000000b";
    const PH = "d6d6d6d6-0000-0000-0000-00000000000c", CT = "c6c6c6c6-0000-0000-0000-000000000001";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PA}','${U2}','discussion','标题A','内容A')`);
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PB}','${U2}','discussion','标题B','内容B')`);
    await db6.exec(`insert into public.community_posts(id,user_id,type,title,content,status) values ('${PH}','${U2}','discussion','隐藏','内容','hidden')`);
    await as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, source_id, source_listing_id)
      values ('${CT}','${S1}','x','x',2021,'Kia','Soul',1,1,'a','b','dealer','Dealer text.','${SRC}','stock-6')`);
    const queue = async () =>
      (await as<{ entity_id: string; mod_hash: string }>("service_role", null, "select * from public.i18n_moderation_queue(50, 90)")).rows;
    const budget = async () =>
      (await as<{ translate_exhausted: boolean; moderation_exhausted: boolean }>("service_role", null, "select * from public.i18n_budget_state()")).rows[0];
    const usage = async () => (await q<{ calls: number; mod_calls: number }>("select calls, mod_calls from i18n.budget"))[0] ?? { calls: 0, mod_calls: 0 };
    const q1 = await queue();
    const ids = q1.map((r) => r.entity_id);
    check("queue: public untrusted unsettled sources only (no trusted car, no hidden post)",
      ids.includes(PA) && ids.includes(PB) && !ids.includes(CT) && !ids.includes(PH), q1);
    check("budget state: nothing exhausted yet", JSON.stringify(await budget()) === JSON.stringify({ translate_exhausted: false, moderation_exhausted: false }));
    // 内容层面的失败(解析不了的判定):3 次且跨度满 30 分钟才放行(漏判成内容失败的服务故障不能把内容放过去);
    // 30 分钟内的第 3 次仍记 error,行留在队列外直到第一次失败后 30 分钟
    const ha = q1.find((r) => r.entity_id === PA)!.mod_hash;
    const strike = async () =>
      (await as<{ r: string }>("service_role", null, `select public.i18n_record_moderation('post','${PA}','${ha}','error') r`)).rows[0].r;
    const strikes = [await strike(), await strike(), await strike()];
    type Strikes = { moderation: string; settled: boolean; attempts: number; held: boolean };
    const strikeState = async () => (await q<Strikes>(`select moderation, moderated_hash is not distinct from mod_hash settled,
      moderation_attempts attempts, mod_lease_until = moderation_first_error_at + interval '30 minutes' held
      from i18n.sources where entity_id=$1`, [PA]))[0];
    const s3 = await strikeState();
    check("3 content strikes within a minute stay 'error': moderation pending, attempts held at 2, out of the queue until 30 min after the first",
      strikes.every((r) => r === "error") && s3.moderation === "pending" && !s3.settled && s3.attempts === 2 && s3.held &&
        !(await queue()).some((r) => r.entity_id === PA), { strikes, s3 });
    await db6.exec(`update i18n.sources set moderation_first_error_at = now() - interval '31 minutes', mod_lease_until = null
      where entity_id = '${PA}'`);
    const back = (await queue()).some((r) => r.entity_id === PA);
    const last = await strike();
    const sa = await strikeState();
    await db6.exec(`update i18n.sources set mod_lease_until = null`);
    check("past the 30-minute mark the row is queued again and the third strike fails open (skipped, settled), then it leaves the queue",
      back && last === "error" && sa.moderation === "skipped" && sa.settled && !(await queue()).some((r) => r.entity_id === PA), { back, last, sa });
    const u0 = await usage();
    check("moderation verdicts (incl. content failures) count as moderation calls, not translation calls",
      u0.mod_calls === 4 && u0.calls === 0, u0);
    await as("service_role", null, "select public.i18n_add_usage(0, 0, 0, 2)");
    await as("service_role", null, "select public.i18n_add_usage(1, 10, 20)");
    const u1 = await usage();
    check("i18n_add_usage: p_mod_calls goes to the moderation counter; the 3-arg form still works", u1.mod_calls === 6 && u1.calls === 1, u1);
    // 新的审核文本重新计数:作者改帖后失败次数和第一次失败时间一起清零
    const hb = q1.find((r) => r.entity_id === PB)!.mod_hash;
    await as("service_role", null, `select public.i18n_record_moderation('post','${PB}','${hb}','error')`);
    const b1 = (await q<{ attempts: number; first: Date | null }>(
      "select moderation_attempts attempts, moderation_first_error_at first from i18n.sources where entity_id=$1", [PB]))[0];
    await as("authenticated", U2, `update public.community_posts set content='内容B(补充)' where id='${PB}'`);
    const b2 = (await q<{ attempts: number; first: Date | null }>(
      "select moderation_attempts attempts, moderation_first_error_at first from i18n.sources where entity_id=$1", [PB]))[0];
    check("an edit (new mod_hash) resets the strikes and the first-strike time",
      b1.attempts === 1 && b1.first !== null && b2.attempts === 0 && b2.first === null, { b1, b2 });
    // 翻译预算用完:claim 停,审核队列照常
    await db6.exec(`select public.i18n_admin_set('daily_call_cap','1'::jsonb); update i18n.sources set mod_lease_until = null`);
    const claim = await as("service_role", null, "select * from public.i18n_claim(6, 120)");
    check("translation cap reached: claims stop, moderation goes on",
      (await budget()).translate_exhausted && claim.rows.length === 0 && (await queue()).some((r) => r.entity_id === PB), claim.rows);
    await db6.exec(`select public.i18n_admin_set('daily_moderation_cap','5'::jsonb); update i18n.sources set mod_lease_until = null`);
    check("moderation cap reached: the moderation queue returns nothing",
      (await budget()).moderation_exhausted && (await queue()).length === 0);
    const over = await as<{ n: string }>("service_role", null, "select count(*)::text n from public.i18n_moderation_queue(50, 90)");
    check("(the exhausted queue is an empty result, not an error)", over.ok && over.rows[0].n === "0", over);
  }));

  await section("[N22] refresh rows of hidden entities are parked; a rejected refresh ends the cycle (F006, F013, F003)", () => fresh(async (db7) => {
    const { q, as } = client(db7);
    await migrated(db7);
    // 26 辆转载车(> 4 × 6 的候选窗口)翻译完成后被同步下架
    await as("service_role", null, `insert into public.cars(seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, source_id, source_listing_id)
      select '${S1}','x','x',2020,'Kia','Soul',1,1,'a','b','dealer','Clean title, stock ' || g, '${SRC}', 'stock-' || g from generate_series(1, 26) g`);
    const claimed = await as<ClaimRow & { entity_id: string }>("service_role", null, "select * from public.i18n_claim(50, 120, 'car')");
    for (const r of claimed.rows) {
      await as("service_role", null, `select public.i18n_complete('car','${r.entity_id}','${r.lease_token}','${r.src_hash}',
        '{"field_langs":{"description":"en"},"primary_lang":"en"}','${okResults("translated")}','{"calls":1}')`);
    }
    const okRows = await q<{ n: number }>("select count(*)::int n from i18n.translations where entity='car' and state='ok'");
    check("26 syndicated cars translated (5 ok locales each)", claimed.rows.length === 26 && okRows[0].n === 130, { claimed: claimed.rows.length, okRows });
    await as("service_role", null, "update public.cars set status='removed' where status='active'");
    const rq = await as<{ n: number }>("service_role", null, "select public.i18n_admin_requeue('car', null, null, 2) n");
    const PN = "d7d7d7d7-0000-0000-0000-00000000000a";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PN}','${U2}','discussion','新帖','新内容')`);
    const c6 = await as<{ entity: string; entity_id: string }>("service_role", null, "select entity, entity_id from public.i18n_claim(6, 120)");
    check("prompt-bump requeue over 26 delisted cars: an unfiltered claim(6) still returns new content",
      rq.ok && rq.rows[0].n === 130 && c6.rows.some((r) => r.entity_id === PN) && !c6.rows.some((r) => r.entity === "car"), { rq, c6: c6.rows });
    const stats = await as<{ entity: string; state: string; n: number }>("service_role", null,
      "select entity, state, sum(n)::int n from public.i18n_stats() where entity='car' and locale not like '\\_%' group by 1, 2");
    const st = Object.fromEntries(stats.rows.map((r) => [r.state, r.n]));
    check("i18n_stats labels them 'ok+refresh(parked)' (nothing actionable left)", st["ok+refresh(parked)"] === 130 && !st["ok+refresh"], st);

    // 重新上架:刷新行恢复可领取
    const relisted = claimed.rows[0].entity_id;
    await as("service_role", null, `update public.cars set status='active' where id='${relisted}'`);
    const rc = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6, 120, 'car', array['${relisted}']::uuid[])`)).rows[0];
    check("relisting one car makes its refresh claimable again", !!rc && rc.locales.join(",") === "es,fr,ja,ko,zh", rc);

    // 刷新被判不安全:管线译文继续用、刷新结束,不会马上又被领取
    const rej = JSON.stringify([{ locale: "zh", outcome: "rejected", error: "unsafe_output", text: "坏输出", categories: ["scam"], reason: "r", model: "m" }]);
    await as("service_role", null, `select public.i18n_complete('car','${relisted}','${rc.lease_token}','${rc.src_hash}',null,'${rej}','{}')`);
    const zh = await q<{ state: string; refresh: boolean; fields: Record<string, string> }>(
      "select state, refresh, fields from i18n.translations where entity_id=$1 and locale='zh'", [relisted]);
    await db7.exec(`update i18n.translations set lease_token = null, lease_until = null where entity_id='${relisted}'`);
    const again = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6, 120, 'car', array['${relisted}']::uuid[])`)).rows[0];
    check("rejected regeneration of pipeline text: old text kept, refresh ended, zh not re-claimed",
      zh[0].state === "ok" && zh[0].refresh === false && zh[0].fields.description === "zh: translated" &&
        !!again && !again.locales.includes("zh"), { zh, again });

    // 旧缓存导入的刷新被判不安全:旧文本不再展示
    const LC = "c7c7c7c7-0000-0000-0000-000000000001";
    await as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, source_id, source_listing_id)
      values ('${LC}','${S1}','x','x',2020,'Kia','Rio',1,1,'a','b','dealer','Legacy cached car.','${SRC}','stock-lc')`);
    const lh = (await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('car','${LC}')`)).rows[0].src_hash;
    await as("service_role", null, `select public.i18n_import_legacy('car','${LC}','ko','${lh}','{"description":"레거시 번역"}','en','{"description":"en"}',true)`);
    const lr = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6, 120, 'car', array['${LC}']::uuid[], array['ko'])`)).rows[0];
    const rejKo = rej.replace('"zh"', '"ko"');
    await as("service_role", null, `select public.i18n_complete('car','${LC}','${lr.lease_token}','${lr.src_hash}',null,'${rejKo}','{}')`);
    const ko = await q<{ state: string; fields: unknown; refresh: boolean }>(
      "select state, fields, refresh from i18n.translations where entity_id=$1 and locale='ko'", [LC]);
    check("rejected regeneration of legacy text: state rejected, legacy text dropped",
      ko[0].state === "rejected" && ko[0].fields === null && ko[0].refresh === false, ko);

    // 不公开的实体:导入时直接停放;绕过触发器的下架由 claim 停放、上架由 sweep 恢复;完成时被隐藏也停放
    const HC = "c7c7c7c7-0000-0000-0000-000000000002";
    await as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original, source_id, source_listing_id, status)
      values ('${HC}','${S1}','x','x',2020,'Kia','Rio',1,1,'a','b','dealer','Hidden car.','${SRC}','stock-hc','removed')`);
    const hh = (await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('car','${HC}')`)).rows[0].src_hash;
    await as("service_role", null, `select public.i18n_import_legacy('car','${HC}','ja','${hh}','{"description":"レガシー"}','en','{"description":"en"}',true)`);
    const parked = async (id: string) => (await q<{ n: number }>(
      "select count(*)::int n from i18n.translations where entity_id=$1 and state='ok' and refresh and next_attempt_at='infinity'", [id]))[0].n;
    check("legacy import of a non-public car parks the refresh row", (await parked(HC)) === 1);
    const R2 = claimed.rows[1].entity_id;
    await as("service_role", null, `update public.cars set status='active' where id='${R2}'`);
    await db7.exec(`set session_replication_role = replica; update public.cars set status='removed' where id='${R2}'; set session_replication_role = origin;`);
    await as("service_role", null, `select * from public.i18n_claim(6, 120, 'car', array['${R2}']::uuid[])`);
    check("claim of an entity hidden behind the triggers' back parks its refresh rows", (await parked(R2)) === 5);
    await db7.exec(`set session_replication_role = replica; update public.cars set status='active' where id='${R2}'; set session_replication_role = origin;`);
    await db7.exec("select i18n.sweep()");
    check("the sweep resumes parked rows of entities that are public again", (await parked(R2)) === 0);
    const lease = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6, 120, 'car', array['${R2}']::uuid[])`)).rows[0];
    await db7.exec(`set session_replication_role = replica; update public.cars set status='removed' where id='${R2}'; set session_replication_role = origin;`);
    const hid = await as<{ r: CompleteResult }>("service_role", null,
      `select public.i18n_complete('car','${R2}','${lease.lease_token}','${lease.src_hash}',null,'${okResults("new")}','{}') r`);
    const leased = await q<{ n: number }>("select count(*)::int n from i18n.translations where entity_id=$1 and lease_token is not null", [R2]);
    check("completion for an entity hidden meanwhile: hidden, leases released, refresh rows parked",
      hid.rows[0].r.hidden === true && leased[0].n === 0 && (await parked(R2)) === 5, { hid: hid.rows, leased });
    // 重新排队不公开实体里的失败 / 拒绝行:直接 hold,不在候选窗口里
    await db7.exec(`update i18n.translations set state='rejected', refresh=false where entity_id='${HC}' and locale='fr'`);
    await as("service_role", null, `select public.i18n_admin_requeue('car', array['${HC}']::uuid[])`);
    const fr = await q<{ state: string }>("select state from i18n.translations where entity_id=$1 and locale='fr'", [HC]);
    check("requeue of a rejected row of a hidden entity waits in 'hold'", fr[0].state === "hold", fr);
  }));

  await section("[N23] translation flags: locales accumulate per version; an admin restore sticks (F053)", () => fresh(async (db8) => {
    const { q, as } = client(db8);
    await migrated(db8);
    const PR = "d8d8d8d8-0000-0000-0000-00000000000f";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PR}','${U2}','discussion','普通标题','普通内容')`);
    const mh = (await as<ModInputRow>("service_role", null, `select * from public.i18n_moderation_input('post','${PR}')`)).rows[0].mod_hash;
    await as("service_role", null, `select public.i18n_record_moderation('post','${PR}','${mh}','pass')`);
    const reject = async (locale: string) => {
      const c = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5,60,'post',array['${PR}']::uuid[],array['${locale}'])`)).rows[0];
      const res = JSON.stringify([{ locale, outcome: "rejected", error: "unsafe_output", text: `坏的 ${locale}`, categories: ["scam"], reason: "r", model: "m" }]);
      await as("service_role", null, `select public.i18n_complete('post','${PR}','${c.lease_token}','${c.src_hash}',null,'${res}','{}')`);
      return c;
    };
    type Flag = { id: string; status: string; context: { locales: string[]; src_hash: string; entity: string }; reviewed_at: string | null; reviewed_by: string | null };
    const flag = async () => (await q<Flag>("select id, status, context, reviewed_at::text, reviewed_by from public.ai_moderation where target_type='translation' and target_id=$1", [PR]))[0];
    const first = await reject("ko");
    await reject("ja");
    const f1 = await flag();
    check("two completions of one version: the flag lists both locales and the version",
      f1.context.locales.join(",") === "ja,ko" && f1.context.src_hash === first.src_hash && f1.context.entity === "post" && f1.status === "shadow", f1);
    const denied = await as("authenticated", U2, `select public.i18n_admin_restore_translation('${f1.id}')`);
    check("non-admin cannot restore a translation flag", !denied.ok && /forbidden/.test(denied.error ?? ""), denied.error);
    const rs = await as<{ n: number }>("authenticated", A1, `select public.i18n_admin_restore_translation('${f1.id}') n`);
    const f2 = await flag();
    const st = await q<{ locale: string; state: string }>("select locale, state from i18n.translations where entity_id=$1 and locale in ('ja','ko') order by locale", [PR]);
    check("restore requeues every rejected locale and marks the flag restored by the admin",
      rs.ok && rs.rows[0].n === 2 && st.every((s) => s.state === "pending") && f2.status === "restored" && f2.reviewed_by === A1, { rs, st, f2 });
    const c3 = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(5,60,'post',array['${PR}']::uuid[],array['ko'])`)).rows[0];
    check("the restored version skips output moderation (claim meta)", !!c3 && c3.meta.moderate_outputs === false, c3?.meta);
    const res = JSON.stringify([{ locale: "ko", outcome: "rejected", error: "unsafe_output", text: "또", categories: ["scam"], reason: "r", model: "m" }]);
    await as("service_role", null, `select public.i18n_complete('post','${PR}','${c3.lease_token}','${c3.src_hash}',null,'${res}','{}')`);
    const f3 = await flag();
    check("a later rejection of the same version does not re-open a restored flag",
      f3.status === "restored" && f3.reviewed_at === f2.reviewed_at && f3.context.locales.join(",") === "ja,ko", f3);
    await as("authenticated", U2, `update public.community_posts set content='作者改了内容' where id='${PR}'`);
    await as("service_role", null, `select public.i18n_record_moderation('post','${PR}',(select mod_hash from public.i18n_moderation_input('post','${PR}')),'pass')`);
    const c4 = await reject("fr");
    const f4 = await flag();
    check("a new version is output-moderated again and re-opens the flag with only its own locales",
      c4.meta.moderate_outputs === true && f4.status === "shadow" && f4.reviewed_at === null &&
        f4.context.locales.join(",") === "fr" && f4.context.src_hash === c4.src_hash, { meta: c4.meta, f4 });
  }));

  await section("[N24] admin audit rows accept every AI-moderation target type (F016)", async () => {
    for (const t of ["post", "car_comment", "post_comment", "qa_question", "qa_answer", "dealer_review", "translation", "source", "user"]) {
      const r = await as("authenticated", A1,
        `insert into public.admin_actions(admin_id, action, target_type, target_id) values ('${A1}','restore_ai_flag','${t}','${P1}')`);
      check(`admin_actions accepts target_type '${t}'`, r.ok, r.error);
    }
    const bad = await as("authenticated", A1,
      `insert into public.admin_actions(admin_id, action, target_type, target_id) values ('${A1}','x','bogus','${P1}')`);
    check("admin_actions still rejects unknown target types", !bad.ok && /admin_actions_target_type_check/.test(bad.error ?? ""), bad.error);
  });

  await section("[N25] glossary: retry refunds the attempt; admins requeue dead / rejected aliases; restored blocks resolve (F030, F054, F055)", () => fresh(async (db9) => {
    const { q, as } = client(db9);
    await migrated(db9);
    const PG = "d9d9d9d9-0000-0000-0000-00000000000a", PB = "d9d9d9d9-0000-0000-0000-00000000000b";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PG}','${U2}','discussion','冬天','换胎',array['冬季胎','车友聚会'])`);
    const mod = async (id: string, verdict: string) => as("service_role", null,
      `select public.i18n_record_moderation('post','${id}',(select mod_hash from public.i18n_moderation_input('post','${id}')),'${verdict}')`);
    await mod(PG, "pass");
    const ct = await as<TermClaimRow>("service_role", null, "select * from public.i18n_claim_terms(10, 60)");
    const winter = ct.rows.find((r) => r.alias_norm === "冬季胎")!, meet = ct.rows.find((r) => r.alias_norm === "车友聚会")!;
    await as("service_role", null, `select public.i18n_complete_term('topic','冬季胎','${winter.lease_token}','retry',null,null,null,'rate_limited',null,120)`);
    await as("service_role", null, `select public.i18n_complete_term('topic','车友聚会','${meet.lease_token}','retry',null,null,null,'http_402')`);
    type Alias = { alias_norm: string; state: string; attempts: number; leased: boolean; due_s: number; last_error: string | null };
    const aliases = async () => q<Alias>(`select alias_norm, state, attempts, lease_token is not null leased,
        extract(epoch from next_attempt_at - now())::int due_s, last_error from i18n.term_aliases where kind='topic' order by alias_norm`);
    const a1 = Object.fromEntries((await aliases()).map((a) => [a.alias_norm, a]));
    check("retry: lease released, attempt refunded, state kept, next try after Retry-After",
      a1["冬季胎"].state === "pending" && a1["冬季胎"].attempts === 0 && !a1["冬季胎"].leased &&
        a1["冬季胎"].due_s > 100 && a1["冬季胎"].due_s <= 120 && a1["冬季胎"].last_error === "rate_limited", a1["冬季胎"]);
    check("retry without Retry-After waits 15 minutes", a1["车友聚会"].due_s > 880 && a1["车友聚会"].due_s <= 900, a1["车友聚会"]);
    await db9.exec(`update i18n.term_aliases set state='dead', attempts=6 where alias_norm='车友聚会';
      update i18n.term_aliases set state='rejected', attempts=1 where alias_norm='冬季胎';
      insert into i18n.terms(kind, slug, labels, origin) values ('topic','okterm','{"en":"Ok"}','admin');
      insert into i18n.term_aliases(kind, alias_norm, sample_raw, term_id, state)
        select 'topic','已解析','已解析', id, 'ok' from i18n.terms where slug='okterm';`);
    const no = await as("authenticated", U2, "select public.i18n_admin_requeue_terms()");
    check("non-admin cannot requeue glossary aliases", !no.ok && /forbidden/.test(no.error ?? ""), no.error);
    const r1 = await as<{ n: number }>("service_role", null, "select public.i18n_admin_requeue_terms('topic') n");
    const a2 = Object.fromEntries((await aliases()).map((a) => [a.alias_norm, a]));
    check("default requeue: failed / dead aliases back to pending (attempts 0, due now); rejected untouched",
      r1.rows[0].n === 1 && a2["车友聚会"].state === "pending" && a2["车友聚会"].attempts === 0 && a2["车友聚会"].due_s <= 0 &&
        a2["冬季胎"].state === "rejected", a2);
    const r2 = await as<{ n: number }>("authenticated", A1,
      "select public.i18n_admin_requeue_terms(null, array['rejected','ok'], array['冬季胎','已解析']) n");
    const a3 = Object.fromEntries((await aliases()).map((a) => [a.alias_norm, a]));
    check("admin requeue of named rejected aliases; resolved ('ok') aliases are never reset",
      r2.rows[0].n === 1 && a3["冬季胎"].state === "pending" && a3["已解析"].state === "ok", a3);
    // 执行模式屏蔽 → 管理员恢复:sources 仍是 blocked,标签照样进词表
    await db9.exec(`select public.i18n_admin_set('moderation_enforce','true'::jsonb)`);
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PB}','${U2}','discussion','翻新','老车',array['老车翻新'])`);
    await mod(PB, "blocked");
    await as("authenticated", A1, `update public.community_posts set status='active' where id='${PB}'`);
    const src = await q<{ moderation: string }>("select moderation from i18n.sources where entity_id=$1", [PB]);
    const ct2 = await as<TermClaimRow>("service_role", null, "select * from public.i18n_claim_terms(10, 60)");
    check("a post restored after an enforce-mode block gets its tags resolved",
      src[0].moderation === "blocked" && ct2.rows.some((r) => r.group_id === PB && r.alias_norm === "老车翻新"), { src, rows: ct2.rows });
  }));

  await section("[N26] search_posts: a '#tag' under an active topic narrows it (F031)", async () => {
    await as("service_role", null,
      `select public.i18n_seed_term('topic','bmw','{"zh":"宝马","en":"BMW","ko":"BMW","ja":"BMW","es":"BMW","fr":"BMW"}','brand',array['寶馬'])`);
    const PX = "dfdfdfdf-0000-0000-0000-0000000000b1", PY = "dfdfdfdf-0000-0000-0000-0000000000b2";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PX}','${U2}','discussion','宝马','只有宝马',array['宝马'])`);
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content,tags) values ('${PY}','${U2}','discussion','对比','特斯拉和宝马',array['Tesla','BMW'])`);
    const ids = async (sqlArgs: string) => (await as<{ id: string }>("anon", null, `select id from public.search_posts(${sqlArgs})`)).rows.map((r) => r.id);
    const both = await ids(`'#宝马', null, 'tesla'`);
    check("topic=tesla + '#宝马' = posts tagged with both", JSON.stringify(both) === JSON.stringify([PY]), both);
    const alias = await ids(`'#寶馬', null, 'tesla'`);
    check("topic=tesla + '#寶馬' (another spelling of the tag) = the same intersection", JSON.stringify(alias) === JSON.stringify([PY]), alias);
    const tag = await ids(`'#宝马'`);
    check("'#宝马' alone still finds every BMW post", tag.includes(PX) && tag.includes(PY) && !tag.includes(P1), tag);
    const topic = await ids(`null, null, 'tesla'`);
    check("topic alone still finds every Tesla post", topic.includes(P1) && topic.includes(PY) && !topic.includes(PX), topic);
  });

  await section("[N27] '#' inside a URL is never a hashtag (F032)", async () => {
    const r = await q<{ t: string }>(
      "select i18n.hashtag_tokens('官方参数 https://www.tesla.com/model3#specs 看这里 #特斯拉 www.example.com/#rd') t");
    check("URL fragments are not tokens", r.map((x) => x.t).join("|") === "特斯拉", r);
    const PW = "dfdfdfdf-0000-0000-0000-0000000000c1";
    await as("authenticated", U2, `insert into public.community_posts(id,user_id,type,title,content) values ('${PW}','${U2}','discussion','文章',
      '转发 https://mp.weixin.qq.com/s/abc?x=1#wechat_redirect 值得一看 #保养')`);
    const tags = await q<{ alias_norm: string }>("select alias_norm from i18n.post_tags where post_id=$1 order by pos", [PW]);
    check("a post with a URL fragment links only its real hashtag", tags.map((t) => t.alias_norm).join(",") === "保养", tags);
  });

  await section("[N28] the content clock covers every API-visible field (F047)", async () => {
    const pin = () => db.exec(`select set_config('i18n.writer','pipeline',false);
      update public.cars set content_updated_at = '2001-01-01T00:00:00Z' where id='${C2}';
      select set_config('i18n.writer','',false);`);
    const clock = async () => (await q<{ cu: string }>("select content_updated_at::text cu from public.cars where id=$1", [C2]))[0].cu;
    for (const [label, set] of [
      ["carfax_url", "carfax_url='https://www.carfax.com/vhr/ABC'"],
      ["original_price", "original_price=27000"],
      ["source_url", "source_url='https://westcoast.example/stock/2'"],
      ["lat / lng", "lat=32.7, lng=-117.1"],
      ["phone", "phone='626-555-0100'"],
    ] as const) {
      await pin();
      const r = await as("service_role", null, `update public.cars set ${set} where id='${C2}'`);
      const cu = await clock();
      check(`service_role update of only ${label} advances content_updated_at`, r.ok && !cu.startsWith("2001"), { r: r.error, cu });
    }
    await pin();
    await as("service_role", null, `update public.cars set last_seen_at=now() where id='${C2}'`);
    check("a sync heartbeat (last_seen_at only) keeps the clock", (await clock()).startsWith("2001"));
  });

  await section("[N29] provisional (local, budget-free) detection keeps new text in the sitemaps (F019)", () => fresh(async (db10) => {
    const { q, as } = client(db10);
    await migrated(db10);
    const CP = "cfcfcfcf-0000-0000-0000-000000000001";
    await as("authenticated", U1, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original)
      values ('${CP}','${U1}','x','x',2019,'Mazda','CX-5',1,1,'a','b','s','Mazda CX-5 Grand Touring')`);
    const dq = async (incl: string) =>
      (await as<{ entity_id: string; src_hash: string }>("service_role", null, `select * from public.i18n_detection_queue(1000${incl})`)).rows;
    const pending = await dq(", false");
    const h = pending.find((r) => r.entity_id === CP)!.src_hash;
    const record = async (langs: string, provisional: boolean) => (await as<{ n: number }>("service_role", null,
      `select public.i18n_record_detection('[{"entity":"car","entity_id":"${CP}","src_hash":"${h}","field_langs":{"description":"${langs}"},"primary_lang":"${langs}","provisional":${provisional}}]'::jsonb) n`)).rows[0].n;
    const p1 = await record("en", true);
    const src = async () => (await q<{ detected: boolean; provisional: boolean; fl: Record<string, string> | null }>(
      "select detected_hash = src_hash detected, detect_provisional provisional, field_langs fl from i18n.sources where entity_id=$1", [CP]))[0];
    check("provisional record: detected for the current version, flagged provisional", p1 === 1 && (await src()).detected && (await src()).provisional);
    const b = await as<{ al: string[] | null }>("anon", null, `select al from public.i18n_bundle('car', array['${CP}']::uuid[], 'en')`);
    const sm = await as<{ id: string }>("service_role", null, "select id from public.sitemap_entries('car','en',0,1000)");
    check("read model treats it as detected: availability known, listed in its source-language shard",
      JSON.stringify(b.rows[0].al) === JSON.stringify(["en"]) && sm.rows.some((r) => r.id === CP), { b: b.rows, sm: sm.rows });
    check("local pass queue (p_include_provisional=false) skips it; the LLM pass queue (default) refines it",
      !(await dq(", false")).some((r) => r.entity_id === CP) && (await dq("")).some((r) => r.entity_id === CP));
    await as("service_role", null, `select public.i18n_record_moderation('car','${CP}',(select mod_hash from public.i18n_moderation_input('car','${CP}')),'pass')`);
    const c = (await as<ClaimRow>("service_role", null, `select * from public.i18n_claim(6,120,'car',array['${CP}']::uuid[])`)).rows[0];
    check("the worker is not handed a provisional detection (it detects again)", !!c && c.field_langs === null, c);
    await as("service_role", null, `select public.i18n_complete('car','${CP}','${c.lease_token}','${c.src_hash}',
      '{"field_langs":{"description":"en"},"primary_lang":"en"}','[{"locale":"en","outcome":"skipped"}]','{}')`);
    check("the worker's detection clears the provisional flag", !(await src()).provisional);
    const p2 = await record("de", true);
    check("a provisional record never overwrites a confirmed detection", p2 === 0 && (await src()).fl?.description === "en");
    await as("authenticated", U1, `update public.cars set description_original='Mazda CX-5 Grand Touring, one owner' where id='${CP}'`);
    const after = await src();
    check("an edit resets detection and the provisional flag", !after.detected && !after.provisional, after);
  }));

  await section("[N30] re-run over a database migrated before this revision (backfill + replaced signatures)", () => fresh(async (db11) => {
    const { q } = client(db11);
    await seedAccounts(db11);
    await db11.exec(`
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description, features)
values ('${C1}','${U1}','t','t',2019,'Toyota','Camry',1,1,'a','b','s','车况好',array['天窗']);
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description, source_id)
values ('${C2}','${S1}','t','t',2020,'Tesla','Model 3',1,1,'a','b','dealer','Clean title.','${SRC}');
insert into public.community_posts(id, user_id, type, title, content, tags) values ('${P1}','${U1}','discussion','求助','内容',array['保险']);
insert into public.community_posts(id, user_id, type, title, content) values ('${P2}','${U1}','discussion','无标签','内容');
insert into public.post_comments(id, post_id, user_id, content) values ('${PC1}','${P1}','${U2}','评论');`);
    await db11.exec(SCHEMA);
    await db11.exec(DATA);
    // 回到上一版的状态:没有 mod_hash,判定按 src_hash 记;旧函数签名还在
    await db11.exec(`update i18n.sources set mod_hash = null, moderated_hash = src_hash;
create function i18n.sweep(p_limit int) returns int language sql as 'select 0';
create function i18n.budget_add(p_calls int, p_in bigint, p_out bigint) returns void language sql as 'select';
create function public.i18n_add_usage(p_calls int, p_in bigint, p_out bigint) returns void language sql as 'select';
create function public.i18n_detection_queue(p_limit int) returns setof int language sql as 'select 1';
create function public.i18n_complete_term(text, text, uuid, text, text, jsonb, text, text, text) returns bigint language sql as 'select 1::bigint';`);
    await db11.exec(SCHEMA);
    const rows = await q<{ entity: string; entity_id: string; has_mod: boolean; settled: boolean }>(
      "select entity, entity_id, mod_hash is not null has_mod, moderated_hash is not distinct from mod_hash settled from i18n.sources");
    const settled = (id: string) => rows.find((r) => r.entity_id === id)?.settled;
    check("backfill: every source has a mod_hash", rows.length === 5 && rows.every((r) => r.has_mod), rows);
    check("backfill: verdicts stay settled where moderation read exactly this text (comment, post without tags)",
      settled(PC1) === true && settled(P2) === true, rows);
    check("backfill: trusted syndicated text stays settled", settled(C2) === true, rows);
    check("backfill: text whose make / features / tags were never moderated is moderated again",
      settled(C1) === false && settled(P1) === false, rows);
    const overloads = await q<{ proname: string; n: number }>(`select p.proname, count(*)::int n from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname, p.proname) in (('i18n','sweep'), ('i18n','budget_add'), ('public','i18n_add_usage'),
       ('public','i18n_detection_queue'), ('public','i18n_complete_term'), ('public','i18n_claim'),
       ('public','i18n_moderation_input'), ('public','i18n_record_moderation'), ('public','i18n_legacy_page'))
     group by 1 order by 1`);
    check("every replaced signature is dropped (one overload each)",
      overloads.length === 9 && overloads.every((o) => o.n === 1), overloads);
    const arg = await q<{ args: string }>(`select pg_get_function_identity_arguments(p.oid) args from pg_proc p
      where p.proname = 'i18n_record_moderation'`);
    check("i18n_record_moderation is keyed by p_mod_hash", arg[0].args.includes("p_mod_hash text"), arg);
  }));

  await section("[N31] car comments: the comments_text_len cap is the comment box's maxLength (F025)", () => fresh(async (db12) => {
    // components/comment-section.tsx 的 MAX_COMMENT_CHARS 就是输入框的 maxLength:与 comments_text_len 必须是同一个上限
    const { as } = client(db12);
    await seedAccounts(db12);
    await db12.exec(`insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh,
  seller_name, description, description_zh, features)
values ('${C1}','${U1}','2019 Toyota Camry','2019 丰田 凯美瑞',2019,'Toyota','Camry',15000,60000,'Flushing, NY','法拉盛',
  'seller','x','x',array[]::text[]);`);
    await db12.exec(SCHEMA);
    await db12.exec(DATA);
    const comment = (chars: number) => as("authenticated", U2,
      `insert into public.comments(car_id, user_id, content) values ('${C1}','${U2}', repeat('长', ${chars}))`);
    const atCap = await comment(5000);
    check("another user's 5000-char comment on a public car is accepted", atCap.ok, atCap.error);
    const over = await comment(5001);
    check("a 5001-char comment fails with 23514 on comments_text_len",
      !over.ok && over.code === "23514" && over.constraint === "comments_text_len", over);
    const def = (await db12.query<{ d: string }>(
      "select pg_get_constraintdef(oid) d from pg_constraint where conname = 'comments_text_len'")).rows[0]?.d ?? "";
    const ui = readFileSync(join(ROOT, "components/comment-section.tsx"), "utf8");
    const uiCap = Number(ui.match(/const MAX_COMMENT_CHARS = (\d+);/)?.[1]);
    const dbCap = Number(def.match(/<= (\d+)/)?.[1]);
    const wired = /maxLength=\{MAX_COMMENT_CHARS\}/.test(ui);
    check("comment-section.tsx MAX_COMMENT_CHARS (the textarea maxLength) = the comments_text_len cap = 5000",
      uiCap === 5000 && dbCap === 5000 && wired, { uiCap, dbCap, wired, def });
  }));

  await section("[N32] per-author daily moderation allowance: one account cannot drain the shared cap (F005)", () => fresh(async (db13) => {
    const { q, as } = client(db13);
    await migrated(db13);
    const post = (n: number) => `d3d3d3d3-0000-0000-0000-${String(n).padStart(12, "0")}`;
    for (const [n, uid] of [[1, U1], [2, U1], [3, U1], [4, U1], [5, U2]] as const) {
      await as("authenticated", uid, `insert into public.community_posts(id,user_id,type,title,content) values ('${post(n)}','${uid}','discussion','标题${n}','内容${n}')`);
    }
    await db13.exec(`select public.i18n_admin_set('daily_moderation_cap_per_author','2'::jsonb)`);
    type Input = { moderated: boolean; mod_hash: string | null };
    const input = async (n: number) =>
      (await as<Input>("service_role", null, `select moderated, mod_hash from public.i18n_moderation_input('post','${post(n)}')`)).rows[0];
    const queue = async () => {
      await db13.exec("update i18n.sources set mod_lease_until = null");
      return (await as<{ entity_id: string }>("service_role", null, "select entity_id from public.i18n_moderation_queue(50, 90)")).rows
        .map((r) => r.entity_id);
    };
    const verdicts = async () =>
      (await q<{ n: number }>("select coalesce(sum(verdicts), 0)::int n from i18n.mod_author_budget where user_id = $1", [U1]))[0].n;
    await as("service_role", null, `select public.i18n_record_moderation('post','${post(4)}','${(await input(4)).mod_hash}','skipped')`);
    check("a 'skipped' verdict costs the author nothing", (await verdicts()) === 0);
    await as("service_role", null, `select public.i18n_record_moderation('post','${post(1)}','${(await input(1)).mod_hash}','pass')`);
    await as("service_role", null, `select public.i18n_record_moderation('post','${post(2)}','${(await input(2)).mod_hash}','error')`);
    const [i1, i3, i5] = [await input(1), await input(3), await input(5)];
    check("allowance used up (pass + content error): an unsettled post of that author has no mod_hash (nothing to pay for)",
      (await verdicts()) === 2 && i3.mod_hash === null && i3.moderated === false, { i3, verdicts: await verdicts() });
    check("its settled post keeps the cached verdict; other authors are untouched",
      i1.moderated === true && i1.mod_hash !== null && i5.mod_hash !== null && i5.moderated === false, { i1, i5 });
    const q1 = await queue();
    check("the moderation queue skips that author only", q1.includes(post(5)) && !q1.includes(post(2)) && !q1.includes(post(3)), q1);
    const c3 = await as("service_role", null, `select entity_id from public.i18n_claim(6,120,'post',array['${post(3)}']::uuid[])`);
    const t3 = await q<{ deferred: boolean; attempts: number }>(`select next_attempt_at = ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc' deferred,
      attempts from i18n.translations where entity_id = $1`, [post(3)]);
    const c5 = await as<{ needs_moderation: boolean }>("service_role", null,
      `select needs_moderation from public.i18n_claim(6,120,'post',array['${post(5)}']::uuid[])`);
    check("claim: the throttled author's unmoderated post waits for the next UTC day (no lease, attempts kept); others are claimed",
      c3.ok && c3.rows.length === 0 && t3.length === 6 && t3.every((t) => t.deferred && t.attempts === 0) &&
        c5.rows[0]?.needs_moderation === true, { c3: c3.error ?? c3.rows, t3, c5: c5.rows });
    await db13.exec("update i18n.mod_author_budget set day = day - 1");
    const q2 = await queue();
    check("next UTC day: the author's backlog is moderated again (input key + queue)",
      (await input(3)).mod_hash !== null && q2.includes(post(2)) && q2.includes(post(3)), q2);
    const purge = await q<{ command: string }>("select command from cron.job where jobname = 'i18n-budget-purge'");
    check("the daily purge job also trims the per-author counters", /i18n\.mod_author_budget/.test(purge[0]?.command ?? ""), purge);
  }));

  await section("[N33] a post with fields in two languages stays in its source-language shard before translation (F019)", () => fresh(async (db14) => {
    const { as } = client(db14);
    await migrated(db14);
    const PM = "d3d3d3d3-0000-0000-0000-000000000001", PP = "d3d3d3d3-0000-0000-0000-000000000002";
    for (const id of [PM, PP]) {
      await as("authenticated", U1, `insert into public.community_posts(id,user_id,type,title,content)
        values ('${id}','${U1}','discussion','Selling my 2019 Camry, low miles','一手车主，保养记录齐全，价格可谈')`);
    }
    const dq = (await as<{ entity_id: string; src_hash: string }>("service_role", null, "select * from public.i18n_detection_queue(1000)")).rows;
    const items = JSON.stringify([PM, PP].map((id) => ({ entity: "post", entity_id: id, src_hash: dq.find((r) => r.entity_id === id)!.src_hash,
      field_langs: { title: "en", content: "zh" }, primary_lang: "zh", provisional: id === PP })));
    const rec = await as<{ n: number }>("service_role", null, `select public.i18n_record_detection('${items}'::jsonb) n`);
    const shard = async (l: string) =>
      (await as<SitemapRow>("service_role", null, `select id, locales, x_default from public.sitemap_entries('post','${l}',0,1000)`)).rows;
    const [zh, en] = [await shard("zh"), await shard("en")];
    const listed = [PM, PP].map((id) => zh.find((r) => r.id === id));
    check("detected mixed post (confirmed and provisional) is in the zh shard, self x-default, zh its only locale",
      rec.rows[0]?.n === 2 && listed.every((r) => !!r && r.x_default === "zh" && JSON.stringify(r.locales) === '["zh"]'), { rec: rec.rows, listed });
    check("…and not in the en shard (its Chinese body is not translated yet)", !en.some((r) => r.id === PM || r.id === PP), en);
    const b = await as<BundleRow>("anon", null, `select s, f, al from public.i18n_bundle('post', array['${PM}']::uuid[], 'zh')`);
    check("the zh page's bundle: still pending (title untranslated), availability = the source language",
      b.rows[0]?.s === "pending" && JSON.stringify(b.rows[0].al) === '["zh"]', b.rows);
  }));

  await section("[N34] source-hash vectors shared with lib/i18n/content/store.ts sourceHash (F021)", async () => {
    const CH = "c3c3c3c3-0000-0000-0000-000000000034", PH = "d4d4d4d4-0000-0000-0000-000000000034";
    const empty = await q<{ h: string }>("select i18n.hash_payload('{}'::jsonb) h");
    check("hash_payload('{}') vector", empty[0].h === "44136fa355b3678a1146ad16f7e8649e", empty);
    await as("authenticated", U1, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description_original)
      values ('${CH}','${U1}','x','x',2018,'Honda','Civic',1,1,'a','b','s',' One owner,' || E'\\r\\n' || 'asking $25,000. ' || E'\\n')`);
    await as("authenticated", U1, `insert into public.community_posts(id,user_id,type,title,content)
      values ('${PH}','${U1}','discussion','二手 Civic','车况好 ' || E'\\t\\n' || '无事故')`);
    const h = await q<{ entity: string; payload_hash: string; src_hash: string }>(`select entity, i18n.hash_payload(i18n.payload_of(entity, entity_id)) payload_hash,
      src_hash from i18n.sources where entity_id in ('${CH}','${PH}') order by entity`);
    const car = h.find((r) => r.entity === "car"), post = h.find((r) => r.entity === "post");
    check("car description vector (CRLF, trailing blanks, NFC): payload hash = sources.src_hash",
      car?.payload_hash === "21398e3d2e0b826f5d20f82ed9cbb105" && car.src_hash === car.payload_hash, car);
    check("post title + content vector (blank run before a newline)",
      post?.payload_hash === "f471d5fca8d86a12c003f070fa1c803e" && post.src_hash === post.payload_hash, post);
  });

  await section("[N35] sync restore of claimant-edited identity fields re-trusts only source text", () => fresh(async (db15) => {
    const { q, as } = client(db15);
    await migrated(db15);
    await db15.exec(`update public.profiles set claimed_by = '${U2}' where id = '${S1}'`);
    type Trust = { trusted: boolean; moderation: string; settled: boolean; trim: string | null; title: string };
    const state = async (id: string) => (await q<Trust>(`select s.trusted, s.moderation, s.moderated_hash is not distinct from s.mod_hash settled,
      i18n.moderation_payload('car', s.entity_id) ->> 'trim' trim, c.title
      from i18n.sources s join public.cars c on c.id = s.entity_id where s.entity = 'car' and s.entity_id = $1`, [id]))[0];
    const insert = (id: string, n: number) => as("service_role", null, `insert into public.cars(id, seller_id, title, title_zh, year, make, model, trim, price, mileage,
      location, location_zh, seller_name, description_original, features_original, source_id, source_listing_id, status)
      values ('${id}','${S1}','2019 Toyota Camry SE','2019 丰田 凯美瑞 SE',2019,'Toyota','Camry','SE',1,1,'a','b','dealer','Dealer text',
        array['Backup Camera'],'${SRC}','stock-35-${n}','active')`);
    const syncBase = `title='2019 Toyota Camry SE', title_zh='2019 丰田 凯美瑞 SE', year=2019, make='Toyota', model='Camry', trim='SE',
      mileage=2, last_seen_at=now()`;
    const restored = (s: Trust, enforce: boolean) => s.trusted && s.moderation === "skipped" && s.settled && s.trim === "SE" &&
      (!enforce || s.title === "2019 Toyota Camry SE");
    for (const enforce of [false, true]) {
      await as(null, null, `select public.i18n_admin_set('enforce','${enforce}'::jsonb)`);
      const tag = enforce ? "enforce" : "observe";
      const base = enforce ? 10 : 0;
      const ids = [1, 2, 3].map((n) => `c5c5c5c5-0000-0000-0000-0000000000${String(base + n).padStart(2, "0")}`);
      for (const [i, id] of ids.entries()) await insert(id, base + i);
      // (1)(2) 认领人改了款型 + 配置;下一次同步带着源站原文(含 originals)写回
      const e1 = await as("authenticated", U2, `update public.cars set trim='SE 加微信scam888 定金',
        features_original=array['Backup Camera','加微信 scam888'] where id='${ids[0]}'`);
      const a1 = await state(ids[0]);
      check(`${tag}: claimant edit of trim + features -> untrusted, pending`, e1.ok && !a1.trusted && a1.moderation === "pending", { e1, a1 });
      await as("service_role", null, `update public.cars set ${syncBase}, description_original='Dealer text',
        features_original=array['Backup Camera'] where id='${ids[0]}'`);
      const r1 = await state(ids[0]);
      check(`${tag}: a sync payload restoring the source text (with originals) re-trusts it (skipped, settled, trim SE${enforce ? ", title rebuilt" : ""})`,
        restored(r1, enforce), r1);
      // (3) 认领人只改款型;同步不带 originals
      await as("authenticated", U2, `update public.cars set trim='SE 加微信scam888 定金' where id='${ids[1]}'`);
      const a2 = await state(ids[1]);
      await as("service_role", null, `update public.cars set ${syncBase} where id='${ids[1]}'`);
      const r2 = await state(ids[1]);
      check(`${tag}: trim-only claimant edit, then a sync payload without originals: untrusted, then trusted again`,
        !a2.trusted && a2.moderation === "pending" && restored(r2, enforce), { a2, r2 });
      // (4) 只碰 last_seen_at / mileage 的服务写:mod_hash 不变,不重新授信
      await as("authenticated", U2, `update public.cars set trim='SE 加微信scam888 定金' where id='${ids[2]}'`);
      await as("service_role", null, `update public.cars set mileage=3, last_seen_at=now() where id='${ids[2]}'`);
      const r3 = await state(ids[2]);
      check(`${tag}: a service write of only last_seen_at / mileage keeps the claimant's trim untrusted and pending`,
        !r3.trusted && r3.moderation === "pending" && r3.trim === "SE 加微信scam888 定金", r3);
    }
  }));

  await section("[N16] sitemap shards: > 1000 rows, 1000-row pages, qa kind (critic gap 1)", () => fresh(async (db4) => {
    await db4.exec(SCHEMA);
    await db4.exec(`insert into auth.users(id) values ('${U1}'); insert into public.profiles(id, username) values ('${U1}','s');
      insert into public.cars(seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description)
      select '${U1}','t','t',2019,'Toyota','Camry',1,1,'a','b','s','Clean title number ' || g from generate_series(1,1005) g;
      insert into public.qa_questions(id, user_id, title, content) values ('abababab-0000-0000-0000-000000000001','${U1}','How do I register a car?','I just moved to CA.');
      update i18n.sources set detected_hash = src_hash, field_langs = case when entity = 'car' then '{"description":"en"}'::jsonb else '{"title":"en","content":"en"}'::jsonb end, primary_lang = 'en';`);
    const svc = async <T>(text: string): Promise<T[]> => {
      await db4.exec("begin; set local role service_role;");
      try {
        return (await db4.query<T>(text)).rows;
      } finally {
        await db4.exec("commit");
      }
    };
    const t0 = Date.now();
    const counts = await svc<{ kind: string; n: number }>(`select kind, n from public.sitemap_counts('en')`);
    const n = Number(counts.find((r) => r.kind === "car")?.n);
    check("counts beyond 1000 (no row cap inside SQL)", n === 1005, counts);
    const p0 = await svc<{ id: string }>(`select id from public.sitemap_entries('car','en',0,5000)`);
    const p1 = await svc<{ id: string }>(`select id from public.sitemap_entries('car','en',1000,1000)`);
    check("one page is clamped to 1000 rows (PostgREST max-rows)", p0.length === 1000, p0.length);
    check("second shard holds the remaining 5", p1.length === 5, p1.length);
    const qa = await svc<{ id: string; locales: string[]; x_default: string }>(`select id, locales, x_default from public.sitemap_entries('qa','en',0,1000)`);
    check("qa kind lists the question with its availability", qa.length === 1 && qa[0].x_default === "en", qa);
    const zh = await svc<{ id: string }>(`select id from public.sitemap_entries('car','zh',0,1000)`);
    check("untranslated locale shard is empty (no thin pages submitted)", zh.length === 0, zh.length);
    console.log(`  (sitemap timing: ${Date.now() - t0} ms for counts + 4 pages over 1005 cars)`);
  }));
}

// =====================================================================
// browse:browse-cars.sql(观察模式 / 强制模式的配置选项 + 筛选 + 列表行)
// =====================================================================
async function browseSuite(db: PGlite) {
  const { as } = client(db);
  const C3 = "c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3"; // 只有中文写法的配置
  await db.exec(`insert into auth.users(id) values ('${U1}'); insert into public.profiles(id, username) values ('${U1}','s');
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description, description_zh, features, phone)
values ('${C1}','${U1}','2019 Toyota Camry','2019 丰田 凯美瑞',2019,'Toyota','Camry',1,1,'a','b','s','Clean title','干净','{倒车影像,Backup Camera,Heated Seats}','555'),
       ('${C2}','${U1}','2020 Kia Soul','2020 起亚 秀尔',2020,'Kia','Soul',1,1,'a','b','s','차량 상태 좋음',null,'{backup camera}','666'),
       ('${C3}','${U1}','2018 Honda Fit','2018 本田 飞度',2018,'Honda','Fit',1,1,'a','b','s',null,'代步小车','{倒车影像}','777');`);
  await db.exec(SCHEMA);
  await db.exec(DATA);
  await db.exec(BROWSE);
  await db.exec(`select public.i18n_seed_term('feature','backup-camera','{"zh":"倒车影像","en":"Backup Camera","ko":"후방 카메라","ja":"バックカメラ","es":"Cámara de reversa","fr":"Caméra de recul"}','dictionary',array['倒车影像','backup camera'])`);
  type Facet = { name: string; label: string; count: number };
  const facets = async () =>
    (await as<{ j: { features: Facet[] } }>("anon", null, `select public.browse_facets(null, 'ko') j`)).rows[0].j.features;
  const filtered = async (name: string) => (await as<{ j: { total: number } }>("anon", null,
    `select public.browse_cars('${JSON.stringify({ filters: { features: name } }).replace(/'/g, "''")}'::jsonb) j`)).rows[0].j.total;
  /** 每个选项的计数都等于按它的 name 筛出的车数(旧版 /browse 直接拿 name 当筛选值) */
  const mismatches = async (fs: Facet[]) => {
    const bad: Array<Facet & { total: number }> = [];
    for (const x of fs) {
      const total = await filtered(x.name);
      if (total !== x.count) bad.push({ ...x, total });
    }
    return bad;
  };
  // 观察模式:cars.features 还没有投影,按 v2 之前的写法分组(只看筛选所读的 cars.features)
  const obs = await facets();
  const cam = obs.find((x) => x.name.toLowerCase() === "backup camera");
  check("observe mode: facets group raw spellings of cars.features (no glossary label as a filter value)",
    !!cam && cam.count === 2 && cam.label === cam.name && obs.some((x) => x.name === "倒车影像" && x.label === "倒车影像" && x.count === 2), obs);
  const obsBad = await mismatches(obs);
  check("observe mode: every facet count equals the cars its name filters", obsBad.length === 0, obsBad);
  check("observe mode: case-insensitive feature filter matches both spellings", (await filtered("backup camera")) === 2);
  await db.exec(`select public.i18n_admin_set('enforce','true'::jsonb)`);
  const feats = await facets();
  check("enforce mode: twins grouped into one facet with ko label", feats.some((x) => x.name === "Backup Camera" && x.label === "후방 카메라" && x.count === 3), feats);
  const enfBad = await mismatches(feats);
  check("enforce mode: every facet count equals the cars its name filters (projection in place)", enfBad.length === 0, enfBad);
  const page = await as<{ j: { total: number; items: Array<Record<string, unknown>> } }>("anon", null,
    `select public.browse_cars('{"filters":{"features":"backup camera"}}'::jsonb) j`);
  check("enforce mode: the filter also finds the Chinese-only car through its projected label", page.rows[0].j.total === 3, page.rows[0].j.total);
  check("list rows carry no originals / other_i18n",
    page.rows[0].j.items.every((i) => !("description_original" in i) && !("other_i18n" in i)), Object.keys(page.rows[0].j.items[0]));
  const kw = await as<{ j: { total: number } }>("anon", null, `select public.browse_cars('{"tokens":[{"t":"차량"}]}'::jsonb) j`);
  check("keyword search hits a Korean original", kw.rows[0].j.total === 1, kw.rows[0].j);

  // 产权状态:browse-cars.sql 自带 add column(存根里没有这一列也能建函数),title-status.sql 加 CHECK;两份都可重复执行
  let tsErr: unknown = null;
  try {
    await db.exec(TITLE_STATUS);
    await db.exec(TITLE_STATUS);
    await db.exec(BROWSE);
  } catch (e) {
    tsErr = e;
  }
  check("title-status.sql + browse-cars.sql re-run without error", tsErr === null, tsErr);
  await db.exec(`update public.cars set title_status = '清白产权' where id = '${C1}';
update public.cars set title_status = '重建产权' where id = '${C2}';`);
  const bad = await as(null, null, `update public.cars set title_status = 'clean' where id = '${C3}'`);
  check("CHECK rejects a title_status outside the 4 Chinese values", !bad.ok && bad.constraint === "cars_title_status_check", bad);
  // 与 lib/car-filters.ts 同一规则:只有 title_status === CLEAN_TITLE 命中,null(C3)与重建(C2)都不命中
  const clean = await as<{ j: { total: number; items: Array<{ id: string; title_status: string | null }> } }>("anon", null,
    `select public.browse_cars('{"filters":{"cleanTitle":"true"}}'::jsonb) j`);
  const cj = clean.rows[0].j;
  check("cleanTitle filter matches only explicit clean titles (null / rebuilt excluded, same rule as car-filters.ts)",
    cj.total === 1 && cj.items.length === 1 && cj.items[0].id === C1 && cj.items.every((i) => i.title_status === CLEAN_TITLE), cj);
  const all = await as<{ j: { total: number } }>("anon", null, `select public.browse_cars('{"filters":{"cleanTitle":""}}'::jsonb) j`);
  check("cleanTitle off does not filter", all.rows[0].j.total === 3, all.rows[0].j);

  // 币种 / 里程单位:browse-cars.sql 自带 add column,car-currency.sql 加 CHECK;两份都可重复执行。
  // 价格 / 里程筛选与排序按折合美元 / 英里(browse_price_usd / browse_mileage_mi),与 lib/currency.ts 同一换算:
  // C1 = US$20,000 / 30,000 mi;C2 = CA$26,000(≈ US$18,841)/ 50,000 km(≈ 31,069 mi);C3 = US$19,000 / 40,000 mi。
  // 按原值比会得出相反的结论(26000 > 20000、50000 > 40000),所以每条断言都能区分「换算了」和「没换算」
  let curErr: unknown = null;
  try {
    await db.exec(CAR_CURRENCY);
    await db.exec(BROWSE);
    await db.exec(CAR_CURRENCY);
  } catch (e) {
    curErr = e;
  }
  check("car-currency.sql + browse-cars.sql re-run without error (either order)", curErr === null, curErr);
  const defaults = await as<{ currency: string; mileage_unit: string }>("anon", null,
    `select currency, mileage_unit from public.cars where id = '${C1}'`);
  check("existing rows default to USD / mi", defaults.rows[0]?.currency === "USD" && defaults.rows[0]?.mileage_unit === "mi", defaults.rows);
  await db.exec(`update public.cars set price = 20000, mileage = 30000 where id = '${C1}';
update public.cars set price = 26000, mileage = 50000, currency = 'CAD', mileage_unit = 'km' where id = '${C2}';
update public.cars set price = 19000, mileage = 40000 where id = '${C3}';`);
  // 库里只校验 ISO 三位大写格式(支持哪些币种由写入端按 lib/currency.ts 校验)
  const badCur = await as(null, null, `update public.cars set currency = 'usd' where id = '${C3}'`);
  check("CHECK rejects a currency that is not a 3-letter uppercase ISO code", !badCur.ok && badCur.constraint === "cars_currency_check", badCur);
  const badCur2 = await as(null, null, `update public.cars set currency = 'EURO' where id = '${C3}'`);
  check("CHECK rejects a 4-letter currency code", !badCur2.ok && badCur2.constraint === "cars_currency_check", badCur2);
  const badUnit = await as(null, null, `update public.cars set mileage_unit = 'miles' where id = '${C3}'`);
  check("CHECK rejects a mileage_unit outside mi / km", !badUnit.ok && badUnit.constraint === "cars_mileage_unit_check", badUnit);
  type UnitItem = { id: string; price: number; mileage: number; currency: string; mileage_unit: string };
  const browseIds = async (p: Record<string, unknown>) => {
    const r = await as<{ j: { total: number; items: UnitItem[] } }>("anon", null,
      `select public.browse_cars('${JSON.stringify(p).replace(/'/g, "''")}'::jsonb) j`);
    return r.rows[0].j;
  };
  // TS 侧同一组车(lib/currency.ts 的换算),用来对照 SQL 结果
  const tsCars = [
    { id: C1, price: 20000, mileage: 30000, currency: "USD", mileage_unit: "mi" },
    { id: C2, price: 26000, mileage: 50000, currency: "CAD", mileage_unit: "km" },
    { id: C3, price: 19000, mileage: 40000, currency: "USD", mileage_unit: "mi" },
  ];
  const tsIds = (pred: (c: (typeof tsCars)[number]) => boolean) => tsCars.filter(pred).map((c) => c.id).sort();
  const sqlIds = (j: { items: UnitItem[] }) => j.items.map((i) => i.id).sort();
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

  const minP = await browseIds({ filters: { minPrice: "19500" } });
  check("minPrice compares CAD listings in USD (CA$26,000 ≈ US$18,841 is below 19,500)",
    same(sqlIds(minP), [C1]) && same(sqlIds(minP), tsIds((c) => carPriceUsd(c) >= 19500)), minP);
  const maxP = await browseIds({ filters: { maxPrice: "19000" } });
  check("maxPrice compares CAD listings in USD (same set as lib/currency carPriceUsd)",
    same(sqlIds(maxP), [C2, C3].sort()) && same(sqlIds(maxP), tsIds((c) => carPriceUsd(c) <= 19000)), maxP);
  const maxM = await browseIds({ filters: { maxMileage: "35000" } });
  check("maxMileage compares km listings in miles (50,000 km ≈ 31,069 mi)",
    same(sqlIds(maxM), [C1, C2].sort()) && same(sqlIds(maxM), tsIds((c) => carMileageMi(c) <= 35000)), maxM);
  const cap = await browseIds({ paymentPriceCap: 18900 });
  check("monthly-budget price cap (USD) converts CAD listings", same(sqlIds(cap), [C2]), cap);
  const byPrice = await browseIds({ sort: "price-asc" });
  check("price-asc sorts by USD-equivalent price (CAD car first)",
    byPrice.items.map((i) => i.id).join() === [C2, C3, C1].join(), byPrice.items.map((i) => i.id));
  const byPriceDesc = await browseIds({ sort: "price-desc" });
  check("price-desc sorts by USD-equivalent price", byPriceDesc.items.map((i) => i.id).join() === [C1, C3, C2].join(),
    byPriceDesc.items.map((i) => i.id));
  const byMileage = await browseIds({ sort: "mileage" });
  check("mileage sort uses miles (50,000 km sorts before 40,000 mi)",
    byMileage.items.map((i) => i.id).join() === [C1, C2, C3].join(), byMileage.items.map((i) => i.id));
  const c2Row = byPrice.items.find((i) => i.id === C2);
  check("list rows carry the listing's own currency / mileage_unit and raw values",
    c2Row?.currency === "CAD" && c2Row?.mileage_unit === "km" && c2Row?.price === 26000 && c2Row?.mileage === 50000, c2Row);

  // 车行贷款标签:browse-cars.sql 自带 add column(定义同 dealer-financing.sql),dealer-financing.sql 加 CHECK + 索引;
  // 两份谁先执行都行、可重复执行。「可贷款(无信用/ITIN)」= 卖家名下任一门店带 支持ITIN贷款 / 无信用记录可贷,
  // 与 lib/dealer-financing.ts 的 hasLoanFinancing 同一规则:U1 无门店、U2 只有 自营分期 + 接受现金、S1 有 无信用记录可贷
  const C4 = "c4c4c4c4-c4c4-c4c4-c4c4-c4c4c4c4c4c4"; // U2 的车
  const C5 = "c5c5c5c5-c5c5-c5c5-c5c5-c5c5c5c5c5c5"; // S1 的车
  let finErr: unknown = null;
  try {
    await db.exec(DEALER_FINANCING);
    await db.exec(BROWSE);
    await db.exec(DEALER_FINANCING);
  } catch (e) {
    finErr = e;
  }
  check("dealer-financing.sql + browse-cars.sql re-run without error (either order)", finErr === null, finErr);
  await db.exec(`insert into auth.users(id) values ('${U2}'),('${S1}');
insert into public.profiles(id, username, account_type) values ('${U2}','d2','dealer'),('${S1}','d3','dealer');
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name)
values ('${C4}','${U2}','2017 Ford Focus','2017 福特 福克斯',2017,'Ford','Focus',9000,60000,'a','b','d2'),
       ('${C5}','${S1}','2016 Mazda 3','2016 马自达 3',2016,'Mazda','3',8000,70000,'a','b','d3');
insert into public.dealer_stores(owner_id, name, address) values ('${U2}','D2','x');`);
  const storeDefault = await as<{ financing: string[] }>("anon", null, `select financing from public.dealer_stores where owner_id = '${U2}'`);
  check("new stores default to an empty financing array",
    JSON.stringify(storeDefault.rows[0]?.financing) === "[]", storeDefault.rows);
  const badFin = await as(null, null, `update public.dealer_stores set financing = '{零首付}' where owner_id = '${U2}'`);
  check("CHECK rejects a financing tag outside the 4 Chinese values",
    !badFin.ok && badFin.constraint === "dealer_stores_financing_check", badFin);
  const nullFin = await as(null, null, `update public.dealer_stores set financing = array[null]::text[] where owner_id = '${U2}'`);
  check("CHECK rejects null elements", !nullFin.ok && nullFin.constraint === "dealer_stores_financing_check", nullFin);
  await db.exec(`update public.dealer_stores set financing = '{自营分期,接受现金}' where owner_id = '${U2}';
insert into public.dealer_stores(owner_id, name, address, financing) values ('${S1}','D3','y','{无信用记录可贷}');`);
  const stores = { [U1]: [] as string[], [U2]: ["自营分期", "接受现金"], [S1]: ["无信用记录可贷"] };
  const sellerOf: Record<string, string> = { [C1]: U1, [C2]: U1, [C3]: U1, [C4]: U2, [C5]: S1 };
  const tsLoan = () => Object.keys(sellerOf).filter((id) => hasLoanFinancing(stores[sellerOf[id]])).sort();
  const loan = await browseIds({ filters: { financing: "true" } });
  check("financing filter: only sellers with ITIN / no-credit stores (same set as hasLoanFinancing)",
    same(sqlIds(loan), [C5]) && same(sqlIds(loan), tsLoan()) && loan.total === 1, loan);
  check("browse_cars reports financingApplied", (loan as { financingApplied?: boolean }).financingApplied === true, loan);
  // 车主可以按 can_act_as 改自己的门店(认领人同理);anon 改不了
  const anonUpd = await as("anon", null, `update public.dealer_stores set financing = '{支持ITIN贷款}' where owner_id = '${U1}' returning id`);
  check("anon cannot write store financing", anonUpd.ok && anonUpd.rows.length === 0, anonUpd);
  await db.exec(`insert into public.dealer_stores(owner_id, name, address) values ('${U1}','D1','z');`);
  const ownUpd = await as("authenticated", U1,
    `update public.dealer_stores set financing = '{支持ITIN贷款}' where owner_id = '${U1}' returning id`);
  check("store owner can set financing", ownUpd.ok && ownUpd.rows.length === 1, ownUpd);
  stores[U1] = ["支持ITIN贷款"];
  const loan2 = await browseIds({ filters: { financing: "true" } });
  check("financing filter follows store edits (any store of the seller counts)",
    same(sqlIds(loan2), tsLoan()) && loan2.total === 4, loan2);
  const off = await browseIds({ filters: { financing: "" } });
  check("financing off does not filter", off.total === 5, off.total);

  // 车况清单:car-condition.sql 可重复执行,既有行默认 {};CHECK 与 lib/car-condition.ts 的 normalizeCarCondition 同一规则
  // (TS 归一后原样不变 ⇔ SQL 接受;已知问题重复项例外:SQL 只管取值,去重由 TS 写入前做)
  let condErr: unknown = null;
  try {
    await db.exec(CAR_CONDITION);
    await db.exec(CAR_CONDITION);
    await db.exec(BROWSE);
  } catch (e) {
    condErr = e;
  }
  check("car-condition.sql re-runs without error", condErr === null, condErr);
  const condDefault = await as<{ condition: unknown }>("anon", null, `select "condition" from public.cars where id = '${C1}'`);
  check("existing rows default to an empty checklist", JSON.stringify(condDefault.rows[0]?.condition) === "{}", condDefault.rows);
  const condSamples: unknown[] = [
    {},
    { service_records: true, one_owner: false, smoker: false, keys_count: 2, tires_condition: "良好", known_issues: ["发动机", "漏油"] },
    { keys_count: 0 },
    { keys_count: 5, tires_condition: "需更换" },
    { known_issues: [] },
    { known_issues: ["发动机", "变速箱", "空调", "电子系统", "漏油", "车身锈蚀", "事故修复", "悬挂"] },
    { notes: "call 555-0100" },
    { smoker: "yes" },
    { one_owner: null },
    { keys_count: 6 },
    { keys_count: 2.5 },
    { keys_count: "2" },
    { keys_count: -1 },
    { tires_condition: "excellent" },
    { known_issues: ["刹车异响"] },
    { known_issues: "发动机" },
    { known_issues: [1] },
    { known_issues: [["发动机"]] },
    [],
    "x",
  ];
  const condMismatch: unknown[] = [];
  for (const sample of condSamples) {
    const r = await as(null, null,
      `update public.cars set "condition" = '${JSON.stringify(sample).replace(/'/g, "''")}'::jsonb where id = '${C3}'`);
    const tsOk = JSON.stringify(normalizeCarCondition(sample)) === JSON.stringify(sample);
    if (r.ok !== tsOk || (!r.ok && r.constraint !== "cars_condition_check")) condMismatch.push({ sample, sql: r.ok, ts: tsOk });
  }
  check("CHECK accepts exactly what normalizeCarCondition keeps unchanged", condMismatch.length === 0, condMismatch);
  const condNull = await as(null, null, `update public.cars set "condition" = null where id = '${C3}'`);
  check("condition is NOT NULL", !condNull.ok, condNull);
}

// =====================================================================
// rollback:紧急摘除 → 旧写法 / 认领人编辑 → 重新挂载 → sweep 修复 → 快速回滚的审核停放 → cleanup
// =====================================================================
async function rollbackSuite(db: PGlite) {
  const { q, as } = client(db);
  const CL = "cccccccc-0000-0000-0000-00000000000c";
  const CS = "c8c8c8c8-0000-0000-0000-000000000001", CS2 = "c8c8c8c8-0000-0000-0000-000000000002";
  await seedAccounts(db);
  await db.exec(`insert into auth.users(id) values ('${CL}'); insert into public.profiles(id, username) values ('${CL}','claimant');
update public.profiles set claimed_by='${CL}' where id='${S1}';
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description, description_zh, features)
values ('${C1}','${U1}','t','t',2019,'Toyota','Camry',1,1,'a','b','s','Clean','干净',array['Sunroof']);
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh, seller_name, description, source_id, source_listing_id)
values ('${CS}','${S1}','t','t',2021,'Kia','Soul',1,1,'a','b','dealer','Dealer text one.','${SRC}','stock-1'),
       ('${CS2}','${S1}','t','t',2021,'Kia','Rio',1,1,'a','b','dealer','Dealer text two.','${SRC}','stock-2');
insert into public.community_posts(id, user_id, type, title, content, tags) values ('${P1}','${U1}','discussion','求助','内容',array['tesla']);`);
  await db.exec(SCHEMA);
  await db.exec(DATA);
  await db.exec(`select public.i18n_admin_set('enforce','true'::jsonb)`);
  const trust = async (id: string) =>
    (await q<{ trusted: boolean; moderation: string }>("select trusted, moderation from i18n.sources where entity_id=$1", [id]))[0];
  check("(the migration trusts syndicated cars held by their source's account)", (await trust(CS)).trusted && (await trust(CS2)).trusted);
  await db.exec(ROLLBACK);
  const triggers = async () => (await db.query<{ tgname: string }>(
    "select tgname from pg_trigger where tgname like 'i18n_%' and not tgisinternal order by tgname")).rows.map((t) => t.tgname);
  const t1 = await triggers();
  check("detach drops every v2 trigger; only the legacy mapper remains", t1.join(",") === "i18n_legacy_map", t1);
  const e1 = (await db.query<{ v: string }>("select value::text v from i18n.settings where key='enforce'")).rows[0];
  check("detach falls back to observe mode (enforce=false)", e1.v === "false", e1);
  // 摘除期间:旧代码照常写 description_zh / features(由临时映射同步到原文),认领人改转载车描述,帖子改标签
  await db.exec(`update public.cars set description_zh='改过' where id='${C1}'`);
  await db.exec(`update public.cars set features='{Heated Seats,Backup Camera}' where id='${C1}'`);
  const ce = await as("authenticated", CL, `update public.cars set description_original='Claimant text. Buy now at scam.example' where id='${CS}'`);
  const ce2 = await as("authenticated", CL, `update public.cars set description_original='Claimant text two. Call 555-0100' where id='${CS2}'`);
  await db.exec(`update public.community_posts set tags=array['bmw'] where id='${P1}'`);
  check("(claimant edits reach the base rows while detached)", ce.ok && ce2.ok, { ce: ce.error, ce2: ce2.error });
  // 摘除期间 drain 的 claim 自愈:漂移的文本写入者不明,不算可信
  await as("service_role", null, `select * from public.i18n_claim(6, 120, 'car', array['${CS2}']::uuid[])`);
  const h2 = await trust(CS2);
  check("claim self-heal while detached: the drifted claimant text is untrusted and moderated", !h2.trusted && h2.moderation === "pending", h2);
  await db.exec(SCHEMA);
  const t2 = await triggers();
  check("re-running i18n-v2.sql re-attaches the 17 triggers and drops the mapper", t2.length === 17 && !t2.includes("i18n_legacy_map"), t2);
  const n = (await db.query<{ n: number }>("select i18n.sweep() n")).rows[0];
  check("sweep repairs every row edited while detached (legacy car edit, claimant edit, post tags)", n.n === 3, n);
  const orig = (await q<{ o: string }>("select description_original o from public.cars where id=$1", [C1]))[0];
  check("the detached-window legacy edit reached description_original", orig.o === "改过", orig);
  const st = (await db.query<{ n: number }>("select count(*)::int n from i18n.sources")).rows[0];
  check("sources kept across detach / re-attach", st.n === 4, st);
  const synced = (await q<{ hash_ok: boolean; states: string[] }>(`select s.src_hash = i18n.hash_payload(i18n.payload_of('car', s.entity_id)) hash_ok,
      array(select distinct t.state from i18n.translations t where t.entity = s.entity and t.entity_id = s.entity_id) states
    from i18n.sources s where s.entity_id = $1`, [C1]))[0];
  check("after the sweep the source hash matches the edited original and every locale is pending",
    synced.hash_ok && synced.states.join(",") === "pending", synced);
  const t3 = await trust(CS);
  check("re-attach sweep: a claimant edit of a trusted car made while detached ends untrusted and moderated",
    !t3.trusted && t3.moderation === "pending", t3);
  const links = await q<{ n: string }>("select string_agg(alias_norm, ',' order by alias_norm) n from i18n.car_features where car_id=$1", [C1]);
  const cb = await as<{ x: { features: FeatureChip[] } }>("anon", null, `select x from public.i18n_bundle('car', array['${C1}']::uuid[], 'en')`);
  check("feature link rows re-synced from the features edited while detached",
    links[0].n === "backupcamera,heatedseats" && cb.rows[0].x.features.map((f) => f.label).join(",") === "Heated Seats,Backup Camera", { links, cb: cb.rows });
  const pb = await as<{ x: { topics: TopicChip[] } }>("anon", null, `select x from public.i18n_bundle('post', array['${P1}']::uuid[], 'en')`);
  check("topic link rows re-synced from the tags edited while detached",
    pb.rows[0].x.topics.map((t) => t.label).join(",") === "bmw", pb.rows);
  // 快速回滚(Vercel 回滚到 v2 之前):按 i18n-v2-rollback.sql 头部文档停放旧管理页认不出的审核标记,重新上线后恢复。
  // 译文标记带 i18n_complete 写的 context(jsonb 键按长度排序,与字面量同序),其余类型的 context 为 null。
  // QH = 被 AI 审核屏蔽的问题;C1 上的 qa_question 标记是影子模式记下的(内容从未屏蔽),不停放
  const trCtx = { entity: "post", locales: ["ko"], src_hash: "h1" };
  const QH = "a7a7a7a7-0000-0000-0000-0000000000a7";
  await db.exec(`insert into public.qa_questions(id, user_id, title, content, status) values ('${QH}','${U2}','怎么验车','求推荐验车的地方','hidden');
insert into public.ai_moderation(target_type, target_id, content, status, context) values
    ('translation','${P1}','x','pending','${JSON.stringify(trCtx)}'), ('qa_answer','${C1}','x','pending',null),
    ('qa_question','${QH}','x','pending',null), ('qa_question','${C1}','x','shadow',null), ('car','${C1}','x','pending',null)`);
  await db.exec(documentedSql(ROLLBACK, "update public.ai_moderation set status = 'shadow'"));
  const parked = await q<{ target_type: string; status: string; parked: boolean }>(
    "select target_type, status, coalesce((context ->> 'parked')::boolean, false) parked from public.ai_moderation order by target_type, parked");
  check("fast rollback: pending flags of v2-only target types leave the pending list (shadow + parked); car and shadow-mode flags stay",
    JSON.stringify(parked.map((r) => [r.target_type, r.status, r.parked])) ===
      JSON.stringify([["car", "pending", false], ["qa_answer", "shadow", true], ["qa_question", "shadow", false],
        ["qa_question", "shadow", true], ["translation", "shadow", true]]), parked);
  // 回滚期间运维在 SQL editor 批量恢复误杀:停放的标记内容仍是屏蔽的,照待审核恢复(停放标记留给取消停放);影子模式的标记不动
  const bulk = await as<{ n: number }>(null, null,
    "select public.i18n_admin_restore_moderation(now() - interval '1 hour', 'qa_question') n");
  const qh = await q<{ status: string }>("select status from public.qa_questions where id = $1", [QH]);
  const qf = await q<{ status: string; parked: boolean }>(`select status, coalesce((context ->> 'parked')::boolean, false) parked
    from public.ai_moderation where target_type = 'qa_question' order by parked`);
  check("bulk restore while parked: the hidden question is active again, its flag restored (marker kept); the shadow-mode flag is untouched",
    bulk.ok && Number(bulk.rows[0].n) === 1 && qh[0].status === "active" &&
      JSON.stringify(qf.map((r) => [r.status, r.parked])) === JSON.stringify([["shadow", false], ["restored", true]]),
    { bulk: bulk.error ?? bulk.rows, qh, qf });
  // 重新上线后、取消停放前:v2 管理页把停放的标记当待审核,管理员对问答标记点了「恢复」(内容恢复,标记 restored)
  const restored = await as<{ status: string }>("authenticated", A1, `update public.ai_moderation
    set status = 'restored', reviewed_at = now(), reviewed_by = '${A1}' where target_type = 'qa_answer' returning status`);
  await db.exec(documentedSql(ROLLBACK, "update public.ai_moderation set status = case"));
  const back = await q<{ target_type: string; status: string; ctx: Record<string, unknown> | null }>(
    "select target_type, status, context ctx from public.ai_moderation order by target_type, status");
  check("re-deploy: unreviewed parked flags are pending again, flags reviewed meanwhile keep their status; marker gone, context as before",
    restored.rows.length === 1 && JSON.stringify(back.map((r) => [r.target_type, r.status, r.ctx])) ===
      JSON.stringify([["car", "pending", null], ["qa_answer", "restored", null], ["qa_question", "restored", null],
        ["qa_question", "shadow", null], ["translation", "pending", trCtx]]),
    { restored: restored.error ?? restored.rows, back });
  await db.exec(CLEANUP);
  const cars = (await db.query<{ other_i18n: unknown }>("select other_i18n from public.cars")).rows;
  check("cleanup clears other_i18n", cars.every((c) => JSON.stringify(c.other_i18n) === "{}"), cars);
  const notValid = (await db.query<{ conname: string }>(`select conname from pg_constraint where not convalidated and conname in
    ('cars_description_original_len','community_posts_text_len','post_comments_text_len','comments_text_len',
     'qa_questions_text_len','qa_answers_text_len','dealer_reviews_text_len','post_comments_reply_to_name_len')`)).rows;
  check("cleanup validates the 8 NOT VALID caps", notValid.length === 0, notValid);
  let again = "";
  try {
    await db.exec(CLEANUP);
  } catch (e) {
    again = e instanceof Error ? e.message : String(e);
  }
  check("cleanup is idempotent (second run ok)", again === "", again);
}

// =====================================================================
// parity:SQL ⇄ lib/i18n/hashtags.ts
// =====================================================================
async function paritySuite(db: PGlite) {
  await db.exec(SCHEMA);
  // 检查名里把不可见的空白写成 \uXXXX(JSON.stringify 不转义 U+0085 / U+00A0 / U+3000 / U+FEFF 这类字符)
  const shown = (s: string) => JSON.stringify(s).replace(/[\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  const sqlNorm = async (s: string) => (await db.query<{ n: string | null }>("select public.i18n_norm_tag($1) n", [s])).rows[0].n;
  const sqlTokens = async (t: string) => (await db.query<{ t: string }>("select i18n.hashtag_tokens($1) t", [t])).rows.map((r) => r.t);
  const samples = ["#CR-V", "＃Model 3", "  特斯拉 ", "#テスラ", "#테슬라", "Tesla", "TESLA", "Backup_Camera", "倒车·影像", "Ｍｏｄｅｌ３", "#", "", "a.b-c d", "ÉCOLE", "Model Y・Long Range", "#ß"];
  for (const s of samples) {
    const sql = await sqlNorm(s);
    const ts = normTag(s);
    check(`normTag ${shown(s)}`, sql === ts, { sql, ts });
  }
  // 空白 = JS \s(trim 去掉的那一套),SQL 逐个写出,不随服务器 libc 的区域设置变:开头的 \t / U+3000 / U+00A0 连同 # 一起去掉,
  // U+FEFF / U+202F 是空白,U+0085 不是。除了两边一致还要等于期望值
  const wsNorms: [string, string | null][] = [
    ["\t#特斯拉", "特斯拉"], ["\u3000#特斯拉", "特斯拉"], ["\u00a0#保险", "保险"], ["Model\ufeffY", "modely"], ["Model\u0085Y", "model\u0085y"], ["\ufeff\u202f", null],
  ];
  for (const [s, want] of wsNorms) {
    const sql = await sqlNorm(s);
    const ts = normTag(s);
    check(`normTag ${shown(s)}`, sql === ts && ts === want, { sql, ts, want });
  }
  const texts = ["好车 #特斯拉，真不错 #Model3! #保险。完", "#a#b c", "（#ＣＲ－Ｖ）好", "#很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长", "no tags", "#tag\n#二行"];
  for (const t of texts) {
    const sql = await sqlTokens(t);
    const ts = extractHashtags(t);
    check(`hashtag tokens ${shown(t)}`, JSON.stringify(sql) === JSON.stringify(ts), { sql, ts });
  }
  // 以下样本除了两边一致还要等于期望的话题
  const pinnedTexts: [string, string[]][] = [
    // URL 里的 '#' 不是话题(C10 F032):两边同一条 URL 规则(URL_SOURCE / i18n.hashtag_tokens)
    ["官方参数 https://www.tesla.com/model3#specs 看这里 #特斯拉", ["特斯拉"]],
    ["转发 https://mp.weixin.qq.com/s/abc?x=1#wechat_redirect 值得一看", []],
    ["转一篇 https://mp.weixin.qq.com/s?__biz=MzA5&mid=2650&idx=1&sn=abc#rd 写得不错 #公众号", ["公众号"]],
    ["原文 https://mp.weixin.qq.com/s/AbCdEf#wechat_redirect", []],
    ["www.example.com/#rd #保养", ["保养"]],
    ["www.example.com/#top 好文 HTTPS://X.COM/#A", []],
    ["HTTPS://EXAMPLE.COM/A#B #大写", ["大写"]],
    ["#tag http://x.y/#z #二", ["tag", "二"]],
    // 链接只由 ASCII URL 字符组成:紧跟的中文、紧贴在链接前的话题都不受影响;括号也是 URL 字符
    ["见 http://a.b/c#frag看这里 #标签", ["标签"]],
    ["https://x.com/a#frag看这里#保险", ["保险"]],
    ["#特斯拉https://x.com/a#b", ["特斯拉"]],
    ["见 (https://x.com/a_(b)#c) 和 #保养。", ["保养"]],
    // 协议后面没有 ASCII 字符就不是链接
    ["http://中文#tag", ["tag"]],
    // 话题在 JS \s 处结束:U+00A0 / U+202F / U+FEFF / U+3000 都算空白,U+0085 不算
    ["#特斯拉\u00a0好车", ["特斯拉"]],
    ["#特斯拉\u202f好车", ["特斯拉"]],
    ["#特斯拉\ufeff好车 #保险\u3000完", ["特斯拉", "保险"]],
    ["#特斯拉\u0085好车", ["特斯拉\u0085好车"]],
  ];
  for (const [t, want] of pinnedTexts) {
    const sql = await sqlTokens(t);
    const ts = extractHashtags(t);
    check(`hashtag tokens ${shown(t)}`, JSON.stringify(sql) === JSON.stringify(ts) && JSON.stringify(ts) === JSON.stringify(want), { sql, ts, want });
  }
  const parts = "好车 #特斯拉，真不错".split(HASHTAG_SPLIT_RE);
  check("HASHTAG_SPLIT_RE keeps each hashtag as its own part", JSON.stringify(parts) === JSON.stringify(["好车 ", "#特斯拉", "，真不错"]), parts);
}

// =====================================================================
// verify:R3(迁移)→ R4(观察模式完成一条 zh/en)→ R6(enforce)后执行一次 i18n-v2-verify.sql
// =====================================================================
async function verifySuite(db: PGlite) {
  const { as } = client(db);
  const CC1 = "f1f1f1f1-0000-0000-0000-000000000001";
  // 迁移前的旧数据:不同日期发布的 app 车 / 转载车,带旧缓存(other_i18n)的帖子、帖子评论与车源评论
  await db.exec(`
insert into auth.users(id) values ('${U1}'),('${U2}'),('${S1}');
insert into public.profiles(id, username, is_system) values ('${U1}','seller',false),('${U2}','other',false),('${S1}','dealer',true);
insert into public.listing_sources(id, key, name, base_url, system_account_id) values ('${SRC}','westcoast','West Coast Auto','https://westcoast.example','${S1}');
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh,
  seller_name, description, description_zh, features, other_i18n, created_at)
values ('${C1}','${U1}','2019 Toyota Camry','2019 丰田 凯美瑞',2019,'Toyota','Camry',15000,60000,'Flushing, NY','法拉盛',
  'seller','Perfect condition, one owner','车况完美，一手车主',array['倒车影像','Backup Camera'],
  '{"ko":{"title":"2019 Toyota Camry","description":"차량 상태 완벽"}}','2024-01-01T00:00:00Z');
insert into public.cars(id, seller_id, title, title_zh, year, make, model, price, mileage, location, location_zh,
  seller_name, description, description_zh, features, source_id, created_at)
values ('${C2}','${S1}','2020 Tesla Model 3','2020 特斯拉 Model 3',2020,'Tesla','Model 3',25000,30000,'San Diego, CA','圣地亚哥',
  'dealer','Clean title. Long range.','清洁产权。长续航。',array['Autopilot','Heated Seats','座椅加热'],'${SRC}','2025-06-01T00:00:00Z');
insert into public.community_posts(id, user_id, type, title, content, tags, other_i18n)
values ('${P1}','${U1}','discussion','特斯拉保险怎么买','求推荐 #Model3 保险',array['特斯拉','保险'],
  '{"ko":{"title":"테슬라 보험 어떻게 사나요","content":"추천 부탁해요 #Model3 보험"}}');
insert into public.post_comments(id, post_id, user_id, content, other_i18n)
values ('${PC1}','${P1}','${U2}','我用的 Geico','{"en":{"content":"I use Geico"}}');
insert into public.comments(id, car_id, user_id, content, other_i18n)
values ('${CC1}','${C1}','${U2}','还在卖吗？','{"en":{"content":"Still for sale?"}}');
`);
  // R3:i18n-v2.sql → i18n-v2-data.sql → browse-cars.sql(观察模式 + 影子审核)
  await db.exec(SCHEMA);
  await db.exec(DATA);
  await db.exec(BROWSE);
  // R4:观察模式下 worker 为转载车(英文原文)完成 zh / en
  const cl = await as<ClaimRow>("service_role", null,
    `select * from public.i18n_claim(6, 120, 'car', array['${C2}']::uuid[], array['zh','en'])`);
  const row = cl.rows[0];
  const done = await as<{ r: CompleteResult }>("service_role", null,
    `select public.i18n_complete('car','${C2}','${row.lease_token}','${row.src_hash}','{"field_langs":{"description":"en"},"primary_lang":"en"}',
      '[{"locale":"en","outcome":"skipped"},{"locale":"zh","outcome":"ok","fields":{"description":"清洁产权。长续航。"},"source_lang":"en","model":"m","prompt_version":1}]',
      '{"calls":1}') r`);
  check("R4: observe-mode drain completes zh/en", done.ok && done.rows[0].r.applied?.join(",") === "en,zh", done);
  // R4 --import-legacy:只有可信(转载)车源的旧缓存可以复用
  const lp = await as<{ entity_id: string; trusted: boolean }>("service_role", null, "select entity_id, trusted from public.i18n_legacy_page('car', null, 100)");
  const trustedOf = (id: string) => lp.rows.find((r) => r.entity_id === id)?.trusted;
  check("R4: i18n_legacy_page marks the syndicated car trusted and the app car untrusted (F003)",
    trustedOf(C2) === true && trustedOf(C1) === false, lp.rows);
  // R6:切换强制模式(重投影标题 / 配置 / 描述)
  const flip = await as(null, null, `select public.i18n_admin_set('enforce','true'::jsonb)`);
  check("R6: enforce flip", flip.ok, flip.error);

  const results = await db.exec(VERIFY);
  /** 按列名找 verify 的结果集(与语句顺序无关) */
  const pick = <T>(...cols: string[]): T[] => {
    const r = results.find((x) => cols.every((c) => x.fields.some((f) => f.name === c)));
    if (!r) throw new Error(`i18n-v2-verify.sql: no result set with columns ${cols.join(", ")}`);
    return r.rows as T[];
  };
  const [structure] = pick<{ i18n_tables: number; i18n_triggers: number; cron_jobs: number }>("i18n_tables", "i18n_triggers", "cron_jobs");
  check("gate 1: 12 private tables, 17 triggers, 2 cron jobs",
    structure.i18n_tables === 12 && structure.i18n_triggers === 17 && structure.cron_jobs === 2, structure);
  const [priv] = pick<Record<string, boolean>>("anon_usage");
  check("gate 2: API roles cannot reach the i18n schema, pipeline, moderation queue, budget, sitemap, legacy or restore RPCs",
    ["anon_usage", "auth_usage", "anon_complete", "auth_claim", "auth_mod_queue", "auth_budget_state", "anon_sitemap", "anon_legacy",
      "anon_restore_translation"].every((k) => priv[k] === false), priv);
  check("gate 2: anon can call i18n_bundle and i18n_norm_tag", priv.anon_bundle === true && priv.anon_norm_tag === true, priv);
  const inlined = pick<{ norm_tag_inlined: boolean }>("norm_tag_inlined");
  check("gate 2: public.i18n_norm_tag does not reference the private schema",
    inlined.length === 1 && inlined[0].norm_tag_inlined === true, inlined);
  const okRows = (await db.query<{ n: number }>("select count(*)::int n from i18n.translations where state = 'ok'")).rows[0].n;
  check("(the stale-hash gate sees validated translations)", okRows > 0, okRows);
  for (const gate of ["ok_rows_with_stale_hash", "active_described_cars_without_original", "entities_without_source",
    "sources_without_mod_hash", "leased_hidden_rows", "parked_rows_of_public_entities", "untrusted_app_cars_marked_trusted",
    "sync_slots_held_by_other_accounts"]) {
    const [g] = pick<Record<string, number>>(gate);
    check(`gate 3: ${gate} = 0`, g[gate] === 0, g);
  }
  const [llm] = pick<{ llm_label_aliases: number }>("llm_label_aliases");
  check("info 3: no LLM label aliases before the glossary worker runs", llm.llm_label_aliases === 0, llm);
  const [backlog] = pick<{ moderation_backlog: number }>("moderation_backlog");
  check("info 3: no moderation backlog after grandfathering", backlog.moderation_backlog === 0, backlog);
  const stash = pick<{ entity: string; count: number }>("entity", "count");
  check("gate 4: legacy stash taken for every entity with legacy text, kept through the enforce flip",
    JSON.stringify(stash.map((s) => [s.entity, s.count])) ===
      JSON.stringify([["car", 2], ["car_comment", 1], ["post", 1], ["post_comment", 1]]), stash);
  const days = pick<{ day: Date; count: number }>("day", "count");
  check("gate 5: content clock keeps the legacy baselines (distinct days, not migration time)",
    days.length === 2 && days.every((d) => d.day.getTime() < Date.now() - 86_400_000), days);
  const stats = pick<{ entity: string; locale: string; state: string; n: number }>("entity", "locale", "state", "n");
  const moderation = stats.filter((s) => s.locale === "_moderation");
  check("gate 6: i18n_stats() readable from the SQL editor; existing content grandfathered (moderation skipped)",
    moderation.length > 0 && moderation.every((s) => s.state === "skipped"), stats);
  const budget = pick<{ day: Date; calls: number; mod_calls: number }>("day", "calls", "mod_calls");
  check("info 6: budget counts the drain's calls (moderation calls separately)",
    budget.length === 1 && budget[0].calls === 1 && budget[0].mod_calls === 0, budget);
  const settings = Object.fromEntries(pick<{ key: string; value: unknown }>("key", "value").map((s) => [s.key, s.value]));
  check("info 6: settings after R6 (enforce on, moderation in shadow mode, default caps, data migration recorded)",
    settings.enforce === true && settings.moderation_enforce === false && settings.daily_call_cap === 20000 &&
      settings.daily_moderation_cap === 20000 && settings.max_attempts === 6 && settings.moderate_outputs === true &&
      typeof settings.data_v2_done === "string", settings);
  const review = pick<{ target_type: string; status: string; count: number }>("target_type", "status");
  check("gate 7: shadow-review query runs (no verdicts recorded yet)", review.length === 0, review);
}

// =====================================================================
// replies:i18n-v2-data.sql 第 5b 步把历史评论正文里的「回复 @name：」前缀迁入 reply_to_*(B33)
// =====================================================================
async function replySuite(db: PGlite) {
  const { q } = client(db);
  const U3 = "33333333-3333-3333-3333-333333333333"; // twin:被迁移的回复之前就评论过
  const U4 = "44444444-4444-4444-4444-444444444444"; // twin(同名):第一条评论晚于 pc(4)
  const pc = (n: number) => `e0e0e0e0-0000-0000-0000-${String(n).padStart(12, "0")}`;
  const LONG = "回复 @seller：" + "长".repeat(5001);
  // 迁移前的旧数据(按时间递增):旧版楼中楼回复把「回复 @name：」写进正文
  await db.exec(`
insert into auth.users(id) values ('${U1}'),('${U2}'),('${U3}'),('${U4}');
insert into public.profiles(id, username) values ('${U1}','seller'),('${U2}','other'),('${U3}','twin'),('${U4}','twin');
insert into public.community_posts(id, user_id, type, title, content) values ('${P1}','${U1}','discussion','求助','刹车异响');
insert into public.post_comments(id, post_id, user_id, parent_id, content, created_at) values
 ('${pc(1)}','${P1}','${U2}',null,'first','2026-01-01T00:00:00Z'),
 ('${pc(2)}','${P1}','${U3}','${pc(1)}','me too','2026-01-01T01:00:00Z'),
 ('${pc(3)}','${P1}','${U1}','${pc(1)}','回复 @other：Thanks, that helps','2026-01-01T02:00:00Z'),
 ('${pc(4)}','${P1}','${U1}','${pc(1)}','回复 @twin: 好的','2026-01-01T03:00:00Z'),
 ('${pc(5)}','${P1}','${U4}','${pc(1)}','回复 @twin：同名','2026-01-01T04:00:00Z'),
 ('${pc(6)}','${P1}','${U2}','${pc(1)}','回复 @匿名：hello','2026-01-01T05:00:00Z'),
 ('${pc(7)}','${P1}','${U2}','${pc(1)}','回复 @seller：','2026-01-01T06:00:00Z'),
 ('${pc(8)}','${P1}','${U2}',null,'说到 回复 @seller：这种写法','2026-01-01T07:00:00Z'),
 ('${pc(9)}','${P1}','${U1}','${pc(1)}','回复 @other：回复 @twin：两层','2026-01-01T08:00:00Z'),
 ('${pc(10)}','${P1}','${U2}','${pc(1)}','${LONG}','2026-01-01T09:00:00Z');
`);
  await db.exec(SCHEMA);
  let err = "";
  try {
    await db.exec(DATA);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
    await db.exec("rollback").catch(() => {});
  }
  check("data migration succeeds with a legacy reply over the 5000-char cap present", err === "", err);

  interface CommentRow { id: string; content: string; reply_to_name: string | null; reply_to_user_id: string | null }
  const read = () => q<CommentRow>("select id, content, reply_to_name, reply_to_user_id from public.post_comments order by id");
  const rows = await read();
  const row = (n: number) => rows.find((r) => r.id === pc(n))!;
  const moved = (n: number, content: string, name: string, uid: string | null) =>
    row(n).content === content && row(n).reply_to_name === name && row(n).reply_to_user_id === uid;
  const untouched = (n: number, content: string) =>
    row(n).content === content && row(n).reply_to_name === null && row(n).reply_to_user_id === null;
  check("prefix moves into reply_to_name / reply_to_user_id; content keeps only the reply text",
    moved(3, "Thanks, that helps", "other", U2), row(3));
  check("ASCII colon; a shared username resolves to the user who had commented before the reply",
    moved(4, "好的", "twin", U3), row(4));
  check("a reply never targets itself (replier shares the username)", moved(5, "同名", "twin", U3), row(5));
  check("a prefix naming nobody who had commented stays in the content (reply_to_name is only a real username)",
    untouched(6, "回复 @匿名：hello"), row(6));
  check("one prefix per row, like the trigger", moved(9, "回复 @twin：两层", "other", U2), row(9));
  check("prefix-only replies and mid-text mentions stay as written",
    untouched(7, "回复 @seller：") && untouched(8, "说到 回复 @seller：这种写法"), [row(7), row(8)]);
  check("a row over the cap stays as written instead of aborting the migration", untouched(10, LONG),
    { length: row(10).content.length, reply_to_name: row(10).reply_to_name });
  check("plain comments untouched", untouched(1, "first") && untouched(2, "me too"), [row(1), row(2)]);

  const src = await q<{ hash_ok: boolean; content: string; moderation: string; pending: number }>(`select
      s.src_hash = i18n.hash_payload(i18n.payload_of('post_comment', s.entity_id)) hash_ok,
      i18n.payload_of('post_comment', s.entity_id) ->> 'content' content, s.moderation,
      (select count(*)::int from i18n.translations t
        where t.entity = s.entity and t.entity_id = s.entity_id and t.state = 'pending' and t.priority = 3) pending
    from i18n.sources s where s.entity = 'post_comment' and s.entity_id = $1`, [pc(3)]);
  check("the queue hashes the stripped text; grandfathered, 6 locales pending at comment priority",
    src.length === 1 && src[0].hash_ok && src[0].content === "Thanks, that helps" && src[0].moderation === "skipped" &&
      src[0].pending === 6, src);

  await db.exec(SCHEMA);
  await db.exec(DATA);
  const again = await read();
  check("re-running both migration files changes no comment (rows with reply metadata are skipped)",
    JSON.stringify(again) === JSON.stringify(rows), again.filter((r, i) => JSON.stringify(r) !== JSON.stringify(rows[i])));
}

await suite("main", () => fresh(mainSuite));
await suite("browse", () => fresh(browseSuite));
await suite("rollback", () => fresh(rollbackSuite));
await suite("parity", () => fresh(paritySuite));
await suite("verify", () => fresh(verifySuite));
await suite("replies", () => fresh(replySuite));

const failed = tallies.reduce((n, t) => n + t.failed, 0);
console.log(`\n${tallies.map((t) => `${t.name} ${t.passed}/${t.passed + t.failed}`).join(" · ")}`);
console.log(failed === 0 ? "ALL PASS" : `${failed} FAILURE(S)`);
if (failed) process.exit(1);
