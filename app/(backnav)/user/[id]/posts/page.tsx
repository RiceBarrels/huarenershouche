// 用户帖子列表 — /user/[id]/posts 独立动态路由(桌面 tab 直达链接)。
// server component:独立 SEO metadata + ItemList JSON-LD + 服务端预取资料。
// 静态导出(Capacitor)构建时 build:static 会替换为客户端兜底版本。

import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import type { DbCommunityPost } from "@/lib/types";
import UserProfilePage from "../../user-detail";

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

const getData = cache(
  async (
    id: string,
  ): Promise<{ profile: SellerProfile | null; posts: DbCommunityPost[] }> => {
    try {
      const [profileRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, location, account_type, is_system, claimed_by, banned, created_at",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("community_posts")
          .select("id, title, created_at, updated_at")
          .eq("user_id", id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      return {
        profile: (profileRes.data as SellerProfile | null) ?? null,
        posts: (postsRes.data as DbCommunityPost[]) || [],
      };
    } catch {
      return { profile: null, posts: [] };
    }
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { profile, posts } = await getData(id);

  if (!profile || profile.banned) {
    return { title: "用户不存在", robots: { index: false, follow: false } };
  }

  const title = `${profile.username} 的帖子 (${posts.length})`;
  const highlights = posts.slice(0, 3).map((p) => p.title).join("、");
  const description =
    `${profile.username} 在常來車網社区发布的 ${posts.length} 篇帖子` +
    (highlights ? `:${highlights}${posts.length > 3 ? " 等" : ""}` : "") +
    "。北美华人二手车社区,车评、晒车、用车讨论。";

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: `/user/${profile.id}/posts` },
    openGraph: {
      type: "profile",
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/user/${profile.id}/posts`,
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
  const { profile, posts } = await getData(id);

  // 帖子清单结构化数据,内链到各帖详情页
  const jsonLd =
    profile && !profile.banned && posts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${profile.username} 的帖子`,
          numberOfItems: posts.length,
          itemListElement: posts.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/community/${p.id}`,
            name: p.title,
          })),
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
      <UserProfilePage userId={id} initialTab="posts" />
    </>
  );
}
