"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { skipNextTransition } from "@/components/page-transition";
import { useRouteParams } from "@/lib/use-route-params";
import dynamic from "next/dynamic";
import { Calendar, Car, ExternalLink, Globe, MapPin, Store, Star, Loader2, Navigation } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { timeAgo } from "@/lib/format";
import { communityPostLink } from "@/lib/static-link";
import { Header } from "@/components/header";
import { DesktopBack } from "@/components/desktop-back";
import { Footer } from "@/components/footer";

import { CarCard } from "@/components/car-card";
import { DealerReviews } from "@/components/dealer-reviews";
import { ChatThread } from "@/components/chat-thread";
import { AvatarViewer } from "@/components/avatar-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { OpenInMaps } from "@/components/open-in-maps";
import type { DbCar, DbCommunityPost } from "@/lib/types";
import { Heart, MessageSquare, Play } from "lucide-react";

// leaflet 不能 SSR,按需加载
const StoreMap = dynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false },
);

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

interface SellerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  account_type: "private" | "dealer";
  is_system: boolean;
  claimed_by?: string | null;
  created_at: string;
}

export default function UserProfilePage({
  userId: userIdProp,
  embedded = false,
  onClose,
  initialProfile = null,
  initialCars,
  initialRating = null,
  initialTab = "cars",
}: {
  userId?: string;
  embedded?: boolean;
  onClose?: () => void;
  // 服务端预取(/user/[id] server component 注入),SSR 首屏直出内容利于 SEO
  initialProfile?: SellerProfile | null;
  initialCars?: DbCar[];
  initialRating?: { avg: number; count: number } | null;
  // 直达 tab(/user/[id]/posts 等动态路由注入)
  initialTab?: "cars" | "posts" | "reviews";
} = {}) {
  const params = useRouteParams<{ id: string }>();
  const userId = userIdProp ?? (params.id as string);
  const showChrome = !embedded;
  const [profile, setProfile] = useState<SellerProfile | null>(initialProfile);
  const [cars, setCars] = useState<DbCar[]>(initialCars ?? []);
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [loading, setLoading] = useState(!initialProfile);
  const [avgRating, setAvgRating] = useState<{ avg: number; count: number } | null>(initialRating);
  const [store, setStore] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
  // 私信:真实登录用户;移动端在 drawer 里直接聊
  const [authId, setAuthId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  // 关注:计数 + 我是否已关注(follows 表,见 supabase/follows.sql)
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [tab, setTab] = useState<"cars" | "posts" | "reviews">(initialTab);

  // 切 tab:内容用原生 View Transition 交叉淡入,URL 同步成对应动态链接
  // (/user/[id]/posts 等)。replaceState 是浅更新,必须先 skipNextTransition()
  // 告知 PageTransition 跳过转场——否则组件被重挂载、tab 状态被重置(要点两次的 bug)。
  // 浮层/静态导出模式(路径不是 /user/ 开头)不动 URL
  function switchTab(t: "cars" | "posts" | "reviews") {
    if (t === tab) return;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (doc.startViewTransition) {
      doc.startViewTransition(() => flushSync(() => setTab(t)));
    } else {
      setTab(t);
    }
    if (window.location.pathname.startsWith("/user/")) {
      skipNextTransition();
      const base = `/user/${userId}`;
      window.history.replaceState(null, "", t === "cars" ? base : `${base}/${t}`);
    }
  }
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthId(data.user?.id ?? null));
  }, []);

  // 关注/粉丝数(表未建或查询失败时静默为 0)
  useEffect(() => {
    async function loadFollowCounts() {
      const [fans, fol] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      setFollowers(fans.count || 0);
      setFollowing(fol.count || 0);
    }
    loadFollowCounts();
  }, [userId]);

  // 我是否已关注该用户
  useEffect(() => {
    if (!authId || authId === userId) return;
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", authId)
      .eq("followee_id", userId)
      .then(({ count }) => setIsFollowing((count || 0) > 0));
  }, [authId, userId]);

  // 关注/取关:乐观更新,失败回滚
  async function toggleFollow() {
    if (!authId) {
      router.push("/login");
      return;
    }
    if (followBusy || authId === userId) return;
    setFollowBusy(true);
    if (isFollowing) {
      setIsFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", authId)
        .eq("followee_id", userId);
      if (error) {
        setIsFollowing(true);
        setFollowers((n) => n + 1);
      }
    } else {
      setIsFollowing(true);
      setFollowers((n) => n + 1);
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: authId, followee_id: userId });
      if (error) {
        setIsFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
      }
    }
    setFollowBusy(false);
  }

  useEffect(() => {
    async function fetchData() {
      const [profileRes, carsRes, reviewsRes, postsRes, storeRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, location, account_type, is_system, claimed_by, created_at")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("cars")
          .select("*")
          .eq("seller_id", userId)
          .eq("status", "active")
          .eq("owner_hidden", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("dealer_reviews")
          .select("rating")
          .eq("dealer_id", userId),
        supabase
          .from("community_posts")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("dealer_stores")
          .select("address, lat, lng")
          .eq("owner_id", userId)
          .limit(1)
          .maybeSingle(),
      ]);
      setProfile(profileRes.data as SellerProfile | null);
      setCars((carsRes.data as DbCar[]) || []);
      setPosts((postsRes.data as DbCommunityPost[]) || []);
      setStore(
        (storeRes.data as { address: string; lat: number | null; lng: number | null } | null)?.address
          ? (storeRes.data as { address: string; lat: number | null; lng: number | null })
          : null,
      );

      const reviewData = (reviewsRes.data as { rating: number }[]) || [];
      if (reviewData.length > 0) {
        const sum = reviewData.reduce((s, r) => s + r.rating, 0);
        setAvgRating({ avg: sum / reviewData.length, count: reviewData.length });
      }

      setLoading(false);
    }
    fetchData();
  }, [userId]);

  // 已被真实用户认领的系统账号 → 视为认证车行
  const isClaimedSystem = !!profile?.is_system && !!profile?.claimed_by;
  const isUnclaimedSystem = !!profile?.is_system && !profile?.claimed_by;

  // 系统检索账号:从其车源的 source_url 推导原始车行网站(listing_sources 表仅管理员可读)
  const sourceSite = (() => {
    if (!isUnclaimedSystem) return null;
    const u = cars.find((c) => c.source_url)?.source_url;
    if (!u) return null;
    try {
      const url = new URL(u);
      return { origin: url.origin, host: url.hostname.replace(/^www\./, "") };
    } catch {
      return null;
    }
  })();

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
      })
    : "";

  // 可私信:已登录、不是本人、且不是未认领的系统账号(没人收消息)
  const canMessage = authId !== userId && !isUnclaimedSystem;

  async function startChat() {
    if (!authId) {
      router.push("/login");
      return;
    }
    // 手机:先开 drawer 立即反馈,会话在后台确保存在
    // (否则首次点击要等 1-2 个网络往返 drawer 才出现)
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) setChatOpen(true);
    setChatLoading(true);
    // 双向查任一已有会话(最近活跃优先)
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(buyer_id.eq.${authId},seller_id.eq.${userId}),and(buyer_id.eq.${userId},seller_id.eq.${authId})`,
      )
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let convId = existing?.id as string | undefined;
    if (!convId) {
      // 会话必须挂在某辆车上,用该卖家最新在售车
      const carId = cars[0]?.id;
      if (!carId) {
        setChatLoading(false);
        if (mobile) setChatOpen(false);
        router.push(`/messages/${userId}`);
        return;
      }
      const { data: created } = await supabase
        .from("conversations")
        .insert({ car_id: carId, buyer_id: authId, seller_id: userId })
        .select("id")
        .single();
      convId = created?.id;
    }
    setChatLoading(false);
    if (mobile && convId) {
      // 手机:drawer 里直接聊
      setChatConvId(convId);
    } else {
      if (mobile) setChatOpen(false);
      router.push(`/messages/${userId}`);
    }
  }

  return (
    <div className={embedded ? "flex flex-col font-mono" : "flex min-h-screen flex-col font-mono"}>

      {showChrome && <Header />}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 min-h-screen">
        {showChrome && <DesktopBack fallback="/" />}
        {loading ? (
          <div className="mt-4">
            <div className="flex items-start gap-4 border-b border-border pb-6">
              <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              {/* 骨架列数与真实车源网格(sm:grid-cols-2)一致,避免加载完成时跳列 */}
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="overflow-hidden rounded-xl bg-card">
                    <Skeleton className="aspect-[16/10] w-full" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !profile ? (
          <div className="flex flex-col items-center py-20">
            <p className="font-mono text-sm text-muted-foreground">
              用户不存在
            </p>
            <Link
              href="/browse"
              className="mt-3 font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              返回浏览
            </Link>
          </div>
        ) : (
          <>
            {/* X 式主页头部:横幅 + 压在横幅上的大头像 + 右侧操作按钮 */}
            <div>
              <div className="h-28 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent md:h-36" />
              <div className="flex items-end justify-between px-1">
                <button
                  type="button"
                  onClick={() => setAvatarViewOpen(true)}
                  className="-mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted ring-4 ring-background md:-mt-12 md:h-24 md:w-24"
                  aria-label="查看头像"
                >
                  <img
                    src={avatarUrl(profile.avatar_url, profile.username)}
                    alt={profile.username}
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="flex items-center gap-2 pt-3">
                  {canMessage && (
                    <button
                      type="button"
                      onClick={startChat}
                      disabled={chatLoading}
                      aria-label="私信"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors hover:bg-muted active:bg-muted"
                    >
                      {chatLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  )}
                  {authId !== userId && (
                    <button
                      type="button"
                      onClick={toggleFollow}
                      disabled={followBusy}
                      className={`h-9 rounded-full px-5 font-mono text-sm font-medium transition-colors ${
                        isFollowing
                          ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          : "bg-foreground text-background hover:opacity-90"
                      }`}
                    >
                      {isFollowing ? "已关注" : "关注"}
                    </button>
                  )}
                </div>
              </div>
              {/* 头像放大查看:可保存;自己的主页可跳设置页更换 */}
              <AvatarViewer
                src={avatarUrl(profile.avatar_url, profile.username)}
                alt={profile.username}
                open={avatarViewOpen}
                onClose={() => setAvatarViewOpen(false)}
                onEdit={
                  authId === userId
                    ? () => router.push("/account/settings/profile")
                    : undefined
                }
              />

              <div className="mt-3 px-1">
                <div className="flex items-center gap-2">
                  {/* 桌面用户名升到 2xl,与更高的横幅/更大的头像比例匹配 */}
                  <h1 className="font-mono text-xl font-bold md:text-2xl">{profile.username}</h1>
                  {isUnclaimedSystem ? (
                    <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                      <Globe className="h-3 w-3" strokeWidth={1.5} />
                      系统检索
                    </Badge>
                  ) : isClaimedSystem || profile.account_type === "dealer" ? (
                    <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                      <Store className="h-3 w-3" strokeWidth={1.5} />
                      认证车行
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                  {profile.account_type === "dealer" && avgRating && (
                    <span className="flex items-center gap-1 font-mono text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                      {avgRating.avg.toFixed(1)} ({avgRating.count})
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono text-xs">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {memberSince} 加入
                  </span>
                  {profile.location && (
                    <span className="flex items-center gap-1 font-mono text-xs">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {profile.location}
                    </span>
                  )}
                </div>

                {/* 关注统计:X 式「N 正在关注 · N 粉丝」 */}
                <div className="mt-2 flex items-center gap-4 font-mono text-xs text-muted-foreground">
                  <span>
                    <b className="font-semibold text-foreground">{following}</b> 正在关注
                  </span>
                  <span>
                    <b className="font-semibold text-foreground">{followers}</b> 粉丝
                  </span>
                </div>

                {isUnclaimedSystem && (
                  <div className="mt-2 space-y-1">
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      本页车源由系统自动从该车行公开网站检索汇总，非车行本人发布，价格与状态以原站为准，无法私信
                    </p>
                    {sourceSite && (
                      <a
                        href={sourceSite.origin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        访问车行官网 · {sourceSite.host}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* X 式 tab 栏:车源 / 帖子 / 评价(车行) */}
            <div className="mt-5 flex border-b border-border">
              {(
                [
                  { key: "cars", label: `车源 ${cars.length}` },
                  { key: "posts", label: `帖子 ${posts.length}` },
                  ...(profile.account_type === "dealer"
                    ? [{ key: "reviews", label: `评价${avgRating ? ` ${avgRating.count}` : ""}` }]
                    : []),
                ] as { key: "cars" | "posts" | "reviews"; label: string }[]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={`relative flex-1 py-3 font-mono text-sm transition-colors ${
                    tab === t.key
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {tab === t.key && (
                    <span className="absolute inset-x-0 bottom-0 mx-auto h-[3px] w-10 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* 门店地址:OpenStreetMap 地图 + 一键导航(车源 tab 内) */}
            {tab === "cars" && store?.address && (
              <div className="mt-4 rounded-xl bg-card p-4">
                <h2 className="font-mono text-sm font-semibold">门店地址</h2>
                <p className="mt-1.5 flex items-start gap-1.5 font-mono text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {store.address}
                </p>
                {store.lat != null && store.lng != null && (
                  <div className="mt-3">
                    <StoreMap
                      markers={[
                        {
                          lat: store.lat,
                          lng: store.lng,
                          name: profile.username,
                          address: store.address,
                        },
                      ]}
                      className="h-52 w-full overflow-hidden rounded-xl bg-muted"
                    />
                  </div>
                )}
                <OpenInMaps
                  target={{
                    address: store.address,
                    lat: store.lat,
                    lng: store.lng,
                    name: profile.username,
                  }}
                >
                  <Button
                    variant="secondary"
                    className="mt-3 w-full gap-1.5 font-mono text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
                    使用地图打开
                  </Button>
                </OpenInMaps>
              </div>
            )}

            {/* 车源 tab */}
            {tab === "cars" && (
              cars.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {cars.map((car) => (
                    <CarCard key={car.id} car={car} />
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center font-mono text-xs text-muted-foreground">
                  暂无在售车辆
                </p>
              )
            )}

            {/* 帖子 tab:X 式圆角卡片列表 */}
            {tab === "posts" && (
              posts.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {posts.map((post) => {
                    const cover = post.images?.[0];
                    return (
                      <Link
                        key={post.id}
                        href={communityPostLink(post.id)}
                        /* 桌面:补齐水平内边距(px-1 在卡片底色下左右几乎贴边),
                           并加与社区 feed 卡一致的 hover 描边/点按反馈 */
                        className="flex gap-3 px-1 py-3.5 bg-card rounded-xl transition-colors hover:bg-muted/30 md:px-3 md:ring-1 md:ring-transparent md:hover:ring-border/70 md:active:bg-muted/50"
                      >
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                          <img
                            src={avatarUrl(profile.avatar_url, profile.username)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 font-mono text-[13px]">
                            <span className="min-w-0 truncate font-semibold text-foreground">
                              {profile.username}
                            </span>
                            <span className="shrink-0 text-muted-foreground/60">
                              · {timeAgo(post.created_at)}
                            </span>
                          </div>
                          {post.title && (
                            <p className="mt-0.5 font-mono text-[15px] font-medium leading-snug">
                              {post.title}
                            </p>
                          )}
                          {post.content && (
                            <p className="mt-0.5 line-clamp-3 whitespace-pre-line font-mono text-sm leading-relaxed text-muted-foreground">
                              {post.content}
                            </p>
                          )}
                          {cover && (
                            <div className="relative mt-2.5 overflow-hidden rounded-xl bg-muted">
                              {VIDEO_RE.test(cover) ? (
                                <>
                                  <video
                                    src={cover}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="max-h-[420px] w-full object-cover"
                                  />
                                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                                      <Play className="ml-0.5 h-4 w-4 fill-white text-white" strokeWidth={1.5} />
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <img
                                  src={cover}
                                  alt=""
                                  className="max-h-[420px] w-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          )}
                          <div className="mt-2.5 flex items-center gap-12 text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-mono text-xs">
                              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                              {post.comments_count || 0}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-xs">
                              <Heart className="h-4 w-4" strokeWidth={1.5} />
                              {post.likes_count || 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="py-12 text-center font-mono text-xs text-muted-foreground">
                  暂无帖子
                </p>
              )
            )}

            {/* 评价 tab(车行) */}
            {tab === "reviews" && profile.account_type === "dealer" && (
              <DealerReviews dealerId={userId} />
            )}
          </>
        )}
      </main>
      {showChrome && <Footer />}

      {/* 手机端:与卖家的对话直接在 drawer 里进行 */}
      <NonModalDrawer open={chatOpen} onOpenChange={setChatOpen}>
        <div className="flex h-[70dvh] flex-col overflow-hidden">
          {chatConvId && authId ? (
            <ChatThread
              conversationId={chatConvId}
              currentUserId={authId}
              otherUsername={profile?.username || "卖家"}
              onBack={() => setChatOpen(false)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
              正在打开对话…
            </div>
          )}
        </div>
      </NonModalDrawer>
    </div>
  );
}
