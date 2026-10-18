// 车行评价 — /user/[id]/reviews 独立动态路由(桌面 tab 直达链接)。
// server component:独立 SEO metadata + 服务端预取资料、评分与最新 20 条公开评价及其译文(B19),
// 直达用户主页的评价 tab;不存在或已封禁的用户 404。
// 静态导出(Capacitor)构建时 [id] 目录被 build:static 隐藏。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { localeAlternates, SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";
import { LOCALES, type Locale } from "@/lib/i18n";
import { isSiteLocale, ogLocale } from "@/lib/i18n/content-langs";
import { getBundles } from "@/lib/i18n/content/server";
import type { BundleMap } from "@/lib/i18n/content/types";
import { ogAlternates } from "@/lib/seo/alternates";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import type { DbDealerReview } from "@/lib/types";
import UserProfilePage, { type SellerProfile } from "../../user-detail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 与 user-detail 客户端拉取的资料列一致(注入后客户端不再重复拉取)
const PROFILE_COLUMNS =
  "id, username, avatar_url, location, account_type, is_system, claimed_by, languages, banned, created_at";
const REVIEW_SELECT = "*, profiles!dealer_reviews_user_id_profiles_fkey(username, avatar_url)";
// 首屏评价条数:DealerReviews 收到满一页时会在客户端补齐更早的,两边须一致
const REVIEW_LIMIT = 20;

type Rating = { avg: number; count: number };

interface ReviewsData {
  profile: SellerProfile | null;
  rating: Rating | null;
  reviews: DbDealerReview[];
  /** 评价在当前语言的译文 bundle(注入 ContentI18nProvider,SSR 直出译文) */
  rows: BundleMap;
}

/** 车行评分汇总(只算公开评价);status 列未建(迁移前)时退回全部评价 */
async function fetchRating(id: string): Promise<Rating | null> {
  const run = (activeOnly: boolean) => {
    let query = supabase.from("dealer_reviews").select("rating").eq("dealer_id", id);
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

/** 最新的公开评价(AI 审核屏蔽的不输出);status 列未建时退回不带过滤的旧查询 */
async function fetchReviews(id: string): Promise<DbDealerReview[]> {
  const run = (activeOnly: boolean) => {
    let query = supabase.from("dealer_reviews").select(REVIEW_SELECT).eq("dealer_id", id);
    if (activeOnly) query = query.eq("status", "active");
    return query.order("created_at", { ascending: false }).limit(REVIEW_LIMIT);
  };
  let res = await run(true);
  if (res.error && isMissingColumnError(res.error)) res = await run(false);
  return (res.data as DbDealerReview[] | null) ?? [];
}

const getData = cache(async (id: string, locale: Locale): Promise<ReviewsData> => {
  if (!UUID_RE.test(id)) return { profile: null, rating: null, reviews: [], rows: {} };
  const [profileRes, rating, reviews] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
    fetchRating(id),
    fetchReviews(id),
  ]);
  // 主体查询出错直接抛出(错误边界 500),不把暂时故障渲染成 404
  if (profileRes.error) throw new Error(`profiles(${id}): ${profileRes.error.message}`);
  return {
    profile: (profileRes.data as SellerProfile | null) ?? null,
    rating,
    reviews,
    rows: await getBundles("dealer_review", reviews.map((r) => r.id), locale),
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isSiteLocale(rawLocale) ? rawLocale : notFound();
  const t = serverT(locale);
  const { profile, rating } = await getData(id, locale);

  if (!profile || profile.banned) {
    return { title: t("用户不存在"), robots: { index: false, follow: false } };
  }

  const title =
    locale === "zh"
      ? `${profile.username} 的评价${rating ? ` - ${rating.avg.toFixed(1)} 分 (${rating.count} 条)` : ""}`
      : t("{name} 的评价", { name: profile.username }) +
        (rating ? ` - ${rating.avg.toFixed(1)}/5 (${rating.count})` : "");
  const description =
    locale === "zh"
      ? `${profile.username} 在常來車網的买家评价${
          rating ? `,综合评分 ${rating.avg.toFixed(1)}/5,共 ${rating.count} 条` : ""
        }。北美华人二手车买卖,真实交易评价。`
      : t("{name} 在 {site} 的买家评价", { name: profile.username, site: t("常來車網") }) +
        (rating
          ? `. ${t("综合评分 {avg}/5,共 {n} 条", { avg: rating.avg.toFixed(1), n: rating.count })}`
          : "");

  return {
    title,
    description: description.slice(0, 160),
    alternates: localeAlternates(locale, `/user/${profile.id}/reviews`),
    openGraph: {
      type: "profile",
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/${locale}/user/${profile.id}/reviews`,
      siteName: t(SITE_NAME),
      locale: ogLocale(locale),
      alternateLocale: ogAlternates(locale, LOCALES),
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url, alt: profile.username }],
      }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = isSiteLocale(rawLocale) ? rawLocale : notFound();
  const { profile, rating, reviews, rows } = await getData(id, locale);
  if (!profile || profile.banned) notFound();

  return (
    <ContentI18nProvider locale={locale} rows={{ dealer_review: rows }}>
      <UserProfilePage
        userId={profile.id}
        initialTab="reviews"
        initialProfile={profile}
        initialRating={rating}
        initialReviews={reviews}
      />
    </ContentI18nProvider>
  );
}
