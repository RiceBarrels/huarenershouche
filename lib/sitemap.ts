// sitemap 共用逻辑:/sitemap.xml(sitemap index)与 /sitemaps/{file}.xml(分片)。
//
// 分片命名(parseShardName):
//   {L}-static.xml      站内静态页;/cars 与 /terms 正文只有中文 → 只进 zh 分片、不带 hreflang
//   zh-seo.xml          /cars/* 程序化落地页(只有中文,单文件)
//   {L}-{kind}-{p}.xml  内容页,kind = car | post | qa | user | topic,第 p 片 = 第 p 个 SHARD_SIZE 条
//   {L}.xml             旧版命名(已提交给搜索引擎):静态页 + car 第 0 片 + post 第 0 片
//
// 内容数据来自 service role 专用 RPC sitemap_counts / sitemap_entries(supabase/i18n-v2.sql),与页面
// hreflang 同一可用性规则:没有该语言可用版本的内容不进该语言分片,alternates / x-default 也取自 RPC。
// PostgREST max-rows = 1000,所以一片 = 一次 sitemap_entries 调用(RPC 自身也把 p_limit 截到 1000)。
// RPC 未部署(SQL 尚未执行)或没有 service key 时降级为旧口径的匿名查询:全语言互链,.range() 每 1000 行一页。
// zh-hant(繁體界面)在库里没有自己的语言:分片计数 / 条目一律按 zh 查(dbLocale),
// 有 zh 版本的内容即有 zh-hant 版本(withZhHant),两者互相声明 hreflang。

import type { SupabaseClient } from "@supabase/supabase-js";
import { SEO_PAGES, SITE_URL } from "@/lib/seo-pages";
import { dbLocale, LOCALES, withZhHant, type Locale } from "@/lib/i18n";
import { htmlLang } from "@/lib/i18n/content-langs";
import { supabase } from "@/lib/supabase";
import { createServiceClient } from "@/lib/sources/service-client";
import { isMissingFunctionError } from "@/lib/supabase-compat";

/** 每个内容分片的 URL 数 = sitemap_entries 一页 = PostgREST max-rows */
export const SHARD_SIZE = 1000;

export type SitemapKind = "static" | "seo" | "car" | "post" | "qa" | "user" | "topic";
export type ContentKind = Exclude<SitemapKind, "static" | "seo">;
export const CONTENT_KINDS: readonly ContentKind[] = ["car", "post", "qa", "user", "topic"];

export interface StaticRoute {
  /** 逻辑路径,不带语言前缀;首页为 "" */
  path: string;
  /** 正文只有中文:只进 zh 分片、不带 hreflang(与页面 canonical 回 /zh 一致) */
  zhOnly?: boolean;
}

// /post(发布页)不进 sitemap:robots 禁止抓取
export const STATIC_ROUTES: readonly StaticRoute[] = [
  { path: "" },
  { path: "/browse" },
  { path: "/cars", zhOnly: true },
  { path: "/guide" },
  { path: "/community" },
  { path: "/qa" },
  { path: "/compare" },
  { path: "/vin" },
  { path: "/services" },
  { path: "/contact" },
  { path: "/business" },
  { path: "/about" },
  { path: "/terms", zhOnly: true },
];

export interface SitemapUrl {
  /** 逻辑路径,不带语言前缀,如 "/car/<id>" */
  path: string;
  /** hreflang 互链的语言(含分片自身语言)+ x-default;null = 不声明(zh-only 页) */
  alternates: { locales: readonly Locale[]; xDefault: Locale } | null;
  /** ISO 8601;静态页省略 */
  lastmod?: string;
}

export type ShardRef =
  | { locale: Locale; kind: "static" | "seo" | "legacy" }
  | { locale: Locale; kind: ContentKind; page: number };

// 静态页与旧口径内容:全部语言互链、x-default 指向 zh
const ALL_LOCALES_ALTERNATES: NonNullable<SitemapUrl["alternates"]> = { locales: LOCALES, xDefault: "zh" };

// ─── 分片命名 ───────────────────────────────────────────────────────────────

// 长的排前面(zh-hant 先于 zh),免得依赖回溯
const LOCALE_GROUP = `(${[...LOCALES].sort((a, b) => b.length - a.length).join("|")})`;
const SHARD_RE = new RegExp(`^${LOCALE_GROUP}-(static|seo|${CONTENT_KINDS.join("|")})(?:-(\\d{1,6}))?\\.xml$`);
const LEGACY_RE = new RegExp(`^${LOCALE_GROUP}\\.xml$`);

export function shardFileName(locale: Locale, kind: SitemapKind, page = 0): string {
  return kind === "static" || kind === "seo" ? `${locale}-${kind}.xml` : `${locale}-${kind}-${page}.xml`;
}

/** 分片文件名 → 语言/种类/页码;不合法(非 zh 的 seo、内容分片缺页码或页码非规范写法)返回 null */
export function parseShardName(file: string): ShardRef | null {
  const legacy = LEGACY_RE.exec(file);
  if (legacy) return { locale: legacy[1] as Locale, kind: "legacy" };
  const m = SHARD_RE.exec(file);
  if (!m) return null;
  const locale = m[1] as Locale;
  const kind = m[2] as SitemapKind;
  const pageText = m[3];
  if (kind === "static" || kind === "seo") {
    if (pageText !== undefined || (kind === "seo" && locale !== "zh")) return null;
    return { locale, kind };
  }
  // 内容分片必须带页码,且只认规范写法("car-01" 之类不算),一片只对应一个 URL
  if (pageText === undefined || String(Number(pageText)) !== pageText) return null;
  return { locale, kind, page: Number(pageText) };
}

// ─── XML ────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const hreflang = htmlLang;
const localeUrl = (l: Locale, path: string) => `${SITE_URL}/${l}${path}`;

/** 渲染 locale 分片的 urlset;每条带 hreflang 互链(zh → zh-CN、zh-hant → zh-Hant)与 x-default */
export function renderUrlset(locale: Locale, urls: readonly SitemapUrl[]): string {
  const blocks = urls.map((u) => {
    const lines = ["  <url>", `    <loc>${esc(localeUrl(locale, u.path))}</loc>`];
    if (u.alternates) {
      for (const l of u.alternates.locales) {
        lines.push(`    <xhtml:link rel="alternate" hreflang="${hreflang(l)}" href="${esc(localeUrl(l, u.path))}"/>`);
      }
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(localeUrl(u.alternates.xDefault, u.path))}"/>`
      );
    }
    if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
    lines.push("  </url>\n");
    return lines.join("\n");
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    blocks.join("") +
    `</urlset>\n`
  );
}

/** 渲染 sitemap index(files 为 /sitemaps/ 下的分片文件名) */
export function renderIndex(files: readonly string[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    files.map((f) => `  <sitemap>\n    <loc>${esc(`${SITE_URL}/sitemaps/${f}`)}</loc>\n  </sitemap>\n`).join("") +
    `</sitemapindex>\n`
  );
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

// ─── 数据 ───────────────────────────────────────────────────────────────────

type ShardCounts = Record<ContentKind, number>;

interface SitemapEntryRow {
  id: string;
  lastmod: string | null;
  locales: string[] | null;
  x_default: string | null;
}

const isLocale = (v: unknown): v is Locale =>
  typeof v === "string" && (LOCALES as readonly string[]).includes(v);

function contentPath(kind: ContentKind, id: string): string {
  switch (kind) {
    case "car":
      return `/car/${id}`;
    case "post":
      return `/community/${id}`;
    case "qa":
      return `/qa/${id}`;
    case "user":
      return `/user/${id}`;
    case "topic":
      return `/community/t/${encodeURIComponent(id)}`;
  }
}

function isoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

let serviceClient: SupabaseClient | null | undefined;

/** sitemap RPC 只授权给 service_role;缺 service key 时为 null(走匿名旧查询) */
function getServiceClient(): SupabaseClient | null {
  if (serviceClient === undefined) {
    try {
      serviceClient = createServiceClient();
    } catch {
      serviceClient = null;
    }
  }
  return serviceClient;
}

/** sitemap_counts(locale);RPC 未部署返回 null,其他错误抛出 */
async function rpcCounts(client: SupabaseClient, locale: Locale): Promise<ShardCounts | null> {
  const { data, error } = await client.rpc("sitemap_counts", { p_locale: dbLocale(locale) });
  if (error) {
    if (isMissingFunctionError(error)) return null;
    throw new Error(`sitemap_counts(${locale}): ${error.message}`);
  }
  const counts: ShardCounts = { car: 0, post: 0, qa: 0, user: 0, topic: 0 };
  for (const row of (data ?? []) as { kind: string; n: number | string }[]) {
    if ((CONTENT_KINDS as readonly string[]).includes(row.kind)) {
      counts[row.kind as ContentKind] = Number(row.n) || 0;
    }
  }
  return counts;
}

/** 一片 = sitemap_entries 的一页;RPC 未部署返回 null,其他错误抛出 */
async function rpcPage(
  client: SupabaseClient,
  kind: ContentKind,
  locale: Locale,
  page: number
): Promise<SitemapUrl[] | null> {
  const { data, error } = await client.rpc("sitemap_entries", {
    p_kind: kind,
    p_locale: dbLocale(locale),
    p_offset: page * SHARD_SIZE,
    p_limit: SHARD_SIZE,
  });
  if (error) {
    if (isMissingFunctionError(error)) return null;
    throw new Error(`sitemap_entries(${kind}, ${locale}, ${page}): ${error.message}`);
  }
  return ((data ?? []) as SitemapEntryRow[]).map((row) => ({
    path: contentPath(kind, row.id),
    alternates: {
      locales: withZhHant(row.locales ?? []),
      xDefault: isLocale(row.x_default) ? row.x_default : "zh",
    },
    lastmod: isoDate(row.lastmod),
  }));
}

/** 旧口径:有在售车的卖家(去重,lastmod = 其车源最近更新),按 id 排序;cars 按 .range() 每 1000 行翻页 */
async function legacySellers(): Promise<SitemapUrl[]> {
  const latest = new Map<string, number>();
  for (let from = 0; ; from += SHARD_SIZE) {
    const { data, error } = await supabase
      .from("cars")
      .select("id, seller_id, updated_at")
      .eq("status", "active")
      .eq("owner_hidden", false)
      .order("id")
      .range(from, from + SHARD_SIZE - 1);
    if (error) throw new Error(`sitemap sellers: ${error.message}`);
    const rows = (data ?? []) as { seller_id: string | null; updated_at: string | null }[];
    for (const row of rows) {
      if (!row.seller_id) continue;
      const t = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
      const prev = latest.get(row.seller_id) ?? Number.NaN;
      latest.set(row.seller_id, Number.isNaN(prev) || t > prev ? t : prev);
    }
    if (rows.length < SHARD_SIZE) break;
  }
  return [...latest.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, t]) => ({
      path: contentPath("user", id),
      alternates: ALL_LOCALES_ALTERNATES,
      lastmod: Number.isNaN(t) ? undefined : new Date(t).toISOString(),
    }));
}

/** 旧口径计数(各语言相同);话题依赖 i18n-v2.sql 的词表,旧库没有 */
async function legacyCounts(): Promise<ShardCounts> {
  const exact = { count: "exact", head: true } as const;
  const [cars, posts, qa, sellers] = await Promise.all([
    supabase.from("cars").select("id", exact).eq("status", "active").eq("owner_hidden", false),
    supabase.from("community_posts").select("id", exact).eq("status", "active"),
    supabase.from("qa_questions").select("id", exact).eq("status", "active"),
    legacySellers(),
  ]);
  for (const res of [cars, posts, qa]) {
    if (res.error) throw new Error(`sitemap legacy count: ${res.error.message}`);
  }
  return { car: cars.count ?? 0, post: posts.count ?? 0, qa: qa.count ?? 0, user: sellers.length, topic: 0 };
}

/** 旧口径的一片:按 id 排序,.range() 取第 page 个 1000 行 */
async function legacyPage(kind: ContentKind, page: number): Promise<SitemapUrl[]> {
  const from = page * SHARD_SIZE;
  const to = from + SHARD_SIZE - 1;
  if (kind === "topic") return [];
  if (kind === "user") return (await legacySellers()).slice(from, to + 1);
  const table = kind === "car" ? "cars" : kind === "post" ? "community_posts" : "qa_questions";
  let query = supabase.from(table).select("id, updated_at").eq("status", "active");
  if (kind === "car") query = query.eq("owner_hidden", false);
  const { data, error } = await query.order("id").range(from, to);
  if (error) throw new Error(`sitemap ${kind}: ${error.message}`);
  return ((data ?? []) as { id: string; updated_at: string | null }[]).map((row) => ({
    path: contentPath(kind, row.id),
    alternates: ALL_LOCALES_ALTERNATES,
    lastmod: isoDate(row.updated_at),
  }));
}

/** 每种语言的内容数:优先 sitemap_counts,RPC 未部署或无 service key 时用旧口径计数 */
async function countsPerLocale(): Promise<ShardCounts[]> {
  const client = getServiceClient();
  if (client) {
    // zh-hant 与 zh 计数相同:按数据库语言去重后各查一次
    const byDb = new Map<string, Promise<ShardCounts | null>>();
    for (const l of LOCALES) if (!byDb.has(dbLocale(l))) byDb.set(dbLocale(l), rpcCounts(client, l));
    const counts = await Promise.all(LOCALES.map((l) => byDb.get(dbLocale(l))!));
    if (counts.every((c): c is ShardCounts => c !== null)) return counts;
  }
  const legacy = await legacyCounts();
  return LOCALES.map(() => legacy);
}

/** 一个内容分片:优先 sitemap_entries,RPC 未部署或无 service key 时走旧查询 */
async function contentPage(kind: ContentKind, locale: Locale, page: number): Promise<SitemapUrl[]> {
  const client = getServiceClient();
  if (client) {
    const urls = await rpcPage(client, kind, locale, page);
    if (urls) return urls;
  }
  return legacyPage(kind, page);
}

function staticUrls(locale: Locale): SitemapUrl[] {
  // zh-only 页(/cars、/terms)只进 zh 分片:zh-hant 树里同样回 canonical /zh
  return STATIC_ROUTES.filter((r) => locale === "zh" || !r.zhOnly).map((r) => ({
    path: r.path,
    alternates: r.zhOnly ? null : ALL_LOCALES_ALTERNATES,
  }));
}

function seoUrls(): SitemapUrl[] {
  return SEO_PAGES.map((p) => ({ path: `/cars/${p.slug}`, alternates: null }));
}

// ─── 对外 ───────────────────────────────────────────────────────────────────

/** index 里不依赖数据库的分片:各语言静态页 + zh 落地页 */
export function staticShardFiles(): string[] {
  return [...LOCALES.map((l) => shardFileName(l, "static")), shardFileName("zh", "seo")];
}

/** index 里的内容分片:每种语言每种内容 ceil(n / SHARD_SIZE) 片 */
export async function contentShardFiles(): Promise<string[]> {
  const counts = await countsPerLocale();
  const files: string[] = [];
  LOCALES.forEach((locale, i) => {
    for (const kind of CONTENT_KINDS) {
      for (let p = 0; p * SHARD_SIZE < counts[i][kind]; p++) files.push(shardFileName(locale, kind, p));
    }
  });
  return files;
}

/** 分片里的 URL;超出范围的内容分片(空的非首片)返回 null,由路由回 404 */
export async function shardUrls(shard: ShardRef): Promise<SitemapUrl[] | null> {
  switch (shard.kind) {
    case "static":
      return staticUrls(shard.locale);
    case "seo":
      return seoUrls();
    case "legacy": {
      const [cars, posts] = await Promise.all([
        contentPage("car", shard.locale, 0),
        contentPage("post", shard.locale, 0),
      ]);
      return [...staticUrls(shard.locale), ...cars, ...posts];
    }
    default: {
      const urls = await contentPage(shard.kind, shard.locale, shard.page);
      return urls.length === 0 && shard.page > 0 ? null : urls;
    }
  }
}
