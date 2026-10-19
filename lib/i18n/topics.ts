// 话题(#hashtag / 帖子标签)的链接与读取 —— 客户端 / 服务端通用,只用 anon client。
//
// - topicHref(slug):已解析话题的聚合页。网页端 /community/t/{slug}(SSR,可收录);
//   静态导出(Capacitor)没有这个动态路由,改走社区页 ?topic={slug}。
// - hashtagSearchHref(raw):尚未解析的标签,跳社区搜索「#raw」(search_posts 按任意语言的写法匹配)。
// - searchPosts():rpc search_posts(话题 slug / #标签 / 转义后的全文,见 supabase/i18n-v2.sql)。
//   函数未部署(代码先于 SQL 上线)时降级为标题 ilike;用户输入一律经 escapeLike 转义,
//   不再拼进 PostgREST 的 .or() 过滤串。
// - getTopic():rpc topic_get,话题聚合页的显示名、各语言标签与帖子数。

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { LEGACY_POST_COLUMNS, POST_AUTHOR_EMBED, POST_COLUMNS } from "@/lib/i18n/content/columns";
import { escapeLike, isMissingFunctionError } from "@/lib/supabase-compat";
import { dbLocale, LOCALES, type Locale } from "@/lib/i18n";
import type { DbCommunityPost } from "@/lib/types";

/** 已解析话题的链接(不带语言前缀,由 localized Link / router 补) */
export function topicHref(slug: string): string {
  const enc = encodeURIComponent(slug);
  return process.env.NEXT_PUBLIC_OUTPUT === "static" ? `/community?topic=${enc}` : `/community/t/${enc}`;
}

/** 未解析标签的社区搜索链接 /community?q=%23<raw>(raw 自带的 #/＃ 先去掉) */
export function hashtagSearchHref(raw: string): string {
  return `/community?q=%23${encodeURIComponent(raw.replace(/^[#＃]+/u, ""))}`;
}

export interface SearchPostsOptions {
  /** 搜索词:以 #/＃ 开头按话题标签精确匹配(任意语言写法),否则全文搜索 */
  q?: string | null;
  /** 话题 slug(聚合页 / ?topic=) */
  topic?: string | null;
  /** 帖子类型 review | showoff | discussion;空 = 全部 */
  type?: string | null;
  offset?: number;
  /** 每页条数 1–50(RPC 上限 50),默认 20 */
  limit?: number;
}

export interface SearchPostsResult {
  /** 公开帖子,新到旧,带作者 profiles;出错时为空数组 */
  data: DbCommunityPost[];
  error: PostgrestError | null;
}

const SEARCH_MAX_LIMIT = 50;
// 与 search_posts 一致:关键词最多取前 100 个字符
const KEYWORD_MAX_CHARS = 100;

/** 社区搜索 / 话题帖子列表(公开帖子,新到旧,分页) */
export async function searchPosts(o: SearchPostsOptions): Promise<SearchPostsResult> {
  const q = o.q?.trim() || null;
  const topic = o.topic?.trim() || null;
  const type = o.type || null;
  const offset = Math.max(0, Math.floor(o.offset ?? 0));
  const limit = Math.min(SEARCH_MAX_LIMIT, Math.max(1, Math.floor(o.limit ?? 20)));

  const { data, error } = await supabase
    .rpc("search_posts", { p_q: q, p_type: type, p_topic: topic, p_offset: offset, p_limit: limit })
    .select(`${POST_COLUMNS}, ${POST_AUTHOR_EMBED}`);
  if (!error) return { data: (data as unknown as DbCommunityPost[] | null) ?? [], error: null };
  if (!isMissingFunctionError(error)) return { data: [], error };

  // search_posts 未部署:还没有话题表,按 slug 筛选无从谈起 → 空结果;其余按标题模糊匹配
  // (#标签去掉 # 当关键词)。i18n-v2 的新列此时也不存在,用旧列集合
  if (topic) return { data: [], error: null };
  const kw = (q ?? "").replace(/^[#＃]+/u, "").trim().slice(0, KEYWORD_MAX_CHARS);
  if (q && !kw) return { data: [], error: null };
  let query = supabase
    .from("community_posts")
    .select(`${LEGACY_POST_COLUMNS}, ${POST_AUTHOR_EMBED}`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (type) query = query.eq("type", type);
  if (kw) query = query.ilike("title", `%${escapeLike(kw)}%`);
  const fallback = await query;
  return { data: (fallback.data as unknown as DbCommunityPost[] | null) ?? [], error: fallback.error };
}

export interface TopicInfo {
  /** 请求的 slug */
  slug: string;
  /** 合并后的目标话题;≠ slug 时聚合页 308 到它 */
  canonical_slug: string;
  /** 当前语言的显示名(缺该语言时回退英文,再回退 slug) */
  label: string;
  /** 已有的各语言标签(hreflang 只声明这些语言) */
  labels: Partial<Record<Locale, string>>;
  /** 关联的公开帖子数 */
  post_count: number;
}

/**
 * 话题聚合页数据。话题不存在、或 topic_get 尚未部署时返回 null;其他数据库错误照常抛出,
 * 交给错误边界(暂时性故障不能当成 404,否则搜索引擎会把话题页当作已删除)。
 */
export async function getTopic(slug: string, locale: Locale): Promise<TopicInfo | null> {
  const { data, error } = await supabase.rpc("topic_get", { p_slug: slug, p_locale: dbLocale(locale) });
  if (error) {
    if (isMissingFunctionError(error)) return null;
    throw new Error(`topic_get(${slug}): ${error.message}`, { cause: error });
  }
  return parseTopic(data);
}

function parseTopic(value: unknown): TopicInfo | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.slug !== "string" || typeof o.canonical_slug !== "string") return null;
  const raw = o.labels && typeof o.labels === "object" ? (o.labels as Record<string, unknown>) : {};
  const labels: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) {
    // zh-hant 没有自己的标签:沿用 zh(与 dbLocale 一致),hreflang 也随 zh 一起声明
    const v = raw[dbLocale(l)];
    if (typeof v === "string" && v.trim()) labels[l] = v.trim();
  }
  const count = Number(o.post_count);
  return {
    slug: o.slug,
    canonical_slug: o.canonical_slug,
    label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : o.canonical_slug,
    labels,
    post_count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
  };
}
