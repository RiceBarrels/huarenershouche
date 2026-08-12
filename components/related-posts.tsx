"use client";

// 帖子详情页底部"相关推荐" — 站内内链(SEO)+ 延长浏览路径。
// server 模式下由 [id]/page.tsx 服务端预取传入 initial(可被爬虫直接抓到);
// 静态导出(Capacitor)模式下无 initial,客户端自行拉取。

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { communityPostLink } from "@/lib/static-link";
import { useOverlay } from "@/components/car-overlay-provider";
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
  const { enabled: overlayEnabled, openPost } = useOverlay();

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
        相关推荐
        <span className="h-px flex-1 bg-border" aria-hidden />
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {posts.map((post) => {
          const cover = post.images?.[0];
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
              className="block overflow-hidden rounded-xl bg-card transition-colors hover:bg-muted/40"
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
                    {TYPE_LABELS[post.type] || post.type}
                  </span>
                </div>
              ) : null}
              <div className="p-2.5">
                {!cover && (
                  <span className="mb-1.5 inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {TYPE_LABELS[post.type] || post.type}
                  </span>
                )}
                <h3 className="line-clamp-2 font-mono text-xs font-medium leading-snug">
                  {post.title}
                </h3>
                {!cover && (
                  <p className="mt-1 line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {post.content}
                  </p>
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
                    {post.profiles?.username || "匿名"}
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
