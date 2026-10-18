// 社区帖子详情 — server component:SEO metadata + JSON-LD + 服务端预取
// (帖子 + 8 篇相关 + 前 50 条可见评论,连同当前语言的译文 bundle)。
// 正文/metadata/JSON-LD 共用同一份 bundle 行(resolvePostView),译文没好时一律原文 + lang,
// canonical 指向原文语言版本;页面渲染不触发任何翻译。
// 静态导出(Capacitor)构建时 [id] 目录整体隐藏,原生端经浮层/客户端拉取渲染 community-detail。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n";
import { isSiteLocale, ogLocale } from "@/lib/i18n/content-langs";
import {
  LEGACY_POST_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
} from "@/lib/i18n/content/columns";
import {
  getBundle,
  getBundles,
  getPublicPost,
  getPublicPostComments,
} from "@/lib/i18n/content/server";
import { localize, resolvePostView } from "@/lib/i18n/content/resolve";
import { contentAlternates, ogAlternates } from "@/lib/seo/alternates";
import { JsonLd } from "@/lib/seo/jsonld";
import { breadcrumbJsonLd, postJsonLd } from "@/lib/seo/structured-data";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import type { DbCommunityPost } from "@/lib/types";
import CommunityDetail from "../community-detail";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const RELATED_LIMIT = 8;
// SSR 的评论条数(更多的由客户端补全);JSON-LD 只放前 10 条
const COMMENT_LIMIT = 50;
const LD_COMMENT_LIMIT = 10;

const POST_SELECT = `${POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;
const LEGACY_POST_SELECT = `${LEGACY_POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;

// 非法语言段由根 layout notFound();这里兜底为 zh
const toLocale = (value: string): Locale => (isSiteLocale(value) ? value : "zh");

async function getRelated(post: DbCommunityPost): Promise<DbCommunityPost[]> {
  const related: DbCommunityPost[] = [];
  const seen = new Set<string>([post.id]);
  const take = (rows: DbCommunityPost[]) => {
    for (const p of rows) {
      if (related.length >= RELATED_LIMIT) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        related.push(p);
      }
    }
  };
  try {
    // 优先同品牌
    const make = post.make;
    if (make) {
      const byMake = (cols: string) =>
        supabase
          .from("community_posts")
          .select(cols)
          .eq("status", "active")
          .eq("make", make)
          .neq("id", post.id)
          .order("likes_count", { ascending: false })
          .limit(RELATED_LIMIT);
      let res = await byMake(POST_SELECT);
      // 迁移 SQL 未执行时新列缺失:按旧列集重查
      if (res.error && isMissingColumnError(res.error)) res = await byMake(LEGACY_POST_SELECT);
      take((res.data as unknown as DbCommunityPost[] | null) ?? []);
    }
    // 同类型补足
    if (related.length < RELATED_LIMIT) {
      const byType = (cols: string) =>
        supabase
          .from("community_posts")
          .select(cols)
          .eq("status", "active")
          .eq("type", post.type)
          .neq("id", post.id)
          .order("created_at", { ascending: false })
          .limit(RELATED_LIMIT + related.length);
      let res = await byType(POST_SELECT);
      if (res.error && isMissingColumnError(res.error)) res = await byType(LEGACY_POST_SELECT);
      take((res.data as unknown as DbCommunityPost[] | null) ?? []);
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
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const L = toLocale(locale);
  const t = serverT(L);
  const post = await getPublicPost(id);

  if (!post) {
    return { title: t("帖子不存在"), robots: { index: false, follow: false } };
  }

  // 与正文同一规则:有校验通过的译文显示译文,否则原文(zh 同样适用);
  // bundle 查询与页面主体在同一请求内去重(getBundles 内部 React cache)
  const view = resolvePostView(post, await getBundle("post", post.id, L), L);
  const postTitle = view.body.text.title;
  const description = excerpt(view.body.text.content);
  const section = t(TYPE_LABELS[post.type] || "社区");
  const cover = post.images?.find((u) => !VIDEO_RE.test(u));
  const path = `/community/${post.id}`;
  // 本语言没有可用版本(译文未就绪)时 canonical 指向原文语言页,hreflang 只列可用语言
  const alternates = contentAlternates(L, path, view.available, view.xDefault);
  const authorUrl = `${SITE_URL}/${L}/user/${post.user_id}`;
  const author = post.profiles?.username || t("匿名用户");

  return {
    title: `${postTitle} - ${section}`,
    description,
    keywords: [
      ...view.topics.map((topic) => topic.label),
      post.make,
      post.model,
      ...(L === "zh" ? ["二手车", "汽车社区"] : [t("二手车"), t("社区")]),
    ].filter(Boolean) as string[],
    authors: [{ name: author, url: authorUrl }],
    alternates,
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    openGraph: {
      type: "article",
      title: postTitle,
      description,
      url: alternates.canonical,
      siteName: t(SITE_NAME),
      locale: ogLocale(L),
      alternateLocale: ogAlternates(L, view.available),
      publishedTime: post.created_at,
      // 内容时钟:只随标题/正文/图片等可见内容变化(点赞、评论计数不动它)
      modifiedTime: post.content_updated_at ?? post.updated_at,
      authors: [authorUrl],
      section,
      tags: view.topics.map((topic) => topic.label),
      ...(cover && { images: [{ url: cover, alt: postTitle }] }),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: postTitle,
      description,
      ...(cover && { images: [cover] }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const L = toLocale(locale);
  const post = await getPublicPost(id);
  if (!post) notFound();

  const [related, comments, postRow] = await Promise.all([
    getRelated(post),
    getPublicPostComments(post.id, COMMENT_LIMIT),
    getBundle("post", post.id, L),
  ]);
  const [relatedRows, commentRows] = await Promise.all([
    getBundles("post", related.map((p) => p.id), L),
    getBundles("post_comment", comments.map((c) => c.id), L),
  ]);
  const postRows = postRow ? { ...relatedRows, [post.id]: postRow } : relatedRows;

  const t = serverT(L);
  const view = resolvePostView(post, postRow, L);
  const path = `/community/${post.id}`;
  const url = `${SITE_URL}/${L}${path}`;

  // DiscussionForumPosting:标题/正文/评论都用页面上显示的文本(译文或原文)及其 lang
  const ldComments = comments.slice(0, LD_COMMENT_LIMIT).map((c) => {
    const shown = localize({ content: c.content }, commentRows[c.id], L);
    return {
      text: shown.text.content,
      lang: shown.textLang.content,
      author: c.profiles?.username || t("匿名用户"),
      userId: c.user_id,
      createdAt: c.created_at,
    };
  });

  return (
    <>
      <JsonLd
        data={postJsonLd({
          post,
          view,
          author: post.profiles?.username || t("匿名用户"),
          comments: ldComments,
          locale: L,
          url,
          // 原文所在语言版本(x-default);显示译文时作为 translationOfWork
          sourceUrl: `${SITE_URL}/${view.xDefault}${path}`,
        })}
      />
      {/* 面包屑结构化数据:首页 → 社区 → 帖子(与车源页同款,利于搜索结果层级展示) */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("首页"), url: `${SITE_URL}/${L}` },
          { name: t("社区"), url: `${SITE_URL}/${L}/community` },
          { name: view.body.text.title, url },
        ])}
      />
      <ContentI18nProvider locale={L} rows={{ post: postRows, post_comment: commentRows }}>
        <CommunityDetail
          initialPost={post}
          initialRelated={related}
          initialComments={comments}
        />
      </ContentI18nProvider>
    </>
  );
}
