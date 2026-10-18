"use client";

// 话题聚合页的客户端部分:标题区 + 帖子卡片列表。首屏 30 篇由服务端取好,bundle 已由外层
// ContentI18nProvider 播种(SSR 即输出当前语言的标题正文,无骨架);「加载更多」按话题 slug 继续分页。
// 登录用户的点赞状态 / 点赞与社区信息流一致;屏蔽用户的帖子在客户端过滤。

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { useI18n } from "@/components/i18n-provider";
import { useIdentity } from "@/components/identity-provider";
import { useRouter } from "@/components/localized-navigation";
import { useLocalizedPrefetch } from "@/hooks/use-localized";
import { useBlockedIds } from "@/lib/blocks";
import { searchPosts } from "@/lib/i18n/topics";
import { supabase } from "@/lib/supabase";
import type { DbCommunityPost } from "@/lib/types";

const PAGE_SIZE = 30;
const NO_LIKES: ReadonlySet<string> = new Set();

export default function TopicPosts({
  slug,
  label,
  postCount,
  initialPosts,
}: {
  slug: string;
  /** 当前语言的话题显示名 */
  label: string;
  /** 话题下的公开帖子总数 */
  postCount: number;
  initialPosts: DbCommunityPost[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { authId } = useIdentity();
  const { blockedIds } = useBlockedIds();
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length < postCount);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // 点赞集合记在拉取它的用户名下:退出或切换账号后自动失效
  const [likes, setLikes] = useState<{ uid: string | null; ids: ReadonlySet<string> }>({
    uid: null,
    ids: NO_LIKES,
  });
  const likedIds = authId && likes.uid === authId ? likes.ids : NO_LIKES;

  const visible = useMemo(() => posts.filter((p) => !blockedIds.has(p.user_id)), [posts, blockedIds]);
  useLocalizedPrefetch(
    "post",
    visible.map((p) => p.id),
  );

  // 当前用户对已加载帖子的点赞状态(按 id 列表变化重查,点赞计数变化不触发)
  const postIdsKey = posts.map((p) => p.id).join(",");
  useEffect(() => {
    if (!authId || !postIdsKey) return;
    let cancelled = false;
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", authId)
      .in("post_id", postIdsKey.split(","))
      .then(({ data }) => {
        if (cancelled || !data) return;
        setLikes({ uid: authId, ids: new Set(data.map((r: { post_id: string }) => r.post_id)) });
      });
    return () => {
      cancelled = true;
    };
  }, [authId, postIdsKey]);

  async function toggleLike(post: DbCommunityPost) {
    if (!authId) {
      router.push("/login");
      return;
    }
    const uid = authId;
    const wasLiked = likedIds.has(post.id);
    const apply = (on: boolean) => {
      setLikes((prev) => {
        const ids = new Set(prev.uid === uid ? prev.ids : NO_LIKES);
        if (on) ids.add(post.id);
        else ids.delete(post.id);
        return { uid, ids };
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (on ? 1 : -1)) } : p,
        ),
      );
    };
    // 乐观更新,失败回滚
    apply(!wasLiked);
    const { error } = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", uid)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: uid });
    if (error) apply(wasLiked);
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadFailed(false);
    const res = await searchPosts({ topic: slug, offset: posts.length, limit: PAGE_SIZE }).catch(() => null);
    if (!res || res.error) {
      setLoadFailed(true);
    } else {
      // 首屏之后有新帖时 offset 会整体后移:按 id 去重
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.data.filter((p) => !seen.has(p.id))];
      });
      setHasMore(res.data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("话题")}
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <h1 className="mt-2 break-words font-mono text-lg font-semibold leading-snug md:text-xl">#{label}</h1>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {t("{n} 篇帖子", { n: postCount })}
        </p>

        {visible.length === 0 ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm text-muted-foreground">{t("该话题暂无帖子")}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visible.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                liked={likedIds.has(post.id)}
                onLike={() => toggleLike(post)}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-1.5 rounded-[0.3rem] border border-border px-4 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-60"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
              {loadFailed ? t("重试") : t("加载更多")}
            </button>
            {loadFailed && (
              <p className="font-mono text-[11px] text-muted-foreground">{t("加载失败")}</p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
