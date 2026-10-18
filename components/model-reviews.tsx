"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/localized-navigation";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import {
  LEGACY_POST_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
} from "@/lib/i18n/content/columns";
import { useI18n } from "@/components/i18n-provider";
import { useLocalizedPrefetch } from "@/hooks/use-localized";
import { PostCard } from "@/components/post-card";
import type { DbCommunityPost } from "@/lib/types";

interface ModelReviewsProps {
  make: string;
  model: string;
}

const POST_SELECT = `${POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;
const LEGACY_POST_SELECT = `${LEGACY_POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;

/**
 * 车主口碑：来自社区的车评（type='review'），直接复用社区帖子卡片
 * （卡片自带界面语言译文 + 显示原文切换）。
 * 优先同 make+model，没有则退回同 make（标注"同品牌车主评价"）。
 * 一条都没有时不渲染。
 */
export function ModelReviews({ make, model }: ModelReviewsProps) {
  const { t } = useI18n();
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [makeLevelOnly, setMakeLevelOnly] = useState(false);

  // 卡片各自 useLocalized;这里把整组 id 合并成一次 bundle 请求
  const ids = useMemo(() => posts.map((p) => p.id), [posts]);
  useLocalizedPrefetch("post", ids);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!make) return;

      // PostCard 需要完整字段(作者/图片/计数)
      const baseQuery = (cols: string) =>
        supabase
          .from("community_posts")
          .select(cols)
          .eq("type", "review")
          .eq("status", "active")
          .ilike("make", make)
          .order("created_at", { ascending: false })
          .limit(3);
      // 迁移 SQL 未执行时新列缺失:改用旧列集,之后的查询沿用
      let cols = POST_SELECT;
      const fetchRows = async (byModel: boolean): Promise<DbCommunityPost[]> => {
        const run = () => (byModel ? baseQuery(cols).ilike("model", model.trim()) : baseQuery(cols));
        let res = await run();
        if (res.error && isMissingColumnError(res.error) && cols !== LEGACY_POST_SELECT) {
          cols = LEGACY_POST_SELECT;
          res = await run();
        }
        return (res.data as unknown as DbCommunityPost[] | null) ?? [];
      };

      let rows: DbCommunityPost[] = [];
      let fellBack = false;

      if (model) rows = await fetchRows(true);
      if (rows.length === 0) {
        rows = await fetchRows(false);
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
