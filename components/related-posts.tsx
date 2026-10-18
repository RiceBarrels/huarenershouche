"use client";

// 帖子详情页底部"相关推荐" — 站内内链(SEO)+ 延长浏览路径。
// server 模式下由 [id]/page.tsx 服务端预取传入 initial(连同译文 bundle 一起 SSR,可被爬虫直接抓到);
// 静态导出(Capacitor)/浮层模式下无 initial,客户端自行拉取。

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/localized-navigation";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import {
  LEGACY_POST_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
} from "@/lib/i18n/content/columns";
import { avatarUrl } from "@/lib/avatar";
import { communityPostLink } from "@/lib/static-link";
import { useOverlay } from "@/components/car-overlay-provider";
import { useI18n } from "@/components/i18n-provider";
import { useLocalized, useLocalizedPrefetch } from "@/hooks/use-localized";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import type { DbCommunityPost } from "@/lib/types";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const LIMIT = 8;
const POST_SELECT = `${POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;
const LEGACY_POST_SELECT = `${LEGACY_POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;

interface RelatedPostsProps {
  postId: string;
  make?: string | null;
  type?: string;
  initial?: DbCommunityPost[];
  className?: string;
}

export function RelatedPosts({
  postId,
  make,
  type,
  initial,
  className = "",
}: RelatedPostsProps) {
  const [posts, setPosts] = useState<DbCommunityPost[]>(initial ?? []);
  const { t } = useI18n();

  // 卡片各自 useLocalized;这里把整组 id 合并成一次 bundle 请求
  const ids = useMemo(() => posts.map((p) => p.id), [posts]);
  useLocalizedPrefetch("post", ids);

  useEffect(() => {
    if (initial && initial.length > 0) return;
    if (!postId) return;

    let cancelled = false;

    async function load() {
      const result: DbCommunityPost[] = [];
      const seen = new Set<string>([postId]);
      const take = (rows: DbCommunityPost[]) => {
        for (const p of rows) {
          if (result.length >= LIMIT) break;
          if (!seen.has(p.id)) {
            seen.add(p.id);
            result.push(p);
          }
        }
      };

      try {
        if (make) {
          const byMake = (cols: string) =>
            supabase
              .from("community_posts")
              .select(cols)
              .eq("status", "active")
              .eq("make", make)
              .neq("id", postId)
              .order("likes_count", { ascending: false })
              .limit(LIMIT);
          let res = await byMake(POST_SELECT);
          // 迁移 SQL 未执行时新列缺失:按旧列集重查
          if (res.error && isMissingColumnError(res.error)) res = await byMake(LEGACY_POST_SELECT);
          take((res.data as unknown as DbCommunityPost[] | null) ?? []);
        }
        if (result.length < LIMIT) {
          const latest = (cols: string) => {
            let query = supabase
              .from("community_posts")
              .select(cols)
              .eq("status", "active")
              .neq("id", postId)
              .order("created_at", { ascending: false })
              .limit(LIMIT + result.length);
            if (type) query = query.eq("type", type);
            return query;
          };
          let res = await latest(POST_SELECT);
          if (res.error && isMissingColumnError(res.error)) res = await latest(LEGACY_POST_SELECT);
          take((res.data as unknown as DbCommunityPost[] | null) ?? []);
        }
      } catch {
        // 表不存在等场景:不展示该区块
      }

      if (!cancelled) setPosts(result);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId, make, type, initial]);

  if (posts.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="flex items-center gap-2 font-mono text-xs font-semibold text-muted-foreground">
        <span className="h-px w-6 bg-border" aria-hidden />
        {t("相关推荐")}
        <span className="h-px flex-1 bg-border" aria-hidden />
      </h2>
      {/* 桌面 3 列:max-w-2xl 下 2 列的 3:4 封面单张过大(约 300×400),
          3 列密度更接近瀑布流推荐位的浏览节奏 */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {posts.map((post) => (
          <RelatedPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

function RelatedPostCard({ post }: { post: DbCommunityPost }) {
  const { t } = useI18n();
  const { enabled: overlayEnabled, openPost } = useOverlay();
  const cover = post.images?.[0];
  // 标题(无封面时连同正文摘要)按界面语言显示,可切回原文。只按卡片显示的字段取译文:
  // 有封面的卡片只显示标题,不能因为正文有译文就标「已翻译」
  const shownFields: Record<string, string> = cover
    ? { title: post.title }
    : { title: post.title, content: post.content };
  const view = useLocalized("post", post.id, shownFields);

  return (
    <Link
      href={communityPostLink(post.id)}
      onClick={(e) => {
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openPost(
            post,
            { top: r.top, left: r.left, width: r.width, height: r.height },
            e.currentTarget.outerHTML,
            e.currentTarget,
          );
        }
      }}
      /* 桌面 hover 细描边:封面图占满卡片上半时,底色 hover 几乎不可见,
         1px 描边让鼠标反馈始终可感知(与全站卡片手感统一) */
      className="block overflow-hidden rounded-xl bg-card transition-colors hover:bg-muted/40 md:ring-1 md:ring-transparent md:hover:ring-border/70 md:active:bg-muted/50"
    >
      {cover ? (
        <div className="relative">
          {VIDEO_RE.test(cover) ? (
            <>
              <video
                src={cover}
                muted
                playsInline
                preload="metadata"
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
                  <Play
                    className="ml-0.5 h-3.5 w-3.5 text-foreground"
                    strokeWidth={1.5}
                  />
                </span>
              </span>
            </>
          ) : (
            <img
              src={cover}
              alt={view.shown.title}
              className="aspect-[3/4] w-full bg-muted object-cover"
              loading="lazy"
            />
          )}
          <span className="absolute left-1.5 top-1.5 rounded-md bg-background/85 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground backdrop-blur-sm">
            {t(TYPE_LABELS[post.type] || post.type)}
          </span>
        </div>
      ) : null}
      <div className="p-2.5">
        {!cover && (
          <span className="mb-1.5 inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            {t(TYPE_LABELS[post.type] || post.type)}
          </span>
        )}
        {/* 翻译标注 + 显示原文切换(卡片在 Link 里,按钮要阻止跳转);「翻译中…」是整条帖子的状态
            (可能只有正文在翻),封面卡只显示标题,所以只在标题确有译文时标注 */}
        {(!cover || view.translated) && (
          <TranslationNotice view={view} stopPropagation className="mb-1" />
        )}
        <LocalizedText
          view={view}
          field="title"
          as="h3"
          className="line-clamp-2 font-mono text-xs font-medium leading-snug"
        />
        {!cover && (
          <LocalizedText
            view={view}
            field="content"
            as="p"
            className="mt-1 line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
          />
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            <img
              src={avatarUrl(
                post.profiles?.avatar_url,
                post.profiles?.username,
              )}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
            {post.profiles?.username || t("匿名")}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
            <Heart className="h-3 w-3" strokeWidth={1.5} />
            {post.likes_count || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
