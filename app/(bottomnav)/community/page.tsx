"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { useOverlay } from "@/components/car-overlay-provider";
import {
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  MapPin,
  Play,
  Search,
  Share,
  X,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { timeAgo } from "@/lib/format";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { carLink, communityPostLink, userLink } from "@/lib/static-link";
import {
  detectUserZip,
  geocodeZipToCoords,
  haversineDistance,
  formatDistance,
} from "@/lib/geocode";
import { rankCars, getFavoriteIds, hasUserHistory } from "@/lib/recommendations";
import { HashtagText } from "@/components/hashtag-text";
import { getSuggestionPool, logSearchTerm } from "@/lib/search-suggestions";
import { match as pinyinMatch } from "pinyin-pro";
import {
  type FeedCache,
  readFeedCache,
  writeFeedCache,
  clearFeedSessionCache,
  readFollowingCache,
  fetchFollowingPosts,
} from "@/lib/community-feed-cache";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import type { DbCar, DbCommunityPost } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;
function isVideoUrl(url: string): boolean {
  return VIDEO_RE.test(url);
}

const SEARCH_TYPE_CHIPS = [
  { key: "", label: "全部" },
  { key: "review", label: "车评" },
  { key: "showoff", label: "晒车" },
  { key: "discussion", label: "讨论" },
] as const;

// 搜索面板:搜索记录(localStorage,blur 时才保存);
// 推荐关键词由 lib/search-suggestions 按热度算法生成
const SEARCH_HISTORY_KEY = "clc_community_search_history";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

type FeedItem =
  | { kind: "post"; post: DbCommunityPost }
  | { kind: "car"; car: DbCar; distance?: number; personalized?: boolean };

// 每隔几张帖子插一张附近车源卡(小红书插卡形式)
const CAR_EVERY = 6;
const FIRST_CAR_AT = 2;

// 无限滚动每页条数
const PAGE_SIZE = 20;

// 双流切换的方向性滑动(X 式):+1 = 去关注流(新页从右进),-1 = 回推荐流
const TAB_SLIDE = {
  enter: (d: number) => ({ x: d * 72, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -72, opacity: 0 }),
};

// 缓存逻辑抽到 lib/community-feed-cache:session(会话状态)+ localStorage(冷启动兜底),
// 站点入口 <CommunityPrefetch /> 预取写入,本页读缓存秒开、stale 数据后台刷新

// 缓存恢复要在绘制前完成(不闪加载页);SSR 无 layout effect,退回普通 effect
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Fisher-Yates 洗牌:每次刷新 feed 顺序都不同
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 封面宽高比:按 id 确定性选择,布局稳定又有错落感

// useSearchParams 需要 Suspense 边界(?q= 话题直达搜索)
export default function CommunityFeedPageWrapper() {
  return (
    <Suspense>
      <CommunityFeedPage />
    </Suspense>
  );
}

function CommunityFeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);

  const [nearbyCars, setNearbyCars] = useState<{ car: DbCar; distance?: number; personalized?: boolean }[]>([]);

  // 搜索:默认不显示任何分类;只有搜索时才出现类型筛选
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchType, setSearchType] = useState("");
  // 下拉刷新在搜索态重跑当前搜索
  const [searchNonce, setSearchNonce] = useState(0);
  const searching = searchOpen && (keyword.trim() !== "" || searchType !== "");
  const reduced = useReducedMotion();

  // 点赞:当前用户 + 已赞集合
  const [userId, setUserId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // X 式双流:为你推荐(洗牌流 + 车源穿插)/ 正在关注(按最近发布)
  const [feedTab, setFeedTab] = useState<"foryou" | "following">("foryou");
  const [followingPosts, setFollowingPosts] = useState<DbCommunityPost[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  // 展示着缓存数据、后台刷新中(顶部小 spinner,即下拉刷新的那种加载)
  const [refreshing, setRefreshing] = useState(false);
  const [followingRefreshing, setFollowingRefreshing] = useState(false);
  // 关注流顶部的作者筛选(null = 全部)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  // tab 切换方向(驱动左右滑动动画)
  const [tabDir, setTabDir] = useState(1);
  // 顶栏:下滑隐藏、上滑或回到顶部显示(X 式)
  const [barHidden, setBarHidden] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function changeTab(t: "foryou" | "following") {
    if (t === feedTab) return;
    setTabDir(t === "following" ? 1 : -1);
    setFeedTab(t);
  }

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    // 防闪烁:tab 条收起会让文档变矮 → 滚动位置被浏览器钳制 → 产生反向 dy
    // → 又展开 → 文档变高 → 再收起……形成上下闪烁的反馈循环。
    // 两道保险:1) 底部滚动余量不足时不收起;2) 状态切换后 400ms 内
    // (高度过渡动画期间)忽略滚动,不响应自身引发的位移
    let hidden = false;
    let lockUntil = 0;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (Math.abs(dy) > 8) {
          const now = performance.now();
          if (now >= lockUntil) {
            const room =
              document.documentElement.scrollHeight - window.innerHeight - y;
            const next = y > 80 && dy > 0 && room > 160;
            if (next !== hidden) {
              hidden = next;
              lockUntil = now + 400;
              setBarHidden(next);
            }
          }
          lastY = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 手势左右滑切换 tab:避开左缘返回手势(x<28)与横向滚动区(data-hswipe-ignore)
  function onFeedTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartRef.current = t.clientX < 28 ? null : { x: t.clientX, y: t.clientY };
  }
  function onFeedTouchEnd(e: React.TouchEvent) {
    const s = touchStartRef.current;
    touchStartRef.current = null;
    if (!s || searching) return;
    if ((e.target as HTMLElement).closest?.("[data-hswipe-ignore]")) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) changeTab("following");
    else changeTab("foryou");
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ?q= 是搜索状态的唯一事实来源:出现(哪怕为空)= 搜索开,消失 = 搜索关。
  // hashtag 跳转、返回键、手动改地址栏都会经这里驱动 UI
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchOpen(true);
      setKeyword((prev) => (prev === q ? prev : q));
    } else {
      setSearchOpen(false);
      setKeyword("");
      setSearchType("");
    }
  }, [searchParams]);

  // UI 侧变更(开关搜索/输入)同步回地址栏;replaceState 不产生历史条目,
  // 传回原 history.state 保住 Next 内部路由状态
  const syncSearchUrl = useCallback((q: string | null) => {
    const url = new URL(window.location.href);
    if (q === null) url.searchParams.delete("q");
    else url.searchParams.set("q", q);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, []);

  // 搜索记录:只在 input 失焦时保存(输入过程不落盘);回车会主动 blur
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage,仅首帧一次
      if (raw) setSearchHistory(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const saveSearchHistory = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    // 上报全站搜索词统计(「猜你想搜」的数据源),失败静默
    logSearchTerm(t);
    setSearchHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 10);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  function clearSearchHistory() {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }

  // 点推荐词/搜索记录:填入关键词 + 同步 URL + 立即记一条
  function pickKeyword(term: string) {
    setKeyword(term);
    syncSearchUrl(term);
    saveSearchHistory(term);
  }

  // 推荐关键词:打开搜索时拉热度候选池(top 40,会话缓存),
  // 展示时根据当前输入实时过滤重排(子串 + 拼音匹配)
  const [suggestPool, setSuggestPool] = useState<string[]>([]);
  useEffect(() => {
    if (!searchOpen) return;
    let cancelled = false;
    getSuggestionPool().then((pool) => {
      if (!cancelled) setSuggestPool(pool);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen]);

  const suggestedKeywords = useMemo(() => {
    const kw = keyword.trim().replace(/^#/, "").toLowerCase();
    if (kw) {
      // 输入中:优先展示能匹配上输入的词(子串或拼音),完全匹配不重复展示;
      // 一个都匹配不上时退回热度榜,方便换个方向搜
      const hits = suggestPool.filter((t) => {
        const tl = t.toLowerCase();
        if (tl === kw) return false;
        return tl.includes(kw) || Boolean(pinyinMatch(t, kw));
      });
      return (hits.length > 0 ? hits : suggestPool).slice(0, 8);
    }
    // 未输入:热度榜,排除已在搜索记录里的词
    const historySet = new Set(searchHistory);
    return suggestPool.filter((t) => !historySet.has(t)).slice(0, 8);
  }, [suggestPool, keyword, searchHistory]);

  // 拉取当前用户对可见帖子的点赞状态(两条流合并查)
  useEffect(() => {
    const ids = [...new Set([...posts, ...followingPosts].map((p) => p.id))];
    if (!userId || ids.length === 0) return;
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", ids)
      .then(({ data }) => {
        if (data) setLikedIds(new Set(data.map((r) => r.post_id as string)));
      });
  }, [userId, posts, followingPosts]);

  async function toggleLike(post: DbCommunityPost) {
    if (!userId) {
      router.push("/login");
      return;
    }
    const wasLiked = likedIds.has(post.id);
    // 乐观更新
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    // 两条流(推荐/关注)可能同时含这篇帖子,计数一起更新
    const bump = (delta: number) => (prev: DbCommunityPost[]) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + delta) }
          : p
      );
    setPosts(bump(wasLiked ? -1 : 1));
    setFollowingPosts(bump(wasLiked ? -1 : 1));
    const { error } = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
    if (error) {
      // 失败回滚
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setPosts(bump(wasLiked ? 1 : -1));
      setFollowingPosts(bump(wasLiked ? 1 : -1));
    }
  }

  // 无限滚动状态
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // 浏览模式的随机顺序(每次刷新重新洗牌,会话内稳定)
  const orderIdsRef = useRef<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  function markTableError(error: { message: string; code?: string }) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("relation") ||
      error.code === "42P01"
    ) {
      setTableError(true);
    }
  }

  // 按 id 列表取整帖,并保持洗牌顺序
  async function fetchPostsByIds(ids: string[]): Promise<DbCommunityPost[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("community_posts")
      .select("*, profiles!user_id(username, avatar_url)")
      .in("id", ids);
    if (error) {
      markTableError(error);
      return [];
    }
    const byId = new Map((data as DbCommunityPost[]).map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as DbCommunityPost[];
  }

  // 拉全部 id → 洗牌 → 取第一页(浏览模式初始加载与下拉刷新共用)
  const loadFeed = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) {
        markTableError(error);
        setPosts([]);
        return;
      }
      const ids = shuffleArray((data || []).map((r) => r.id as string));
      orderIdsRef.current = ids;
      const first = await fetchPostsByIds(ids.slice(0, PAGE_SIZE));
      setPosts(first);
      setHasMore(ids.length > PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load community posts:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 浏览模式初始化:优先还原缓存(session 新鲜缓存直接用;localStorage 旧数据
  // 先展示 + 顶部小 spinner 后台刷新)。整屏 loading 只出现在「真正第一次」
  // (两层缓存都没有);layout effect 在绘制前还原,不闪加载页
  useIsoLayoutEffect(() => {
    if (searching) return;
    const hit = readFeedCache();
    if (hit && hit.cache.posts.length > 0) {
      orderIdsRef.current = hit.cache.ids;
      setPosts(hit.cache.posts);
      setHasMore(hit.cache.posts.length < hit.cache.ids.length);
      setLoading(false);
      if (hit.stale) {
        setRefreshing(true);
        loadFeed().finally(() => setRefreshing(false));
      }
      return;
    }
    setLoading(true);
    setPosts([]);
    setHasMore(true);
    loadFeed().finally(() => setLoading(false));
  }, [searching, loadFeed]);

  // 已加载内容写入双层缓存(浏览模式;加载更多也会追加进缓存)。
  // refreshing 期间展示的是 localStorage 旧数据,绝不能写回 session——
  // 否则旧顺序会被当成本会话新鲜缓存,导致「重新进网站还是同一批」
  useEffect(() => {
    if (searching || loading || refreshing || posts.length === 0) return;
    writeFeedCache({ ids: orderIdsRef.current, posts, nearbyCars } satisfies FeedCache);
  }, [posts, nearbyCars, searching, loading, refreshing]);

  // 搜索模式:按时间排序 + 关键词/类型过滤,分页
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    setLoading(true);
    // 搜「#话题」时剥掉 #;tags.cs 精确匹配标签数组,标题/正文仍模糊匹配
    const kw = keyword.trim().replace(/^#/, "");
    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);
        if (searchType) query = query.eq("type", searchType);
        if (kw) query = query.or(`title.ilike.%${kw}%,content.ilike.%${kw}%,tags.cs.{${kw}}`);
        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          markTableError(error);
          setPosts([]);
        } else {
          const rows = (data as DbCommunityPost[]) || [];
          setPosts(rows);
          setHasMore(rows.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error("Failed to search community posts:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, kw ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, searchType, searching, searchNonce]);

  // 加载下一页
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      if (searching) {
        const kw = keyword.trim().replace(/^#/, "");
        let query = supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(posts.length, posts.length + PAGE_SIZE - 1);
        if (searchType) query = query.eq("type", searchType);
        if (kw) query = query.or(`title.ilike.%${kw}%,content.ilike.%${kw}%,tags.cs.{${kw}}`);
        const { data, error } = await query;
        if (!error) {
          const rows = (data as DbCommunityPost[]) || [];
          setPosts((prev) => [...prev, ...rows]);
          setHasMore(rows.length === PAGE_SIZE);
        }
      } else {
        const ids = orderIdsRef.current;
        const slice = ids.slice(posts.length, posts.length + PAGE_SIZE);
        const rows = await fetchPostsByIds(slice);
        setPosts((prev) => [...prev, ...rows]);
        setHasMore(posts.length + slice.length < ids.length);
      }
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, loading, hasMore, searching, keyword, searchType, posts.length]);

  // 触底哨兵
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Feed 插卡车源:有个性化信号时按「喜欢/浏览」画像推荐(距离仅小幅加成);
  // 无信号时退回真正的「附近车源」——在足够大的候选池里按距离排序。
  useEffect(() => {
    // 缓存里已有插卡车源 → 直接还原,保持 feed 与上次一致
    const hit = readFeedCache();
    if (hit && hit.cache.nearbyCars.length > 0) {
      setNearbyCars(hit.cache.nearbyCars);
      return;
    }
    async function loadCars() {
      // 拉较大的候选池,避免「在最新 24 台里挑最近」导致其实并不近
      const { data } = await supabase
        .from("cars")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);
      const cars = (data as DbCar[]) || [];
      if (cars.length === 0) return;

      // 用户定位(用于距离)
      let coords: { lat: number; lng: number } | null = null;
      try {
        const zip = await detectUserZip();
        if (zip) coords = await geocodeZipToCoords(zip);
      } catch {
        /* 无定位则跳过距离 */
      }

      const withDist = (car: DbCar): number | undefined =>
        coords && car.lat != null && car.lng != null
          ? haversineDistance(coords.lat, coords.lng, car.lat, car.lng)
          : undefined;

      // 有「喜欢/浏览」信号 → 个性化推荐(与首页同一套算法)
      if (hasUserHistory()) {
        const recentIds = getRecentlyViewed();
        const favIds = getFavoriteIds();
        const signalIds = [...new Set([...recentIds, ...favIds])];
        let favoriteCars: DbCar[] = [];
        let viewedCars: DbCar[] = [];
        if (signalIds.length > 0) {
          const { data: sig } = await supabase.from("cars").select("*").in("id", signalIds);
          const byId = new Map(((sig as DbCar[]) || []).map((c) => [c.id, c]));
          favoriteCars = favIds.map((id) => byId.get(id)).filter(Boolean) as DbCar[];
          viewedCars = recentIds.map((id) => byId.get(id)).filter(Boolean) as DbCar[];
        }
        const ranked = rankCars(
          cars,
          { favorites: favoriteCars, viewed: viewedCars },
          { excludeIds: new Set(recentIds), userCoords: coords, limit: 6 },
        );
        if (ranked.length > 0) {
          setNearbyCars(ranked.map((car) => ({ car, distance: withDist(car), personalized: true })));
          return;
        }
      }

      // 无信号 → 真正的附近车源(在整个候选池里按距离排序)
      if (coords) {
        const nearby = cars
          .filter((c) => c.lat != null && c.lng != null)
          .map((car) => ({ car, distance: withDist(car)!, personalized: false }))
          .sort((a, b) => a.distance - b.distance);
        if (nearby.length > 0) {
          setNearbyCars(nearby.slice(0, 6));
          return;
        }
      }

      // 兜底:无定位无信号,取最新
      setNearbyCars(cars.slice(0, 6).map((car) => ({ car, personalized: false })));
    }
    loadCars().catch(() => {});
  }, []);

  // 下拉刷新:清会话缓存重新洗牌拉新;搜索态则重跑当前搜索
  const refreshFeed = useCallback(async () => {
    if (searching) {
      setSearchNonce((n) => n + 1);
      return;
    }
    clearFeedSessionCache();
    await loadFeed();
  }, [searching, loadFeed]);

  // 帖子 + 穿插车源合成瀑布流(搜索时不插车源卡)
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = posts.map((post) => ({ kind: "post", post }));
    if (!searching) {
      nearbyCars.forEach((entry, i) => {
        const at = FIRST_CAR_AT + i * CAR_EVERY;
        if (at <= items.length) {
          items.splice(at, 0, { kind: "car", ...entry });
        }
      });
    }
    return items;
  }, [posts, nearbyCars, searching]);

  // 正在关注流:先还原缓存(有缓存立即展示 + 顶部小 spinner 后台刷新,
  // 无缓存整屏 loading),数据按最近发布排布;fetchFollowingPosts 内部会回写缓存
  useIsoLayoutEffect(() => {
    if (feedTab !== "following" || !userId) return;
    let cancelled = false;
    const hit = readFollowingCache(userId);
    if (hit) {
      setFollowingPosts(hit.posts);
      setFollowingLoaded(true);
      setFollowingRefreshing(true);
    } else {
      setFollowingLoading(true);
    }
    fetchFollowingPosts(userId)
      .then((posts) => {
        if (!cancelled) setFollowingPosts(posts);
      })
      .finally(() => {
        if (!cancelled) {
          setFollowingLoaded(true);
          setFollowingLoading(false);
          setFollowingRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [feedTab, userId]);

  // 关注流顶部作者行:posts 已按时间倒序,首次出现的顺序即「最近发布」顺序
  const followingAuthors = useMemo(() => {
    const seen = new Set<string>();
    const authors: { id: string; username: string; avatar_url: string | null }[] = [];
    for (const p of followingPosts) {
      if (seen.has(p.user_id)) continue;
      seen.add(p.user_id);
      authors.push({
        id: p.user_id,
        username: p.profiles?.username || "用户",
        avatar_url: p.profiles?.avatar_url || null,
      });
    }
    return authors;
  }, [followingPosts]);

  const shownFollowingPosts = selectedAuthor
    ? followingPosts.filter((p) => p.user_id === selectedAuthor)
    : followingPosts;


  return (
    <PullToRefresh onRefresh={refreshFeed}>
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4 md:px-4 md:py-6">
        {/* Top bar — title + search (sticky)。安全区并入吸顶条自身的 padding:
            若只把 top 设为安全区高度,刘海/状态栏那条不被覆盖,滚动时内容
            会从底下穿过(Capacitor 里看起来顶部"透明") */}
        <div
          className="sticky top-0 z-30 -mx-3 bg-background/90 px-3 pb-3 border-b border-border backdrop-blur-md md:top-14 md:-mx-4 md:px-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.25rem)" }}
        >
          <motion.div layout={!reduced} transition={{ duration: 0.24, ease: EASE }}>
            <AnimatePresence initial={false} mode="popLayout">
              {searchOpen ? (
                <motion.div
                  key="search"
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                >
                  <div className="flex items-center gap-2 rounded-full bg-muted px-3">
                    <motion.span layoutId="community-search-icon" className="shrink-0">
                      <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </motion.span>
                    <input
                      autoFocus
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        syncSearchUrl(e.target.value);
                      }}
                      onBlur={() => saveSearchHistory(keyword)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="搜索帖子..."
                      className="h-10 w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setKeyword("");
                        setSearchType("");
                        syncSearchUrl(null);
                      }}
                      className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="关闭搜索"
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  {/* 类型筛选只在搜索时出现 */}
                  <div className="mt-2 flex items-center gap-1.5">
                    {SEARCH_TYPE_CHIPS.map((chip, i) => (
                      <motion.button
                        key={chip.key}
                        initial={reduced ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: EASE, delay: 0.04 + i * 0.03 }}
                        onClick={() => setSearchType(chip.key)}
                        className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors ${
                          searchType === chip.key
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        {chip.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="header"
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Community
                    </span>
                    <h1 className="font-logo text-lg tracking-tight">社区</h1>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(true);
                        syncSearchUrl("");
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="搜索帖子"
                    >
                      <motion.span layoutId="community-search-icon" className="flex">
                        <Search className="h-4 w-4" strokeWidth={1.5} />
                      </motion.span>
                    </button>
                    <Link
                      href="/community/new"
                      className="hidden h-9 items-center gap-1 rounded-full bg-muted px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground md:flex"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      发帖
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* X 式双流 tab:为你推荐 / 正在关注(搜索态隐藏)。
              下滑时只收起这一条,标题栏保持吸顶;上滑立即展开 */}
          {!searchOpen && (
            <div
              className={`flex overflow-hidden transition-all duration-300 ease-out ${
                barHidden
                  ? "mt-0 -mb-0 max-h-0 opacity-0"
                  : "-mb-3 mt-2 max-h-14 opacity-100"
              }`}
            >
              {(
                [
                  ["foryou", "为你推荐"],
                  ["following", "正在关注"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => changeTab(k)}
                  className={`relative flex-1 pb-3 pt-2 font-mono text-sm transition-colors ${
                    feedTab === k
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {label}
                  {feedTab === k && (
                    <span className="absolute inset-x-0 bottom-0 mx-auto h-[3px] w-14 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 搜索面板:未输入时 = 搜索记录 + 猜你想搜;输入中仍保留猜你想搜
            (显示在结果上方)。整块淡入上移,chips 逐个错峰进场 */}
        {searchOpen && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="mt-4"
          >
            {!searching && searchHistory.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-muted-foreground">搜索记录</p>
                  <button
                    type="button"
                    onClick={clearSearchHistory}
                    className="font-mono text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
                  >
                    清空
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {searchHistory.map((h, i) => (
                    <motion.button
                      key={h}
                      initial={reduced ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: EASE, delay: 0.04 + i * 0.03 }}
                      type="button"
                      onClick={() => pickKeyword(h)}
                      className="rounded-full bg-muted px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-muted/70 active:bg-muted/70"
                    >
                      {h}
                    </motion.button>
                  ))}
                </div>
              </>
            )}
            {suggestedKeywords.length > 0 && (
              <>
                <p
                  className={`font-mono text-xs text-muted-foreground ${
                    !searching && searchHistory.length > 0 ? "mt-5" : ""
                  }`}
                >
                  猜你想搜
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedKeywords.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={reduced ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: EASE, delay: 0.06 + i * 0.03 }}
                      type="button"
                      onClick={() => pickKeyword(s)}
                      className="rounded-full bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* 内容区:tab 间方向性左右滑动动画(X 式),手势左右滑也可切换;
            搜索面板展示时隐藏(display:none 保住 feed 状态) */}
        <div
          onTouchStart={onFeedTouchStart}
          onTouchEnd={onFeedTouchEnd}
          style={searchOpen && !searching ? { display: "none" } : undefined}
        >
        <AnimatePresence mode="popLayout" initial={false} custom={tabDir}>
        <motion.div
          key={searching ? "searching" : feedTab}
          custom={tabDir}
          variants={reduced ? undefined : TAB_SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: EASE }}
        >
        {/* 展示缓存数据、后台刷新中:顶部小 spinner(与下拉刷新同款) */}
        {!searching &&
          ((feedTab === "foryou" && refreshing) ||
            (feedTab === "following" && followingRefreshing)) && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
            </div>
          )}
        {/* 正在关注流:作者选择行 + 按最近发布的帖子列表 */}
        {feedTab === "following" && !searching ? (
          <div className="min-h-[50vh]">
            {followingAuthors.length > 0 && (
              <div
                data-hswipe-ignore
                className="flex gap-4 overflow-x-auto border-b border-border/70 px-1 py-3 scrollbar-none"
              >
                <button
                  type="button"
                  onClick={() => setSelectedAuthor(null)}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-muted font-mono text-xs transition-shadow ${
                      !selectedAuthor
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "ring-1 ring-border"
                    }`}
                  >
                    全部
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">全部</span>
                </button>
                {followingAuthors.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setSelectedAuthor(selectedAuthor === a.id ? null : a.id)
                    }
                    className="flex shrink-0 flex-col items-center gap-1"
                  >
                    <span
                      className={`h-14 w-14 overflow-hidden rounded-full bg-muted transition-shadow ${
                        selectedAuthor === a.id
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border"
                      }`}
                    >
                      <img
                        src={avatarUrl(a.avatar_url, a.username)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="max-w-14 truncate font-mono text-[10px] text-muted-foreground">
                      {a.username}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!userId ? (
              <div className="flex flex-col items-center py-16">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
                <p className="mt-3 font-mono text-sm text-muted-foreground">
                  登录后查看关注的人的动态
                </p>
                <Link
                  href="/login"
                  className="mt-4 rounded-full bg-primary px-6 py-2 font-mono text-xs text-primary-foreground"
                >
                  登录 / 注册
                </Link>
              </div>
            ) : !followingLoaded ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
              </div>
            ) : shownFollowingPosts.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
                <p className="mt-3 font-mono text-sm text-muted-foreground">
                  关注的人还没有发帖
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                  去「为你推荐」逛逛,关注感兴趣的用户吧
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {shownFollowingPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    liked={likedIds.has(post.id)}
                    onLike={() => toggleLike(post)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : tableError ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm text-muted-foreground">社区即将上线</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              敬请期待，社区功能正在建设中
            </p>
          </div>
        ) : feed.length === 0 ? (
          loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
            </div>
          ) : (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mt-12 flex flex-col items-center py-12"
            >
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-sm text-muted-foreground">
                {searching ? "没有找到相关帖子" : "暂无帖子"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                {searching ? "换个关键词试试" : "成为第一个发帖的人吧"}
              </p>
            </motion.div>
          )
        ) : (
          /* X 式单列信息流:圆角卡片 + 间距。搜索切换时卡片淡入淡出过渡,
             加载中把结果轻微变淡代替骨架屏 */
          <motion.div
            className="mt-3"
            animate={{ opacity: loading ? 0.55 : 1 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {feed.map((item) => {
                const card =
                  item.kind === "post" ? (
                    <PostCard
                      post={item.post}
                      liked={likedIds.has(item.post.id)}
                      onLike={() => toggleLike(item.post)}
                    />
                  ) : (
                    <CarFeedCard car={item.car} distance={item.distance} personalized={item.personalized} />
                  );
                const key = item.kind === "post" ? item.post.id : `car-${item.car.id}`;
                return (
                  <motion.div
                    key={key}
                    layout={!reduced}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="mb-3"
                  >
                    {card}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 无限滚动哨兵 + 状态(只属于「为你推荐」流) */}
        {(feedTab === "foryou" || searching) && (
          <>
            <div ref={sentinelRef} className="h-px" aria-hidden="true" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}
            {!hasMore && !loading && posts.length > 0 && (
              <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40">
                — End · 已经到底了 —
              </p>
            )}
          </>
        )}
        </motion.div>
        </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
    </PullToRefresh>
  );
}

function PostCard({
  post,
  liked,
  onLike,
}: {
  post: DbCommunityPost;
  liked: boolean;
  onLike: () => void;
}) {
  const router = useRouter();
  const { enabled: overlayEnabled, openPost, openUser } = useOverlay();
  const media = post.images || [];
  const shown = media.slice(0, 4);

  // 点头像/名字进作者主页(浮层可用时用浮层)
  function goProfile(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (overlayEnabled) openUser(post.user_id);
    else router.push(userLink(post.user_id));
  }

  return (
    <Link
      href={communityPostLink(post.id)}
      onClick={(e) => {
        // 移动端:在当前页浮层打开(从卡片放大);桌面端正常跳转
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openPost(post, { top: r.top, left: r.left, width: r.width, height: r.height }, e.currentTarget.outerHTML, e.currentTarget);
        }
      }}
      className="block p-3 bg-card rounded-xl transition-colors hover:bg-muted/30"
    >
      <div className="flex gap-3">
        {/* 头像列 */}
        <button
          type="button"
          onClick={goProfile}
          aria-label="查看主页"
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
        >
          <img
            src={avatarUrl(post.profiles?.avatar_url, post.profiles?.username)}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>

        <div className="min-w-0 flex-1 pr-3 pt-1">
          {/* X 式头部行:名字 · 时间(类型收进正文右上不再占位) */}
          <div className="flex items-center gap-1 font-mono text-[15px] leading-5">
            <button
              type="button"
              onClick={goProfile}
              className="min-w-0 truncate font-bold text-foreground hover:underline"
            >
              {post.profiles?.username || "匿名"}
            </button>
            <span className="shrink-0 text-muted-foreground">
              · {timeAgo(post.created_at)}
            </span>
          </div>

          {/* 正文:X 式全色文字,标题加粗、内容常规 */}
          {post.title && (
            <h3 className="font-mono text-[15px] font-semibold leading-snug text-foreground py-2">
              {post.title}
            </h3>
          )}
          {post.content && (
            <p className="mt-0.5 line-clamp-4 whitespace-pre-line font-mono text-[15px] leading-relaxed text-foreground">
              <HashtagText text={post.content} />
            </p>
          )}

          {/* 媒体:单图原比例,多图 2 列网格,超过 4 张盖 +N;X 式细描边圆角 */}
          {shown.length > 0 && (
            <div
              className={`mt-2.5 overflow-hidden rounded-2xl ring-1 ring-border/60 ${
                shown.length > 1 ? "grid grid-cols-2 gap-0.5" : ""
              } ${shown.length === 3 ? "grid-rows-2" : ""}`}
            >
              {shown.map((url, i) => {
                const spanFirst = shown.length === 3 && i === 0;
                return (
                  <div
                    key={i}
                    className={`relative bg-muted ${
                      shown.length === 1 ? "" : spanFirst ? "row-span-2 h-full" : "aspect-square"
                    }`}
                  >
                    {isVideoUrl(url) ? (
                      <>
                        <video
                          src={url}
                          muted
                          playsInline
                          preload="metadata"
                          className={`w-full object-cover ${shown.length === 1 ? "max-h-[420px]" : "h-full"}`}
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                            <Play className="ml-0.5 h-4 w-4 fill-white text-white" strokeWidth={1.5} />
                          </span>
                        </span>
                      </>
                    ) : (
                      <img
                        src={url}
                        alt=""
                        className={`w-full object-cover ${shown.length === 1 ? "max-h-[420px]" : "h-full"}`}
                        loading="lazy"
                      />
                    )}
                    {i === 3 && media.length > 4 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-sm font-medium text-white">
                        +{media.length - 4}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* X 式操作行:评论 / 点赞 / 分享,横向铺开 */}
          <div className="mt-2 flex max-w-xs items-center justify-start gap-4 text-muted-foreground">
            <span className="group flex items-center font-mono text-[13px] transition-colors hover:text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-primary/10">
                <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </span>
              {post.comments_count || 0}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLike();
              }}
              aria-label={liked ? "取消点赞" : "点赞"}
              className={`group flex items-center gap-1 font-mono text-[13px] transition-colors ${
                liked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${liked ? "" : "group-hover:bg-red-500/10"}`}>
                <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} strokeWidth={1.5} />
              </span>
              {post.likes_count || 0}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = `${window.location.origin}/community/${post.id}`;
                if (navigator.share) {
                  navigator.share({ title: post.title, url }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(url).catch(() => {});
                }
              }}
              aria-label="分享"
              className="group flex items-center font-mono text-[13px] transition-colors hover:text-primary"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-primary/10">
                <Share className="h-4 w-4" strokeWidth={1.5} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CarFeedCard({ car, distance, personalized }: { car: DbCar; distance?: number; personalized?: boolean }) {
  const { enabled: overlayEnabled, openCar } = useOverlay();
  return (
    <Link
      href={carLink(car.id)}
      onClick={(e) => {
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openCar(car, { top: r.top, left: r.left, width: r.width, height: r.height }, e.currentTarget.outerHTML, e.currentTarget);
        }
      }}
      className="block p-3 bg-card rounded-xl transition-colors hover:bg-muted/30"
    >
      {/* 与帖子完全同构的 X 式卡片:头像列 + 名字行 + 正文 + 大图 + 底部行 */}
      <div className="flex gap-3">
        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          <img
            src={avatarUrl(null, car.seller_name)}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 font-mono text-[15px] leading-5">
            <span className="min-w-0 truncate font-bold text-foreground">
              {car.seller_name || "卖家"}
            </span>
            <span className="shrink-0 text-muted-foreground">
              · {personalized ? "为你推荐" : "附近车源"}
            </span>
          </div>
          <h3 className="font-mono text-[15px] font-semibold leading-snug text-foreground">
            {car.title_zh}
          </h3>
          <p className="mt-0.5 font-mono text-[15px] leading-relaxed text-foreground">
            {car.price > 0 ? formatPrice(car.price) : "电议"}
          </p>
          <div className="relative mt-2.5 overflow-hidden rounded-2xl ring-1 ring-border/60">
            {car.image_url ? (
              <img
                src={car.image_url}
                alt={car.title_zh}
                className="aspect-video w-full bg-muted object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-muted">
                <span className="font-mono text-[10px] text-muted-foreground">暂无图片</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1 font-mono text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{car.location_zh}</span>
            {distance != null && (
              <span className="ml-auto shrink-0 text-brand">{formatDistance(distance)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
