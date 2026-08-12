"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { communityPostLink } from "@/lib/static-link";
import { timeAgo } from "@/lib/format";
import type { DbCommunityPost } from "@/lib/types";

interface ModelReviewsProps {
  make: string;
  model: string;
}

/**
 * 车主口碑：来自社区的车评（type='review'）。
 * 优先同 make+model，没有则退回同 make（标注"同品牌车主评价"）。
 * 一条都没有时不渲染。
 */
export function ModelReviews({ make, model }: ModelReviewsProps) {
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [makeLevelOnly, setMakeLevelOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!make) return;

      const baseQuery = () =>
        supabase
          .from("community_posts")
          .select("id, title, content, likes_count, created_at, make, model")
          .eq("type", "review")
          .eq("status", "active")
          .ilike("make", make)
          .order("created_at", { ascending: false })
          .limit(3);

      let rows: DbCommunityPost[] = [];
      let fellBack = false;

      if (model) {
        const { data } = await baseQuery().ilike("model", model.trim());
        rows = (data as DbCommunityPost[]) || [];
      }
      if (rows.length === 0) {
        const { data } = await baseQuery();
        rows = (data as DbCommunityPost[]) || [];
        fellBack = true;
      }

      if (!cancelled) {
        setPosts(rows);
        setMakeLevelOnly(fellBack);
      }
    }

    load().catch((err) => console.error("Failed to load model reviews:", err));
    return () => {
      cancelled = true;
    };
  }, [make, model]);

  if (posts.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-mono text-sm font-semibold">车主口碑</h2>
        <span className="font-mono text-[10px] text-muted-foreground">
          {makeLevelOnly ? `同品牌车主评价 · ${make}` : `${make} ${model}`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={communityPostLink(post.id)}
            className="block rounded-xl bg-card p-3 transition-colors hover:bg-muted/40"
          >
            <h3 className="line-clamp-1 font-mono text-xs font-semibold leading-tight">
              {post.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {post.content}
            </p>
            <div className="mt-2.5 flex items-center gap-3 font-mono text-[10px] text-muted-foreground/70">
              <span className="flex items-center gap-0.5">
                <Heart className="h-2.5 w-2.5" strokeWidth={1.5} />
                {post.likes_count || 0}
              </span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/community"
        className="mt-3 inline-block font-mono text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        查看全部车主评价 →
      </Link>
    </section>
  );
}
