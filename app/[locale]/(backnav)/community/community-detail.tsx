"use client";

// 帖子详情 — 小红书式布局:媒体轮播 → 标题/正文/话题 → 楼中楼评论 → 相关推荐,
// 底部固定操作栏(评论输入 + 点赞 + 评论数)。
// server 模式下由 [id]/page.tsx 传入 initialPost/initialRelated/initialComments,译文 bundle 由
// ContentI18nProvider 预置,SSR 直接输出界面语言的标题/正文/评论(无译文时原文 + lang,无骨架);
// 静态导出(Capacitor)/浮层模式下缺的数据客户端自行拉取,译文由 useLocalized 按显示语言读取。

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  Flag,
} from "lucide-react";
import { useRouteParams } from "@/lib/use-route-params";
import { useI18n } from "@/components/i18n-provider";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import {
  LEGACY_POST_COLUMNS,
  LEGACY_POST_COMMENT_COLUMNS,
  POST_AUTHOR_EMBED,
  POST_COLUMNS,
  POST_COMMENT_COLUMNS,
} from "@/lib/i18n/content/columns";
import { normTag } from "@/lib/i18n/hashtags";
import { useBundleRow, useLocalized, useLocalizedPrefetch } from "@/hooks/use-localized";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import { requestModeration } from "@/lib/moderation-client";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RelatedPosts } from "@/components/related-posts";
import { TopicChip } from "@/components/topic-chip";
import { Reveal } from "@/components/reveal";
import { FollowButton } from "@/components/follow-button";
import { ReportDialog } from "@/components/report-dialog";
import { useBlockedIds } from "@/lib/blocks";
import { useOverlay } from "@/components/car-overlay-provider";
import { ImageLightbox } from "@/components/image-lightbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { SITE_URL } from "@/lib/seo-pages";
import { dateLocale } from "@/lib/i18n";
import { userLink } from "@/lib/static-link";
import type { TopicLabel } from "@/lib/i18n/content/types";
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

// useSyncExternalStore 的挂载标记:服务端与水合首帧为 false,之后为 true
const subscribeNever = () => () => {};
const getMounted = () => true;
const getNotMounted = () => false;

// 帖子/评论列集;迁移 SQL 未执行时新列(含 reply_to 外键)不存在 → 旧列集重查
const POST_SELECT = `${POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;
const LEGACY_POST_SELECT = `${LEGACY_POST_COLUMNS}, ${POST_AUTHOR_EMBED}`;
const COMMENT_SELECT = `${POST_COMMENT_COLUMNS}, ${POST_AUTHOR_EMBED}, reply_to:profiles!reply_to_user_id(username)`;
const LEGACY_COMMENT_SELECT = `${LEGACY_POST_COMMENT_COLUMNS}, ${POST_AUTHOR_EMBED}`;

// 与数据库上限一致(i18n-v2.sql post_comments_text_len:评论正文 ≤ 5000 字)
const MAX_COMMENT_CHARS = 5000;

interface ReplyTarget {
  /** 楼中楼统一挂在顶层评论下(两级结构) */
  parentId: string;
  name: string;
  /** 被回复者;回复的是楼中楼里的某条回复时写入 reply_to_user_id,界面渲染「回复 @xxx」 */
  userId: string;
  isNested: boolean;
}

export default function CommunityDetailPage({
  initialPost = null,
  initialRelated,
  initialComments,
  embedded = false,
  onClose,
}: {
  initialPost?: DbCommunityPost | null;
  initialRelated?: DbCommunityPost[];
  // SSR 预取的前若干条可见评论(server 模式);浮层/静态导出模式不传,客户端自行拉取
  initialComments?: DbPostComment[];
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
  const [comments, setComments] = useState<DbPostComment[]>(initialComments ?? []);
  const [loading, setLoading] = useState(!initialPost);
  const [commentsLoading, setCommentsLoading] = useState(!initialComments);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialPost?.likes_count ?? 0);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  // AI 审核拦截 / 发送失败提示(展示在输入框上方)
  const [modNotice, setModNotice] = useState("");
  const [tableError, setTableError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentsRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // 标题/正文按界面语言显示(SSR 由 ContentI18nProvider 预置译文;无译文显示原文并标 lang),
  // 「显示原文」切换在 view 里;正文 #话题 与标签 chip 用 bundle 里的话题名
  const view = useLocalized("post", post?.id, { title: post?.title, content: post?.content });
  const topics = useBundleRow("post", post?.id)?.x?.topics;
  // 绝对发帖时间按访客时区格式化,服务端(UTC)的结果必与水合不一致:只在挂载后输出
  const mounted = useSyncExternalStore(subscribeNever, getMounted, getNotMounted);

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
      const byId = (cols: string) =>
        supabase.from("community_posts").select(cols).eq("id", postId).single();
      let { data, error } = await byId(POST_SELECT);
      if (error && isMissingColumnError(error)) ({ data, error } = await byId(LEGACY_POST_SELECT));

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
        const row = data as unknown as DbCommunityPost;
        setPost(row);
        setLikeCount(row.likes_count || 0);
      }
    }

    loadPost()
      .catch((err) => console.error("Failed to load post:", err))
      .finally(() => setLoading(false));
  }, [postId, initialPost]);

  // Load comments:SSR 已带全部可见评论则不重复拉;评论数多于 SSR 条数(长楼)时后台补全
  useEffect(() => {
    if (!postId) return;
    if (initialComments && initialComments.length >= (initialPost?.comments_count ?? 0)) return;
    let cancelled = false;

    async function loadComments() {
      const run = (cols: string, activeOnly: boolean) => {
        const query = supabase
          .from("post_comments")
          .select(cols)
          .eq("post_id", postId)
          .order("created_at", { ascending: true });
        return activeOnly ? query.eq("status", "active") : query;
      };
      let { data, error } = await run(COMMENT_SELECT, true);
      // 迁移 SQL 未执行:status / reply_to 列与外键都不存在 → 旧列集、不按状态过滤
      if (error && isMissingColumnError(error)) ({ data, error } = await run(LEGACY_COMMENT_SELECT, false));
      if (cancelled) return;

      if (!error) {
        setComments((data as unknown as DbPostComment[]) || []);
      } else if (!initialComments) {
        // Table may not exist
        setComments([]);
      }
    }

    loadComments()
      .catch((err) => console.error("Failed to load comments:", err))
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, initialComments, initialPost?.comments_count]);

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
    // 只在评论条数变化时重查(点赞改计数不触发);SSR 评论 + 长楼补全后也能拿到全部点赞状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, commentsLoading, comments.length]);

  // 被屏蔽用户的评论、AI 审核屏蔽的评论不展示(blocks 表 / status 列)
  const { blockedIds } = useBlockedIds();
  const visibleComments = useMemo(
    () => comments.filter((c) => !blockedIds.has(c.user_id) && c.status !== "blocked"),
    [comments, blockedIds],
  );
  // 可见评论的译文合并成批量 bundle 请求(被屏蔽的不请求)
  const visibleCommentIds = useMemo(() => visibleComments.map((c) => c.id), [visibleComments]);
  useLocalizedPrefetch("post_comment", visibleCommentIds);

  // 楼中楼结构:顶层 + 按 parent_id 分组的回复
  const topLevel = useMemo(
    () => visibleComments.filter((c) => !c.parent_id),
    [visibleComments],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, DbPostComment[]>();
    for (const c of visibleComments) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [visibleComments]);

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
      userId: target.user_id,
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
    setModNotice("");

    const text = content.trim();
    const base = { post_id: postId, user_id: userId, parent_id: replyTo?.parentId ?? null };
    // 楼中楼回复:被回复者存 reply_to_user_id,「回复 @xx」由界面按语言渲染,不写进正文
    let { data, error } = await supabase
      .from("post_comments")
      .insert({ ...base, content: text, reply_to_user_id: replyTo?.isNested ? replyTo.userId : null })
      .select(COMMENT_SELECT)
      .single();
    // 迁移 SQL 未执行时没有 reply_to_* 列:按旧版格式把「回复 @xx：」前缀写进正文
    if (error && isMissingColumnError(error)) {
      const legacyContent =
        replyTo?.isNested && !text.startsWith("回复 @") ? `回复 @${replyTo.name}：${text}` : text;
      ({ data, error } = await supabase
        .from("post_comments")
        .insert({ ...base, content: legacyContent })
        .select(LEGACY_COMMENT_SELECT)
        .single());
    }

    if (!error && data) {
      const row = data as unknown as DbPostComment;
      setComments((prev) => [...prev, row]);
      if (replyTo) {
        setExpanded((prev) => new Set(prev).add(replyTo.parentId));
      }
      setContent("");
      setReplyTo(null);
      // AI 审核(不阻塞发送):违规评论就地屏蔽并从列表移除
      requestModeration("post_comment", row.id).then((mod) => {
        if (mod.blocked) {
          setComments((prev) => prev.filter((c) => c.id !== row.id));
          setModNotice(t("评论涉嫌违规，已被系统拦截"));
        }
      });
    } else {
      // 写入失败(网络、权限等):保留输入内容并提示,用户可直接重试
      setModNotice(t("提交失败，请稍后再试"));
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
    // 分享线上带语言前缀的地址(原生端为显示语言);原生壳/浮层里 window.location 不是帖子页
    const url = `${SITE_URL}/${locale}/community/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: view.shown.title, url });
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

  // 帖子自带的标签按归一化 key 对上 bundle 话题(正文里的 #话题 由 LocalizedText 渲染,不重复成 chip)。
  // 按话题去重:只差大小写/空格的写法(Model 3 / model3)对应同一条 bundle 话题,
  // 不同写法解析到同一话题(特斯拉 / Tesla)时指向同一话题页,都只出一个 chip
  const topicByNorm = new Map((topics ?? []).map((topic) => [topic.norm, topic]));
  const tagChips = new Map<string, TopicLabel | { raw: string }>();
  for (const raw of post.tags ?? []) {
    const norm = normTag(raw);
    const topic = norm ? topicByNorm.get(norm) : undefined;
    const key = topic?.slug ? `t:${topic.slug}` : `r:${norm ?? raw}`;
    if (!tagChips.has(key)) tagChips.set(key, topic ?? { raw });
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
            {userId !== post.user_id && (
              <ReportDialog targetType="post" targetId={post.id}>
                <button
                  type="button"
                  aria-label={t("举报此帖子")}
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </ReportDialog>
            )}
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
            需要更松的行距才不显拥挤(行宽由 max-w-2xl 保证,刻意不拉宽)。
            SSR 即输出可见正文(译文或带 lang 的原文),ssrVisible 不从隐藏态开始 */}
        <Reveal ssrVisible>
          {/* 翻译标注 + 显示原文切换(仅确实显示了译文时出现;翻译中仅挂载后提示) */}
          <TranslationNotice view={view} className="mt-3" />
          <LocalizedText
            view={view}
            field="title"
            as="h1"
            className="mt-3 font-mono text-lg font-bold leading-snug md:text-xl"
          />
          <LocalizedText
            view={view}
            field="content"
            as="div"
            hashtags
            topics={topics}
            className="mt-1.5 whitespace-pre-wrap font-mono text-[15px] leading-relaxed text-foreground md:mt-2 md:leading-[1.8]"
          />
        </Reveal>

        {/* 标签:按 bundle 话题显示当前语言的话题名(未解析的显示原始标签),
            点击进话题页 / 社区搜索(TopicChip 会先清浮层栈) */}
        {tagChips.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 font-mono text-sm">
            {[...tagChips].map(([key, topic]) => (
              <TopicChip key={key} topic={topic} />
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
                      alt={view.shown.title}
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

        {/* X 式绝对时间行:绝对时间挂载后才出现(见 mounted);
            相对时间在服务端渲染与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
        <p className="mt-3 font-mono text-[13px] text-muted-foreground" suppressHydrationWarning>
          {mounted && (
            <>
              {new Date(post.created_at).toLocaleString(dateLocale(locale), {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <span className="mx-1.5">·</span>
            </>
          )}
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

        {/* Comments — interactive content must never start hidden (Safari
            IntersectionObserver can fail to fire on tall sections / after the
            iOS page-transition remount): ssrVisible starts visible, SSR included */}
        <section
          ref={commentsRef}
          className="mt-5 scroll-mt-16 border-t border-border pt-4"
        >
          <h2 className="font-mono text-xs text-muted-foreground">
            {t("共 {n} 条评论", { n: visibleComments.length })}
          </h2>

          {/* 桌面楼层间距略放大,楼与楼的层级分隔更清晰 */}
          <Reveal ssrVisible className="mt-4 space-y-4 md:mt-5 md:space-y-5">
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
          </Reveal>
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
          {modNotice && (
            <p className="mb-1.5 font-mono text-[11px] text-red-600 dark:text-red-400">{modNotice}</p>
          )}
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
                maxLength={MAX_COMMENT_CHARS}
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
                  <span className="tabular-nums">{visibleComments.length}</span>
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
  const { t } = useI18n();
  // 评论正文按界面语言显示(父组件批量预取 bundle;无译文显示原文并标 lang),可切回原文
  const view = useLocalized("post_comment", comment.id, { content: comment.content });
  // 楼中楼回复对象:优先关联出的当前用户名(改名后仍正确),其次写入时记录的名字
  const replyName = comment.reply_to?.username ?? comment.reply_to_name;
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
        <p className="mt-0.5 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
          {replyName && (
            <span className="mr-1.5 text-muted-foreground">
              {t("回复 @{name}", { name: replyName })}
            </span>
          )}
          <LocalizedText view={view} field="content" as="span" />
        </p>
        <TranslationNotice view={view} className="mt-0.5" />
        <div className="mt-1 flex items-center gap-3">
          {/* 相对时间在服务端渲染与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
          <span className="font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
            {timeAgo(comment.created_at, t)}
          </span>
          <button
            type="button"
            onClick={onReply}
            className="font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("回复")}
          </button>
          {userId === comment.user_id ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-muted-foreground transition-colors hover:text-destructive"
              aria-label={t("删除评论")}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          ) : (
            <ReportDialog targetType="post_comment" targetId={comment.id}>
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("举报此评论")}
              >
                <Flag className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </ReportDialog>
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
