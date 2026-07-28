"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { useOverlay } from "@/components/car-overlay-provider";
import {
  Heart,
  Loader2,
  MessageSquare,
  Plus,
  MapPin,
  Play,
  Search,
  X,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { carLink, userLink } from "@/lib/static-link";
import {
  detectUserZip,
  geocodeZipToCoords,
  haversineDistance,
  formatDistance,
} from "@/lib/geocode";
import { rankCars, getFavoriteIds, hasUserHistory } from "@/lib/recommendations";
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
const COVER_RATIOS = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]"] as const;
function coverRatio(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COVER_RATIOS[Math.abs(h) % COVER_RATIOS.length];
}

// 响应式列数:2 / md 3 / xl 4(与原 columns-2 md:columns-3 xl:columns-4 一致)
function useColumnCount(): number {
  const [count, setCount] = useState(2);
  useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 768px)");
    const xlQuery = window.matchMedia("(min-width: 1280px)");
    const update = () => setCount(xlQuery.matches ? 4 : mdQuery.matches ? 3 : 2);
    update();
    mdQuery.addEventListener("change", update);
    xlQuery.addEventListener("change", update);
    return () => {
      mdQuery.removeEventListener("change", update);
      xlQuery.removeEventListener("change", update);
    };
  }, []);
  return count;
}

export default function CommunityFeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);

  const [nearbyCars, setNearbyCars] = useState<{ car: DbCar; distance?: number; personalized?: boolean }[]>([]);

  // 搜索:默认不显示任何分类;只有搜索时才出现类型筛选
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchType, setSearchType] = useState("");
  const searching = searchOpen && (keyword.trim() !== "" || searchType !== "");
  const reduced = useReducedMotion();

  // 点赞:当前用户 + 已赞集合
  const [userId, setUserId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 拉取当前用户对可见帖子的点赞状态
  useEffect(() => {
    if (!userId || posts.length === 0) return;
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", posts.map((p) => p.id))
      .then(({ data }) => {
        if (data) setLikedIds(new Set(data.map((r) => r.post_id as string)));
      });
  }, [userId, posts]);

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
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? -1 : 1)) }
          : p
      )
    );
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
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? 1 : -1)) }
            : p
        )
      );
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

  // 浏览模式初始化:拉全部 id → 洗牌 → 取第一页
  useEffect(() => {
    if (searching) return;
    let cancelled = false;
    setLoading(true);
    setPosts([]);
    setHasMore(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .select("id")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (cancelled) return;
        if (error) {
          markTableError(error);
          setPosts([]);
          return;
        }
        const ids = shuffleArray((data || []).map((r) => r.id as string));
        orderIdsRef.current = ids;
        const first = await fetchPostsByIds(ids.slice(0, PAGE_SIZE));
        if (cancelled) return;
        setPosts(first);
        setHasMore(ids.length > PAGE_SIZE);
      } catch (err) {
        console.error("Failed to load community posts:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  // 搜索模式:按时间排序 + 关键词/类型过滤,分页
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    setLoading(true);
    const kw = keyword.trim();
    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);
        if (searchType) query = query.eq("type", searchType);
        if (kw) query = query.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`);
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
  }, [keyword, searchType, searching]);

  // 加载下一页
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      if (searching) {
        const kw = keyword.trim();
        let query = supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(posts.length, posts.length + PAGE_SIZE - 1);
        if (searchType) query = query.eq("type", searchType);
        if (kw) query = query.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`);
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

  // 显式列分发(round-robin):追加新内容只往列尾加,已有卡片永不换位
  // (CSS columns 会在每次追加时全量重排,导致滚动跳动)
  const columnCount = useColumnCount();
  const feedColumns = useMemo<FeedItem[][]>(() => {
    const cols: FeedItem[][] = Array.from({ length: columnCount }, () => []);
    feed.forEach((item, i) => cols[i % columnCount].push(item));
    return cols;
  }, [feed, columnCount]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 md:px-4 md:py-6 xl:max-w-6xl">
        {/* Top bar — title + search (sticky) */}
        <div className="sticky top-0 z-30 -mx-3 bg-background/90 px-3 pb-3 pt-1 backdrop-blur-md md:top-14 md:-mx-4 md:px-4">
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
                  <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3">
                    <motion.span layoutId="community-search-icon" className="shrink-0">
                      <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </motion.span>
                    <input
                      autoFocus
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索帖子..."
                      className="h-10 w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setKeyword("");
                        setSearchType("");
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
                        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                          searchType === chip.key
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
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
                    <h1 className="font-mono text-base font-semibold tracking-tight">社区</h1>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                      aria-label="搜索帖子"
                    >
                      <motion.span layoutId="community-search-icon" className="flex">
                        <Search className="h-4 w-4" strokeWidth={1.5} />
                      </motion.span>
                    </button>
                    <Link
                      href="/community/new"
                      className="hidden h-9 items-center gap-1 rounded-full border border-border px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground md:flex"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      发帖
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Content — 搜索/加载用动画过渡代替骨架屏 */}
        {tableError ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm text-muted-foreground">社区即将上线</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              敬请期待，社区功能正在建设中
            </p>
          </div>
        ) : feed.length === 0 ? (
          loading ? (
            <div className="mt-16 flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
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
          /* 小红书式瀑布流:显式列分发,追加不重排。搜索切换时卡片淡入淡出过渡,
             加载中把结果轻微变淡代替骨架屏 */
          <motion.div
            className="flex items-start gap-3"
            animate={{ opacity: loading ? 0.55 : 1 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {feedColumns.map((col, colIdx) => (
              <div key={colIdx} className="min-w-0 flex-1">
                <AnimatePresence initial={false} mode="popLayout">
                  {col.map((item) => {
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
              </div>
            ))}
          </motion.div>
        )}

        {/* 无限滚动哨兵 + 状态 */}
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
      </main>
      <Footer />

      {/* Floating post button (mobile) */}
      <Link
        href="/community/new"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
      >
        <Plus className="h-5 w-5" strokeWidth={1.5} />
      </Link>

    </div>
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
  const cover = post.images?.[0];
  return (
    <Link
      href={`/community/${post.id}`}
      onClick={(e) => {
        // 移动端:在当前页浮层打开(从卡片放大);桌面端正常跳转
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openPost(post, { top: r.top, left: r.left, width: r.width, height: r.height }, e.currentTarget.outerHTML);
        }
      }}
      className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/30"
    >
      {cover ? (
        <div className="relative">
          {isVideoUrl(cover) ? (
            <>
              <video
                src={cover}
                muted
                playsInline
                preload="metadata"
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-sm">
                  <Play className="ml-0.5 h-4 w-4 text-foreground" strokeWidth={1.5} />
                </span>
              </span>
            </>
          ) : (
            /* 固定宽高比(按 id 确定):图片加载完成不会撑开布局 */
            <img
              src={cover}
              alt=""
              className={`${coverRatio(post.id)} w-full bg-muted object-cover`}
              loading="lazy"
            />
          )}
          <span className="absolute left-1.5 top-1.5 rounded-full border border-border bg-background/85 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground backdrop-blur-sm">
            {TYPE_LABELS[post.type] || post.type}
          </span>
          {post.images && post.images.length > 1 && (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-background/85 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground backdrop-blur-sm">
              +{post.images.length - 1}
            </span>
          )}
        </div>
      ) : null}
      <div className="p-2.5">
        {!cover && (
          <span className="mb-1.5 inline-block rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            {TYPE_LABELS[post.type] || post.type}
          </span>
        )}
        <h3 className="line-clamp-2 font-mono text-xs font-medium leading-snug">
          {post.title}
        </h3>
        {!cover && (
          <p className="mt-1 line-clamp-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {post.content}
          </p>
        )}
        {/* Author + likes (XHS style) — author clicks through to profile */}
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (overlayEnabled) openUser(post.user_id);
              else router.push(userLink(post.user_id));
            }}
            className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-70"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              <img src={avatarUrl(post.profiles?.avatar_url, post.profiles?.username)} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
              {post.profiles?.username || "匿名"}
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLike();
            }}
            aria-label={liked ? "取消点赞" : "点赞"}
            className={`ml-auto flex shrink-0 items-center gap-0.5 font-mono text-[10px] transition-colors ${
              liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} strokeWidth={1.5} />
            {post.likes_count || 0}
          </button>
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
          openCar(car, { top: r.top, left: r.left, width: r.width, height: r.height }, e.currentTarget.outerHTML);
        }
      }}
      className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/30"
    >
      <div className="relative">
        {car.image_url ? (
          <img
            src={car.image_url}
            alt={car.title_zh}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
            <span className="font-mono text-[10px] text-muted-foreground">暂无图片</span>
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 font-mono text-[9px] font-medium text-primary-foreground">
          {personalized ? "为你推荐" : "附近车源"}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-1 font-mono text-xs font-medium leading-snug">
          {car.title_zh}
        </h3>
        <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
          {car.price > 0 ? formatPrice(car.price) : "电议"}
        </p>
        <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{car.location_zh}</span>
          {distance != null && (
            <span className="ml-auto shrink-0 text-brand">{formatDistance(distance)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
