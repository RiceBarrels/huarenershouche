"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2, Send, Loader2, Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestModeration } from "@/lib/moderation-client";
import { avatarUrl } from "@/lib/avatar";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/report-dialog";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import { useLocalized, useLocalizedPrefetch } from "@/hooks/use-localized";
import {
  CAR_COMMENT_COLUMNS,
  LEGACY_CAR_COMMENT_COLUMNS,
  POST_AUTHOR_EMBED,
} from "@/lib/i18n/content/columns";
import type { TFn } from "@/lib/i18n/content/types";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { useBlockedIds } from "@/lib/blocks";
import Link from "@/components/localized-navigation";
import type { DbComment } from "@/lib/types";

// 与数据库上限一致(i18n-v2.sql comments_text_len:评论正文 ≤ 5000 字)
const MAX_COMMENT_CHARS = 5000;

function timeAgo(dateStr: string, t: TFn): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("刚刚");
  if (mins < 60) return t("{n}分钟前", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("{n}小时前", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("{n}天前", { n: days });
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

// AI 审核屏蔽的评论不展示(status 列在 i18n-v2.sql 之前不存在,旧行没有该字段)
function isShown(c: DbComment): boolean {
  return c.status !== "blocked";
}

// 列集带 status(作者 join 与帖子评论同形);i18n-v2.sql 未执行(列不存在)时退回旧列集。
// 出错返回 null,调用方保留现有列表
async function fetchCarComments(carId: string): Promise<DbComment[] | null> {
  const query = (columns: string) =>
    supabase
      .from("comments")
      .select(`${columns}, ${POST_AUTHOR_EMBED}`)
      .eq("car_id", carId)
      .order("created_at", { ascending: true });
  let { data, error } = await query(CAR_COMMENT_COLUMNS);
  if (error && isMissingColumnError(error)) ({ data, error } = await query(LEGACY_CAR_COMMENT_COLUMNS));
  return error ? null : ((data as DbComment[] | null) ?? []);
}

async function fetchCarComment(id: string): Promise<DbComment | null> {
  const query = (columns: string) =>
    supabase.from("comments").select(`${columns}, ${POST_AUTHOR_EMBED}`).eq("id", id).maybeSingle();
  let { data, error } = await query(CAR_COMMENT_COLUMNS);
  if (error && isMissingColumnError(error)) ({ data, error } = await query(LEGACY_CAR_COMMENT_COLUMNS));
  return error ? null : ((data as DbComment | null) ?? null);
}

export function CommentSection({
  carId,
  initialComments,
}: {
  carId: string;
  // 服务端预取的首批评论(随详情页 SSR 直出,译文由 ContentI18nProvider 预置)
  initialComments?: DbComment[];
}) {
  const { t } = useI18n();
  const [comments, setComments] = useState<DbComment[]>(() => (initialComments ?? []).filter(isShown));
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(!initialComments);
  const [sending, setSending] = useState(false);
  // 输入框下方的红字提示:AI 审核拦截(评论已被屏蔽)或发送失败
  const [modNotice, setModNotice] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 有 SSR 首批时也补拉一次:SSR 只带前 20 条,这里补全并以最新数据为准
    fetchCarComments(carId).then((rows) => {
      if (cancelled) return;
      if (rows) setComments(rows.filter(isShown));
      setLoading(false);
    });

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${carId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `car_id=eq.${carId}` },
        async (payload) => {
          // Fetch the full comment with profile join
          const row = await fetchCarComment(String(payload.new.id));
          if (cancelled || !row || !isShown(row)) return;
          setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments", filter: `car_id=eq.${carId}` },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [carId]);

  async function handleSubmit() {
    if (!content.trim() || !userId) return;
    setSending(true);
    setModNotice("");
    const { data, error } = await supabase
      .from("comments")
      .insert({
        car_id: carId,
        user_id: userId,
        content: content.trim(),
      })
      .select("id")
      .single();
    if (!error) {
      setContent("");
      // AI 审核(不阻塞发送):违规评论就地屏蔽并从列表移除;通过后服务端顺带排队翻译
      if (data) {
        requestModeration("car_comment", data.id).then((mod) => {
          if (mod.blocked) {
            setComments((prev) => prev.filter((c) => c.id !== data.id));
            setModNotice(t("评论涉嫌违规，已被系统拦截"));
          }
        });
      }
    } else {
      // 写入失败(网络、权限等):保留输入内容并提示,用户可直接重试
      setModNotice(t("提交失败，请稍后再试"));
    }
    setSending(false);
    inputRef.current?.focus();
  }

  async function handleDelete(commentId: string) {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  // 被屏蔽用户的评论不展示(blocks 表),也不为它们请求译文
  const { blockedIds } = useBlockedIds();
  const visibleComments = comments.filter((c) => !blockedIds.has(c.user_id));
  // 一次批量取齐可见评论的译文(每条评论各自的 useLocalized 复用同一份缓存)
  useLocalizedPrefetch(
    "car_comment",
    visibleComments.map((c) => c.id),
  );

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="font-mono text-sm font-semibold">
        {t("评论")} ({visibleComments.length})
      </h2>

      {/* Comment input */}
      <div className="mt-4">
        {userId ? (
          /* 桌面:输入框与发送键间距放宽,与下方评论列表 gap-3 的节奏对齐 */
          <div className="flex gap-2 md:gap-3">
            <textarea
              ref={inputRef}
              className="flex-1 resize-none rounded-xl bg-muted px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
              placeholder={t("写评论...")}
              rows={2}
              maxLength={MAX_COMMENT_CHARS}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              size="sm"
              className="h-auto self-end gap-1 font-mono text-xs"
              onClick={handleSubmit}
              disabled={!content.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              ) : (
                <Send className="h-3 w-3" strokeWidth={1.5} />
              )}
              {t("发送")}
            </Button>
          </div>
        ) : (
          <Link href="/login" className="block w-full rounded-xl border border-dashed border-border px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            {t("登录后发表评论")}
          </Link>
        )}
        {modNotice && (
          <p className="mt-1.5 font-mono text-[11px] text-red-600 dark:text-red-400">{modNotice}</p>
        )}
      </div>

      {/* Comments list — 桌面条目间距略放大,长列表扫读更省力 */}
      <div className="mt-4 space-y-3 md:mt-5 md:space-y-4">
        {loading ? (
          <p className="font-mono text-xs text-muted-foreground">{t("加载中...")}</p>
        ) : visibleComments.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs text-muted-foreground">
            {t("暂无评论，来说两句吧")}
          </p>
        ) : (
          visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              own={userId === comment.user_id}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

// 单条评论:原文或当前语言译文直出,译文时附「已从 X 翻译 · 显示原文」逐条切换
function CommentItem({
  comment,
  own,
  onDelete,
}: {
  comment: DbComment;
  own: boolean;
  onDelete: (commentId: string) => void;
}) {
  const { t } = useI18n();
  const view = useLocalized("car_comment", comment.id, { content: comment.content });

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
        <img
          src={avatarUrl(comment.profiles?.avatar_url, comment.profiles?.username)}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium">
            {comment.profiles?.username || t("匿名")}
          </span>
          {/* 相对时间在服务端渲染与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
          <span className="font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
            {timeAgo(comment.created_at, t)}
          </span>
          {own ? (
            <button
              onClick={() => onDelete(comment.id)}
              className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          ) : (
            <ReportDialog targetType="car_comment" targetId={comment.id}>
              <button
                type="button"
                className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t("举报此评论")}
              >
                <Flag className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </ReportDialog>
          )}
        </div>
        <LocalizedText
          view={view}
          field="content"
          as="p"
          className="mt-0.5 whitespace-pre-wrap font-mono text-sm text-foreground/90"
        />
        <TranslationNotice view={view} className="mt-0.5" />
      </div>
    </div>
  );
}
