"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/localized-navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { PostCard } from "@/components/post-card";
import { usePostTranslations, type PostI18nMap } from "@/hooks/use-post-translations";
import type { DbCommunityPost } from "@/lib/types";

interface ModelReviewsProps {
  make: string;
  model: string;
}

/**
 * 车主口碑：来自社区的车评（type='review'），直接复用社区帖子卡片
 * （含非中文界面的 AI 翻译 + 显示原文切换）。
 * 优先同 make+model，没有则退回同 make（标注"同品牌车主评价"）。
 * 一条都没有时不渲染。
 */
export function ModelReviews({ make, model }: ModelReviewsProps) {
  const { t, locale } = useI18n();
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [makeLevelOnly, setMakeLevelOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!make) return;

      // PostCard 需要完整字段(作者/图片/计数/翻译缓存)
      const baseQuery = () =>
        supabase
          .from("community_posts")
          .select("*, profiles!user_id(username, avatar_url)")
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

  // 非中文界面:批量翻译并合并回状态(缓存全站共享)
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

  if (posts.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-mono text-sm font-semibold">{t("车主口碑")}</h2>
        <span className="font-mono text-[10px] text-muted-foreground">
          {makeLevelOnly ? t("同品牌车主评价 · {make}", { make }) : `${make} ${model}`}
        </span>
      </div>

      {/* 直接用社区帖子卡片;点赞在此为只读展示(不传 onLike) */}
      <div className="mt-3 space-y-3 md:space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <Link
        href="/community"
        className="mt-3 inline-block font-mono text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        {t("查看全部车主评价 →")}
      </Link>
    </section>
  );
}
