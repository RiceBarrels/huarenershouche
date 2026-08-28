// 用户/车行主页 — server component:每个卖家独立 SEO metadata + Person/AutoDealer JSON-LD + 服务端预取。
// 静态导出(Capacitor)构建时 build:static 会用客户端兜底版本替换本文件,
// 客户端组件 user-detail 在无 initialProfile 时仍会自行拉取数据。

import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import { avatarUrl } from "@/lib/avatar";
import type { DbCar } from "@/lib/types";
import UserProfilePage from "../user-detail";

interface SellerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  account_type: "private" | "dealer";
  is_system: boolean;
  claimed_by: string | null;
  banned: boolean;
  created_at: string;
}

interface SellerData {
  profile: SellerProfile | null;
  cars: DbCar[];
  rating: { avg: number; count: number } | null;
}

const getSeller = cache(async (id: string): Promise<SellerData> => {
  try {
    const [profileRes, carsRes, reviewsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, avatar_url, location, account_type, is_system, claimed_by, banned, created_at",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("cars")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "active")
        .eq("owner_hidden", false)
        .order("created_at", { ascending: false }),
      supabase.from("dealer_reviews").select("rating").eq("dealer_id", id),
    ]);
    const reviews = (reviewsRes.data as { rating: number }[]) || [];
    return {
      profile: (profileRes.data as SellerProfile | null) ?? null,
      cars: (carsRes.data as DbCar[]) || [],
      rating:
        reviews.length > 0
          ? {
              avg: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
              count: reviews.length,
            }
          : null,
    };
  } catch {
    return { profile: null, cars: [], rating: null };
  }
});

function isDealer(p: SellerProfile): boolean {
  return p.account_type === "dealer" || p.is_system;
}

/** 面向搜索/分享的一句话描述:身份 + 在售车亮点 + 地区。 */
function buildDescription(p: SellerProfile, cars: DbCar[]): string {
  const who = isDealer(p) ? "车行" : "个人卖家";
  const parts: string[] = [`${p.username} · 常來車網${who}`];
  if (cars.length > 0) {
    const highlights = cars
      .slice(0, 3)
      .map((c) => `${c.year} ${c.make} ${c.model}`)
      .join("、");
    parts.push(`在售 ${cars.length} 辆二手车:${highlights}${cars.length > 3 ? " 等" : ""}`);
  }
  if (p.location) parts.push(p.location);
  parts.push("北美华人二手车买卖,中文沟通更放心");
  return parts.join("。").slice(0, 160);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { profile, cars } = await getSeller(id);

  if (!profile || profile.banned) {
    return { title: "用户不存在", robots: { index: false, follow: false } };
  }

  const who = isDealer(profile) ? "车行主页" : "个人主页";
  const carLabel = cars.length > 0 ? ` - 在售${cars.length}辆二手车` : "";
  const title = `${profile.username} 的${who}${carLabel}${profile.location ? ` - ${profile.location}` : ""}`;
  const description = buildDescription(profile, cars);
  const url = `${SITE_URL}/user/${profile.id}`;
  const image = profile.avatar_url || cars.find((c) => c.image_url)?.image_url || null;

  return {
    title,
    description,
    keywords: [
      profile.username,
      isDealer(profile) ? "华人车行" : "华人卖车",
      profile.location,
      ...cars.slice(0, 5).map((c) => `${c.make} ${c.model}`),
      "北美华人二手车",
      "二手车",
    ].filter(Boolean) as string[],
    alternates: { canonical: `/user/${profile.id}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      siteName: SITE_NAME,
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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, cars, rating } = await getSeller(id);

  // ProfilePage + Person/AutoDealer(车行带评分),附在售车 ItemList 做内链
  const jsonLd =
    profile && !profile.banned
      ? {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "@id": `${SITE_URL}/user/${profile.id}`,
          dateCreated: profile.created_at,
          mainEntity: {
            "@type": isDealer(profile) ? "AutoDealer" : "Person",
            "@id": `${SITE_URL}/user/${profile.id}#seller`,
            name: profile.username,
            url: `${SITE_URL}/user/${profile.id}`,
            image: avatarUrl(profile.avatar_url, profile.id),
            ...(profile.location && {
              address: { "@type": "PostalAddress", addressLocality: profile.location },
            }),
            ...(isDealer(profile) &&
              rating && {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: Number(rating.avg.toFixed(1)),
                  reviewCount: rating.count,
                  bestRating: 5,
                },
              }),
          },
          ...(cars.length > 0 && {
            hasPart: {
              "@type": "ItemList",
              name: `${profile.username} 的在售车源`,
              numberOfItems: cars.length,
              itemListElement: cars.slice(0, 30).map((c, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/car/${c.id}`,
                name: `${c.year} ${c.make} ${c.model}${c.trim ? " " + c.trim : ""}`,
              })),
            },
          }),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <UserProfilePage
        userId={id}
        initialProfile={profile}
        initialCars={cars}
        initialRating={rating}
      />
    </>
  );
}
