"use client";

// 社区帖子卡片(X 式):社区信息流、话题页、用户主页与车详情「车主口碑」等处共用。
// 标题/正文按界面语言显示译文(useLocalized 读 i18n_bundle,无译文时显示原文并标 lang),
// 带「已从X翻译 · 显示原文」切换;使用方用 useLocalizedPrefetch 批量预取可见卡片。

import { Play, MessageCircle, Heart, Share } from "lucide-react";
import Link from "@/components/localized-navigation";
import { useRouter } from "@/components/localized-navigation";
import { useI18n } from "@/components/i18n-provider";
import { useOverlay } from "@/components/car-overlay-provider";
import { useBundleRow, useLocalized } from "@/hooks/use-localized";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import { avatarUrl } from "@/lib/avatar";
import { timeAgo } from "@/lib/format";
import { SITE_URL } from "@/lib/seo-pages";
import { communityPostLink, userLink } from "@/lib/static-link";
import type { DbCommunityPost } from "@/lib/types";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;
function isVideoUrl(url: string): boolean {
  return VIDEO_RE.test(url);
}

export function PostCard({
  post,
  liked = false,
  onLike,
}: {
  post: DbCommunityPost;
  liked?: boolean;
  /** 不传则点赞为只读展示(如车详情口碑模块) */
  onLike?: () => void;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { enabled: overlayEnabled, openPost, openUser } = useOverlay();
  const media = post.images || [];
  const shown = media.slice(0, 4);
  // 译文/原文与「显示原文」切换都由 useLocalized 管理;#话题 按 bundle 里的话题名显示
  const view = useLocalized("post", post.id, { title: post.title, content: post.content });
  const topics = useBundleRow("post", post.id)?.x?.topics;

  // 点头像/名字进作者主页(浮层可用时用浮层)
  function goProfile(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (overlayEnabled) openUser(post.user_id);
    else router.push(userLink(post.user_id));
  }

  return (
    <Link
      href={communityPostLink(post.id)}
      onClick={(e) => {
        // 移动端:在当前页浮层打开(从卡片放大);桌面端正常跳转
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openPost(post, { top: r.top, left: r.left, width: r.width, height: r.height }, e.currentTarget.outerHTML, e.currentTarget);
        }
      }}
      /* 桌面:hover 细描边 + 点按变深,鼠标环境下给出更明确的可点击反馈(工具感 1px 边,非发光) */
      className="block p-3 bg-card rounded-xl transition-colors hover:bg-muted/30 md:ring-1 md:ring-transparent md:hover:ring-border/70 md:active:bg-muted/50"
    >
      <div className="flex gap-3">
        {/* 头像列 */}
        <button
          type="button"
          onClick={goProfile}
          aria-label={t("查看主页")}
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
        >
          <img
            src={avatarUrl(post.profiles?.avatar_url, post.profiles?.username)}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>

        <div className="min-w-0 flex-1 pr-3 pt-1">
          {/* X 式头部行:名字 · 时间(类型收进正文右上不再占位) */}
          <div className="flex items-center gap-1 font-mono text-[15px] leading-5">
            <button
              type="button"
              onClick={goProfile}
              className="min-w-0 truncate font-bold text-foreground hover:underline"
            >
              {post.profiles?.username || t("匿名")}
            </button>
            {/* 相对时间在服务端渲染(话题页、用户主页)与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
            <span className="shrink-0 text-muted-foreground" suppressHydrationWarning>
              · {timeAgo(post.created_at, t)}
            </span>
          </div>

          {/* 正文:X 式全色文字,标题加粗、内容常规 */}
          {/* 翻译标注 + 显示原文切换(卡片在 Link 里,按钮要阻止跳转) */}
          <TranslationNotice view={view} stopPropagation className="mt-1" />
          {post.title && (
            <LocalizedText
              view={view}
              field="title"
              as="h3"
              className="font-mono text-[15px] font-semibold leading-snug text-foreground py-2"
            />
          )}
          {post.content && (
            <LocalizedText
              view={view}
              field="content"
              as="p"
              hashtags
              topics={topics}
              className="mt-0.5 line-clamp-4 whitespace-pre-line font-mono text-[15px] leading-relaxed text-foreground"
            />
          )}

          {/* 媒体:单图原比例,多图 2 列网格,超过 4 张盖 +N;X 式细描边圆角 */}
          {shown.length > 0 && (
            <div
              className={`mt-2.5 overflow-hidden rounded-2xl ring-1 ring-border/60 ${
                shown.length > 1 ? "grid grid-cols-2 gap-0.5" : ""
              } ${shown.length === 3 ? "grid-rows-2" : ""}`}
            >
              {shown.map((url, i) => {
                const spanFirst = shown.length === 3 && i === 0;
                return (
                  <div
                    key={i}
                    className={`relative bg-muted ${
                      shown.length === 1 ? "" : spanFirst ? "row-span-2 h-full" : "aspect-square"
                    }`}
                  >
                    {isVideoUrl(url) ? (
                      <>
                        <video
                          src={url}
                          muted
                          playsInline
                          preload="metadata"
                          className={`w-full object-cover ${shown.length === 1 ? "max-h-[420px]" : "h-full"}`}
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                            <Play className="ml-0.5 h-4 w-4 fill-white text-white" strokeWidth={1.5} />
                          </span>
                        </span>
                      </>
                    ) : (
                      <img
                        src={url}
                        alt=""
                        className={`w-full object-cover ${shown.length === 1 ? "max-h-[420px]" : "h-full"}`}
                        loading="lazy"
                      />
                    )}
                    {i === 3 && media.length > 4 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-mono text-sm font-medium text-white">
                        +{media.length - 4}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* X 式操作行:评论 / 点赞 / 分享,横向铺开 */}
          <div className="mt-2 flex max-w-xs items-center justify-start gap-4 text-muted-foreground">
            <span className="group flex items-center font-mono text-[13px] transition-colors hover:text-brand-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-primary/30">
                <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </span>
              {post.comments_count || 0}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLike?.();
              }}
              aria-label={liked ? t("取消点赞") : t("点赞")}
              className={`group flex items-center gap-1 font-mono text-[13px] transition-colors ${
                liked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${liked ? "" : "group-hover:bg-red-500/10"}`}>
                <Heart className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} strokeWidth={1.5} />
              </span>
              {post.likes_count || 0}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 分享线上带语言前缀的地址(原生端为显示语言),不用 window.location(原生壳是本地页)
                const url = `${SITE_URL}/${locale}/community/${post.id}`;
                if (navigator.share) {
                  navigator.share({ title: view.shown.title, url }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(url).catch(() => {});
                }
              }}
              aria-label={t("分享")}
              className="group flex items-center font-mono text-[13px] transition-colors hover:text-brand-ink"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-primary/30">
                <Share className="h-4 w-4" strokeWidth={1.5} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
