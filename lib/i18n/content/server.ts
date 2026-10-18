// SSR 读取(server component / route handler;客户端代码不要 import,客户端走 store.ts)。
// 全部用 anon supabase(RLS + SECURITY DEFINER RPC 只返回公开内容),React cache() 在同一次请求内
// 去重(generateMetadata 与页面主体共用一次查询)。
//
// 容错:代码可能先于 SQL 迁移上线 ——
// - i18n_bundle 不存在 / 出错:返回 {}(页面显示原文),每个进程只 warn 一次;
// - 新列不存在:用 LEGACY_* 列集合重试一次;
// - 其他数据库错误:主体(车源 / 帖子)直接抛出,由错误边界返回 500,避免把暂时故障渲染成 404;
//   评论属于次要内容,出错时返回空列表。

import { cache } from "react";
import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";
import { isMissingColumnError } from "@/lib/supabase-compat";
import type { DbComment, DbCommunityPost, DbPostComment, PublicCar } from "@/lib/types";
import {
  CAR_COMMENT_COLUMNS,
  CAR_PROFILE_EMBED,
  LEGACY_CAR_COMMENT_COLUMNS,
  LEGACY_POST_COLUMNS,
  LEGACY_POST_COMMENT_COLUMNS,
  LEGACY_PUBLIC_CAR_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
  POST_COMMENT_COLUMNS,
  PUBLIC_CAR_COLUMNS,
} from "./columns";
import type { BundleMap, BundleRow, ContentEntity } from "./types";

// i18n_bundle 单次最多 200 个 id(超出 SQL 直接返回空)
const BUNDLE_CHUNK = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 回复对象的用户名(post_comments.reply_to_user_id → profiles)
const REPLY_TO_EMBED = "reply_to:profiles!reply_to_user_id(username)";

let bundleWarned = false;

const errorMessage = (err: unknown) =>
  err && typeof err === "object" && "message" in err ? String(err.message) : String(err);

/** cache() 按参数引用比较,数组每次都是新对象:把 id 列表规范成字符串 key(去重、小写、排序、过滤非 uuid) */
function idsKey(ids: readonly string[]): string {
  const valid = new Set<string>();
  for (const id of ids) if (UUID_RE.test(id)) valid.add(id.toLowerCase());
  return [...valid].sort().join(",");
}

const loadBundles = cache(
  async (entity: ContentEntity, key: string, locale: Locale): Promise<BundleMap> => {
    if (!key) return {};
    const ids = key.split(",");
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += BUNDLE_CHUNK) chunks.push(ids.slice(i, i + BUNDLE_CHUNK));
    try {
      const results = await Promise.all(
        chunks.map((chunk) =>
          supabase.rpc("i18n_bundle", { p_entity: entity, p_ids: chunk, p_locale: locale }),
        ),
      );
      const map: BundleMap = {};
      for (const { data, error } of results) {
        if (error) throw error;
        for (const row of (data as BundleRow[] | null) ?? []) map[row.id] = row;
      }
      return map;
    } catch (err) {
      if (!bundleWarned) {
        bundleWarned = true;
        console.warn(`[i18n] i18n_bundle unavailable, rendering originals: ${errorMessage(err)}`);
      }
      return {};
    }
  },
);

/** 一批内容在某语言下的翻译状态 / 译文(key 为小写 uuid) */
export const getBundles = (
  entity: ContentEntity,
  ids: readonly string[],
  locale: Locale,
): Promise<BundleMap> => loadBundles(entity, idsKey(ids), locale);

export function getBundle(
  entity: ContentEntity,
  id: string,
  locale: Locale,
): Promise<BundleRow | undefined> {
  return getBundles(entity, [id], locale).then((map) => map[id.toLowerCase()]);
}

/** 公开车源:在售且车主未隐藏,否则 null(含卖家 profiles join,不含 phone) */
export const getPublicCar = cache(async (id: string): Promise<PublicCar | null> => {
  if (!UUID_RE.test(id)) return null;
  const query = (columns: string) =>
    supabase
      .from("cars")
      .select(`${columns}, ${CAR_PROFILE_EMBED}`)
      .eq("id", id)
      .eq("status", "active")
      .eq("owner_hidden", false)
      .maybeSingle();
  let res = await query(PUBLIC_CAR_COLUMNS);
  if (res.error && isMissingColumnError(res.error)) res = await query(LEGACY_PUBLIC_CAR_COLUMNS);
  if (res.error) throw new Error(`getPublicCar(${id}): ${res.error.message}`);
  return (res.data as unknown as PublicCar | null) ?? null;
});

/** 公开帖子(status = active)+ 作者 */
export const getPublicPost = cache(async (id: string): Promise<DbCommunityPost | null> => {
  if (!UUID_RE.test(id)) return null;
  const query = (columns: string) =>
    supabase
      .from("community_posts")
      .select(`${columns}, ${POST_AUTHOR_EMBED}`)
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
  let res = await query(POST_COLUMNS);
  if (res.error && isMissingColumnError(res.error)) res = await query(LEGACY_POST_COLUMNS);
  if (res.error) throw new Error(`getPublicPost(${id}): ${res.error.message}`);
  return (res.data as unknown as DbCommunityPost | null) ?? null;
});

const loadPostComments = cache(async (postId: string, limit: number): Promise<DbPostComment[]> => {
  if (!UUID_RE.test(postId)) return [];
  const query = (select: string, activeOnly: boolean) => {
    let q = supabase.from("post_comments").select(select).eq("post_id", postId);
    if (activeOnly) q = q.eq("status", "active");
    return q.order("created_at", { ascending: true }).limit(limit);
  };
  let res = await query(`${POST_COMMENT_COLUMNS}, ${POST_AUTHOR_EMBED}, ${REPLY_TO_EMBED}`, true);
  if (res.error && isMissingColumnError(res.error)) {
    // SQL 未执行:还没有 status / reply_to_* 列,也就没有被屏蔽的评论,去掉过滤
    res = await query(`${LEGACY_POST_COMMENT_COLUMNS}, ${POST_AUTHOR_EMBED}`, false);
  }
  if (res.error) {
    console.warn(`[i18n] getPublicPostComments(${postId}): ${res.error.message}`);
    return [];
  }
  return (res.data as unknown as DbPostComment[] | null) ?? [];
});

/** 帖子的前 limit 条公开评论(按时间正序,带作者与回复对象用户名) */
export function getPublicPostComments(postId: string, limit = 50): Promise<DbPostComment[]> {
  return loadPostComments(postId, limit);
}

const loadCarComments = cache(async (carId: string, limit: number): Promise<DbComment[]> => {
  if (!UUID_RE.test(carId)) return [];
  const query = (select: string, activeOnly: boolean) => {
    let q = supabase.from("comments").select(select).eq("car_id", carId);
    if (activeOnly) q = q.eq("status", "active");
    return q.order("created_at", { ascending: true }).limit(limit);
  };
  let res = await query(`${CAR_COMMENT_COLUMNS}, ${POST_AUTHOR_EMBED}`, true);
  if (res.error && isMissingColumnError(res.error)) {
    // SQL 未执行:还没有 status 列,去掉过滤
    res = await query(`${LEGACY_CAR_COMMENT_COLUMNS}, ${POST_AUTHOR_EMBED}`, false);
  }
  if (res.error) {
    console.warn(`[i18n] getPublicCarComments(${carId}): ${res.error.message}`);
    return [];
  }
  return (res.data as unknown as DbComment[] | null) ?? [];
});

/** 车源的前 limit 条公开评论(按时间正序,带作者) */
export function getPublicCarComments(carId: string, limit = 20): Promise<DbComment[]> {
  return loadCarComments(carId, limit);
}
