// 车行评价 — /user/[id]/reviews 独立动态路由(桌面 tab 直达链接)。
// server component:独立 SEO metadata,直达用户主页的评价 tab。
// 静态导出(Capacitor)构建时 build:static 会替换为客户端兜底版本。

import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import UserProfilePage from "../../user-detail";

const getData = cache(async (id: string) => {
  try {
    const [profileRes, reviewsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_url, banned")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("dealer_reviews").select("rating").eq("dealer_id", id),
    ]);
    const reviews = (reviewsRes.data as { rating: number }[]) || [];
    return {
      profile: profileRes.data as {
        id: string;
        username: string;
        avatar_url: string | null;
        banned: boolean;
      } | null,
      rating:
        reviews.length > 0
          ? {
              avg: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
              count: reviews.length,
            }
          : null,
    };
  } catch {
    return { profile: null, rating: null };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { profile, rating } = await getData(id);

  if (!profile || profile.banned) {
    return { title: "用户不存在", robots: { index: false, follow: false } };
  }

  const title = `${profile.username} 的评价${rating ? ` - ${rating.avg.toFixed(1)} 分 (${rating.count} 条)` : ""}`;
  const description = `${profile.username} 在常來車網的买家评价${
    rating ? `,综合评分 ${rating.avg.toFixed(1)}/5,共 ${rating.count} 条` : ""
  }。北美华人二手车买卖,真实交易评价。`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: `/user/${profile.id}/reviews` },
    openGraph: {
      type: "profile",
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/user/${profile.id}/reviews`,
      siteName: SITE_NAME,
      ...(profile.avatar_url && {
        images: [{ url: profile.avatar_url, alt: profile.username }],
      }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserProfilePage userId={id} initialTab="reviews" />;
}
