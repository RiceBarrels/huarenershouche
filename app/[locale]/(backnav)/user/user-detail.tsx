"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "@/components/localized-navigation";
import { skipNextTransition } from "@/components/page-transition";
import { useRouteParams } from "@/lib/use-route-params";
import dynamic from "next/dynamic";
import { Calendar, ExternalLink, MapPin, Star, Loader2, Navigation } from "lucide-react";
import Link from "@/components/localized-navigation";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useI18n } from "@/components/i18n-provider";

import { CarCard } from "@/components/car-card";
import { PostCard } from "@/components/post-card";
import { usePostTranslations, type PostI18nMap } from "@/hooks/use-post-translations";
import { DealerReviews } from "@/components/dealer-reviews";
import { ChatThread } from "@/components/chat-thread";
import { AvatarViewer } from "@/components/avatar-viewer";
import { ProfileBadges } from "@/components/profile-badges";
import { Button } from "@/components/ui/button";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { OpenInMaps } from "@/components/open-in-maps";
import type { DbCar, DbCommunityPost } from "@/lib/types";
import { MessageSquare } from "lucide-react";

// leaflet 不能 SSR,按需加载
const StoreMap = dynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false },
);

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
  const { t, locale } = useI18n();
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

  // 非中文界面:帖子批量 AI 翻译并合并回状态(缓存全站共享,见 use-post-translations)
  const mergeI18n = useCallback(
    (map: PostI18nMap) => {
      setPosts((prev) =>
        prev.map((p) =>
          map[p.id] ? { ...p, other_i18n: { ...(p.other_i18n ?? {}), [locale]: map[p.id] } } : p
        )
      );
    },
    [locale]
  );
  usePostTranslations(posts, locale, mergeI18n);

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
          // PostCard 需要作者信息(profiles)与翻译缓存(other_i18n,含在 * 中)
          .select("*, profiles!user_id(username, avatar_url)")
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
    ? new Date(profile.created_at).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
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
              {t("用户不存在")}
            </p>
            <Link
              href="/browse"
              className="mt-3 font-mono text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("返回浏览")}
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
                  aria-label={t("查看头像")}
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
                      aria-label={t("私信")}
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
                      {isFollowing ? t("已关注") : t("关注")}
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
                <div className="flex items-center gap-1.5">
                  {/* 桌面用户名升到 2xl,与更高的横幅/更大的头像比例匹配 */}
                  <h1 className="font-mono text-xl font-bold md:text-2xl">{profile.username}</h1>
                  <ProfileBadges
                    verifiedDealer={isClaimedSystem || profile.account_type === "dealer"}
                    system={profile.is_system}
                    className="h-5 w-5"
                  />
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
                    {t("{date} 加入", { date: memberSince })}
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
                    <b className="font-semibold text-foreground">{following}</b> {t("正在关注")}
                  </span>
                  <span>
                    <b className="font-semibold text-foreground">{followers}</b> {t("粉丝")}
                  </span>
                </div>

                {isUnclaimedSystem && (
                  <div className="mt-2 space-y-1">
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {t("本页车源由系统自动从该车行公开网站检索汇总，非车行本人发布，价格与状态以原站为准，无法私信")}
                    </p>
                    {sourceSite && (
                      <a
                        href={sourceSite.origin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                        {t("访问车行官网")} · {sourceSite.host}
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
                  { key: "cars", label: `${t("车源")} ${cars.length}` },
                  { key: "posts", label: `${t("帖子")} ${posts.length}` },
                  ...(profile.account_type === "dealer"
                    ? [{ key: "reviews", label: `${t("评价")}${avgRating ? ` ${avgRating.count}` : ""}` }]
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
                <h2 className="font-mono text-sm font-semibold">{t("门店地址")}</h2>
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
                    {t("使用地图打开")}
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
                  {t("暂无在售车辆")}
                </p>
              )
            )}

            {/* 帖子 tab:直接复用社区帖子卡片(含非中文界面 AI 翻译 + 显示原文切换);
                点赞在此为只读展示(不传 onLike) */}
            {tab === "posts" && (
              posts.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center font-mono text-xs text-muted-foreground">
                  {t("暂无帖子")}
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
              otherUsername={profile?.username || t("卖家")}
              onBack={() => setChatOpen(false)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
              {t("正在打开对话…")}
            </div>
          )}
        </div>
      </NonModalDrawer>
    </div>
  );
}
