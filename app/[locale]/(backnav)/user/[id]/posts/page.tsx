// 用户帖子列表 — /user/[id]/posts 独立动态路由(桌面 tab 直达链接)。
// server component:独立 SEO metadata(帖子标题按界面语言显示译文)+ ItemList JSON-LD + 服务端预取
// 资料与最新 12 篇帖子及其译文(B19);不存在或已封禁的用户 404。
// 静态导出(Capacitor)构建时 [id] 目录被 build:static 隐藏。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { localeAlternates, SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";
import { isZhLocale, LOCALES, type Locale } from "@/lib/i18n";
import { isSiteLocale, ogLocale } from "@/lib/i18n/content-langs";
import { LEGACY_POST_COLUMNS, POST_AUTHOR_EMBED, POST_COLUMNS } from "@/lib/i18n/content/columns";
import { resolvePostView } from "@/lib/i18n/content/resolve";
import { getBundles } from "@/lib/i18n/content/server";
import type { BundleMap } from "@/lib/i18n/content/types";
import { ogAlternates } from "@/lib/seo/alternates";
import { JsonLd } from "@/lib/seo/jsonld";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import type { DbCommunityPost } from "@/lib/types";
import UserProfilePage, { type SellerProfile } from "../../user-detail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 与 user-detail 客户端拉取的资料列一致(注入后客户端不再重复拉取)
const PROFILE_COLUMNS =
  "id, username, avatar_url, location, account_type, is_system, claimed_by, languages, banned, created_at";

interface PostsData {
  profile: SellerProfile | null;
  /** 最新 12 篇(首屏注入) */
  posts: DbCommunityPost[];
  /** 公开帖子总数 */
  total: number;
  /** 帖子在当前语言的译文 bundle(注入 ContentI18nProvider,SSR 直出译文) */
  rows: BundleMap;
  /** 与 posts 一一对应的显示标题(译文或原文),metadata 与 JSON-LD 共用 */
  titles: string[];
}

/** 最新 12 篇公开帖子(PostCard 需要作者信息)+ 总数;新列未建时退回旧列集 */
async function fetchPosts(id: string): Promise<{ posts: DbCommunityPost[]; total: number }> {
  const run = (columns: string) =>
    supabase
      .from("community_posts")
      .select(`${columns}, ${POST_AUTHOR_EMBED}`, { count: "exact" })
      .eq("user_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);
  let res = await run(POST_COLUMNS);
  if (res.error && isMissingColumnError(res.error)) res = await run(LEGACY_POST_COLUMNS);
  const posts = (res.data as DbCommunityPost[] | null) ?? [];
  return { posts, total: res.count ?? posts.length };
}

const getData = cache(async (id: string, locale: Locale): Promise<PostsData> => {
  if (!UUID_RE.test(id)) return { profile: null, posts: [], total: 0, rows: {}, titles: [] };
  const [profileRes, { posts, total }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
    fetchPosts(id),
  ]);
  // 主体查询出错直接抛出(错误边界 500),不把暂时故障渲染成 404
  if (profileRes.error) throw new Error(`profiles(${id}): ${profileRes.error.message}`);
  const rows = await getBundles("post", posts.map((p) => p.id), locale);
  return {
    profile: (profileRes.data as SellerProfile | null) ?? null,
    posts,
    total,
    rows,
    titles: posts.map((p) => resolvePostView(p, rows[p.id], locale).body.text.title),
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
  const { profile, total, titles } = await getData(id, locale);

  if (!profile || profile.banned) {
    return { title: t("用户不存在"), robots: { index: false, follow: false } };
  }

  const title =
    isZhLocale(locale)
      ? `${profile.username} 的帖子 (${total})`
      : t("{name} 的帖子 ({n})", { name: profile.username, n: total });
  const highlights = titles.slice(0, 3).join(isZhLocale(locale) ? "、" : ", ");
  const description =
    isZhLocale(locale)
      ? `${profile.username} 在常來車網社区发布的 ${total} 篇帖子` +
        (highlights ? `:${highlights}${total > 3 ? " 等" : ""}` : "") +
        "。北美华人二手车社区,车评、晒车、用车讨论。"
      : t("{name} 在 {site} 社区发布的 {n} 篇帖子", {
          name: profile.username,
          site: t("常來車網"),
          n: total,
        }) + (highlights ? `: ${highlights}` : "");

  return {
    title,
    description: description.slice(0, 160),
    alternates: localeAlternates(locale, `/user/${profile.id}/posts`),
    openGraph: {
      type: "profile",
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/${locale}/user/${profile.id}/posts`,
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
  const { profile, posts, rows, titles } = await getData(id, locale);
  if (!profile || profile.banned) notFound();

  const t = serverT(locale);

  return (
    <>
      {/* 帖子清单结构化数据,内链到各帖详情页(显示标题 + 带语言前缀的地址) */}
      {posts.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: t("{name} 的帖子", { name: profile.username }),
            url: `${SITE_URL}/${locale}/user/${profile.id}/posts`,
            items: posts.map((p, i) => ({
              name: titles[i],
              url: `${SITE_URL}/${locale}/community/${p.id}`,
            })),
          })}
        />
      )}
      <ContentI18nProvider locale={locale} rows={{ post: rows }}>
        <UserProfilePage
          userId={profile.id}
          initialTab="posts"
          initialProfile={profile}
          initialPosts={posts}
        />
      </ContentI18nProvider>
    </>
  );
}
