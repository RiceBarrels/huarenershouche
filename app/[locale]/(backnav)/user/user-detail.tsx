"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "@/components/localized-navigation";
import { skipNextTransition } from "@/components/page-transition";
import { useRouteParams } from "@/lib/use-route-params";
import dynamic from "next/dynamic";
import { Calendar, ExternalLink, MapPin, Star, Loader2, Navigation, Flag, Ban, Languages, Handshake, Clock } from "lucide-react";
import { languageList } from "@/components/language-picker";
import Link from "@/components/localized-navigation";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError, queryWithColumnFallback } from "@/lib/supabase-compat";
import { dateLocale } from "@/lib/i18n";
import {
  CAR_LIST_COLUMN_SETS,
  CAR_PROFILE_EMBED,
  LEGACY_POST_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
} from "@/lib/i18n/content/columns";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useI18n } from "@/components/i18n-provider";
import { useLocalizedPrefetch } from "@/hooks/use-localized";

import { CarCard } from "@/components/car-card";
import { PostCard } from "@/components/post-card";
import { DealerReviews } from "@/components/dealer-reviews";
import { ChatThread } from "@/components/chat-thread";
import { AvatarViewer } from "@/components/avatar-viewer";
import { ProfileBadges } from "@/components/profile-badges";
import { ReportDialog } from "@/components/report-dialog";
import { blockUser, unblockUser } from "@/lib/blocks";
import { Button } from "@/components/ui/button";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OpenInMaps } from "@/components/open-in-maps";
import type { DbCar, DbClaimRequest, DbCommunityPost, DbDealerReview } from "@/lib/types";
import { MessageSquare } from "lucide-react";

// leaflet 不能 SSR,按需加载
const StoreMap = dynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false },
);

// 主页资料列(/user/[id] 系列 server page 用同一组列预取后注入 initialProfile)
export interface SellerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  account_type: "private" | "dealer";
  is_system: boolean;
  claimed_by?: string | null;
  languages?: string[] | null;
  banned?: boolean;
  created_at: string;
}

type Rating = { avg: number; count: number };

// 首屏车源条数,须与 /user/[id] server page 的 limit 一致:注入满一页说明可能还有,挂载后补齐其余
const SSR_CAR_PAGE = 48;

/** 卖家在售车源(列表列含电话 + 卖家资料 embed,新→旧,从第 offset 辆起) */
async function fetchSellerCars(userId: string, offset: number): Promise<DbCar[]> {
  // car-currency.sql 未执行时退回不带币种 / 里程单位的列集(按 USD / mi 显示)
  const { data } = await queryWithColumnFallback(
    (cols) =>
      supabase
        .from("cars")
        .select(`${cols}, ${CAR_PROFILE_EMBED}`)
        .eq("seller_id", userId)
        .eq("status", "active")
        .eq("owner_hidden", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + 999),
    CAR_LIST_COLUMN_SETS
  );
  return (data as unknown as DbCar[] | null) ?? [];
}

/** 指定车源的电话(id → phone,无号码的不收);查询失败时为空,卡片照旧不显示拨号按钮 */
async function fetchCarPhones(ids: string[]): Promise<Map<string, string>> {
  const { data } = await supabase.from("cars").select("id, phone").in("id", ids);
  const phones = new Map<string, string>();
  for (const row of (data as Pick<DbCar, "id" | "phone">[] | null) ?? []) {
    if (row.phone) phones.set(row.id, row.phone);
  }
  return phones;
}

/** 最新 12 篇帖子(PostCard 需要作者信息);新列未建(迁移前)时退回旧列集 */
async function fetchUserPosts(userId: string): Promise<DbCommunityPost[]> {
  const run = (columns: string) =>
    supabase
      .from("community_posts")
      .select(`${columns}, ${POST_AUTHOR_EMBED}`)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);
  let res = await run(POST_COLUMNS);
  if (res.error && isMissingColumnError(res.error)) res = await run(LEGACY_POST_COLUMNS);
  return (res.data as DbCommunityPost[] | null) ?? [];
}

/** 车行评分汇总(只算公开评价);status 列未建(迁移前)时退回全部评价 */
async function fetchRating(userId: string): Promise<Rating | null> {
  const run = (activeOnly: boolean) => {
    let query = supabase.from("dealer_reviews").select("rating").eq("dealer_id", userId);
    if (activeOnly) query = query.eq("status", "active");
    return query;
  };
  let res = await run(true);
  if (res.error && isMissingColumnError(res.error)) res = await run(false);
  const rows = (res.data as { rating: number }[] | null) ?? [];
  return rows.length > 0
    ? { avg: rows.reduce((s, r) => s + r.rating, 0) / rows.length, count: rows.length }
    : null;
}

export default function UserProfilePage({
  userId: userIdProp,
  embedded = false,
  onClose,
  initialProfile = null,
  initialCars,
  initialRating,
  initialPosts,
  initialReviews,
  initialTab = "cars",
}: {
  userId?: string;
  embedded?: boolean;
  onClose?: () => void;
  // 服务端预取(/user/[id] 系列 server page 注入),SSR 首屏直出内容利于 SEO;
  // 注入了的数据客户端不再重复拉取(B19),未注入的(undefined)照常在客户端拉取
  initialProfile?: SellerProfile | null;
  initialCars?: DbCar[];
  initialRating?: Rating | null;
  initialPosts?: DbCommunityPost[];
  initialReviews?: DbDealerReview[];
  // 直达 tab(/user/[id]/posts 等动态路由注入)
  initialTab?: "cars" | "posts" | "reviews";
} = {}) {
  const { t, locale } = useI18n();
  const params = useRouteParams<{ id: string }>();
  const userId = userIdProp ?? (params.id as string);
  const showChrome = !embedded;
  const [profile, setProfile] = useState<SellerProfile | null>(initialProfile);
  const [cars, setCars] = useState<DbCar[]>(initialCars ?? []);
  const [posts, setPosts] = useState<DbCommunityPost[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(!initialProfile);
  const [avgRating, setAvgRating] = useState<Rating | null>(initialRating ?? null);
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
  // 屏蔽(拉黑):blocks 表,见 supabase/blocks.sql
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [tab, setTab] = useState<"cars" | "posts" | "reviews">(initialTab);
  // 自助认领系统账号:本人对该账号最近一条申请(claim_requests 表,见 supabase/claim-requests.sql)
  const [claimReq, setClaimReq] = useState<Pick<DbClaimRequest, "id" | "status" | "admin_note"> | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [claimContact, setClaimContact] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState("");

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

  // 帖子译文:PostCard 各自 useLocalized 读取;这里只在帖子 tab 可见时批量预取一次(B47)
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  useLocalizedPrefetch("post", postIds, { enabled: tab === "posts" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthId(data.user?.id ?? null));
  }, []);

  // 未认领系统账号:查本人是否已提交过认领申请(表未建时静默)
  useEffect(() => {
    if (!authId || !profile?.is_system || profile.claimed_by) return;
    let cancelled = false;
    supabase
      .from("claim_requests")
      .select("id, status, admin_note")
      .eq("system_id", userId)
      .eq("requester_id", authId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setClaimReq((data as Pick<DbClaimRequest, "id" | "status" | "admin_note">) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [authId, userId, profile?.is_system, profile?.claimed_by]);

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

  // 我是否已屏蔽该用户(表未建时静默)
  useEffect(() => {
    if (!authId || authId === userId) return;
    supabase
      .from("blocks")
      .select("*", { count: "exact", head: true })
      .eq("blocker_id", authId)
      .eq("blocked_id", userId)
      .then(({ count }) => setIsBlocked((count || 0) > 0))
      .then(undefined, () => {});
  }, [authId, userId]);

  // 屏蔽/取消屏蔽:乐观更新,失败回滚
  async function toggleBlock() {
    if (!authId) {
      router.push("/login");
      return;
    }
    if (blockBusy || authId === userId) return;
    setBlockBusy(true);
    if (isBlocked) {
      setIsBlocked(false);
      const { error } = await unblockUser(authId, userId);
      if (error) setIsBlocked(true);
    } else {
      setIsBlocked(true);
      const { error } = await blockUser(authId, userId);
      if (error) setIsBlocked(false);
    }
    setBlockBusy(false);
  }

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
    let cancelled = false;
    // SSR 注入的数据只对它所属的用户有效;浮层与静态导出(原生)没有注入,全部在客户端拉取
    const seeded = !!initialProfile && initialProfile.id === userId;
    const seededCars = seeded ? initialCars : undefined;
    // 车源:未注入从头拉;注入满一页时只补齐其余,注入不足一页说明已是全部(客户端拉取一律用含电话的列表列)
    const carOffset = !seededCars ? 0 : seededCars.length >= SSR_CAR_PAGE ? seededCars.length : null;
    // 注入的车卡不含电话(电话不进 SSR HTML / RSC 负载,B26):挂载后按 id 补拉,卡片恢复拨号按钮
    const phoneIds = seededCars?.map((c) => c.id) ?? [];
    async function fetchData() {
      const [profileRes, carRows, phones, rating, postRows, storeRes] = await Promise.all([
        seeded
          ? null
          : supabase
              .from("profiles")
              .select("id, username, avatar_url, location, account_type, is_system, claimed_by, languages, banned, created_at")
              .eq("id", userId)
              .maybeSingle(),
        carOffset === null ? null : fetchSellerCars(userId, carOffset),
        phoneIds.length > 0 ? fetchCarPhones(phoneIds) : null,
        seeded && initialRating !== undefined ? undefined : fetchRating(userId),
        seeded && initialPosts ? null : fetchUserPosts(userId),
        supabase
          .from("dealer_stores")
          .select("address, lat, lng")
          .eq("owner_id", userId)
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (profileRes) {
        const p = profileRes.data as SellerProfile | null;
        // 已封禁与不存在同等对待(与 server page 的 404 一致)
        setProfile(p && !p.banned ? p : null);
      }
      if (carRows) {
        setCars((prev) => {
          if (!carOffset) return carRows;
          const seen = new Set(prev.map((c) => c.id));
          return [...prev, ...carRows.filter((c) => !seen.has(c.id))];
        });
      }
      if (phones && phones.size > 0) {
        setCars((prev) =>
          prev.map((c) => {
            const phone = phones.get(c.id);
            return phone ? { ...c, phone } : c;
          }),
        );
      }
      if (rating !== undefined) setAvgRating(rating);
      if (postRows) setPosts(postRows);
      setStore(
        (storeRes.data as { address: string; lat: number | null; lng: number | null } | null)?.address
          ? (storeRes.data as { address: string; lat: number | null; lng: number | null })
          : null,
      );

      setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [userId, initialProfile, initialCars, initialRating, initialPosts]);

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

  // 加入年月按 UTC 取:服务端(UTC)与访客浏览器时区不同也输出同一文本,水合不会不一致
  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString(dateLocale(locale), {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";

  // 可私信:已登录、不是本人、且不是未认领的系统账号(没人收消息)
  const canMessage = authId !== userId && !isUnclaimedSystem;

  function openClaim() {
    if (!authId) {
      router.push("/login");
      return;
    }
    setClaimError("");
    setClaimOpen(true);
  }

  async function submitClaim() {
    if (!authId || claimBusy) return;
    setClaimBusy(true);
    setClaimError("");
    const { data, error } = await supabase.rpc("request_claim", {
      target: userId,
      note: claimMsg.trim() || null,
      contact_info: claimContact.trim() || null,
    });
    setClaimBusy(false);
    if (error) {
      setClaimError(error.message);
      return;
    }
    setClaimReq({ id: data as string, status: "pending", admin_note: null });
    setClaimMsg("");
    setClaimContact("");
    setClaimOpen(false);
  }

  async function withdrawClaim() {
    if (!claimReq || claimBusy) return;
    setClaimBusy(true);
    const { error } = await supabase.from("claim_requests").delete().eq("id", claimReq.id);
    setClaimBusy(false);
    if (!error) setClaimReq(null);
  }

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
                  {authId !== userId && (
                    <>
                      <ReportDialog targetType="user" targetId={userId}>
                        <button
                          type="button"
                          aria-label={t("举报此用户")}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-foreground transition-colors hover:bg-muted active:bg-muted"
                        >
                          <Flag className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </ReportDialog>
                      <button
                        type="button"
                        onClick={toggleBlock}
                        disabled={blockBusy}
                        aria-label={isBlocked ? t("取消屏蔽") : t("屏蔽用户")}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                          isBlocked
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted/60 text-foreground hover:bg-muted active:bg-muted"
                        }`}
                      >
                        <Ban className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </>
                  )}
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
                  {!!profile.languages?.length && (
                    <span className="flex items-center gap-1 font-mono text-xs">
                      <Languages className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {languageList(profile.languages)}
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
                    {/* 自助认领:任何登录用户都可申请,管理员审核后生效 */}
                    {authId !== userId && (
                      <div className="pt-1.5">
                        {claimReq?.status === "pending" ? (
                          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" strokeWidth={1.5} />
                              {t("认领申请审核中")}
                            </span>
                            <button
                              type="button"
                              onClick={withdrawClaim}
                              disabled={claimBusy}
                              className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                            >
                              {t("撤回申请")}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {claimReq?.status === "rejected" && (
                              <p className="font-mono text-[11px] text-destructive">
                                {t("认领申请未通过")}
                                {claimReq.admin_note ? `：${claimReq.admin_note}` : ""}
                              </p>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 gap-1.5 px-3 font-mono text-xs"
                              onClick={openClaim}
                            >
                              <Handshake className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {claimReq?.status === "rejected" ? t("重新申请认领") : t("我是该车行，申请认领")}
                            </Button>
                          </div>
                        )}
                      </div>
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

            {/* 帖子 tab:直接复用社区帖子卡片(卡片自带按界面语言显示译文 + 显示原文切换);
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
              <DealerReviews
                dealerId={userId}
                initialReviews={initialProfile && initialProfile.id === userId ? initialReviews : undefined}
              />
            )}
          </>
        )}
      </main>
      {showChrome && <Footer />}

      {/* 认领申请表单 */}
      <NonModalDrawer open={claimOpen} onOpenChange={setClaimOpen}>
        <div className="space-y-3 p-4 font-mono">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Handshake className="h-4 w-4" strokeWidth={1.5} />
            {t("认领此车行账号")}
          </h2>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("认领后可以车行身份管理本页车源、发布新车并接收买家私信。请说明您与该车行的关系及可核实的联系方式，管理员审核通过后生效。")}
          </p>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground" htmlFor="claim-contact">
              {t("联系方式（电话或邮箱）")}
            </label>
            <Input
              id="claim-contact"
              value={claimContact}
              onChange={(e) => setClaimContact(e.target.value)}
              placeholder={t("便于管理员核实身份")}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground" htmlFor="claim-message">
              {t("说明（可选）")}
            </label>
            <Textarea
              id="claim-message"
              value={claimMsg}
              onChange={(e) => setClaimMsg(e.target.value)}
              placeholder={t("例如：我是该车行的负责人 / 销售经理")}
              rows={3}
              className="text-sm"
            />
          </div>
          {claimError && <p className="text-[11px] text-destructive">{claimError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setClaimOpen(false)}>
              {t("取消")}
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              disabled={claimBusy || !claimContact.trim()}
              onClick={submitClaim}
            >
              {claimBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {t("提交申请")}
            </Button>
          </div>
        </div>
      </NonModalDrawer>

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
