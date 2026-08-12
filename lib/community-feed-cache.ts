// 社区 feed 双层缓存:sessionStorage(本次会话状态,优先)+ localStorage(冷启动兜底)。
// 站点任意入口挂载 <CommunityPrefetch /> 即预取社区首屏与关注流,
// 进社区页时先展示缓存、后台刷新(顶部小 spinner),体感秒开。

import { supabase } from "./supabase";
import type { DbCar, DbCommunityPost } from "./types";

export interface FeedCache {
  ids: string[];
  posts: DbCommunityPost[];
  nearbyCars: { car: DbCar; distance?: number; personalized?: boolean }[];
}

interface FollowingCache {
  userId: string;
  posts: DbCommunityPost[];
}

export const FEED_CACHE_KEY = "clc_community_feed_v1";
const FOLLOWING_CACHE_KEY = "clc_community_following_v1";
export const FEED_PAGE_SIZE = 20;

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* 超配额等错误直接放弃缓存 */
  }
}

/** stale=true 表示来自 localStorage 的旧数据:先展示,调用方应后台刷新 */
export function readFeedCache(): { cache: FeedCache; stale: boolean } | null {
  if (typeof window === "undefined") return null;
  const fresh = readJson<FeedCache>(sessionStorage, FEED_CACHE_KEY);
  if (fresh && fresh.posts?.length > 0) return { cache: fresh, stale: false };
  const local = readJson<FeedCache>(localStorage, FEED_CACHE_KEY);
  if (local && local.posts?.length > 0) return { cache: local, stale: true };
  return null;
}

export function writeFeedCache(cache: FeedCache) {
  if (typeof window === "undefined") return;
  writeJson(sessionStorage, FEED_CACHE_KEY, cache);
  writeJson(localStorage, FEED_CACHE_KEY, cache);
}

/** 下拉刷新:只清会话层,localStorage 保留做下次冷启动兜底 */
export function clearFeedSessionCache() {
  try {
    sessionStorage.removeItem(FEED_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function readFollowingCache(
  userId: string,
): { posts: DbCommunityPost[]; stale: boolean } | null {
  if (typeof window === "undefined") return null;
  const fresh = readJson<FollowingCache>(sessionStorage, FOLLOWING_CACHE_KEY);
  if (fresh?.userId === userId) return { posts: fresh.posts, stale: false };
  const local = readJson<FollowingCache>(localStorage, FOLLOWING_CACHE_KEY);
  if (local?.userId === userId) return { posts: local.posts, stale: true };
  return null;
}

export function writeFollowingCache(userId: string, posts: DbCommunityPost[]) {
  if (typeof window === "undefined") return;
  const value: FollowingCache = { userId, posts };
  writeJson(sessionStorage, FOLLOWING_CACHE_KEY, value);
  writeJson(localStorage, FOLLOWING_CACHE_KEY, value);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 拉取关注流(关注的人的帖子,按最近发布),并写入缓存;未关注任何人返回 [] */
export async function fetchFollowingPosts(
  userId: string,
): Promise<DbCommunityPost[]> {
  const { data: fRows, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId);
  if (error || !fRows || fRows.length === 0) {
    writeFollowingCache(userId, []);
    return [];
  }
  const ids = fRows.map((r) => r.followee_id as string);
  const { data } = await supabase
    .from("community_posts")
    .select("*, profiles!user_id(username, avatar_url)")
    .in("user_id", ids)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);
  const posts = (data as DbCommunityPost[]) || [];
  writeFollowingCache(userId, posts);
  return posts;
}

// 每个页面加载只预取一次(跨路由切换不重复)
let prefetched = false;

/** 站点入口预取:社区首屏(洗牌顺序 + 第一页)与关注流,写入双层缓存 */
export async function prefetchCommunityFeed() {
  if (prefetched || typeof window === "undefined") return;
  prefetched = true;

  // 本会话已有新鲜缓存(比如刚逛过社区)就不重复拉
  const hasSession = (() => {
    try {
      return Boolean(sessionStorage.getItem(FEED_CACHE_KEY));
    } catch {
      return false;
    }
  })();

  if (!hasSession) {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!error && data && data.length > 0) {
        const ids = shuffleArray(data.map((r) => r.id as string));
        const firstIds = ids.slice(0, FEED_PAGE_SIZE);
        const { data: rows } = await supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
          .in("id", firstIds);
        if (rows && rows.length > 0) {
          const byId = new Map((rows as DbCommunityPost[]).map((p) => [p.id, p]));
          const posts = firstIds
            .map((id) => byId.get(id))
            .filter(Boolean) as DbCommunityPost[];
          // nearbyCars 由社区页自己按定位补齐(缓存为空数组时会触发加载)
          writeFeedCache({ ids, posts, nearbyCars: [] });
        }
      }
    } catch {
      /* 预取失败不影响正常浏览 */
    }
  }

  // 关注流预取(需登录)
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) await fetchFollowingPosts(uid);
  } catch {
    /* ignore */
  }
}
