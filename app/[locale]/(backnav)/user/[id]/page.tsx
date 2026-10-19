// 用户/车行主页 — server component:每个卖家独立 SEO metadata + ProfilePage / ItemList JSON-LD + 服务端预取
// (≤ 48 辆在售车卡片 + 最新 12 篇帖子及其当前语言译文,B19);不存在或已封禁的用户 404。
// 静态导出(Capacitor)构建时 [id] 目录被 build:static 隐藏,原生端走 /user?id= 客户端页,
// 客户端组件 user-detail 在无 initialProfile 时仍会自行拉取数据。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError, queryWithColumnFallback } from "@/lib/supabase-compat";
import { localeAlternates, SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";
import { carTitle, isZhLocale, LOCALES, type Locale } from "@/lib/i18n";
import { isSiteLocale, ogLocale } from "@/lib/i18n/content-langs";
import {
  CAR_PROFILE_EMBED,
  CAR_SSR_CARD_COLUMN_SETS,
  LEGACY_POST_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
} from "@/lib/i18n/content/columns";
import { getBundles } from "@/lib/i18n/content/server";
import type { BundleMap } from "@/lib/i18n/content/types";
import { ogAlternates } from "@/lib/seo/alternates";
import { JsonLd } from "@/lib/seo/jsonld";
import { itemListJsonLd, profilePageJsonLd } from "@/lib/seo/structured-data";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import type { DbCar, DbCommunityPost } from "@/lib/types";
import UserProfilePage, { type SellerProfile } from "../user-detail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 与 user-detail 客户端拉取的资料列一致(注入后客户端不再重复拉取)
const PROFILE_COLUMNS =
  "id, username, avatar_url, location, account_type, is_system, claimed_by, languages, banned, created_at";
// 首屏车源条数:user-detail 收到满一页时会在客户端补齐其余,两边须一致
const CAR_LIMIT = 48;

type Rating = { avg: number; count: number };

interface SellerData {
  profile: SellerProfile | null;
  cars: DbCar[];
  /** 在售总数(cars 只取首屏 CAR_LIMIT 辆) */
  carCount: number;
  rating: Rating | null;
  posts: DbCommunityPost[];
  /** 帖子在当前语言的译文 bundle(注入 ContentI18nProvider,SSR 直出译文) */
  postRows: BundleMap;
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

/** 最新 12 篇公开帖子(PostCard 需要作者信息);新列未建时退回旧列集 */
async function fetchPosts(id: string): Promise<DbCommunityPost[]> {
  const run = (columns: string) =>
    supabase
      .from("community_posts")
      .select(`${columns}, ${POST_AUTHOR_EMBED}`)
      .eq("user_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);
  let res = await run(POST_COLUMNS);
  if (res.error && isMissingColumnError(res.error)) res = await run(LEGACY_POST_COLUMNS);
  return (res.data as DbCommunityPost[] | null) ?? [];
}

const getSeller = cache(async (id: string, locale: Locale): Promise<SellerData> => {
  if (!UUID_RE.test(id)) {
    return { profile: null, cars: [], carCount: 0, rating: null, posts: [], postRows: {} };
  }
  const [profileRes, carsRes, rating, posts] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
    // 卡片列(不含 phone,电话不进 SSR HTML / RSC 负载)+ 卖家资料 embed;count 给出在售总数。
    // car-currency.sql 未执行时退回不带币种 / 里程单位的列集
    queryWithColumnFallback(
      (cols) =>
        supabase
          .from("cars")
          .select(`${cols}, ${CAR_PROFILE_EMBED}`, { count: "exact" })
          .eq("seller_id", id)
          .eq("status", "active")
          .eq("owner_hidden", false)
          .order("created_at", { ascending: false })
          .limit(CAR_LIMIT),
      CAR_SSR_CARD_COLUMN_SETS
    ),
    fetchRating(id),
    fetchPosts(id),
  ]);
  // 主体查询出错直接抛出(错误边界 500),不把暂时故障渲染成 404
  if (profileRes.error) throw new Error(`profiles(${id}): ${profileRes.error.message}`);
  const cars = (carsRes.data as unknown as DbCar[] | null) ?? [];
  return {
    profile: (profileRes.data as SellerProfile | null) ?? null,
    cars,
    carCount: carsRes.count ?? cars.length,
    rating,
    posts,
    postRows: await getBundles("post", posts.map((p) => p.id), locale),
  };
});

function isDealer(p: SellerProfile): boolean {
  return p.account_type === "dealer" || p.is_system;
}

/** 面向搜索/分享的一句话描述:身份 + 在售车亮点(carCount 为在售总数)+ 地区。 */
function buildDescription(p: SellerProfile, cars: DbCar[], carCount: number, locale: string): string {
  if (!isZhLocale(locale)) {
    const t = serverT(locale);
    const parts: string[] = [
      t(isDealer(p) ? "{name} · {site} 车行" : "{name} · {site} 个人卖家", {
        name: p.username,
        site: t("常來車網"),
      }),
    ];
    if (cars.length > 0) {
      const highlights = cars
        .slice(0, 3)
        .map((c) => `${c.year} ${c.make} ${c.model}`)
        .join(", ");
      parts.push(t("在售 {n} 辆二手车:{list}", { n: carCount, list: highlights }));
    }
    if (p.location) parts.push(p.location);
    return parts.join(". ").slice(0, 160);
  }
  const who = isDealer(p) ? "车行" : "个人卖家";
  const parts: string[] = [`${p.username} · 常來車網${who}`];
  if (cars.length > 0) {
    const highlights = cars
      .slice(0, 3)
      .map((c) => `${c.year} ${c.make} ${c.model}`)
      .join("、");
    parts.push(`在售 ${carCount} 辆二手车:${highlights}${carCount > 3 ? " 等" : ""}`);
  }
  if (p.location) parts.push(p.location);
  parts.push("北美华人二手车买卖,中文沟通更放心");
  return parts.join("。").slice(0, 160);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isSiteLocale(rawLocale) ? rawLocale : notFound();
  const t = serverT(locale);
  const { profile, cars, carCount } = await getSeller(id, locale);

  if (!profile || profile.banned) {
    return { title: t("用户不存在"), robots: { index: false, follow: false } };
  }

  const who = isDealer(profile) ? "车行主页" : "个人主页";
  const carLabel = carCount > 0 ? ` - 在售${carCount}辆二手车` : "";
  const title =
    isZhLocale(locale)
      ? `${profile.username} 的${who}${carLabel}${profile.location ? ` - ${profile.location}` : ""}`
      : [
          t(isDealer(profile) ? "{name} 的车行主页" : "{name} 的个人主页", { name: profile.username }),
          carCount > 0 && t("在售 {n} 辆二手车", { n: carCount }),
          profile.location,
        ]
          .filter(Boolean)
          .join(" - ");
  const description = buildDescription(profile, cars, carCount, locale);
  const url = `${SITE_URL}/${locale}/user/${profile.id}`;
  const image = profile.avatar_url || cars.find((c) => c.image_url)?.image_url || null;

  return {
    title,
    description,
    keywords: [
      profile.username,
      isZhLocale(locale) ? (isDealer(profile) ? "华人车行" : "华人卖车") : t("二手车"),
      profile.location,
      ...cars.slice(0, 5).map((c) => `${c.make} ${c.model}`),
      ...(isZhLocale(locale) ? ["北美华人二手车", "二手车"] : [t("常來車網")]),
    ].filter(Boolean) as string[],
    // 主页在 6 种语言下都完整可用(界面文案本地化,无待翻译正文):全部 hreflang
    alternates: localeAlternates(locale, `/user/${profile.id}`),
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      siteName: t(SITE_NAME),
      locale: ogLocale(locale),
      alternateLocale: ogAlternates(locale, LOCALES),
      ...(image && { images: [{ url: image, alt: profile.username }] }),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(image && { images: [image] }),
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
  const { profile, cars, rating, posts, postRows } = await getSeller(id, locale);
  if (!profile || profile.banned) notFound();

  const t = serverT(locale);
  const url = `${SITE_URL}/${locale}/user/${profile.id}`;

  return (
    <>
      {/* ProfilePage(Person / 车行 AutoDealer 带评分)+ 在售车 ItemList 做内链 */}
      <JsonLd data={profilePageJsonLd({ profile, locale, url, rating })} />
      {cars.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: t("{name} 的在售车源", { name: profile.username }),
            url,
            items: cars.map((c) => ({
              name: carTitle(c, locale),
              url: `${SITE_URL}/${locale}/car/${c.id}`,
            })),
          })}
        />
      )}
      <ContentI18nProvider locale={locale} rows={{ post: postRows }}>
        <UserProfilePage
          userId={profile.id}
          initialProfile={profile}
          initialCars={cars}
          initialRating={rating}
          initialPosts={posts}
        />
      </ContentI18nProvider>
    </>
  );
}
