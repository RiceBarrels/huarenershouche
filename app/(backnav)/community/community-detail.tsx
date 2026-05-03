"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  User,
  Send,
  Loader2,
  Trash2,
  ImageIcon,
  ChevronLeft,
} from "lucide-react";
import { useRouteParams } from "@/lib/use-route-params";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import type { DbCommunityPost, DbPostComment } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const TYPE_COLORS: Record<string, string> = {
  review: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  showoff: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  discussion: "bg-green-500/10 text-green-600 border-green-500/20",
};

export default function CommunityDetailPage() {
  const { id: postId } = useRouteParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<DbCommunityPost | null>(null);
  const [comments, setComments] = useState<DbPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [tableError, setTableError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load post
  useEffect(() => {
    if (!postId) return;

    async function loadPost() {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("id", postId)
        .single();

      if (error) {
        if (
          error.message.includes("does not exist") ||
          error.message.includes("relation") ||
          error.code === "42P01"
        ) {
          setTableError(true);
        }
        setPost(null);
      } else {
        setPost(data as DbCommunityPost);
        setLikeCount((data as DbCommunityPost).likes_count || 0);
      }
    }

    loadPost()
      .catch((err) => console.error("Failed to load post:", err))
      .finally(() => setLoading(false));
  }, [postId]);

  // Load comments
  useEffect(() => {
    if (!postId) return;

    async function loadComments() {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        // Table may not exist
        setComments([]);
      } else {
        setComments((data as DbPostComment[]) || []);
      }
    }

    loadComments()
      .catch((err) => console.error("Failed to load comments:", err))
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  // Check if user already liked
  useEffect(() => {
    if (!postId || !userId) return;
    supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiked(true);
      })
      .then(undefined, () => {});
  }, [postId, userId]);

  async function handleLike() {
    if (!userId || !postId) return;

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: userId });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  }

  async function handleComment() {
    if (!content.trim() || !userId || !postId) return;
    setSending(true);

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
      })
      .select("*, profiles!user_id(username, avatar_url)")
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as DbPostComment]);
      setContent("");
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from("post_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-4 h-6 w-3/4" />
          <Skeleton className="mt-3 h-20 w-full" />
          <Skeleton className="mt-3 h-40 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
          <ImageIcon
            className="h-8 w-8 text-muted-foreground/50"
            strokeWidth={1.5}
          />
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            社区即将上线
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
          <p className="font-mono text-sm text-muted-foreground">
            帖子不存在或已被删除
          </p>
          <Link href="/community">
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5 font-mono text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              返回社区
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {/* Back link */}
        <Link
          href="/community"
          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          返回社区
        </Link>

        {/* Author row */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-muted">
            {post.profiles?.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-mono text-xs font-medium text-muted-foreground">
                {(post.profiles?.username || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <span className="font-mono text-xs font-medium">
              {post.profiles?.username || "匿名"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {timeAgo(post.created_at)}
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[10px] ${
                  TYPE_COLORS[post.type] || ""
                }`}
              >
                {TYPE_LABELS[post.type] || post.type}
              </Badge>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-4 font-mono text-base font-semibold leading-snug">
          {post.title}
        </h1>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="font-mono text-[10px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Car info for reviews */}
        {post.type === "review" && (post.make || post.model || post.year) && (
          <div className="mt-3 border border-border bg-muted/30 px-3 py-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              车型：
              {[post.year, post.make, post.model].filter(Boolean).join(" ")}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
          {post.content}
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-4 space-y-2">
            {post.images.map((img, i) => (
              <div key={i} className="border border-border">
                <img
                  src={img}
                  alt=""
                  className="w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Like button + stats */}
        <div className="mt-6 flex items-center gap-4 border-t border-border pt-4">
          <button
            onClick={handleLike}
            disabled={!userId}
            className={`flex items-center gap-1.5 font-mono text-xs transition-colors ${
              liked
                ? "text-red-500"
                : "text-muted-foreground hover:text-foreground"
            } ${!userId ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Heart
              className="h-4 w-4"
              strokeWidth={1.5}
              fill={liked ? "currentColor" : "none"}
            />
            {likeCount}
          </button>
          <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
            {comments.length}
          </span>
        </div>

        {/* Comments section */}
        <section className="mt-6 border-t border-border pt-6">
          <h2 className="font-mono text-sm font-semibold">
            评论 ({comments.length})
          </h2>

          {/* Comment input */}
          <div className="mt-4">
            {userId ? (
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 resize-none border border-border bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                  placeholder="写评论..."
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-auto self-end gap-1 font-mono text-xs"
                  onClick={handleComment}
                  disabled={!content.trim() || sending}
                >
                  {sending ? (
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Send className="h-3 w-3" strokeWidth={1.5} />
                  )}
                  发送
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="block w-full border border-dashed border-border px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                登录后发表评论
              </Link>
            )}
          </div>

          {/* Comments list */}
          <div className="mt-4 space-y-3">
            {commentsLoading ? (
              <p className="font-mono text-xs text-muted-foreground">
                加载中...
              </p>
            ) : comments.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-muted-foreground">
                暂无评论，来说两句吧
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User
                        className="h-3.5 w-3.5 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">
                        {comment.profiles?.username || "匿名"}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {timeAgo(comment.created_at)}
                      </span>
                      {userId === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2
                            className="h-3 w-3"
                            strokeWidth={1.5}
                          />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap font-mono text-sm text-foreground/90">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
