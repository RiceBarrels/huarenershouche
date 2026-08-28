"use client";

import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Link from "@/components/localized-navigation";
import { useRouter, useSearchParams } from "@/components/localized-navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { useOverlay } from "@/components/car-overlay-provider";
import { SwipeSheet } from "@/components/swipe-sheet";
import {
  OverlayLayerRegistryCtx,
  OverlayLayerZCtx,
} from "@/components/overlay-stack";
import { triggerHaptic } from "@/lib/haptics";
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
  Smile,
  X,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { timeAgo } from "@/lib/format";
import { carTitle, needsContentTranslation } from "@/lib/i18n";
import { PostCard } from "@/components/post-card";
import { apiOrigin } from "@/lib/capacitor";
import { useI18n } from "@/components/i18n-provider";
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
  const { t, locale } = useI18n();
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

  // ---- 列表卡片按需 AI 翻译:非中文界面,把已加载且未翻译的帖子分批(12/批)
  // 送 /api/translate-post 批量翻译,结果合并回两条流;in-flight 集合防重复请求 ----
  const cardTranslating = useRef<Set<string>>(new Set());
  useEffect(() => {

    const all = [...posts, ...followingPosts];
    // other_i18n[locale] === undefined 表示"从未尝试";失败会写入 {} 标记,
    // 让卡片 skeleton 收起、回退原文,且不再重试
    const need = all.filter(
      (p) =>
        needsContentTranslation(`${p.title}\n${p.content}`, locale) &&
        p.other_i18n?.[locale] === undefined &&
        !cardTranslating.current.has(p.id)
    );
    if (need.length === 0) return;
    const ids = need.slice(0, 12).map((p) => p.id);
    ids.forEach((id) => cardTranslating.current.add(id));
    const applyMap = (map: Record<string, { title?: string | null; content?: string | null }>) => {
      const merge = (list: DbCommunityPost[]) =>
        list.map((p) =>
          map[p.id] ? { ...p, other_i18n: { ...(p.other_i18n ?? {}), [locale]: map[p.id] } } : p
        );
      setPosts(merge);
      setFollowingPosts(merge);
    };
    fetch(`${apiOrigin()}/api/translate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds: ids, locale }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (json: {
          ok?: boolean;
          i18n?: Record<string, { title?: string | null; content?: string | null }>;
        } | null) => {
          const map = { ...(json?.ok ? json.i18n : undefined) };
          for (const id of ids) if (!(id in map)) map[id] = {};
          applyMap(map);
        }
      )
      .catch(() => {
        applyMap(Object.fromEntries(ids.map((id) => [id, {}])));
      })
      .finally(() => {
        ids.forEach((id) => cardTranslating.current.delete(id));
      });
  }, [posts, followingPosts, locale]);
  // 展示着缓存数据、后台刷新中(顶部小 spinner,即下拉刷新的那种加载)
  const [refreshing, setRefreshing] = useState(false);
  const [followingRefreshing, setFollowingRefreshing] = useState(false);
  // 关注流顶部的作者筛选(null = 全部)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  // 桌面左栏:我关注的人(X 式三栏布局的左侧列表;null = 加载中)
  const [followingList, setFollowingList] = useState<
    { id: string; username: string; avatar_url: string | null }[] | null
  >(null);
  // 宽屏发帖入口(X 式 composer)用的当前用户资料
  const [me, setMe] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    if (!userId) {
      setMe(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) {
          setMe(data as { username: string | null; avatar_url: string | null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  // 宽屏(xl+,右栏可见):搜索 UI 只在右栏(输入框/筛选/建议都在右边),
  // 中栏只展示结果,吸顶条不再切换成搜索框
  const [railSearch, setRailSearch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读取媒体查询,仅首帧一次
    setRailSearch(mq.matches);
    const update = (e: MediaQueryListEvent) => setRailSearch(e.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
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

  // 桌面左栏关注列表:follows 表按关注时间倒序,内嵌被关注者资料
  //(轻量查询,不做断点判断,避免「小屏加载后拉宽窗口」时列表缺数据)
  useEffect(() => {
    if (!userId) {
      setFollowingList(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("follows")
      .select("followee_id, profiles!followee_id(username, avatar_url)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        type Row = {
          followee_id: string;
          profiles: { username: string | null; avatar_url: string | null } | null;
        };
        setFollowingList(
          ((data as Row[] | null) || []).map((r) => ({
            id: r.followee_id,
            username: r.profiles?.username || t("用户"),
            avatar_url: r.profiles?.avatar_url ?? null,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

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

  // —— 移动端:搜索是独立浮层(SwipeSheet),feed 与滚动位置原地不动 ——
  // 桌面端保留内联面板。mobileLayer 与详情浮层同一开关(<768px)
  const { enabled: mobileLayer } = useOverlay();
  const layerRegistry = useContext(OverlayLayerRegistryCtx);
  const layerZMap = useContext(OverlayLayerZCtx);
  const searchLayerId = useId();
  const searchLayerZ = layerZMap?.get(searchLayerId) ?? 60;
  const layerMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // 注册进浮层栈(统一层级 + 系统返回关层),并把 ?q= 挪到浮层自己的
  // 历史条目上:register 会压一条 overlay 历史,返回/关闭落回的底层条目
  // 必须不带 q(深链 /community?q=xx 进来时尤其),否则 searchParams
  // 效应会立刻把搜索层重新打开,形成关不掉的循环
  useEffect(() => {
    if (!mobileLayer || !searchOpen || !layerRegistry) return;
    const q = new URL(window.location.href).searchParams.get("q");
    syncSearchUrl(null);
    layerRegistry.register(searchLayerId, () => setSearchOpen(false));
    syncSearchUrl(q ?? "");
    return () => layerRegistry.release(searchLayerId);
  }, [mobileLayer, searchOpen, layerRegistry, searchLayerId, syncSearchUrl]);

  // 开/关搜索层触觉(与其他浮层一致)
  const prevSearchOpen = useRef(searchOpen);
  useEffect(() => {
    if (prevSearchOpen.current === searchOpen) return;
    prevSearchOpen.current = searchOpen;
    if (mobileLayer) triggerHaptic();
  }, [searchOpen, mobileLayer]);

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
  // 桌面右栏「大家在搜」:宽屏(xl+)开页即拉候选池(lib 内有会话缓存,
  // 与搜索面板共享一份数据);窄屏仍然等打开搜索时才拉
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1280px)").matches) return;
    let cancelled = false;
    getSuggestionPool().then((pool) => {
      if (!cancelled) setSuggestPool(pool);
    });
    return () => {
      cancelled = true;
    };
  }, []);
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
        username: p.profiles?.username || t("用户"),
        avatar_url: p.profiles?.avatar_url || null,
      });
    }
    return authors;
  }, [followingPosts, t]);

  const shownFollowingPosts = selectedAuthor
    ? followingPosts.filter((p) => p.user_id === selectedAuthor)
    : followingPosts;

  // —— 搜索 UI 共享片段:桌面内联面板与移动浮层各渲染一处(同一时刻只挂一份)——

  // 类型筛选 chips
  const typeChips = (
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
          {t(chip.label)}
        </motion.button>
      ))}
    </div>
  );

  // 未输入 = 搜索记录 + 猜你想搜;输入中仍保留猜你想搜(显示在结果上方)
  const searchSuggestPanel = (
    <>
      {!searching && searchHistory.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted-foreground">{t("搜索记录")}</p>
            <button
              type="button"
              onClick={clearSearchHistory}
              className="font-mono text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              {t("清空")}
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
            {t("猜你想搜")}
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
    </>
  );

  // 搜索结果列表(含触底哨兵;哨兵与 feed 区互斥,同一 ref 只挂一处)
  const searchResults = searching && (
    <div>
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center py-12">
          <MessageSquare className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="mt-3 font-mono text-sm text-muted-foreground">{t("没有找到相关帖子")}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">{t("换个关键词试试")}</p>
        </div>
      ) : (
        <motion.div
          className="mt-3"
          animate={{ opacity: loading ? 0.55 : 1 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {posts.map((post) => (
            <div key={post.id} className="mb-3">
              <PostCard
                post={post}
                liked={likedIds.has(post.id)}
                onLike={() => toggleLike(post)}
              />
            </div>
          ))}
        </motion.div>
      )}
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {loadingMore && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </div>
      )}
      {!hasMore && !loading && posts.length > 0 && (
        <p className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40">
          {t("— End · 已经到底了 —")}
        </p>
      )}
    </div>
  );

  return (
    <PullToRefresh onRefresh={refreshFeed}>
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      {/* X 式三栏(桌面):左 关注列表(lg+)/ 中 信息流 / 右 搜索+热搜+车源(xl+)。
          移动端只有中栏,行为不变 */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-start justify-center px-3 py-4 md:px-4 md:py-6 lg:max-w-5xl lg:gap-6 xl:max-w-7xl">
        {/* 左栏:关注列表(替代 X 的导航栏)+ 发帖按钮 */}
        <aside className="scrollbar-none sticky top-[117px] hidden max-h-[calc(100vh-8.5rem)] w-56 shrink-0 overflow-y-auto lg:block">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Following
          </span>
          <h2 className="font-logo text-lg tracking-tight">{t("关注列表")}</h2>
          <div className="mt-3">
            {!userId ? (
              <div className="rounded-xl bg-card p-4">
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  {t("登录后,你关注的人会出现在这里")}
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex h-8 items-center rounded-full bg-primary px-4 font-mono text-xs text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t("登录 / 注册")}
                </Link>
              </div>
            ) : followingList === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
              </div>
            ) : followingList.length === 0 ? (
              <div className="rounded-xl bg-card p-4">
                <p className="font-mono text-xs text-muted-foreground">{t("还没有关注任何人")}</p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground/70">
                  {t("在帖子里点「关注」,对方就会出现在这里")}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {followingList.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={userLink(u.id)}
                      className="flex items-center gap-2.5 rounded-full px-2 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                        <img
                          src={avatarUrl(u.avatar_url, u.username)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0 truncate font-mono text-[13px] text-foreground">
                        {u.username}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/community/new"
            className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground font-mono text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            {t("发帖")}
          </Link>
        </aside>

        {/* 中栏:原有信息流 */}
        <div className="w-full min-w-0 max-w-2xl">
        {/* Top bar — title + search (sticky)。安全区并入吸顶条自身的 padding:
            若只把 top 设为安全区高度,刘海/状态栏那条不被覆盖,滚动时内容
            会从底下穿过(Capacitor 里看起来顶部"透明") */}
        <div
          /* 宽屏搜索结果態:标题和 tabs 都不展示,整条吸顶条收起 */
          className={`sticky top-0 z-30 -m-3 mb-0 bg-card/90 px-3 pb-3 border-b border-border backdrop-blur-md md:top-[101px] md:-mx-4 md:px-4 lg:mx-0 lg:px-0 ${
            railSearch && searching ? "hidden" : ""
          }`}
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.25rem)" }}
        >
          {/* 宽屏(xl+)删掉标题条:tabs 直接置顶,发帖入口是 feed 顶部的 X 式 composer */}
          <motion.div
            layout={!reduced}
            transition={{ duration: 0.24, ease: EASE }}
            className="xl:hidden"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {searchOpen && !mobileLayer && !railSearch ? (
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
                      placeholder={t("搜索帖子...")}
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
                      aria-label={t("关闭搜索")}
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  {/* 类型筛选只在搜索时出现 */}
                  {typeChips}
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
                    <h1 className="font-logo text-lg tracking-tight">{t("社区")}</h1>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(true);
                        // 移动端 ?q= 由浮层注册 effect 写到浮层历史条目上
                        if (!mobileLayer) syncSearchUrl("");
                      }}
                      /* 宽屏右栏自带搜索框,这里的入口藏掉避免重复 */
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:hidden"
                      aria-label={t("搜索帖子")}
                    >
                      <motion.span layoutId="community-search-icon" className="flex">
                        <Search className="h-4 w-4" strokeWidth={1.5} />
                      </motion.span>
                    </button>
                    <Link
                      href="/community/new"
                      /* 左栏(lg+)有大发帖按钮,吸顶条这颗只在 md–lg 出现 */
                      className="hidden h-9 items-center gap-1 rounded-full bg-muted px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground md:flex lg:hidden"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("发帖")}
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* X 式双流 tab:为你推荐 / 正在关注(桌面搜索态隐藏;移动端搜索
              是独立浮层,feed 原地不动,tab 条也保持;宽屏右栏搜索只是
              聚焦(还没输入)时 feed 还在,tabs 也保持不跳动 */}
          {(!searchOpen || mobileLayer || (railSearch && !searching)) && (
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
                  {t(label)}
                  {feedTab === k && (
                    <span className="absolute inset-x-0 bottom-0 mx-auto h-[3px] w-14 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 桌面搜索面板:搜索记录/猜你想搜 + 结果(移动端在独立浮层里渲染)。
            宽屏右栏搜索:仅在真正搜索(有关键词/类型)时接管中栏,
            光聚焦输入框不清空 feed */}
        {searchOpen && !mobileLayer && (!railSearch || searching) && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="mt-4"
          >
            {/* 宽屏:输入/筛选/建议都在右栏,中栏只展示搜索结果 */}
            {!railSearch && searchSuggestPanel}
            {searchResults}
          </motion.div>
        )}

        {/* 内容区:tab 间方向性左右滑动动画(X 式),手势左右滑也可切换;
            桌面搜索面板展示时隐藏(display:none 保住 feed 状态);
            移动端搜索浮层盖在上面,feed 与滚动位置原地不动 */}
        <div
          onTouchStart={onFeedTouchStart}
          onTouchEnd={onFeedTouchEnd}
          style={
            searchOpen && !mobileLayer && (!railSearch || searching)
              ? { display: "none" }
              : undefined
          }
        >
        {/* X 式发帖入口(宽屏):头像 + 占位文案 + 图标行 + 发帖按钮,
            点击整卡进发帖页(未登录去登录) */}
        <Link
          href={userId ? "/community/new" : "/login"}
          className="mb-3 mt-3 hidden rounded-xl bg-card p-3 ring-1 ring-transparent transition-[box-shadow,background-color] hover:ring-border/70 xl:block"
        >
          <div className="flex gap-3">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
              <img
                src={avatarUrl(me?.avatar_url, me?.username)}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex min-h-10 items-center font-mono text-[15px] text-muted-foreground/70">
                {t("有什么新鲜事?聊聊车吧…")}
              </p>
              <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-2">
                <span className="flex items-center text-brand-ink dark:text-brand">
                  {[ImageIcon, Smile, MapPin].map((Icon, i) => (
                    <span
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-primary/20"
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    </span>
                  ))}
                </span>
                <span className="flex h-9 items-center rounded-full bg-foreground px-5 font-mono text-sm font-medium text-background transition-opacity hover:opacity-90">
                  {t("发帖")}
                </span>
              </div>
            </div>
          </div>
        </Link>
        <AnimatePresence mode="popLayout" initial={false} custom={tabDir}>
        <motion.div
          key={feedTab}
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
                        ? "ring-2 ring-brand-ink ring-offset-2 ring-offset-background"
                        : "ring-1 ring-border"
                    }`}
                  >
                    {t("全部")}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{t("全部")}</span>
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
                          ? "ring-2 ring-brand-ink ring-offset-2 ring-offset-background"
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
                  {t("登录后查看关注的人的动态")}
                </p>
                <Link
                  href="/login"
                  className="mt-4 rounded-full bg-primary px-6 py-2 font-mono text-xs text-primary-foreground"
                >
                  {t("登录 / 注册")}
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
                  {t("关注的人还没有发帖")}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                  {t("去「为你推荐」逛逛,关注感兴趣的用户吧")}
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
            <p className="mt-3 font-mono text-sm text-muted-foreground">{t("社区即将上线")}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              {t("敬请期待，社区功能正在建设中")}
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
                {searching ? t("没有找到相关帖子") : t("暂无帖子")}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                {searching ? t("换个关键词试试") : t("成为第一个发帖的人吧")}
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

        {/* 无限滚动哨兵 + 状态(只属于「为你推荐」流;搜索时哨兵挂在结果列表里) */}
        {feedTab === "foryou" && !searching && (
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
        </div>

        {/* 右栏:搜索框 + 大家在搜 + 车源推荐(X 右侧栏式)。
            桌面搜索 UI 只在这里:聚焦展开筛选/建议,输入后中栏切成结果 */}
        <aside className="scrollbar-none sticky top-[117px] hidden max-h-[calc(100vh-8.5rem)] w-72 shrink-0 space-y-4 overflow-y-auto xl:block">
          <div className="flex h-10 w-full items-center gap-2 rounded-full bg-muted px-4 transition-colors focus-within:ring-1 focus-within:ring-border">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={keyword}
              onFocus={() => {
                if (!searchOpen) {
                  setSearchOpen(true);
                  syncSearchUrl(keyword);
                }
              }}
              onChange={(e) => {
                if (!searchOpen) setSearchOpen(true);
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
              placeholder={t("搜索帖子...")}
              className="h-full w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {searchOpen && (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setKeyword("");
                  setSearchType("");
                  syncSearchUrl(null);
                }}
                className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("关闭搜索")}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* 搜索态:类型筛选 + 搜索记录/猜你想搜(替换掉热搜/车源卡) */}
          {searchOpen && (
            <div className="rounded-xl bg-card p-4">
              {typeChips}
              <div className="mt-4">{searchSuggestPanel}</div>
            </div>
          )}

          {!searchOpen && suggestPool.length > 0 && (
            <div className="rounded-xl bg-card p-4">
              <h3 className="font-mono text-sm font-semibold">{t("大家在搜")}</h3>
              <ul className="mt-1">
                {suggestPool.slice(0, 6).map((t, i) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(true);
                        pickKeyword(t);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-full px-2 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="w-4 shrink-0 font-mono text-[11px] text-muted-foreground/60">
                        {i + 1}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[13px] text-foreground">
                        {t}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!searchOpen && nearbyCars.length > 0 && (
            <div className="rounded-xl bg-card p-4">
              <h3 className="font-mono text-sm font-semibold">
                {nearbyCars[0]?.personalized ? t("为你推荐") : t("附近车源")}
              </h3>
              <ul className="mt-1 space-y-0.5">
                {nearbyCars.slice(0, 3).map(({ car, distance }) => (
                  <li key={car.id}>
                    <Link
                      href={carLink(car.id)}
                      className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-muted/60"
                    >
                      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60">
                        {car.image_url && (
                          <img
                            src={car.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] text-foreground">
                          {carTitle(car, locale)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <span className="text-brand-ink">
                            {car.price > 0 ? formatPrice(car.price) : t("电议")}
                          </span>
                          {distance != null && <span>· {formatDistance(distance)}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>
      <Footer />
    </div>

    {/* 移动端搜索浮层:与详情浮层同一套图层模型(SwipeSheet 底部滑入、
        拖拽/系统返回可关),portal 到 body 避免手势冒泡进 PullToRefresh。
        feed 留在原地,关闭后滚动位置不变 */}
    {layerMounted &&
      mobileLayer &&
      createPortal(
        <AnimatePresence>
          {searchOpen && (
            <SwipeSheet
              key="community-search-layer"
              onClose={() => setSearchOpen(false)}
              zIndex={searchLayerZ}
              topBarExtra={
                <div className="mr-2 flex min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
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
                    placeholder={t("搜索帖子...")}
                    className="h-9 w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                  {keyword !== "" && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword("");
                        syncSearchUrl("");
                      }}
                      className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={t("清空关键词")}
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              }
            >
              <div className="mx-auto w-full max-w-2xl px-3 pb-12 pt-1">
                {typeChips}
                <div className="mt-4">
                  {searchSuggestPanel}
                  {searchResults}
                </div>
              </div>
            </SwipeSheet>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </PullToRefresh>
  );
}

function CarFeedCard({ car, distance, personalized }: { car: DbCar; distance?: number; personalized?: boolean }) {
  const { t, locale } = useI18n();
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
      /* 桌面 hover/点按反馈与帖子卡保持一致,避免两种卡片手感割裂 */
      className="block p-3 bg-card rounded-xl transition-colors hover:bg-muted/30 md:ring-1 md:ring-transparent md:hover:ring-border/70 md:active:bg-muted/50"
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
              {car.seller_name || t("卖家")}
            </span>
            <span className="shrink-0 text-muted-foreground">
              · {personalized ? t("为你推荐") : t("附近车源")}
            </span>
          </div>
          <h3 className="font-mono text-[15px] font-semibold leading-snug text-foreground">
            {carTitle(car, locale)}
          </h3>
          <p className="mt-0.5 font-mono text-[15px] leading-relaxed text-foreground">
            {car.price > 0 ? formatPrice(car.price) : t("电议")}
          </p>
          <div className="relative mt-2.5 overflow-hidden rounded-2xl ring-1 ring-border/60">
            {car.image_url ? (
              <img
                src={car.image_url}
                alt={carTitle(car, locale)}
                className="aspect-video w-full bg-muted object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-muted">
                <span className="font-mono text-[10px] text-muted-foreground">{t("暂无图片")}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1 font-mono text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{car.location_zh}</span>
            {distance != null && (
              <span className="ml-auto shrink-0 text-brand-ink">{formatDistance(distance)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
