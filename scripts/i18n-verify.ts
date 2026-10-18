#!/usr/bin/env bun
/**
 * i18n-verify — 内容翻译 v2 的上线核验(spec 10.2 第 5 步、10.4)。任何检查失败退出码 1。
 *
 * Usage:
 *   bun scripts/i18n-verify.ts db [--url URL --service KEY]
 *       i18n_stats(各实体 × 语言的队列状态、审核、检测、词表)+ 每个语言的 sitemap_counts;
 *       某实体 dead + rejected 超过其译文行的 5 % 视为失败(spec 10.4 第 7 条的告警线);
 *       另提示 R7 的 drain 门槛(pending = 0、refresh = 0)是否已满足 —— parked(不公开内容的 refresh 行,
 *       重新公开前不会被领取)不算;新内容随时进队列,这一项不计入失败
 *
 *   bun scripts/i18n-verify.ts http --base https://www.clcauto.com [--sample 5] [--url URL --service KEY]
 *       站点核验(spec 10.4 第 3 条):/sitemap.xml 列出的分片 = 按 sitemap_counts 算出的分片;第 p 片恰好
 *       min(1000, n − p·1000) 条 <url>,每条的 hreflang 都指向同一路径的各语言版本(含自身与 x-default);
 *       越过最后一片 → 404;旧版分片名 {L}.xml = 静态页 + car 第 0 片 + post 第 0 片;静态页 / zh 落地页不带
 *       lastmod,zh-only 页(/cars、/terms、/cars/*)只在 zh 分片且不带 hreflang;某个语言的车源分片合计 > 1000;
 *       没有 /post;车源 / 帖子 lastmod 不全相同。
 *       每个语言从分片里抽 N 车源、N 帖子、2 用户、1 问答、1 话题,普通 UA 与 Googlebot UA 各请求一次:
 *       200、<html lang>、canonical / hreflang / og:locale / robots 都在 <head> 里(body 里没有)、canonical 指向自身、
 *       hreflang 与分片里该 URL 的互链完全一致、JSON-LD 可解析且没有裸 <、站内 @id 带语言前缀、
 *       data-i18n-field 有文字且不在骨架屏 / opacity:0 里;每个语言的随机 UUID 详情页 → 404
 *
 *   bun scripts/i18n-verify.ts smoke --url URL --anon KEY --service KEY [--seed] [--force]
 *       R1 演练库(spec 10.2 第 5 步)上用 supabase-js 跑冒烟测试,只碰合成数据。--seed 先补齐:2 个测试账号
 *       (auth admin API,其一为管理员)、1100 辆转载车源、3 辆用户车源(其一没有描述)、30 篇帖子 + 评论,并记录
 *       语言检测(可重复执行,只补缺的)。检查:权限(anon / 普通用户调 sitemap、审核队列等 RPC → 42501,普通用户
 *       不能重置词表写法)、anon i18n_norm_tag 与 TS normTag 一致、anon i18n_bundle 200 个 id < 3 s、search_posts +
 *       profiles 嵌入、sitemap_entries 截到 1000 行且分页合计 = sitemap_counts、i18n_claim → i18n_complete、
 *       i18n_claim_terms → i18n_complete_term、i18n_admin_requeue_terms、旧版 description_zh 写入映射到原文、
 *       卖家只改身份列(source_id / source_listing_id / api_key_id / external_id)在观察与 enforce 模式下都被改回、
 *       other_i18n 写入被改回、没有描述的车只改配置也重新待审(按 mod_hash)并进审核队列、审核下架后卖家重新上架
 *       → P0001 listing_blocked、pg-safeupdate 没有拦下任何 RPC、i18n_admin_set('enforce', true) 计时。
 *       会临时打开 moderation_enforce 与 enforce,结束时都恢复为 false(观察 / 影子模式)。
 *       目标是 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL(生产库)时拒绝运行,除非加 --force。
 *
 *   db / http 默认用 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY(sitemap RPC 只授权给 service role),
 *   --url / --service 可指向别的库。bun 会从当前目录自动加载 .env.local;从别的目录运行时脚本自己读仓库根目录的。
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { LOCALES, type Locale } from "@/lib/i18n";
import { htmlLang, ogLocale } from "@/lib/i18n/content-langs";
import { ENTITY_FIELDS, type ContentEntity } from "@/lib/i18n/content/types";
import { detectFields } from "@/lib/i18n/detect";
import { normTag } from "@/lib/i18n/hashtags";
import { SITE_URL } from "@/lib/seo-pages";

const ROOT = join(import.meta.dir, "..");

const HELP = `
  i18n-verify — content translation v2 rollout checks (exit 1 on any failure)

  Usage:
    bun scripts/i18n-verify.ts db [--url URL --service KEY]
    bun scripts/i18n-verify.ts http --base URL [--sample 5] [--url URL --service KEY]
    bun scripts/i18n-verify.ts smoke --url URL --anon KEY --service KEY [--seed] [--force]

  db and http default to NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local).
  smoke only touches synthetic data, temporarily enables moderation_enforce / enforce and resets both to false;
  it refuses to target NEXT_PUBLIC_SUPABASE_URL (production) unless --force is given.
`;

type Mode = "db" | "http" | "smoke";
const MODE_FLAGS: Record<Mode, { values: string[]; bools: string[] }> = {
  db: { values: ["--url", "--service"], bools: [] },
  http: { values: ["--base", "--sample", "--url", "--service"], bools: [] },
  smoke: { values: ["--url", "--anon", "--service"], bools: ["--seed", "--force"] },
};

/** 内容分片种类与分片大小(spec 7.4:一片 = 一次 sitemap_entries = PostgREST max-rows) */
const CONTENT_KINDS = ["car", "post", "qa", "user", "topic"] as const;
type Kind = (typeof CONTENT_KINDS)[number];
const SHARD_SIZE = 1000;
/** 正文只有中文的静态页(spec 7.2):只进 zh 静态分片、不带 hreflang */
const ZH_ONLY_STATIC = ["/cars", "/terms"];

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// ---------- 通用 ----------

let passed = 0;
let failed = 0;

function describe(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail instanceof Error) return detail.message;
  if (isRecord(detail) && typeof detail.message === "string") {
    return `${typeof detail.code === "string" ? `${detail.code} ` : ""}${detail.message}`;
  }
  const json = JSON.stringify(detail);
  return json === undefined ? String(detail) : json.length > 600 ? `${json.slice(0, 600)}…` : json;
}

function check(ok: boolean, label: string, detail?: unknown): boolean {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "  ok   " : "  FAIL "} ${label}${!ok && detail !== undefined ? ` — ${describe(detail)}` : ""}`);
  return ok;
}

function section(title: string): void {
  console.log(`\n[${title}]`);
}

/** 一组检查出异常时记一条失败,不中断后面的检查 */
async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    check(false, name, err);
  }
}

function fatal(message: string): never {
  console.error(`[i18n:verify] ${message}`);
  process.exit(1);
}

function usage(message: string): never {
  console.error(`[i18n:verify] ${message}`);
  console.error(HELP);
  process.exit(1);
}

// Bun 会从当前目录自动加载 .env.local;从别的目录运行时手动读仓库根目录的(已存在的变量一律不覆盖,空值也算)
function loadEnvLocal(): void {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function parseArgs(argv: readonly string[]): { mode: Mode; values: Map<string, string>; flags: Set<string> } {
  const mode = argv[0];
  if (mode === "--help" || mode === "-h") {
    console.log(HELP);
    process.exit(0);
  }
  if (mode !== "db" && mode !== "http" && mode !== "smoke") usage(mode ? `unknown mode "${mode}"` : "no mode given");
  const spec = MODE_FLAGS[mode];
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const key = eq > 0 ? arg.slice(0, eq) : arg;
    if (key === "--help") {
      console.log(HELP);
      process.exit(0);
    }
    if (spec.values.includes(key)) {
      const value = eq > 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || value === "" || value.startsWith("--")) usage(`${key} needs a value`);
      values.set(key, value);
    } else if (spec.bools.includes(key) && eq < 0) {
      flags.add(key);
    } else {
      usage(`unknown argument "${arg}" for ${mode}`);
    }
  }
  return { mode, values, flags };
}

const makeClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function serviceFromArgs(values: Map<string, string>): SupabaseClient {
  const url = values.get("--url") ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.get("--service") ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fatal("needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or --url and --service)");
  return makeClient(url, key);
}

/** 同时最多 n 个任务在途 */
function limiter(n: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    while (active >= n) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

// ---------- i18n_stats / sitemap_counts ----------

interface StatRow {
  entity: string;
  locale: string;
  state: string;
  n: number;
}

const ENTITIES = Object.keys(ENTITY_FIELDS) as ContentEntity[];
const QUEUE_STATES = [
  "ok", "ok+refresh", "ok+refresh(parked)", "pending", "failed", "dead", "rejected", "hold", "skipped",
] as const;
// ok+refresh(parked) = 不公开内容(下架 / 隐藏)的 refresh 行:重新公开前不会被领取,不是待做的 refresh
const STATE_LABELS: Partial<Record<(typeof QUEUE_STATES)[number], string>> = {
  "ok+refresh": "refresh",
  "ok+refresh(parked)": "parked",
};

// _detected 行的 state 是 (detected_hash = src_hash)::text,从未检测过的为 NULL(记作 "null")
function parseStats(data: unknown): StatRow[] {
  return (Array.isArray(data) ? data : []).filter(isRecord).map((r) => ({
    entity: String(r.entity),
    locale: String(r.locale),
    state: String(r.state),
    n: Number(r.n) || 0,
  }));
}

function sumStates(rows: readonly StatRow[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const r of rows) sums[r.state] = (sums[r.state] ?? 0) + r.n;
  return sums;
}

function printStats(rows: readonly StatRow[]): void {
  for (const entity of ENTITIES) {
    const own = rows.filter((r) => r.entity === entity);
    if (own.length === 0) continue;
    console.log(`  ${entity}`);
    for (const locale of LOCALES) {
      const sums = sumStates(own.filter((r) => r.locale === locale));
      if (Object.keys(sums).length === 0) continue;
      console.log(`    ${locale}  ${QUEUE_STATES.map((s) => `${STATE_LABELS[s] ?? s} ${sums[s] ?? 0}`).join(" · ")}`);
    }
    const moderation = sumStates(own.filter((r) => r.locale === "_moderation"));
    console.log(`    moderation  ${Object.entries(moderation).map(([s, n]) => `${s} ${n}`).join(" · ") || "-"}`);
    const detected = sumStates(own.filter((r) => r.locale === "_detected"));
    const sources = Object.values(detected).reduce((n, v) => n + v, 0);
    console.log(`    detected  ${detected.true ?? 0} / ${sources}`);
  }
  for (const kind of ["topic", "feature"]) {
    const sums = sumStates(rows.filter((r) => r.entity === `term:${kind}`));
    console.log(`  glossary ${kind}  ${Object.entries(sums).map(([s, n]) => `${s} ${n}`).join(" · ") || "-"}`);
  }
}

/** sitemap_counts(locale) → {kind: n};RPC 出错时返回 error */
async function sitemapCounts(
  svc: SupabaseClient,
  locale: Locale,
): Promise<{ counts: Record<Kind, number> | null; error: string | null }> {
  const { data, error } = await svc.rpc("sitemap_counts", { p_locale: locale });
  if (error) return { counts: null, error: `${error.code} ${error.message}` };
  const rows = (Array.isArray(data) ? data : []).filter(isRecord);
  const counts = {} as Record<Kind, number>;
  for (const kind of CONTENT_KINDS) {
    const row = rows.find((r) => r.kind === kind);
    if (!row) return { counts: null, error: `kind "${kind}" missing` };
    counts[kind] = Number(row.n) || 0;
  }
  return { counts, error: null };
}

const shardCount = (n: number) => Math.ceil(n / SHARD_SIZE);
const formatCounts = (c: Record<Kind, number>) =>
  CONTENT_KINDS.map((k) => `${k} ${c[k]}${c[k] > 0 ? ` (${shardCount(c[k])} shard${shardCount(c[k]) > 1 ? "s" : ""})` : ""}`).join(
    " · ",
  );

// ---------- db ----------

async function modeDb(values: Map<string, string>): Promise<void> {
  const svc = serviceFromArgs(values);

  section("i18n_stats");
  const { data, error } = await svc.rpc("i18n_stats");
  if (check(!error, "i18n_stats", error)) {
    const rows = parseStats(data);
    if (check(rows.length > 0, "i18n_stats returns rows (only service / admin callers see them)")) {
      printStats(rows);
      section("health");
      for (const entity of ENTITIES) {
        const own = rows.filter((r) => r.entity === entity && (LOCALES as string[]).includes(r.locale));
        const total = own.reduce((n, r) => n + r.n, 0);
        if (total === 0) continue;
        const bad = own.filter((r) => r.state === "dead" || r.state === "rejected").reduce((n, r) => n + r.n, 0);
        check(
          bad <= total * 0.05,
          `${entity}: dead + rejected ${bad} of ${total} translation rows (${((bad / total) * 100).toFixed(1)} %, alert > 5 %)`,
        );
      }
      // R7(spec 10.1)drain 到 pending = 0、refresh = 0 为止;parked 不算。新内容随时进队列:只提示,不计入失败
      const queue = sumStates(rows.filter((r) => (LOCALES as string[]).includes(r.locale)));
      const pending = queue.pending ?? 0;
      const refresh = queue["ok+refresh"] ?? 0;
      console.log(
        `  info  R7 drain gate: pending ${pending} · refresh ${refresh} → ${pending + refresh === 0 ? "met" : "not met yet"} ` +
          `(failed ${queue.failed ?? 0} backing off; parked ${queue["ok+refresh(parked)"] ?? 0} not counted)`,
      );
    }
  }

  section("sitemap_counts");
  for (const locale of LOCALES) {
    const { counts, error: countError } = await sitemapCounts(svc, locale);
    check(!countError && counts !== null, `${locale}: ${counts ? formatCounts(counts) : "sitemap_counts"}`, countError);
  }
}

// ---------- http ----------

const NORMAL_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const GOOGLEBOT_UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/130.0.6723.116 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const FETCH_TIMEOUT_MS = 45_000;
const HTTP_PARALLEL = 4;

interface Fetched {
  status: number;
  text: string;
  location: string | null;
  error: string | null;
}

async function get(url: string, ua: string): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": ua, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return { status: res.status, text: await res.text(), location: res.headers.get("location"), error: null };
  } catch (err) {
    return { status: 0, text: "", location: null, error: errText(err) };
  }
}

const httpProblem = (r: Fetched) =>
  `HTTP ${r.status}${r.location ? ` → ${r.location}` : ""}${r.error ? ` (${r.error})` : ""}`;

interface SitemapUrl {
  loc: string;
  /** hreflang(小写)→ href */
  alternates: Map<string, string>;
  lastmod: string | null;
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const xmlText = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => XML_ENTITIES[e]);

/** 分片 urlset(lib/sitemap.ts renderUrlset 的输出) */
function parseUrlset(xml: string): SitemapUrl[] {
  return (xml.match(/<url>[\s\S]*?<\/url>/g) ?? []).map((block) => {
    const alternates = new Map<string, string>();
    for (const link of block.matchAll(/<xhtml:link\b([^>]*?)\/?>/g)) {
      const attrs = new Map([...link[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1].toLowerCase(), xmlText(a[2])]));
      const hreflang = attrs.get("hreflang");
      const href = attrs.get("href");
      if (attrs.get("rel") === "alternate" && hreflang && href) alternates.set(hreflang.toLowerCase(), href);
    }
    return {
      loc: xmlText(/<loc>([^<]*)<\/loc>/.exec(block)?.[1] ?? ""),
      alternates,
      lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(block)?.[1] ?? null,
    };
  });
}

/** URL 的 path(去掉末尾 /,根路径除外);解析失败返回原串 */
function pathOf(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p.length > 1 ? p.replace(/\/+$/, "") : p;
  } catch {
    return url;
  }
}

const normUrl = (url: string) => url.trim().replace(/(?<=[^/])\/+$/, "");
const localeOfHreflang = (code: string): Locale | null => {
  const l = code === "zh-cn" ? "zh" : code;
  return (LOCALES as string[]).includes(l) ? (l as Locale) : null;
};

/**
 * 分片里一条 <url> 的互链问题(null = 没问题):loc 在 /{locale} 下;每个 hreflang 的 href = 同一路径换成该语言前缀;
 * 含自身;x-default 指向某个语言版本,xDefaultListed 时还必须是列出的语言之一(话题的 x-default 恒为 zh)
 */
function alternatesProblem(u: SitemapUrl, locale: Locale, xDefaultListed: boolean): string | null {
  const prefix = `${SITE_URL}/${locale}`;
  const loc = normUrl(u.loc);
  if (loc !== prefix && !loc.startsWith(`${prefix}/`)) return `${u.loc} is outside /${locale}`;
  const rest = loc.slice(prefix.length);
  const target = (href: string) => LOCALES.find((l) => normUrl(href) === `${SITE_URL}/${l}${rest}`) ?? null;
  const listed = new Set<Locale>();
  for (const [code, href] of u.alternates) {
    if (code === "x-default") continue;
    const l = target(href);
    if (l === null || l !== localeOfHreflang(code)) return `${u.loc}: hreflang ${code} → ${href}`;
    listed.add(l);
  }
  if (!listed.has(locale)) return `${u.loc}: no self alternate`;
  const xHref = u.alternates.get("x-default");
  const x = xHref === undefined ? null : target(xHref);
  if (x === null) return `${u.loc}: x-default ${xHref ?? "missing"}`;
  if (xDefaultListed && !listed.has(x)) return `${u.loc}: x-default ${x} is not among the alternates`;
  return null;
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LOCALIZED_ID_RE = new RegExp(`^${escapeRe(SITE_URL)}/(?:${LOCALES.join("|")})(?:[/#?]|$)`);

interface PageScan {
  lang: string | null;
  head: {
    canonical: string[];
    hreflang: [string, string][];
    ogLocale: string[];
    ogAlternate: string[];
    robots: string[];
    title: string;
  };
  body: { canonical: number; hreflang: number; ogLocale: number; robots: number };
  jsonLd: string[];
  fields: { name: string; text: string; hidden: Set<string> }[];
}

interface AttrSource {
  getAttribute(name: string): string | null;
}

/**
 * Bun 内置 HTMLRewriter 里 scanPage 用到的部分。项目没装 @types/bun,所以在本模块内声明(只有类型,
 * 运行时用的仍是 Bun 的全局类;以后装上 @types/bun 也只是被这里遮住,不冲突)
 */
interface RewriterElement extends AttrSource {
  readonly canHaveContent: boolean;
  onEndTag(handler: () => void): void;
}
interface RewriterHandlers {
  element?(el: RewriterElement): void;
  text?(chunk: { readonly text: string }): void;
}
declare class HTMLRewriter {
  on(selector: string, handlers: RewriterHandlers): HTMLRewriter;
  transform(input: Response): Response;
}

/** 会把内容藏起来的容器:内联 opacity:0、opacity-0 类、骨架屏(data-slot="skeleton" / skeleton / animate-pulse / animate-shimmer) */
function hidingReason(el: AttrSource): string | null {
  const style = el.getAttribute("style");
  if (style && /(?:^|;)\s*opacity\s*:\s*0(?:\.0*)?\s*(?:!important\s*)?(?:;|$)/i.test(style)) return "opacity:0";
  const tokens = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
  if (tokens.includes("opacity-0")) return "opacity-0";
  if (el.getAttribute("data-slot") === "skeleton" || tokens.some((t) => !t.includes(":") && /skeleton|animate-pulse|animate-shimmer/.test(t))) {
    return "skeleton";
  }
  return null;
}

/** 用 Bun 内置的 HTMLRewriter 流式解析 SSR HTML */
async function scanPage(html: string): Promise<PageScan> {
  const scan: PageScan = {
    lang: null,
    head: { canonical: [], hreflang: [], ogLocale: [], ogAlternate: [], robots: [], title: "" },
    body: { canonical: 0, hreflang: 0, ogLocale: 0, robots: 0 },
    jsonLd: [],
    fields: [],
  };
  const hiding: string[] = []; // 当前所在的「隐藏容器」
  const openFields: PageScan["fields"] = []; // 当前所在的 data-i18n-field 元素
  await new HTMLRewriter()
    .on("html", {
      element(el) {
        scan.lang ??= el.getAttribute("lang");
      },
    })
    .on("head link[rel='canonical']", {
      element(el) {
        scan.head.canonical.push(el.getAttribute("href") ?? "");
      },
    })
    .on("body link[rel='canonical']", {
      element() {
        scan.body.canonical++;
      },
    })
    .on("head link[rel='alternate'][hreflang]", {
      element(el) {
        scan.head.hreflang.push([(el.getAttribute("hreflang") ?? "").toLowerCase(), el.getAttribute("href") ?? ""]);
      },
    })
    .on("body link[rel='alternate'][hreflang]", {
      element() {
        scan.body.hreflang++;
      },
    })
    .on("head meta[property='og:locale']", {
      element(el) {
        scan.head.ogLocale.push(el.getAttribute("content") ?? "");
      },
    })
    .on("body meta[property='og:locale']", {
      element() {
        scan.body.ogLocale++;
      },
    })
    .on("head meta[property='og:locale:alternate']", {
      element(el) {
        scan.head.ogAlternate.push(el.getAttribute("content") ?? "");
      },
    })
    .on("head meta[name='robots']", {
      element(el) {
        scan.head.robots.push(el.getAttribute("content") ?? "");
      },
    })
    .on("body meta[name='robots']", {
      element() {
        scan.body.robots++;
      },
    })
    .on("head title", {
      text(chunk) {
        scan.head.title += chunk.text;
      },
    })
    .on("script[type='application/ld+json']", {
      element() {
        scan.jsonLd.push("");
      },
      text(chunk) {
        scan.jsonLd[scan.jsonLd.length - 1] += chunk.text;
      },
    })
    // 先于 data-i18n-field 注册:字段元素自身带隐藏样式时,字段处理器已能看到
    .on("*", {
      element(el) {
        const reason = hidingReason(el);
        if (!reason) return;
        for (const field of openFields) field.hidden.add(`contains ${reason}`);
        if (!el.canHaveContent) return;
        hiding.push(reason);
        el.onEndTag(() => {
          hiding.pop();
        });
      },
    })
    .on("[data-i18n-field]", {
      element(el) {
        const field = { name: el.getAttribute("data-i18n-field") ?? "", text: "", hidden: new Set(hiding) };
        scan.fields.push(field);
        if (!el.canHaveContent) return;
        openFields.push(field);
        el.onEndTag(() => {
          openFields.pop();
        });
      },
      text(chunk) {
        const field = openFields[openFields.length - 1];
        if (field) field.text += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();
  return scan;
}

interface Sample {
  locale: Locale;
  kind: Kind;
  entry: SitemapUrl;
}

/** 一个抽样页面在一种 UA 下的问题清单(空 = 通过) */
function pageProblems(scan: PageScan, s: Sample): string[] {
  const problems: string[] = [];
  const want = htmlLang(s.locale);
  if (scan.lang !== want) problems.push(`<html lang="${scan.lang ?? ""}"> (want ${want})`);

  if (scan.head.canonical.length !== 1) problems.push(`${scan.head.canonical.length} canonical links in <head>`);
  else if (normUrl(scan.head.canonical[0]) !== normUrl(s.entry.loc)) {
    problems.push(`canonical ${scan.head.canonical[0]} (want ${s.entry.loc})`);
  }

  const page = new Map(scan.head.hreflang.map(([code, href]) => [code, normUrl(href)]));
  const shard = new Map([...s.entry.alternates].map(([code, href]) => [code, normUrl(href)]));
  if (page.size !== scan.head.hreflang.length) problems.push("duplicate hreflang links");
  const missing = [...shard].filter(([code, href]) => page.get(code) !== href).map(([code]) => code);
  const extra = [...page.keys()].filter((code) => !shard.has(code));
  if (missing.length > 0 || extra.length > 0) {
    problems.push(`hreflang differs from the shard (missing/different: ${missing.join(",") || "-"}; extra: ${extra.join(",") || "-"})`);
  }

  const og = ogLocale(s.locale);
  if (scan.head.ogLocale.length !== 1 || scan.head.ogLocale[0] !== og) {
    problems.push(`og:locale ${JSON.stringify(scan.head.ogLocale)} (want ${og})`);
  }
  const available = new Set(
    [...s.entry.alternates.keys()]
      .map(localeOfHreflang)
      .filter((l): l is Locale => l !== null && l !== s.locale)
      .map(ogLocale),
  );
  const strayAlternates = scan.head.ogAlternate.filter((v) => !available.has(v));
  if (strayAlternates.length > 0) problems.push(`og:locale:alternate for unavailable locales: ${strayAlternates.join(",")}`);

  if (scan.head.robots.length === 0) problems.push("no robots meta in <head>");
  else if (scan.head.robots.some((r) => /noindex/i.test(r))) problems.push(`robots "${scan.head.robots.join(", ")}"`);
  if (!scan.head.title.trim()) problems.push("empty <title> in <head>");

  const leaked = Object.entries(scan.body).filter(([, n]) => n > 0);
  if (leaked.length > 0) problems.push(`metadata inside <body>: ${leaked.map(([k, n]) => `${k} ${n}`).join(", ")}`);

  if (scan.jsonLd.length === 0) problems.push("no JSON-LD");
  scan.jsonLd.forEach((raw, i) => {
    if (raw.includes("<")) problems.push(`JSON-LD #${i + 1} contains a raw "<"`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      problems.push(`JSON-LD #${i + 1} does not parse (${errText(err)})`);
      return;
    }
    const ids: string[] = [];
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (isRecord(v)) {
        for (const [key, value] of Object.entries(v)) {
          if (key === "@id" && typeof value === "string") ids.push(value);
          else walk(value);
        }
      }
    };
    walk(parsed);
    const unprefixed = ids.filter((id) => id.startsWith(SITE_URL) && !LOCALIZED_ID_RE.test(id));
    if (unprefixed.length > 0) problems.push(`@id without a locale prefix: ${[...new Set(unprefixed)].join(", ")}`);
  });

  if ((s.kind === "post" || s.kind === "qa") && scan.fields.length === 0) problems.push("no data-i18n-field in the SSR HTML");
  for (const field of scan.fields) {
    if (!field.text.trim()) problems.push(`data-i18n-field="${field.name}" is empty`);
    if (field.hidden.size > 0) problems.push(`data-i18n-field="${field.name}" hidden (${[...field.hidden].join(", ")})`);
  }
  return problems;
}

/** 分片抽样数:N 车源、N 帖子、2 用户、1 问答、1 话题 */
const sampleSize = (kind: Kind, n: number) => (kind === "car" || kind === "post" ? n : kind === "user" ? 2 : 1);

async function modeHttp(values: Map<string, string>): Promise<void> {
  const baseArg = values.get("--base");
  if (!baseArg || !/^https?:\/\/[^/]+/i.test(baseArg)) usage("http needs --base https://host");
  const base = baseArg.replace(/\/+$/, "");
  const sampleArg = values.get("--sample");
  const sample = sampleArg === undefined ? 5 : Number(sampleArg);
  if (!Number.isSafeInteger(sample) || sample < 1) usage(`--sample must be a positive integer (got "${sampleArg}")`);
  const svc = serviceFromArgs(values);
  const gate = limiter(HTTP_PARALLEL);

  section("sitemap_counts (service key)");
  const counts = new Map<Locale, Record<Kind, number>>();
  for (const locale of LOCALES) {
    const r = await sitemapCounts(svc, locale);
    if (check(r.counts !== null, `${locale}: ${r.counts ? formatCounts(r.counts) : "sitemap_counts"}`, r.error)) {
      counts.set(locale, r.counts as Record<Kind, number>);
    }
  }
  if (counts.size !== LOCALES.length) {
    check(false, "shard expectations need sitemap_counts for every locale; stopping");
    return;
  }

  section("sitemap index");
  const expected = [...LOCALES.map((l) => `${l}-static.xml`), "zh-seo.xml"];
  for (const locale of LOCALES) {
    for (const kind of CONTENT_KINDS) {
      for (let p = 0; p < shardCount(counts.get(locale)![kind]); p++) expected.push(`${locale}-${kind}-${p}.xml`);
    }
  }
  const index = await get(`${base}/sitemap.xml`, NORMAL_UA);
  if (check(index.status === 200, "GET /sitemap.xml → 200", httpProblem(index))) {
    const listed = [...index.text.matchAll(/<sitemap>\s*<loc>([^<]*)<\/loc>/g)].map((m) => {
      const path = pathOf(xmlText(m[1]));
      return path.startsWith("/sitemaps/") ? path.slice("/sitemaps/".length) : path;
    });
    const missing = expected.filter((f) => !listed.includes(f));
    const extra = listed.filter((f) => !expected.includes(f));
    check(
      missing.length === 0 && extra.length === 0 && listed.length === new Set(listed).size,
      `index lists exactly the ${expected.length} expected shards (ISR caches the index for up to 1 h)`,
      { missing, extra },
    );
  }

  section("shards");
  const entries = new Map<string, SitemapUrl[]>(); // `${locale}-${kind}` → 该语言该种类的全部条目
  const staticCounts = new Map<Locale, number>();
  const fetchShard = (file: string) => gate(() => get(`${base}/sitemaps/${file}`, NORMAL_UA));

  // 静态页不带 lastmod;zh-only 页只在 zh 分片且不带 hreflang;其余静态页互链全部语言
  const staticChecks = LOCALES.map(async (locale) => {
    const file = `${locale}-static.xml`;
    const res = await fetchShard(file);
    if (!check(res.status === 200, `${file} → 200`, httpProblem(res))) return;
    const urls = parseUrlset(res.text);
    staticCounts.set(locale, urls.length);
    const problems: string[] = [];
    for (const u of urls) {
      const path = pathOf(u.loc);
      if (path === `/${locale}/post`) problems.push(`${path} is listed`);
      if (u.lastmod !== null) problems.push(`${path} has a lastmod`);
      if (ZH_ONLY_STATIC.includes(path.slice(locale.length + 1))) {
        if (locale !== "zh") problems.push(`zh-only ${path} is listed`);
        else if (u.alternates.size > 0) problems.push(`zh-only ${path} has hreflang`);
        continue;
      }
      const problem = alternatesProblem(u, locale, true);
      if (problem) problems.push(problem);
      else if (u.alternates.size !== LOCALES.length + 1) problems.push(`${path} links ${u.alternates.size - 1} locales`);
    }
    check(
      urls.length > 0 && problems.length === 0,
      `${file}: ${urls.length} static URLs (no lastmod, no /${locale}/post, zh-only pages without hreflang, ` +
        `the others linking all ${LOCALES.length} locales)`,
      problems.slice(0, 5).join("; "),
    );
  });
  const seoCheck = (async () => {
    const res = await fetchShard("zh-seo.xml");
    if (!check(res.status === 200, "zh-seo.xml → 200", httpProblem(res))) return;
    const urls = parseUrlset(res.text);
    const bad = urls.filter((u) => !pathOf(u.loc).startsWith("/zh/cars/") || u.alternates.size > 0 || u.lastmod !== null);
    check(
      urls.length > 0 && bad.length === 0,
      `zh-seo.xml: ${urls.length} /zh/cars/* landing pages without hreflang or lastmod`,
      bad.slice(0, 3).map((u) => u.loc),
    );
  })();
  // 越过最后一片的内容分片(空的非首片)→ 404:分片空间不会无限延伸
  const pastEndChecks = LOCALES.flatMap((locale) =>
    CONTENT_KINDS.map(async (kind) => {
      const file = `${locale}-${kind}-${Math.max(1, shardCount(counts.get(locale)![kind]))}.xml`;
      const res = await fetchShard(file);
      check(res.status === 404, `${file} (past the last shard) → 404`, httpProblem(res));
    }),
  );

  const contentChecks: Promise<void>[] = [];
  const shardPages = new Map<string, SitemapUrl[][]>(); // 按页码存放,抽样顺序与并发完成顺序无关
  for (const locale of LOCALES) {
    for (const kind of CONTENT_KINDS) {
      const n = counts.get(locale)![kind];
      const pages: SitemapUrl[][] = [];
      shardPages.set(`${locale}-${kind}`, pages);
      for (let p = 0; p < shardCount(n); p++) {
        const file = `${locale}-${kind}-${p}.xml`;
        const want = Math.min(SHARD_SIZE, n - p * SHARD_SIZE);
        contentChecks.push(
          (async () => {
            const res = await fetchShard(file);
            if (!check(res.status === 200, `${file} → 200`, httpProblem(res))) return;
            const urls = parseUrlset(res.text);
            pages[p] = urls;
            const problems = urls
              .map((u) => alternatesProblem(u, locale, kind !== "topic"))
              .filter((v): v is string => v !== null);
            check(
              urls.length === want && problems.length === 0,
              `${file}: ${urls.length} <url> (want min(1000, ${n} − ${p}·1000) = ${want})`,
              problems.length > 0
                ? `${problems.length} entries with broken hreflang alternates, e.g. ${problems[0]}`
                : "count differs (shards are ISR-cached for up to 1 h; re-run if content changed recently)",
            );
          })(),
        );
      }
    }
  }
  await Promise.all([...staticChecks, seoCheck, ...pastEndChecks, ...contentChecks]);
  for (const [key, pages] of shardPages) entries.set(key, pages.flat()); // 取失败的分片是空位,flat 跳过

  // 旧版分片名(已提交给搜索引擎)继续可用:静态页 + car 第 0 片 + post 第 0 片
  section("legacy shard names");
  await Promise.all(
    LOCALES.map(async (locale) => {
      const file = `${locale}.xml`;
      const res = await fetchShard(file);
      if (!check(res.status === 200, `${file} → 200`, httpProblem(res))) return;
      const statics = staticCounts.get(locale);
      if (statics === undefined) return; // 静态分片本身已记失败
      const c = counts.get(locale)!;
      const want = statics + Math.min(SHARD_SIZE, c.car) + Math.min(SHARD_SIZE, c.post);
      const got = parseUrlset(res.text).length;
      check(got === want, `${file}: ${got} <url> = ${statics} static + car page 0 + post page 0 (want ${want})`);
    }),
  );

  section("shard totals");
  const carTotals = LOCALES.map((l) => [l, entries.get(`${l}-car`)?.length ?? 0] as const);
  const [bestLocale, bestTotal] = carTotals.reduce((a, b) => (b[1] > a[1] ? b : a));
  check(
    bestTotal > 1000,
    `car URLs across shards: ${carTotals.map(([l, n]) => `${l} ${n}`).join(" · ")} (> 1000 in ${bestLocale})`,
  );
  // B16:内容时钟不能退化成「迁移时间」;几条内容同一时刻写入很正常,≥ 10 条全相同才算退化
  for (const locale of LOCALES) {
    for (const kind of ["car", "post"] as const) {
      const stamps = (entries.get(`${locale}-${kind}`) ?? []).map((u) => u.lastmod).filter((v): v is string => !!v);
      if (stamps.length < 10) continue;
      const distinct = new Set(stamps).size;
      check(distinct > 1, `${locale} ${kind}: ${distinct} distinct lastmod values over ${stamps.length} URLs`);
    }
  }

  section("pages (normal UA + Googlebot UA)");
  const samples: Sample[] = [];
  for (const locale of LOCALES) {
    for (const kind of CONTENT_KINDS) {
      const all = (entries.get(`${locale}-${kind}`) ?? []).slice(0, sampleSize(kind, sample));
      for (const entry of all) samples.push({ locale, kind, entry });
    }
  }
  const pageChecks = samples.flatMap((s) =>
    [
      ["normal", NORMAL_UA],
      ["googlebot", GOOGLEBOT_UA],
    ].map(([uaName, ua]) =>
      gate(async () => {
        const path = pathOf(s.entry.loc);
        const res = await get(`${base}${path}`, ua);
        const problems = res.status === 200 ? pageProblems(await scanPage(res.text), s) : [httpProblem(res)];
        check(problems.length === 0, `${s.locale} ${s.kind} ${path} (${uaName})`, problems.join("; "));
      }),
    ),
  );
  await Promise.all(pageChecks);
  if (samples.length === 0) check(false, "no content URLs to sample (empty shards)");

  section("missing content → 404");
  await Promise.all(
    LOCALES.flatMap((locale) =>
      ["car", "community", "user", "qa"].map((segment) =>
        gate(async () => {
          const path = `/${locale}/${segment}/${randomUUID()}`;
          const res = await get(`${base}${path}`, NORMAL_UA);
          check(res.status === 404, `${path} → 404`, httpProblem(res));
        }),
      ),
    ),
  );
}

// ---------- smoke ----------

const SMOKE = {
  sourceKey: "i18n-smoke",
  owner: { email: "i18n-smoke-owner@example.com", username: "i18n-smoke-owner", role: "user" },
  admin: { email: "i18n-smoke-admin@example.com", username: "i18n-smoke-admin", role: "admin" },
  syndicatedCars: 1100,
  posts: 30,
  commentsPerPost: 2,
} as const;

/** 合成转载车源的品牌 / 车型轮换 */
const SMOKE_MODELS = [
  ["Toyota", "Camry"],
  ["Honda", "Civic"],
  ["Tesla", "Model 3"],
  ["Ford", "Escape"],
  ["BMW", "X5"],
  ["Subaru", "Outback"],
] as const;

const APP_CAR_DESCRIPTION = "车况很好，一手车主，保养记录齐全，欢迎随时看车。";

/**
 * 卖家本人发布的三辆车:A 用来测旧版写入映射 / 身份列强制 / enforce 投影,B 用来测审核下架后不能重新上架,
 * C 没有描述(没有翻译工作),用来测只改配置也会重新审核(审核键是 mod_hash,不是译文 hash)
 */
const APP_CARS = [
  { trim: "smoke-A", year: 2019, make: "Toyota", model: "Camry", description: APP_CAR_DESCRIPTION },
  { trim: "smoke-B", year: 2018, make: "Honda", model: "Accord", description: APP_CAR_DESCRIPTION },
  { trim: "smoke-C", year: 2017, make: "Ford", model: "Escape", description: null },
] as const;

const NORM_TAG_SAMPLES = [
  "#CR-V", "＃Model 3", "  特斯拉 ", "#テスラ", "#테슬라", "Tesla", "TESLA", "Backup_Camera", "倒车·影像",
  "Ｍｏｄｅｌ３", "#", "", "a.b-c d", "ÉCOLE", "Model Y・Long Range", "#ß",
];

interface AppCar {
  id: string;
  trim: string;
  year: number;
  make: string;
  model: string;
}

interface Synthetic {
  ownerId: string;
  adminId: string;
  sourceId: string;
  /** 转载车源 id,按 source_listing_id 排序 */
  carIds: string[];
  appA: AppCar;
  appB: AppCar;
  appC: AppCar;
  postIds: string[];
  commentIds: string[];
}

/** i18n_moderation_input 的一行(审核键 mod_hash,审核内容 mod_payload) */
interface ModerationInputRow {
  moderation: string;
  moderated: boolean;
  mod_hash: string | null;
  mod_payload: Record<string, unknown> | null;
}

/** 每次 RPC 的错误都记下来,最后检查有没有被 pg-safeupdate 拦下的 */
const rpcErrors: { fn: string; error: string }[] = [];

async function call<T>(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<{ data: T | null; error: PostgrestError | null; ms: number }> {
  const started = performance.now();
  const { data, error } = await client.rpc(fn, args);
  const ms = Math.round(performance.now() - started);
  if (error) rpcErrors.push({ fn, error: `${error.code} ${error.message}` });
  return { data: (data ?? null) as T | null, error, ms };
}

const rowsOf = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);
const listingId = (i: number) => `smoke-${String(i).padStart(4, "0")}`;
const strongPassword = () => `${randomBytes(24).toString("base64url")}Aa1!`;
const smokeSlug = (aliasNorm: string) => `smoke-${createHash("sha256").update(aliasNorm).digest("hex").slice(0, 12)}`;

/** 按 PostgREST max-rows(1000)分页取全 */
async function selectAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  label: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(`${label}: ${error.code} ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function findUserId(svc: SupabaseClient, email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
  }
}

/** 测试账号:--seed 时缺了就建,并 upsert profiles(用户名、管理员角色);否则必须已存在且角色正确 */
async function ensureUser(
  svc: SupabaseClient,
  spec: { email: string; username: string; role: string },
  seed: boolean,
): Promise<string> {
  let id = await findUserId(svc, spec.email);
  if (!id) {
    if (!seed) throw new Error(`synthetic user ${spec.email} is missing: run smoke with --seed first`);
    const { data, error } = await svc.auth.admin.createUser({
      email: spec.email,
      password: strongPassword(),
      email_confirm: true,
      user_metadata: { username: spec.username },
    });
    if (error || !data.user) throw new Error(`auth.admin.createUser(${spec.email}): ${error?.message ?? "no user"}`);
    id = data.user.id;
  }
  if (seed) {
    const { error } = await svc
      .from("profiles")
      .upsert({ id, username: spec.username, role: spec.role }, { onConflict: "id" });
    if (error) throw new Error(`profiles upsert (${spec.username}): ${error.code} ${error.message}`);
  } else {
    const { data, error } = await svc.from("profiles").select("role").eq("id", id).maybeSingle();
    if (error || data?.role !== spec.role) {
      throw new Error(`profile of ${spec.email} is missing or not ${spec.role}: run smoke with --seed`);
    }
  }
  return id;
}

/** 每次运行给测试账号换一个随机密码再登录(不在任何地方保存密码) */
async function signIn(
  svc: SupabaseClient,
  url: string,
  anonKey: string,
  userId: string,
  email: string,
): Promise<SupabaseClient> {
  const password = strongPassword();
  const updated = await svc.auth.admin.updateUserById(userId, { password });
  if (updated.error) throw new Error(`auth.admin.updateUserById(${email}): ${updated.error.message}`);
  const client = makeClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return client;
}

async function ensureSource(svc: SupabaseClient, adminId: string, seed: boolean): Promise<string> {
  const found = await svc.from("listing_sources").select("id").eq("key", SMOKE.sourceKey).maybeSingle();
  if (found.error) throw new Error(`listing_sources: ${found.error.code} ${found.error.message}`);
  if (found.data) return found.data.id as string;
  if (!seed) throw new Error(`listing source "${SMOKE.sourceKey}" is missing: run smoke with --seed first`);
  const created = await svc
    .from("listing_sources")
    .insert({
      key: SMOKE.sourceKey,
      name: "i18n smoke test (synthetic)",
      base_url: "https://example.com",
      enabled: false,
      system_account_id: adminId,
    })
    .select("id")
    .single();
  if (created.error) throw new Error(`listing_sources insert: ${created.error.code} ${created.error.message}`);
  return created.data.id as string;
}

function syndicatedCar(i: number, sourceId: string, sellerId: string) {
  const [make, model] = SMOKE_MODELS[i % SMOKE_MODELS.length];
  const year = 2012 + (i % 12);
  const title = `${year} ${make} ${model}`;
  return {
    seller_id: sellerId,
    title,
    title_zh: title,
    year,
    make,
    model,
    price: 8000 + ((i * 137) % 40000),
    mileage: 15000 + ((i * 911) % 140000),
    location: "San Diego, CA",
    location_zh: "圣地亚哥",
    seller_name: "i18n smoke dealer",
    description_original:
      `Synthetic listing ${i} for the translation rehearsal. Clean title, one owner, full service records. ` +
      "Ask the dealer for a test drive.",
    features_original: ["Bluetooth", "Backup Camera", `Smoke Option ${i}`],
    source_id: sourceId,
    source_listing_id: listingId(i),
    status: "active",
  };
}

function smokePost(i: number, ownerId: string) {
  const zh = i % 2 === 0;
  return {
    user_id: ownerId,
    type: "discussion",
    title: zh ? `[smoke ${i}] 二手特斯拉的保险怎么买比较划算` : `[smoke ${i}] Insurance for a used Tesla`,
    content: zh
      ? `冒烟测试合成帖子 ${i}，用于翻译系统演练。大家买二手车保险一般怎么选？#smoketest #特斯拉`
      : `Synthetic smoke test post ${i} for the translation rehearsal. How do you pick insurance for a used car? #smoketest #Tesla`,
    tags: ["smoketest", zh ? "保险" : "Insurance"],
  };
}

/** --seed:补齐合成数据(已有的不动) */
async function seedSynthetic(
  svc: SupabaseClient,
  owner: SupabaseClient,
  ids: { ownerId: string; adminId: string; sourceId: string },
): Promise<void> {
  section("seed");
  const existingCars = await selectAll<{ source_listing_id: string }>(
    (from, to) => svc.from("cars").select("source_listing_id").eq("source_id", ids.sourceId).range(from, to),
    "synthetic cars",
  );
  const have = new Set(existingCars.map((c) => c.source_listing_id));
  const missing = Array.from({ length: SMOKE.syndicatedCars }, (_, i) => i).filter((i) => !have.has(listingId(i)));
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100).map((n) => syndicatedCar(n, ids.sourceId, ids.adminId));
    const { error } = await svc.from("cars").insert(batch);
    if (error) throw new Error(`insert synthetic cars: ${error.code} ${error.message}`);
  }
  console.log(`  syndicated cars: ${missing.length} inserted (${SMOKE.syndicatedCars} wanted)`);

  // 用户车源由卖家本人(authenticated)发布:writer class = user,不可信、要审核
  const appCars = await svc.from("cars").select("trim").eq("seller_id", ids.ownerId).in("trim", APP_CARS.map((c) => c.trim));
  if (appCars.error) throw new Error(`app cars: ${appCars.error.code} ${appCars.error.message}`);
  const haveTrims = new Set((appCars.data ?? []).map((c) => c.trim as string));
  const newAppCars = APP_CARS.filter((c) => !haveTrims.has(c.trim)).map((c) => ({
    seller_id: ids.ownerId,
    title: `${c.year} ${c.make} ${c.model} ${c.trim}`,
    title_zh: `${c.year} ${c.make} ${c.model} ${c.trim}`,
    year: c.year,
    make: c.make,
    model: c.model,
    trim: c.trim,
    price: 18000,
    mileage: 42000,
    location: "Flushing, NY",
    location_zh: "法拉盛",
    seller_name: "i18n smoke owner",
    description_original: c.description,
    features_original: ["倒车影像", "座椅加热"],
  }));
  if (newAppCars.length > 0) {
    const { error } = await owner.from("cars").insert(newAppCars);
    if (error) throw new Error(`owner insert app cars: ${error.code} ${error.message}`);
  }
  console.log(`  owner cars: ${newAppCars.length} inserted`);

  const posts = await svc.from("community_posts").select("id, title").eq("user_id", ids.ownerId);
  if (posts.error) throw new Error(`posts: ${posts.error.code} ${posts.error.message}`);
  const havePosts = new Set(
    (posts.data ?? []).map((p) => /^\[smoke (\d+)\]/.exec(String(p.title))?.[1]).filter((v): v is string => !!v),
  );
  const newPosts = Array.from({ length: SMOKE.posts }, (_, i) => i)
    .filter((i) => !havePosts.has(String(i)))
    .map((i) => smokePost(i, ids.ownerId));
  if (newPosts.length > 0) {
    const { error } = await svc.from("community_posts").insert(newPosts);
    if (error) throw new Error(`insert posts: ${error.code} ${error.message}`);
  }
  console.log(`  posts: ${newPosts.length} inserted`);

  const allPosts = await svc.from("community_posts").select("id").eq("user_id", ids.ownerId);
  if (allPosts.error) throw new Error(`posts: ${allPosts.error.code} ${allPosts.error.message}`);
  const postIds = (allPosts.data ?? []).map((p) => p.id as string);
  const comments = await svc.from("post_comments").select("post_id").in("post_id", postIds);
  if (comments.error) throw new Error(`comments: ${comments.error.code} ${comments.error.message}`);
  const perPost = new Map<string, number>();
  for (const c of comments.data ?? []) perPost.set(c.post_id as string, (perPost.get(c.post_id as string) ?? 0) + 1);
  const newComments = postIds.flatMap((postId) =>
    Array.from({ length: Math.max(0, SMOKE.commentsPerPost - (perPost.get(postId) ?? 0)) }, (_, k) => ({
      post_id: postId,
      user_id: ids.adminId,
      content:
        k % 2 === 0
          ? `Smoke comment ${k}: we went with a local insurance agent and it worked out fine.`
          : `冒烟评论 ${k}：我找的是本地的保险经纪，价格还可以。`,
    })),
  );
  if (newComments.length > 0) {
    const { error } = await svc.from("post_comments").insert(newComments);
    if (error) throw new Error(`insert comments: ${error.code} ${error.message}`);
  }
  console.log(`  comments: ${newComments.length} inserted`);
}

async function loadSynthetic(
  svc: SupabaseClient,
  ids: { ownerId: string; adminId: string; sourceId: string },
): Promise<Synthetic> {
  const cars = await selectAll<{ id: string; source_listing_id: string }>(
    (from, to) =>
      svc
        .from("cars")
        .select("id, source_listing_id")
        .eq("source_id", ids.sourceId)
        .order("source_listing_id")
        .range(from, to),
    "synthetic cars",
  );
  const app = await svc
    .from("cars")
    .select("id, trim, year, make, model")
    .eq("seller_id", ids.ownerId)
    .in("trim", APP_CARS.map((c) => c.trim));
  if (app.error) throw new Error(`app cars: ${app.error.code} ${app.error.message}`);
  const appCars = rowsOf<AppCar>(app.data);
  const appA = appCars.find((c) => c.trim === "smoke-A");
  const appB = appCars.find((c) => c.trim === "smoke-B");
  const appC = appCars.find((c) => c.trim === "smoke-C");
  const posts = await svc.from("community_posts").select("id").eq("user_id", ids.ownerId);
  if (posts.error) throw new Error(`posts: ${posts.error.code} ${posts.error.message}`);
  const postIds = rowsOf<{ id: string }>(posts.data).map((p) => p.id);
  const comments = postIds.length
    ? await svc.from("post_comments").select("id").in("post_id", postIds)
    : { data: [], error: null };
  if (comments.error) throw new Error(`comments: ${comments.error.code} ${comments.error.message}`);
  if (cars.length < SMOKE.syndicatedCars || !appA || !appB || !appC || postIds.length < SMOKE.posts) {
    throw new Error(
      `synthetic data incomplete (${cars.length} cars, ${appCars.length} of ${APP_CARS.length} owner cars, ` +
        `${postIds.length} posts): run smoke with --seed`,
    );
  }
  return {
    ...ids,
    carIds: cars.map((c) => c.id),
    appA,
    appB,
    appC,
    postIds,
    commentIds: rowsOf<{ id: string }>(comments.data).map((c) => c.id),
  };
}

/** 本地检测 + i18n_record_detection:只记合成实体(sitemap / al 依赖检测结果) */
async function detectSynthetic(svc: SupabaseClient, ids: ReadonlySet<string>): Promise<number> {
  let recorded = 0;
  for (let round = 0; round < 20; round++) {
    const queue = await call<{ entity: ContentEntity; entity_id: string; src_hash: string; payload: unknown }[]>(
      svc,
      "i18n_detection_queue",
      { p_limit: 1000 },
    );
    if (queue.error) throw new Error(`i18n_detection_queue: ${queue.error.code} ${queue.error.message}`);
    const items = rowsOf<{ entity: ContentEntity; entity_id: string; src_hash: string; payload: unknown }>(queue.data)
      .filter((r) => ids.has(r.entity_id))
      .map((r) => {
        const payload = isRecord(r.payload) ? r.payload : {};
        const fields: Record<string, string> = {};
        for (const f of ENTITY_FIELDS[r.entity] ?? []) {
          if (typeof payload[f] === "string") fields[f] = payload[f] as string;
        }
        const d = detectFields(fields);
        return { entity: r.entity, entity_id: r.entity_id, src_hash: r.src_hash, field_langs: d.fieldLangs, primary_lang: d.primary };
      });
    if (items.length === 0) break;
    for (let i = 0; i < items.length; i += 200) {
      const res = await call<number>(svc, "i18n_record_detection", { p_items: items.slice(i, i + 200) });
      if (res.error) throw new Error(`i18n_record_detection: ${res.error.code} ${res.error.message}`);
      recorded += Number(res.data) || 0;
    }
  }
  return recorded;
}

/**
 * 卖家只改转载 / API 身份列(spec I6):语句照常成功,但身份列保持原值(用户车源恒为 NULL),同一语句里的
 * 普通列(phone)照常写入。api_key_id 用随机 id:没被改回时外键会报错,同样记失败
 */
async function checkIdentityCoercion(
  svc: SupabaseClient,
  owner: SupabaseClient,
  carId: string,
  sourceId: string,
  mode: "observe" | "enforce",
  runTag: string,
): Promise<void> {
  const slot = `smoke-slot-${mode}-${runTag}`;
  const patches: Record<string, string>[] = [
    { source_id: sourceId },
    { source_id: sourceId, source_listing_id: slot },
    { source_id: sourceId, source_listing_id: slot, phone: `555-${mode}-${runTag}` },
    { api_key_id: randomUUID(), external_id: `smoke-ext-${mode}-${runTag}` },
  ];
  for (const patch of patches) {
    const write = await owner.from("cars").update(patch).eq("id", carId);
    const read = await svc
      .from("cars")
      .select("source_id, source_listing_id, api_key_id, external_id, phone")
      .eq("id", carId)
      .single();
    const car = read.data;
    const kept =
      !!car && car.source_id === null && car.source_listing_id === null && car.api_key_id === null &&
      car.external_id === null;
    const withPhone = "phone" in patch;
    check(
      !write.error && !read.error && kept && (!withPhone || car?.phone === patch.phone),
      `${mode}: owner update {${Object.keys(patch).join(", ")}} succeeds, the identity columns stay null` +
        (withPhone ? ", phone is written" : ""),
      write.error ?? read.error ?? car,
    );
  }
}

async function modeSmoke(values: Map<string, string>, flags: Set<string>): Promise<void> {
  const url = values.get("--url");
  const anonKey = values.get("--anon");
  const serviceKey = values.get("--service");
  if (!url || !anonKey || !serviceKey) usage("smoke needs --url, --anon and --service");
  const production = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sameHost = (a: string, b: string) => {
    try {
      return new URL(a).host === new URL(b).host;
    } catch {
      return a === b;
    }
  };
  if (production && sameHost(url, production) && !flags.has("--force")) {
    fatal(
      "smoke writes synthetic rows and flips i18n settings; it targets NEXT_PUBLIC_SUPABASE_URL (production). " +
        "Use a rehearsal branch / local stack, or pass --force if this URL really is a rehearsal database.",
    );
  }
  const seed = flags.has("--seed");
  const svc = makeClient(url, serviceKey);
  const anon = makeClient(url, anonKey);
  const runTag = Date.now().toString(36);

  section("synthetic data");
  const adminId = await ensureUser(svc, SMOKE.admin, seed);
  const ownerId = await ensureUser(svc, SMOKE.owner, seed);
  const sourceId = await ensureSource(svc, adminId, seed);
  const owner = await signIn(svc, url, anonKey, ownerId, SMOKE.owner.email);
  const admin = await signIn(svc, url, anonKey, adminId, SMOKE.admin.email);
  if (seed) await seedSynthetic(svc, owner, { ownerId, adminId, sourceId });
  const data = await loadSynthetic(svc, { ownerId, adminId, sourceId });
  const synthetic = new Set([
    ...data.carIds, data.appA.id, data.appB.id, data.appC.id, ...data.postIds, ...data.commentIds,
  ]);
  const detected = await detectSynthetic(svc, synthetic);
  console.log(
    `  ${data.carIds.length} syndicated cars, ${APP_CARS.length} owner cars, ${data.postIds.length} posts, ` +
      `${data.commentIds.length} comments (${detected} language detections recorded)`,
  );

  const restore = { enforce: false, moderation: false };
  try {
    section("privileges");
    await step("privileges", async () => {
      const denied = async (client: SupabaseClient, who: string, fn: string, args: Record<string, unknown>) => {
        const r = await call(client, fn, args);
        check(r.error?.code === "42501", `${who} ${fn} → 42501`, r.error ?? "call succeeded");
      };
      await denied(anon, "anon", "sitemap_entries", { p_kind: "car", p_locale: "en", p_offset: 0, p_limit: 10 });
      await denied(anon, "anon", "sitemap_counts", { p_locale: "en" });
      await denied(owner, "authenticated", "sitemap_entries", { p_kind: "car", p_locale: "en", p_offset: 0, p_limit: 10 });
      await denied(anon, "anon", "i18n_legacy_page", { p_entity: "car", p_after: null, p_limit: 1 });
      await denied(owner, "authenticated", "i18n_claim", { p_max_entities: 1 });
      await denied(owner, "authenticated", "i18n_moderation_queue", { p_limit: 1 });
      await denied(anon, "anon", "i18n_stats", {});
      const own = await call(owner, "i18n_stats", {});
      check(!own.error && rowsOf(own.data).length === 0, "authenticated (non-admin) i18n_stats returns no rows", own.error);
      // 授权给 authenticated(管理员 JWT 要用),函数里再拒绝非管理员
      const requeue = await call(owner, "i18n_admin_requeue_terms", { p_alias_norms: ["smoke-no-such-alias"] });
      check(!!requeue.error, "authenticated (non-admin) i18n_admin_requeue_terms is refused", "call succeeded");
    });

    section("normalization parity");
    await step("i18n_norm_tag parity", async () => {
      const mismatches: string[] = [];
      for (const sample of NORM_TAG_SAMPLES) {
        const r = await call<string | null>(anon, "i18n_norm_tag", { p: sample });
        if (r.error || (r.data ?? null) !== normTag(sample)) {
          mismatches.push(`${JSON.stringify(sample)}: sql ${JSON.stringify(r.data)} ts ${JSON.stringify(normTag(sample))}`);
        }
      }
      check(mismatches.length === 0, `anon i18n_norm_tag == TS normTag (${NORM_TAG_SAMPLES.length} samples)`, mismatches);
    });

    section("reads");
    await step("i18n_bundle", async () => {
      const ids = data.carIds.slice(0, 200);
      const r = await call(anon, "i18n_bundle", { p_entity: "car", p_ids: ids, p_locale: "ko" });
      check(
        !r.error && rowsOf(r.data).length === ids.length && r.ms < 3000,
        `anon i18n_bundle(car, 200 ids, ko): ${rowsOf(r.data).length} rows in ${r.ms} ms (< 3000 ms)`,
        r.error ?? `${rowsOf(r.data).length} rows, ${r.ms} ms`,
      );
    });
    await step("search_posts", async () => {
      const embed = await anon
        .rpc("search_posts", { p_q: "smoke", p_type: null, p_topic: null, p_offset: 0, p_limit: 5 })
        .select("*, profiles!user_id(username, avatar_url)");
      if (embed.error) rpcErrors.push({ fn: "search_posts", error: `${embed.error.code} ${embed.error.message}` });
      const rows = rowsOf<{ profiles?: { username?: unknown } | null }>(embed.data);
      check(
        !embed.error && rows.length > 0 && rows.every((p) => typeof p.profiles?.username === "string"),
        `anon search_posts('smoke').select('*, profiles!user_id(username, avatar_url)'): ${rows.length} rows with authors`,
        embed.error ?? rows.slice(0, 1),
      );
      const tag = await call(anon, "search_posts", { p_q: "#smoketest", p_limit: 50 });
      check(
        !tag.error && rowsOf(tag.data).length >= data.postIds.length,
        `anon search_posts('#smoketest'): ${rowsOf(tag.data).length} of ${data.postIds.length} synthetic posts`,
        tag.error,
      );
      const escaped = await call(anon, "search_posts", { p_q: "100%_", p_limit: 5 });
      check(!escaped.error, "anon search_posts('100%_') (LIKE-escaped)", escaped.error);
    });

    section("sitemaps");
    await step("sitemaps", async () => {
      const counts = await sitemapCounts(svc, "en");
      const n = counts.counts?.car;
      if (!check(n !== undefined, "service sitemap_counts('en') returns car, post, qa, user, topic", counts.error) || n === undefined) {
        return;
      }
      check(n > 1000, `sitemap_counts('en').car = ${n} (> 1000: the synthetic cars are detected English)`);
      const big = await call<{ id: string }[]>(svc, "sitemap_entries", {
        p_kind: "car",
        p_locale: "en",
        p_offset: 0,
        p_limit: 5000,
      });
      check(
        !big.error && rowsOf(big.data).length === Math.min(SHARD_SIZE, n),
        `service sitemap_entries(car, en, 0, 5000) is clamped to ${rowsOf(big.data).length} rows (${big.ms} ms)`,
        big.error ?? `want ${Math.min(SHARD_SIZE, n)}`,
      );
      const seen = new Set<string>();
      let total = 0;
      let sizesOk = true;
      for (let offset = 0; offset < n + SHARD_SIZE; offset += SHARD_SIZE) {
        const page = await call<{ id: string }[]>(svc, "sitemap_entries", {
          p_kind: "car",
          p_locale: "en",
          p_offset: offset,
          p_limit: SHARD_SIZE,
        });
        if (page.error) throw new Error(`sitemap_entries offset ${offset}: ${page.error.message}`);
        const rows = rowsOf<{ id: string }>(page.data);
        if (rows.length !== Math.max(0, Math.min(SHARD_SIZE, n - offset))) sizesOk = false;
        for (const r of rows) seen.add(r.id);
        total += rows.length;
        if (rows.length < SHARD_SIZE) break;
      }
      check(
        sizesOk && total === n && seen.size === n,
        `sitemap_entries pages of 1000 sum to sitemap_counts (${total} rows, ${seen.size} distinct, n = ${n})`,
      );
    });

    section("pipeline round trip");
    await step("i18n_claim → i18n_complete", async () => {
      const carId = data.carIds[0];
      const requeue = await call(svc, "i18n_admin_requeue", {
        p_entity: "car",
        p_ids: [carId],
        p_locales: ["ko"],
        p_older_prompt_than: null,
      });
      check(!requeue.error, "service i18n_admin_requeue(car, [id], [ko])", requeue.error);
      const claim = await call(svc, "i18n_claim", {
        p_max_entities: 1,
        p_lease_seconds: 60,
        p_entity: "car",
        p_entity_ids: [carId],
        p_locales: ["ko"],
      });
      const row = rowsOf<{ entity_id: string; src_hash: string; locales: string[]; lease_token: string }>(claim.data)[0];
      const leased = !claim.error && row?.entity_id === carId && row.locales.includes("ko");
      check(leased, "i18n_claim leases the car's ko row", claim.error ?? claim.data);
      if (!leased || !row) return;
      const text = `[smoke ${runTag}] 시운전이 가능한 합성 매물입니다.`;
      const args = {
        p_entity: "car",
        p_entity_id: carId,
        p_lease: row.lease_token,
        p_src_hash: row.src_hash,
        p_detect: null,
        p_results: [
          { locale: "ko", outcome: "ok", fields: { description: text }, source_lang: "en", pivot: null, model: "i18n-smoke", prompt_version: 1 },
        ],
        p_usage: { calls: 0, in: 0, out: 0 },
      };
      const done = await call<{ stale?: boolean; applied?: string[]; discarded?: string[] }>(svc, "i18n_complete", args);
      check(
        !done.error && done.data?.stale === false && (done.data.applied ?? []).includes("ko"),
        "i18n_complete applies the ko result",
        done.error ?? done.data,
      );
      const again = await call<{ stale?: boolean; applied?: string[]; discarded?: string[] }>(svc, "i18n_complete", args);
      check(
        !again.error && (again.data?.applied ?? []).length === 0 && (again.data?.discarded ?? []).includes("ko"),
        "a second completion with the same lease is discarded (CAS)",
        again.error ?? again.data,
      );
      const bundle = await call(anon, "i18n_bundle", { p_entity: "car", p_ids: [carId], p_locale: "ko" });
      const b = rowsOf<{ s: string; f: Record<string, string> | null; sl: string | null; al: string[] | null }>(bundle.data)[0];
      check(
        b?.s === "ok" && b.f?.description === text && b.sl === "en" && !!b.al?.includes("ko") && !!b.al?.includes("en"),
        "anon i18n_bundle serves the completed translation (s ok, sl en, al ⊇ {en, ko})",
        bundle.error ?? b,
      );
    });
    await step("i18n_claim_terms → i18n_complete_term", async () => {
      // 新写法保证词表总有可领取的组(可信转载写入 → sync_car_features)
      const fresh = await svc
        .from("cars")
        .update({ features_original: ["Bluetooth", "Backup Camera", "Smoke Option 1", `Smoke Glossary ${runTag}`] })
        .eq("id", data.carIds[1]);
      check(!fresh.error, "service features_original write adds a fresh feature alias", fresh.error);
      const claim = await call(svc, "i18n_claim_terms", { p_max_groups: 1, p_lease_seconds: 60 });
      const aliases = rowsOf<{ kind: "topic" | "feature"; alias_norm: string; sample_raw: string; lease_token: string }>(claim.data);
      if (!check(!claim.error && aliases.length > 0, `i18n_claim_terms leases one group (${aliases.length} aliases)`, claim.error)) {
        return;
      }
      const failures: string[] = [];
      let resolved: { kind: string; raw: string; slug: string } | null = null;
      for (const a of aliases) {
        const slug = smokeSlug(a.alias_norm);
        const label = a.sample_raw.slice(0, 40);
        const r = await call<number | null>(svc, "i18n_complete_term", {
          p_kind: a.kind,
          p_alias_norm: a.alias_norm,
          p_lease: a.lease_token,
          p_outcome: "ok",
          p_slug: slug,
          p_labels: { zh: label, en: label, ko: label, ja: label, es: label, fr: label },
          p_model: "i18n-smoke",
          p_error: null,
          p_alias_lang: null,
        });
        if (r.error || r.data === null) failures.push(`${a.alias_norm}: ${r.error ? describe(r.error) : "null term id"}`);
        else resolved ??= { kind: a.kind, raw: a.sample_raw, slug };
      }
      check(failures.length === 0, `i18n_complete_term resolves all ${aliases.length} leased aliases`, failures);
      if (!resolved) return;
      const labels = await call(anon, "i18n_term_labels", { p_kind: resolved.kind, p_raws: [resolved.raw], p_locale: "ko" });
      const first = rowsOf<{ key: string }>(labels.data)[0];
      check(first?.key === `t:${resolved.slug}`, "anon i18n_term_labels returns the new term key", labels.error ?? labels.data);
    });
    await step("i18n_admin_requeue_terms", async () => {
      // bun scripts/i18n-backfill.ts --requeue-terms 的 RPC;限定一个不存在的写法,不改动任何数据
      const r = await call<number>(svc, "i18n_admin_requeue_terms", {
        p_kind: "feature",
        p_states: ["failed", "dead"],
        p_alias_norms: ["smoke-no-such-alias"],
      });
      check(!r.error && Number(r.data) === 0, "service i18n_admin_requeue_terms (no matching alias → 0)", r.error ?? r.data);
    });
    await step("legacy stash RPCs", async () => {
      const page = await call(svc, "i18n_legacy_page", { p_entity: "car", p_after: null, p_limit: 5 });
      check(!page.error, `service i18n_legacy_page (${rowsOf(page.data).length} stash rows)`, page.error);
      const imported = await call<boolean>(svc, "i18n_import_legacy", {
        p_entity: "car",
        p_entity_id: data.carIds[0],
        p_locale: "ja",
        p_src_hash: "smoke-stale-hash",
        p_fields: { description: "x" },
        p_source_lang: "en",
        p_field_langs: null,
        p_refresh: true,
      });
      check(!imported.error && imported.data === false, "i18n_import_legacy with a stale hash changes nothing", imported.error ?? imported.data);
      const usage = await call(svc, "i18n_add_usage", { p_calls: 0, p_in: 0, p_out: 0 });
      check(!usage.error, "service i18n_add_usage", usage.error);
      const stats = await call(svc, "i18n_stats", {});
      check(!stats.error && rowsOf(stats.data).length > 0, `service i18n_stats (${rowsOf(stats.data).length} rows)`, stats.error);
    });

    section("writer guards");
    await step("legacy description_zh write", async () => {
      const text = `冒烟测试旧版写入 ${runTag}:车况良好,左后门有小刮痕。`;
      const write = await owner.from("cars").update({ description_zh: text }).eq("id", data.appA.id);
      check(!write.error, "owner legacy description_zh update succeeds", write.error);
      const row = await svc.from("cars").select("description_original").eq("id", data.appA.id).single();
      check(row.data?.description_original === text, "the legacy write maps onto description_original", row.error ?? row.data);
    });
    await step("identity coercion (observe mode)", () =>
      checkIdentityCoercion(svc, owner, data.appA.id, data.sourceId, "observe", runTag),
    );
    await step("moderation without a description", async () => {
      // 车 C 没有描述(没有翻译工作):只改配置也会换 mod_hash → 重新待审,并由审核队列交给 drain
      const tag = `smoke ${runTag}`;
      const edit = await owner.from("cars").update({ features_original: ["倒车影像", tag] }).eq("id", data.appC.id);
      check(!edit.error, "owner features-only edit of car C succeeds", edit.error);
      const input = await call(svc, "i18n_moderation_input", { p_entity: "car", p_entity_id: data.appC.id });
      const row = rowsOf<ModerationInputRow>(input.data)[0];
      const payload = isRecord(row?.mod_payload) ? row.mod_payload : {};
      const modHash = row?.mod_hash;
      if (
        !check(
          !!modHash && row.moderation === "pending" && row.moderated === false &&
            Array.isArray(payload.features) && payload.features.includes(tag) && payload.trim === data.appC.trim,
          "car C is pending moderation, keyed to mod_hash (mod_payload carries trim + features)",
          input.error ?? row,
        ) ||
        !modHash
      ) {
        return;
      }
      // 队列按 updated_at 从旧到新返回并租走(30 s):一页页取,直到看到车 C 或队列见底
      let queued = false;
      for (let page = 0; page < 20 && !queued; page++) {
        const q = await call(svc, "i18n_moderation_queue", { p_limit: 200, p_lease_seconds: 30 });
        if (q.error) throw new Error(`i18n_moderation_queue: ${describe(q.error)}`);
        const items = rowsOf<{ entity: string; entity_id: string; mod_hash: string }>(q.data);
        if (items.length === 0) break;
        queued = items.some((r) => r.entity === "car" && r.entity_id === data.appC.id && r.mod_hash === modHash);
      }
      check(queued, "service i18n_moderation_queue hands car C to the drain");
      const record = (hash: string) =>
        call<string>(svc, "i18n_record_moderation", {
          p_entity: "car",
          p_entity_id: data.appC.id,
          p_mod_hash: hash,
          p_verdict: "pass",
          p_categories: [],
          p_reason: null,
          p_model: "i18n-smoke",
          p_text: null,
          p_user_id: data.ownerId,
        });
      const stale = await record(`stale-${modHash}`);
      check(stale.data === "stale", "a verdict for another mod_hash is stale (CAS)", stale.error ?? stale.data);
      const pass = await record(modHash);
      check(pass.data === "pass", "i18n_record_moderation(pass) with the current mod_hash", pass.error ?? pass.data);
      const after = await call(svc, "i18n_moderation_input", { p_entity: "car", p_entity_id: data.appC.id });
      const settled = rowsOf<ModerationInputRow>(after.data)[0];
      check(
        settled?.moderated === true && settled.moderation === "pass",
        "car C is moderated (pass) for its current mod_hash",
        after.error ?? settled,
      );
    });
    await step("moderation removal", async () => {
      const on = await call(admin, "i18n_admin_set", { p_key: "moderation_enforce", p_value: true });
      if (!check(!on.error, "admin i18n_admin_set('moderation_enforce', true)", on.error)) return;
      restore.moderation = true;
      const input = await call(svc, "i18n_moderation_input", { p_entity: "car", p_entity_id: data.appB.id });
      const modHash = rowsOf<ModerationInputRow>(input.data)[0]?.mod_hash;
      if (!check(!!modHash, "service i18n_moderation_input(car B) returns its mod_hash", input.error ?? input.data)) return;
      const verdict = await call<string>(svc, "i18n_record_moderation", {
        p_entity: "car",
        p_entity_id: data.appB.id,
        p_mod_hash: modHash,
        p_verdict: "blocked",
        p_categories: ["smoke"],
        p_reason: "i18n smoke test",
        p_model: "i18n-smoke",
        p_text: "i18n smoke test",
        p_user_id: data.ownerId,
      });
      check(verdict.data === "blocked", "i18n_record_moderation(blocked) in enforce mode", verdict.error ?? verdict.data);
      const removed = await svc.from("cars").select("status, removal_reason").eq("id", data.appB.id).single();
      check(
        removed.data?.status === "removed" && removed.data.removal_reason === "moderation",
        "the car is removed with removal_reason = moderation",
        removed.error ?? removed.data,
      );
      const relist = await owner.from("cars").update({ status: "active" }).eq("id", data.appB.id);
      check(
        relist.error?.code === "P0001" && /listing_blocked/.test(relist.error.message),
        "owner relisting a moderation-removed car → P0001 listing_blocked",
        relist.error ?? "update succeeded",
      );
      const flag = await svc
        .from("ai_moderation")
        .select("created_at")
        .eq("target_type", "car")
        .eq("target_id", data.appB.id)
        .single();
      const since = flag.data?.created_at as string | undefined;
      if (!check(!flag.error && !!since, "ai_moderation row recorded for the removal", flag.error) || !since) return;
      const restored = await call<number>(admin, "i18n_admin_restore_moderation", {
        p_since: since,
        p_target_type: "car",
      });
      check(!restored.error && Number(restored.data) >= 1, `admin i18n_admin_restore_moderation restored ${restored.data ?? 0}`, restored.error);
      const back = await svc.from("cars").select("status, removal_reason").eq("id", data.appB.id).single();
      check(
        back.data?.status === "active" && back.data.removal_reason === null,
        "the restored car is active again",
        back.error ?? back.data,
      );
    });

    section("enforce flip");
    await step("enforce flip", async () => {
      const started = performance.now();
      const flip = await call(admin, "i18n_admin_set", { p_key: "enforce", p_value: true });
      const ms = Math.round(performance.now() - started);
      if (!check(!flip.error, `admin i18n_admin_set('enforce', true) re-projected every car in ${ms} ms`, flip.error)) return;
      restore.enforce = true;
      const marker = `SMOKE-${runTag}`;
      const write = await owner
        .from("cars")
        .update({ other_i18n: { zh: { description: marker } } })
        .eq("id", data.appA.id);
      check(!write.error, "owner other_i18n update statement succeeds (coerced, not rejected)", write.error);
      const read = await svc
        .from("cars")
        .select("other_i18n, description, description_zh, description_original, title")
        .eq("id", data.appA.id)
        .single();
      const car = read.data;
      if (!check(!read.error && !!car, "read car A back", read.error) || !car) return;
      check(!JSON.stringify(car.other_i18n ?? {}).includes(marker), "other_i18n is frozen for owners in enforce mode");
      check(
        car.description === car.description_original && car.description_zh === car.description_original,
        "description / description_zh are projected from the original (no zh / en translation yet)",
        car,
      );
      const wantTitle = `${data.appA.year} ${data.appA.make} ${data.appA.model} ${data.appA.trim}`;
      check(car.title === wantTitle, `title re-derived deterministically ("${wantTitle}")`, car.title);
    });
    if (restore.enforce) {
      await step("identity coercion (enforce mode)", () =>
        checkIdentityCoercion(svc, owner, data.appA.id, data.sourceId, "enforce", runTag),
      );
    }
  } finally {
    section("restore settings");
    if (restore.moderation) {
      const off = await call(admin, "i18n_admin_set", { p_key: "moderation_enforce", p_value: false });
      check(!off.error, "moderation_enforce reset to false (shadow mode)", off.error);
    }
    if (restore.enforce) {
      const off = await call(admin, "i18n_admin_set", { p_key: "enforce", p_value: false });
      check(!off.error, "enforce reset to false (observe mode)", off.error);
    }
  }

  section("pg-safeupdate");
  const blocked = rpcErrors.filter((e) => /requires a WHERE clause/i.test(e.error));
  check(
    blocked.length === 0,
    `no RPC rejected by pg-safeupdate (${rpcErrors.length} RPC errors in total, incl. the expected 42501s)`,
    blocked,
  );
}

// ---------- main ----------

async function main(): Promise<void> {
  const { mode, values, flags } = parseArgs(process.argv.slice(2));
  loadEnvLocal();
  if (mode === "db") await modeDb(values);
  else if (mode === "http") await modeHttp(values);
  else await modeSmoke(values, flags);
  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAILED`} (${passed} ok)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`[i18n:verify] ${errText(err)}`);
  process.exit(1);
});
