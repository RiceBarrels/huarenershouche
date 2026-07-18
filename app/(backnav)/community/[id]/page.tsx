// 社区帖子详情 — server component:SEO metadata + JSON-LD + 服务端预取。
// 静态导出(Capacitor)构建时本文件会被 build:static 替换为 query-param 版本,
// 客户端组件 community-detail 在无 initialPost 时仍会自行拉取数据。

import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import type { DbCommunityPost } from "@/lib/types";
import CommunityDetail from "../community-detail";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const getPost = cache(async (id: string): Promise<DbCommunityPost | null> => {
  try {
    const { data } = await supabase
      .from("community_posts")
      .select("*, profiles!user_id(username, avatar_url)")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
    return (data as DbCommunityPost | null) ?? null;
  } catch {
    return null;
  }
});

async function getRelated(post: DbCommunityPost): Promise<DbCommunityPost[]> {
  const LIMIT = 8;
  const related: DbCommunityPost[] = [];
  const seen = new Set<string>([post.id]);
  try {
    // 优先同品牌
    if (post.make) {
      const { data } = await supabase
        .from("community_posts")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("status", "active")
        .eq("make", post.make)
        .neq("id", post.id)
        .order("likes_count", { ascending: false })
        .limit(LIMIT);
      for (const p of (data as DbCommunityPost[]) ?? []) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          related.push(p);
        }
      }
    }
    // 同类型补足
    if (related.length < LIMIT) {
      const { data } = await supabase
        .from("community_posts")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("status", "active")
        .eq("type", post.type)
        .neq("id", post.id)
        .order("created_at", { ascending: false })
        .limit(LIMIT + related.length);
      for (const p of (data as DbCommunityPost[]) ?? []) {
        if (related.length >= LIMIT) break;
        if (!seen.has(p.id)) {
          seen.add(p.id);
          related.push(p);
        }
      }
    }
  } catch {
    // 表不存在等场景:静默降级
  }
  return related;
}

function excerpt(content: string, len = 120): string {
  return content.replace(/\s+/g, " ").trim().slice(0, len);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return { title: "帖子不存在", robots: { index: false, follow: false } };
  }

  const description = excerpt(post.content);
  const cover = post.images?.find((u) => !VIDEO_RE.test(u));
  const url = `${SITE_URL}/community/${post.id}`;

  return {
    title: `${post.title} - ${TYPE_LABELS[post.type] || "社区"}`,
    description,
    keywords: [
      ...(post.tags || []),
      post.make,
      post.model,
      "北美华人",
      "二手车",
      "汽车社区",
    ].filter(Boolean) as string[],
    alternates: { canonical: `/community/${post.id}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      siteName: SITE_NAME,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      ...(cover && { images: [{ url: cover }] }),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(cover && { images: [cover] }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  const related = post ? await getRelated(post) : [];

  const jsonLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        "@id": `${SITE_URL}/community/${post.id}`,
        mainEntityOfPage: `${SITE_URL}/community/${post.id}`,
        headline: post.title,
        articleBody: excerpt(post.content, 500),
        ...(post.images?.filter((u) => !VIDEO_RE.test(u)).length && {
          image: post.images.filter((u) => !VIDEO_RE.test(u)),
        }),
        datePublished: post.created_at,
        dateModified: post.updated_at,
        author: {
          "@type": "Person",
          name: post.profiles?.username || "匿名用户",
          url: `${SITE_URL}/user/${post.user_id}`,
        },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: post.likes_count || 0,
          },
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/CommentAction",
            userInteractionCount: post.comments_count || 0,
          },
        ],
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
      <CommunityDetail initialPost={post} initialRelated={related} />
    </>
  );
}
