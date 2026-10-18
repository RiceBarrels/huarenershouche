// 话题聚合页 /community/t/[slug] —— server component(ISR 5 分钟),话题的 SEO 入口:
// 显示名按语言取(topic_get);合并过的话题 308 到目标 slug;首屏 30 篇帖子 + 各自 bundle
// (SSR 即输出当前语言的标题正文);帖子数 < 3 的话题 noindex(与 sitemap 的收录门槛一致);
// hreflang 只声明有该语言标签的语言,x-default 为中文页(同 sitemap 的 topic 分片)。
// 静态导出(Capacitor)没有这个动态路由:lib/i18n/topics.ts topicHref 在静态包里改走 /community?topic=。

import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { LOCALES, localizePath, type Locale } from "@/lib/i18n";
import { isSiteLocale, ogLocale } from "@/lib/i18n/content-langs";
import { serverT } from "@/lib/i18n/translate";
import { getTopic, searchPosts, type TopicInfo } from "@/lib/i18n/topics";
import { getBundles } from "@/lib/i18n/content/server";
import { resolvePostView } from "@/lib/i18n/content/resolve";
import { contentAlternates, ogAlternates } from "@/lib/seo/alternates";
import { JsonLd } from "@/lib/seo/jsonld";
import { collectionPageJsonLd, itemListJsonLd } from "@/lib/seo/structured-data";
import { SITE_NAME, SITE_URL } from "@/lib/seo-pages";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import TopicPosts from "./topic-posts";

export const revalidate = 300;

const POSTS_LIMIT = 30;
// 与 sitemap 一致:至少 3 篇公开帖子的话题才收录
const INDEX_MIN_POSTS = 3;
// 同 i18n.terms 的 slug 约束
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 48;

type Params = Promise<{ locale: string; slug: string }>;

const pagePath = (slug: string) => `/community/t/${slug}`;

// generateMetadata 与页面共用一次查询
const loadTopic = cache((slug: string, locale: Locale) => getTopic(slug, locale));

/** 语言或 slug 格式不对直接 404,不查库 */
async function readParams(params: Params): Promise<{ locale: Locale; slug: string }> {
  const { locale, slug } = await params;
  if (!isSiteLocale(locale) || slug.length > SLUG_MAX || !SLUG_RE.test(slug)) notFound();
  return { locale, slug };
}

/** 有标签的语言(hreflang / og:locale:alternate 只声明这些) */
const labelLocales = (topic: TopicInfo): Locale[] => LOCALES.filter((l) => Boolean(topic.labels[l]));

function excerpt(text: string, max = 80): string {
  return Array.from(text.replace(/\s+/g, " ").trim()).slice(0, max).join("");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await readParams(params);
  const topic = await loadTopic(slug, locale);
  // 不存在 / 已合并:由页面本身给出 404 / 308
  if (!topic || topic.canonical_slug !== topic.slug) return {};

  const t = serverT(locale);
  const available = labelLocales(topic);
  const alternates = contentAlternates(locale, pagePath(topic.slug), available, "zh");
  const title = `#${topic.label}`;
  const description = t("关于 #{label} 的社区帖子", { label: topic.label });
  return {
    title,
    description,
    alternates,
    robots: { index: topic.post_count >= INDEX_MIN_POSTS, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: alternates.canonical,
      siteName: t(SITE_NAME),
      locale: ogLocale(locale),
      alternateLocale: ogAlternates(locale, available),
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function TopicPage({ params }: { params: Params }) {
  const { locale, slug } = await readParams(params);
  const topic = await loadTopic(slug, locale);
  if (!topic) notFound();
  if (topic.canonical_slug !== topic.slug) {
    permanentRedirect(localizePath(pagePath(topic.canonical_slug), locale));
  }

  const { data: posts, error } = await searchPosts({ topic: topic.slug, limit: POSTS_LIMIT });
  // 暂时性故障交给错误边界(ISR 期间继续提供上一版),不把空列表缓存成话题页
  if (error) throw new Error(`search_posts(${topic.slug}): ${error.message}`, { cause: error });
  const bundles = await getBundles(
    "post",
    posts.map((p) => p.id),
    locale,
  );

  // 结构化数据用页面上显示的标题(译文或原文)
  const name = `#${topic.label}`;
  const url = `${SITE_URL}/${locale}${pagePath(topic.slug)}`;
  const items = posts.map((p) => {
    const { text } = resolvePostView(p, bundles[p.id], locale).body;
    return { name: text.title || excerpt(text.content), url: `${SITE_URL}/${locale}/community/${p.id}` };
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd({ name, url, locale, items })} />
      <JsonLd data={itemListJsonLd({ name, url, items })} />
      <ContentI18nProvider key={topic.slug} locale={locale} rows={{ post: bundles }}>
        <TopicPosts slug={topic.slug} label={topic.label} postCount={topic.post_count} initialPosts={posts} />
      </ContentI18nProvider>
    </>
  );
}
