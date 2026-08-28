"use client";

// 帖子详情 — 小红书式布局:媒体轮播 → 标题/正文/话题 → 楼中楼评论 → 相关推荐,
// 底部固定操作栏(评论输入 + 点赞 + 评论数)。
// server 模式下由 [id]/page.tsx 传入 initialPost/initialRelated(SSR + SEO);
// 静态导出(Capacitor)模式下无 props,依旧客户端自行拉取。

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import {
  Heart,
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  ImageIcon,
  Share,
  X,
} from "lucide-react";
import { useRouteParams } from "@/lib/use-route-params";
import { useI18n } from "@/components/i18n-provider";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RelatedPosts } from "@/components/related-posts";
import { HashtagText } from "@/components/hashtag-text";
import { FollowButton } from "@/components/follow-button";
import { useOverlay } from "@/components/car-overlay-provider";
import { ImageLightbox } from "@/components/image-lightbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { SITE_URL } from "@/lib/seo-pages";
import { apiOrigin } from "@/lib/capacitor";
import { needsContentTranslation } from "@/lib/i18n";
import { userLink } from "@/lib/static-link";
import type { DbCommunityPost, DbPostComment } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const TYPE_COLORS: Record<string, string> = {
  review: "bg-blue-500/10 text-blue-600 border-transparent",
  showoff: "bg-orange-500/10 text-orange-600 border-transparent",
  discussion: "bg-green-500/10 text-green-600 border-transparent",
};

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

interface ReplyTarget {
  /** 楼中楼统一挂在顶层评论下(两级结构) */
  parentId: string;
  name: string;
  /** 回复的是楼中楼里的某条回复时,正文加"回复 @xxx："前缀 */
  isNested: boolean;
}

export default function CommunityDetailPage({
  initialPost = null,
  initialRelated,
  embedded = false,
  onClose,
}: {
  initialPost?: DbCommunityPost | null;
  initialRelated?: DbCommunityPost[];
  // embedded:在移动端浮层里内嵌打开(隐藏 Header/Footer,不占满整屏高度)
  embedded?: boolean;
  onClose?: () => void;
} = {}) {
  const { id: routeId } = useRouteParams<{ id: string }>();
  const postId = initialPost?.id ?? routeId;
  const router = useRouter();
  const { t, locale } = useI18n();
  const showChrome = !embedded;
  const { enabled: overlayEnabled, openUser } = useOverlay();
  // 移动端:点头像/名字在浮层打开主页
  const userClick = (uid: string) => (e: React.MouseEvent) => {
    if (overlayEnabled) {
      e.preventDefault();
      openUser(uid);
    }
  };

  const [post, setPost] = useState<DbCommunityPost | null>(initialPost);
  const [comments, setComments] = useState<DbPostComment[]>([]);
  const [loading, setLoading] = useState(!initialPost);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialPost?.likes_count ?? 0);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  // 非中文界面:帖子经 AI 翻译展示,可切回原文(X 式)
  const [showOriginal, setShowOriginal] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentsRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // ---- 帖子 AI 翻译(en/ko):原文已是目标语言则不翻;结果缓存在 other_i18n ----
  const postText = post ? `${post.title}\n${post.content}` : "";
  const sourceIsCJK = /[一-鿿]/.test(postText);
  // 先检测源语言再决定翻译(helper 支持 zh:中文界面看英文帖同样翻)
  const needsTranslation = !!post && needsContentTranslation(postText, locale);
  const translation = needsTranslation ? post?.other_i18n?.[locale] : undefined;
  const showTranslated = needsTranslation && !!translation?.content && !showOriginal;
  // 翻译在途(尚无任何尝试结果):正文区显示 skeleton
  const postTranslationPending = needsTranslation && post?.other_i18n?.[locale] === undefined;
  const postTranslateAttempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!post?.id || !needsTranslation) return;
    if (post.other_i18n?.[locale] !== undefined) return; // 已有译文或已尝试(失败标记 {})
    const key = `${post.id}:${locale}`;
    if (postTranslateAttempted.current.has(key)) return;
    postTranslateAttempted.current.add(key);
    let cancelled = false;
    const pid = post.id;
    // 失败也写入 {} 标记:skeleton 收起、回退原文、不再重试
    const markFailed = () =>
      setPost((prev) =>
        prev && prev.id === pid
          ? { ...prev, other_i18n: { ...(prev.other_i18n ?? {}), [locale]: {} } }
          : prev
      );
    // 网页端走同源相对路径;仅原生壳用线上绝对地址(静态导出没有 /api)
    fetch(`${apiOrigin()}/api/translate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: pid, locale }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { ok?: boolean; i18n?: { title?: string | null; content?: string | null } } | null) => {
        if (cancelled) return;
        const i18n = json?.ok ? json.i18n : undefined;
        if (!i18n) return markFailed();
        setPost((prev) =>
          prev && prev.id === pid
            ? { ...prev, other_i18n: { ...(prev.other_i18n ?? {}), [locale]: i18n } }
            : prev
        );
      })
      .catch(() => {
        if (!cancelled) markFailed();
      });
    return () => {
      cancelled = true;
    };
  }, [post?.id, post?.other_i18n, needsTranslation, locale]);

  // ---- 评论按需批量翻译(40/批,一次模型调用),结果合并回 comments ----
  const commentTranslating = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (comments.length === 0) return;
    // undefined = 从未尝试;失败写入 {} 标记(skeleton 收起、回退原文、不再重试)
    const need = comments.filter(
      (c) =>
        needsContentTranslation(c.content, locale) &&
        c.other_i18n?.[locale] === undefined &&
        !commentTranslating.current.has(c.id)
    );
    if (need.length === 0) return;
    const ids = need.slice(0, 40).map((c) => c.id);
    ids.forEach((id) => commentTranslating.current.add(id));
    const applyMap = (map: Record<string, { content?: string | null }>) =>
      setComments((prev) =>
        prev.map((c) =>
          map[c.id] ? { ...c, other_i18n: { ...(c.other_i18n ?? {}), [locale]: map[c.id] } } : c
        )
      );
    fetch(`${apiOrigin()}/api/translate-comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "post", ids, locale }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { ok?: boolean; i18n?: Record<string, { content?: string | null }> } | null) => {
        const map = { ...(json?.ok ? json.i18n : undefined) };
        for (const id of ids) if (!(id in map)) map[id] = {};
        applyMap(map);
      })
      .catch(() => {
        applyMap(Object.fromEntries(ids.map((id) => [id, {}])));
      })
      .finally(() => {
        ids.forEach((id) => commentTranslating.current.delete(id));
      });
  }, [comments, locale]);

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

  // Load post(服务端已预取则跳过)
  useEffect(() => {
    if (!postId || initialPost) return;

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
  }, [postId, initialPost]);

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

  // Check if user already liked the post
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

  // Load which comments the user liked
  useEffect(() => {
    if (!userId || commentsLoading || comments.length === 0) return;
    supabase
      .from("post_comment_likes")
      .select("comment_id")
      .eq("user_id", userId)
      .in(
        "comment_id",
        comments.map((c) => c.id),
      )
      .then(({ data }) => {
        if (data) {
          setLikedComments(
            new Set(data.map((d: { comment_id: string }) => d.comment_id)),
          );
        }
      })
      .then(undefined, () => {}); // 表可能还没建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, commentsLoading]);

  // 楼中楼结构:顶层 + 按 parent_id 分组的回复
  const topLevel = useMemo(
    () => comments.filter((c) => !c.parent_id),
    [comments],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, DbPostComment[]>();
    for (const c of comments) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [comments]);

  async function handleLike() {
    if (!postId) return;
    if (!userId) {
      router.push("/login");
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      if (!error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: userId });
      if (!error) {
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    }
  }

  async function handleCommentLike(comment: DbPostComment) {
    if (!userId) {
      router.push("/login");
      return;
    }
    const isLiked = likedComments.has(comment.id);
    // 乐观更新
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(comment.id);
      else next.add(comment.id);
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              likes_count: Math.max(
                0,
                (c.likes_count || 0) + (isLiked ? -1 : 1),
              ),
            }
          : c,
      ),
    );

    const { error } = isLiked
      ? await supabase
          .from("post_comment_likes")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", userId)
      : await supabase
          .from("post_comment_likes")
          .insert({ comment_id: comment.id, user_id: userId });

    if (error) {
      // 回滚
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(comment.id);
        else next.delete(comment.id);
        return next;
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                likes_count: Math.max(
                  0,
                  (c.likes_count || 0) + (isLiked ? 1 : -1),
                ),
              }
            : c,
        ),
      );
    }
  }

  function startReply(target: DbPostComment) {
    const name = target.profiles?.username || t("匿名");
    setReplyTo({
      parentId: target.parent_id ?? target.id,
      name,
      isNested: !!target.parent_id,
    });
    inputRef.current?.focus();
  }

  async function handleComment() {
    if (!content.trim() || !postId) return;
    if (!userId) {
      router.push("/login");
      return;
    }
    setSending(true);

    const body =
      replyTo?.isNested && !content.trim().startsWith("回复 @")
        ? `回复 @${replyTo.name}：${content.trim()}`
        : content.trim();

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content: body,
        parent_id: replyTo?.parentId ?? null,
      })
      .select("*, profiles!user_id(username, avatar_url)")
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as DbPostComment]);
      if (replyTo) {
        setExpanded((prev) => new Set(prev).add(replyTo.parentId));
      }
      setContent("");
      setReplyTo(null);
    }

    setSending(false);
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from("post_comments").delete().eq("id", commentId);
    setComments((prev) =>
      prev.filter((c) => c.id !== commentId && c.parent_id !== commentId),
    );
  }

  async function handleShare() {
    if (!post) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch {
        // 用户取消分享:忽略
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {}
  }

  function scrollToComments() {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const media = useMemo(() => post?.images ?? [], [post?.images]);
  const imageUrls = useMemo(
    () => media.filter((u) => !VIDEO_RE.test(u)),
    [media],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        {showChrome && <Header />}
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-4 h-72 w-full" />
          <Skeleton className="mt-4 h-6 w-3/4" />
          <Skeleton className="mt-3 h-20 w-full" />
        </main>
        {showChrome && <Footer />}
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        {showChrome && <Header />}
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
          <ImageIcon
            className="h-8 w-8 text-muted-foreground/50"
            strokeWidth={1.5}
          />
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            {t("社区即将上线")}
          </p>
        </main>
        {showChrome && <Footer />}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        {showChrome && <Header />}
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
          <p className="font-mono text-sm text-muted-foreground">
            {t("帖子不存在或已被删除")}
          </p>
        </main>
        {showChrome && <Footer />}
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "flex flex-col bg-background font-mono"
          : "flex min-h-screen flex-col bg-background font-mono"
      }
      style={
        embedded
          ? undefined
          : { paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }
      }
    >
      {showChrome && <Header />}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">

        {/* X 式作者行:大头像 + 加粗名字,右侧分享 */}
        <div className="flex items-center gap-3">
          <Link
            href={userLink(post.user_id)}
            onClick={userClick(post.user_id)}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
          >
            <img
              src={avatarUrl(post.profiles?.avatar_url, post.profiles?.username)}
              alt=""
              className="h-full w-full object-cover"
            />
          </Link>
          <div className="min-w-0">
            <Link
              href={userLink(post.user_id)}
              onClick={userClick(post.user_id)}
              className="block truncate font-mono text-[15px] font-bold hover:underline"
            >
              {post.profiles?.username || t("匿名")}
            </Link>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge
                variant="outline"
                className={`font-mono text-[10px] ${
                  TYPE_COLORS[post.type] || ""
                }`}
              >
                {t(TYPE_LABELS[post.type] || post.type)}
              </Badge>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FollowButton userId={post.user_id} />
            <button
              type="button"
              onClick={handleShare}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Share className="h-3.5 w-3.5" strokeWidth={1.5} />
              {shareCopied ? t("已复制") : t("分享")}
            </button>
          </div>
        </div>

        {/* X 式:标题/正文在媒体之前,大字号全色。
            桌面:标题升半档、正文行高放宽到 1.8——中文长文在 42em 行宽下
            需要更松的行距才不显拥挤(行宽由 max-w-2xl 保证,刻意不拉宽) */}
        {/* AI 翻译标注 + 显示原文切换(仅非中文界面且确实翻译了才出现) */}
        {needsTranslation && !!translation?.content && (
          <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>{sourceIsCJK ? t("已从中文翻译") : t("已从英文翻译")}</span>
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="text-brand-ink underline-offset-2 hover:underline"
            >
              {showOriginal ? t("显示翻译") : t("显示原文")}
            </button>
          </div>
        )}
        {postTranslationPending ? (
          /* 翻译在途:标题 + 正文骨架,避免先闪原文再跳变 */
          <div className="mt-3 space-y-2.5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <h1 className="mt-3 font-mono text-lg font-bold leading-snug md:text-xl">
              {showTranslated && translation?.title ? translation.title : post.title}
            </h1>
            <div className="mt-1.5 whitespace-pre-wrap font-mono text-[15px] leading-relaxed text-foreground md:mt-2 md:leading-[1.8]">
              <HashtagText text={showTranslated && translation?.content ? translation.content : post.content} />
            </div>
          </>
        )}

        {/* Hashtags:可点击,跳社区搜索该话题(HashtagText 会先清浮层栈) */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 font-mono text-sm">
            {post.tags.map((tag) => (
              <HashtagText key={tag} text={`#${tag}`} />
            ))}
          </div>
        )}

        {/* Media carousel:X 式圆角细描边,整宽轮播 + 指示点 */}
        {media.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-border/60">
            <div
              ref={trackRef}
              onScroll={() => {
                const el = trackRef.current;
                if (!el || el.clientWidth === 0) return;
                setActiveImg(
                  Math.min(
                    media.length - 1,
                    Math.round(el.scrollLeft / el.clientWidth),
                  ),
                );
              }}
              className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {media.map((src, i) => (
                <div
                  key={i}
                  /* 桌面把多图轮播从 4:5 压到 4:3:672px 宽的 4:5 高达 840px,
                     一屏放不下轮播 + 指示点;4:3 可整体入画,竖图 contain 留灰边 */
                  className={`flex w-full shrink-0 snap-center items-center justify-center bg-muted ${
                    media.length > 1 ? "aspect-[4/5] md:aspect-[4/3]" : ""
                  }`}
                >
                  {VIDEO_RE.test(src) ? (
                    <video
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[70vh] w-full"
                    />
                  ) : (
                    <img
                      src={src}
                      alt={post.title}
                      className={`w-full cursor-zoom-in object-contain ${
                        media.length > 1 ? "h-full" : "max-h-[70vh]"
                      }`}
                      loading={i === 0 ? "eager" : "lazy"}
                      onClick={() => {
                        const idx = imageUrls.indexOf(src);
                        if (idx >= 0) setLightboxIdx(idx);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            {media.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-2">
                {media.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 w-1 rounded-full transition-colors ${
                      i === activeImg ? "bg-foreground" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* X 式绝对时间行 */}
        <p className="mt-3 font-mono text-[13px] text-muted-foreground">
          {new Date(post.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          <span className="mx-1.5">·</span>
          {timeAgo(post.created_at, t)}
        </p>

        {/* Car info for reviews */}
        {post.type === "review" && (post.make || post.model || post.year) && (
          <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              {t("车型：")}
              {[post.year, post.make, post.model].filter(Boolean).join(" ")}
            </span>
          </div>
        )}

        {/* Comments — no scroll reveal: interactive content must never
            start hidden (Safari IntersectionObserver can fail to fire on tall
            sections / after the iOS page-transition remount) */}
        <section
          ref={commentsRef}
          className="mt-5 scroll-mt-16 border-t border-border pt-4"
        >
          <h2 className="font-mono text-xs text-muted-foreground">
            {t("共 {n} 条评论", { n: comments.length })}
          </h2>

          {/* 桌面楼层间距略放大,楼与楼的层级分隔更清晰 */}
          <div className="mt-4 space-y-4 md:mt-5 md:space-y-5">
            {commentsLoading ? (
              <p className="font-mono text-xs text-muted-foreground">
                {t("加载中...")}
              </p>
            ) : topLevel.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-muted-foreground">
                {t("暂无评论，来说两句吧")}
              </p>
            ) : (
              topLevel.map((comment) => {
                const replies = repliesByParent.get(comment.id) ?? [];
                const isExpanded = expanded.has(comment.id);
                const visibleReplies = isExpanded
                  ? replies
                  : replies.slice(0, 1);
                const hiddenCount = replies.length - visibleReplies.length;

                return (
                  <div key={comment.id}>
                    <CommentRow
                      comment={comment}
                      isReply={false}
                      userId={userId}
                      liked={likedComments.has(comment.id)}
                      onLike={() => handleCommentLike(comment)}
                      onReply={() => startReply(comment)}
                      onDelete={() => handleDeleteComment(comment.id)}
                    />
                    {replies.length > 0 && (
                      /* 桌面缩进对齐父楼正文起点:头像 32px + 间距 10px = 42px
                         (ml-10 的 40px 差 2px,小屏差异不可见故仅桌面修正) */
                      <div className="ml-10 mt-2 space-y-2 md:ml-[42px]">
                        {visibleReplies.map((reply) => (
                          <CommentRow
                            key={reply.id}
                            comment={reply}
                            isReply
                            userId={userId}
                            liked={likedComments.has(reply.id)}
                            onLike={() => handleCommentLike(reply)}
                            onReply={() => startReply(reply)}
                            onDelete={() => handleDeleteComment(reply.id)}
                          />
                        ))}
                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) =>
                                new Set(prev).add(comment.id),
                              )
                            }
                            className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <span className="h-px w-6 bg-border" aria-hidden />
                            {t("展开 {n} 条回复", { n: hiddenCount })}
                          </button>
                        )}
                        {isExpanded && replies.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                next.delete(comment.id);
                                return next;
                              })
                            }
                            className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <span className="h-px w-6 bg-border" aria-hidden />
                            {t("收起")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 相关推荐(内链)*/}
        <RelatedPosts
          postId={post.id}
          make={post.make}
          type={post.type}
          initial={initialRelated}
          className="mt-8 border-t border-border pt-5"
        />
      </main>
      {showChrome && <Footer />}

      {/* 底部固定操作栏:评论输入 + 点赞 + 评论数 */}
      <div
        className={
          embedded
            ? "absolute inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
            : "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
        }
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* 桌面底栏纵向多给一点呼吸,输入框不贴边 */}
        <div className="mx-auto w-full max-w-2xl px-4 py-2 md:py-3">
          {replyTo && (
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="truncate">{t("回复 @{name}", { name: replyTo.name })}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="flex h-4 w-4 items-center justify-center transition-colors hover:text-foreground"
                aria-label={t("取消回复")}
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            {userId ? (
              <textarea
                ref={inputRef}
                className="min-h-9 flex-1 resize-none rounded-xl bg-muted/50 px-3 py-2 font-mono text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                placeholder={
                  replyTo
                    ? t("回复 @{name}...", { name: replyTo.name })
                    : t("说点什么...")
                }
                rows={1}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
              />
            ) : (
              <Link
                href="/login"
                className="flex h-9 flex-1 items-center rounded-xl bg-muted/50 px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t("登录后参与讨论")}
              </Link>
            )}

            {content.trim() ? (
              <button
                type="button"
                onClick={handleComment}
                disabled={sending}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 font-mono text-xs text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Send className="h-3 w-3" strokeWidth={1.5} />
                )}
                {t("发送")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex shrink-0 items-center gap-1 py-2 font-mono text-xs transition-colors ${
                    liked
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart
                    className="h-4.5 w-4.5"
                    strokeWidth={1.5}
                    fill={liked ? "currentColor" : "none"}
                  />
                  <span className="tabular-nums">{likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToComments}
                  className="flex shrink-0 items-center gap-1 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MessageSquare className="h-4.5 w-4.5" strokeWidth={1.5} />
                  <span className="tabular-nums">{comments.length}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ImageLightbox
        images={imageUrls}
        initialIndex={lightboxIdx ?? 0}
        open={lightboxIdx !== null}
        onClose={() => setLightboxIdx(null)}
      />
    </div>
  );
}

function CommentRow({
  comment,
  isReply,
  userId,
  liked,
  onLike,
  onReply,
  onDelete,
}: {
  comment: DbPostComment;
  isReply: boolean;
  userId: string | null;
  liked: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  const avatarSize = isReply ? "h-6 w-6" : "h-8 w-8";
  const { t, locale } = useI18n();
  // 非中文界面显示 AI 译文(父组件批量拉取写入 other_i18n),可切回原文
  const [showOriginal, setShowOriginal] = useState(false);
  const commentNeedsTranslation = needsContentTranslation(comment.content, locale);
  const translatedContent = commentNeedsTranslation
    ? comment.other_i18n?.[locale]?.content
    : undefined;
  // 翻译在途:内容行显示 skeleton
  const commentPending = commentNeedsTranslation && comment.other_i18n?.[locale] === undefined;
  const commentIsCJK = /[一-鿿]/.test(comment.content);
  const { enabled: overlayEnabled, openUser } = useOverlay();
  const onUser = (e: React.MouseEvent) => {
    if (overlayEnabled) {
      e.preventDefault();
      openUser(comment.user_id);
    }
  };
  return (
    <div className="flex gap-2.5">
      <Link
        href={userLink(comment.user_id)}
        onClick={onUser}
        className={`${avatarSize} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-70`}
      >
        <img
          src={avatarUrl(comment.profiles?.avatar_url, comment.profiles?.username)}
          alt=""
          className="h-full w-full object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={userLink(comment.user_id)}
          onClick={onUser}
          className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {comment.profiles?.username || t("匿名")}
        </Link>
        {commentPending ? (
          <div className="mt-1 space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
            {translatedContent && !showOriginal ? translatedContent : comment.content}
          </p>
        )}
        {translatedContent && (
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span>{commentIsCJK ? t("已从中文翻译") : t("已从英文翻译")}</span>
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="text-brand-ink underline-offset-2 hover:underline"
            >
              {showOriginal ? t("显示翻译") : t("显示原文")}
            </button>
          </div>
        )}
        <div className="mt-1 flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted-foreground">
            {timeAgo(comment.created_at, t)}
          </span>
          <button
            type="button"
            onClick={onReply}
            className="font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("回复")}
          </button>
          {userId === comment.user_id && (
            <button
              type="button"
              onClick={onDelete}
              className="text-muted-foreground transition-colors hover:text-destructive"
              aria-label={t("删除评论")}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onLike}
        aria-label={liked ? t("取消点赞") : t("点赞")}
        className={`flex shrink-0 flex-col items-center gap-0.5 pt-0.5 font-mono text-[10px] transition-colors ${
          liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Heart
          className="h-3.5 w-3.5"
          strokeWidth={1.5}
          fill={liked ? "currentColor" : "none"}
        />
        <span className="tabular-nums">
          {comment.likes_count > 0 ? comment.likes_count : ""}
        </span>
      </button>
    </div>
  );
}
