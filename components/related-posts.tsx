"use client";

// 帖子详情页底部"相关推荐" — 站内内链(SEO)+ 延长浏览路径。
// server 模式下由 [id]/page.tsx 服务端预取传入 initial(可被爬虫直接抓到);
// 静态导出(Capacitor)模式下无 initial,客户端自行拉取。

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/localized-navigation";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { communityPostLink } from "@/lib/static-link";
import { useOverlay } from "@/components/car-overlay-provider";
import { useI18n } from "@/components/i18n-provider";
import { needsContentTranslation } from "@/lib/i18n";
import { usePostTranslations, type PostI18nMap } from "@/hooks/use-post-translations";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCommunityPost } from "@/lib/types";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

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
  // 每条「显示原文」切换状态(id 集合,避免为每条拆子组件)
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string>>(new Set());
  const { enabled: overlayEnabled, openPost } = useOverlay();
  const { t, locale } = useI18n();

  // 非中文界面:批量 AI 翻译并合并回状态(缓存全站共享,见 use-post-translations)
  const mergeI18n = useCallback(
    (map: PostI18nMap) => {
      setPosts((prev) =>
        prev.map((p) =>
          map[p.id] ? { ...p, other_i18n: { ...(p.other_i18n ?? {}), [locale]: map[p.id] } } : p
        )
      );
    },
    [locale]
  );
  usePostTranslations(posts, locale, mergeI18n);

  useEffect(() => {
    if (initial && initial.length > 0) return;
    if (!postId) return;

    let cancelled = false;

    async function load() {
      const LIMIT = 8;
      const result: DbCommunityPost[] = [];
      const seen = new Set<string>([postId]);

      try {
        if (make) {
          const { data } = await supabase
            .from("community_posts")
            .select("*, profiles!user_id(username, avatar_url)")
            .eq("status", "active")
            .eq("make", make)
            .neq("id", postId)
            .order("likes_count", { ascending: false })
            .limit(LIMIT);
          for (const p of (data as DbCommunityPost[]) ?? []) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              result.push(p);
            }
          }
        }
        if (result.length < LIMIT) {
          let query = supabase
            .from("community_posts")
            .select("*, profiles!user_id(username, avatar_url)")
            .eq("status", "active")
            .neq("id", postId)
            .order("created_at", { ascending: false })
            .limit(LIMIT + result.length);
          if (type) query = query.eq("type", type);
          const { data } = await query;
          for (const p of (data as DbCommunityPost[]) ?? []) {
            if (result.length >= LIMIT) break;
            if (!seen.has(p.id)) {
              seen.add(p.id);
              result.push(p);
            }
          }
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
        {posts.map((post) => {
          const cover = post.images?.[0];
          // AI 翻译消费:other_i18n[locale] === undefined 表示在途(skeleton),
          // {} 标记表示尝试失败(回退原文),有译文时可切回原文
          const needsTranslation = needsContentTranslation(
            `${post.title}\n${post.content}`,
            locale,
          );
          const i18n = needsTranslation ? post.other_i18n?.[locale] : undefined;
          const hasTranslation = !!(i18n?.content || i18n?.title);
          const translationPending =
            needsTranslation && post.other_i18n?.[locale] === undefined;
          const showOriginal = showOriginalIds.has(post.id);
          const sourceIsCJK = /[一-鿿]/.test(`${post.title}${post.content}`);
          const displayTitle =
            hasTranslation && !showOriginal ? i18n?.title || post.title : post.title;
          const displayContent =
            hasTranslation && !showOriginal
              ? i18n?.content || post.content
              : post.content;
          return (
            <Link
              key={post.id}
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
                      alt={post.title}
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
                {/* AI 翻译标注 + 显示原文切换(卡片在 Link 里,按钮要阻止跳转) */}
                {hasTranslation && (
                  <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <span className="truncate">
                      {sourceIsCJK ? t("已从中文翻译") : t("已从英文翻译")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowOriginalIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(post.id)) next.delete(post.id);
                          else next.add(post.id);
                          return next;
                        });
                      }}
                      className="shrink-0 text-brand-ink underline-offset-2 hover:underline"
                    >
                      {showOriginal ? t("显示翻译") : t("显示原文")}
                    </button>
                  </div>
                )}
                {translationPending ? (
                  /* 翻译在途:标题(+ 无封面时的内容)骨架 */
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                    {!cover && (
                      <>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <h3 className="line-clamp-2 font-mono text-xs font-medium leading-snug">
                      {displayTitle}
                    </h3>
                    {!cover && (
                      <p className="mt-1 line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {displayContent}
                      </p>
                    )}
                  </>
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
        })}
      </div>
    </section>
  );
}
