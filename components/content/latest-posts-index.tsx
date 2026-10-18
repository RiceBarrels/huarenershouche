// 社区「最新帖子」可抓取索引(server component,随社区页 ISR 每 5 分钟刷新)。
// 信息流是客户端洗牌渲染的(SSR 不含帖子),爬虫靠这份列表发现帖子详情页;
// 标题按页面语言取译文,无译文时显示原文并标其 lang。
// 页面在构建期预渲染,那时迁移 SQL 可能还没执行:新列缺失回退旧列、bundle 缺失显示原文,
// 其他任何错误直接不渲染。静态导出(Capacitor)没有服务端,不渲染。

import Link from "@/components/localized-navigation";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import type { Locale } from "@/lib/i18n";
import { serverT } from "@/lib/i18n/translate";
import { LEGACY_POST_COLUMNS, POST_COLUMNS } from "@/lib/i18n/content/columns";
import { getBundles } from "@/lib/i18n/content/server";
import { resolvePostView } from "@/lib/i18n/content/resolve";
import type { DbCommunityPost } from "@/lib/types";

const LIMIT = 30;

interface IndexItem {
  id: string;
  title: string;
  lang: string | undefined;
  createdAt: string;
}

async function loadIndex(locale: Locale): Promise<IndexItem[] | null> {
  try {
    const latest = (cols: string) =>
      supabase
        .from("community_posts")
        .select(cols)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(LIMIT);
    let res = await latest(POST_COLUMNS);
    if (res.error && isMissingColumnError(res.error)) res = await latest(LEGACY_POST_COLUMNS);
    if (res.error) return null;
    const posts = (res.data as unknown as DbCommunityPost[] | null) ?? [];
    if (posts.length === 0) return [];
    const rows = await getBundles("post", posts.map((p) => p.id), locale);
    return posts.map((post) => {
      const { body } = resolvePostView(post, rows[post.id], locale);
      return {
        id: post.id,
        title: body.text.title,
        lang: body.textLang.title,
        createdAt: post.created_at,
      };
    });
  } catch {
    return null;
  }
}

export async function LatestPostsIndex({ locale }: { locale: Locale }) {
  if (process.env.NEXT_PUBLIC_OUTPUT === "static") return null;
  const items = await loadIndex(locale);
  if (!items || items.length === 0) return null;
  const t = serverT(locale);
  return (
    <section className="mx-auto w-full max-w-2xl px-3 pb-8 pt-6 font-mono md:px-4">
      <h2 className="text-xs font-semibold text-muted-foreground">{t("最新帖子")}</h2>
      <ol className="mt-3 divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item.id}>
            {/* 帖子页是动态路由:30 条链接进视口时不逐个预取 */}
            <Link
              href={`/community/${item.id}`}
              prefetch={false}
              className="flex items-baseline gap-3 py-2 text-[13px] text-foreground transition-colors hover:text-brand-ink"
            >
              <span lang={item.lang} className="min-w-0 flex-1 truncate">
                {item.title}
              </span>
              <time
                dateTime={item.createdAt}
                className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
              >
                {item.createdAt.slice(0, 10)}
              </time>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
