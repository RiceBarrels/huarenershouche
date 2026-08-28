"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import Link from "@/components/localized-navigation";
import type { DbComment } from "@/lib/types";

function timeAgo(
  dateStr: string,
  t: (text: string, vars?: Record<string, string | number>) => string,
): string {
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

export function CommentSection({ carId }: { carId: string }) {
  const { t } = useI18n();
  const [comments, setComments] = useState<DbComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
    async function load() {
      const { data } = await supabase
        .from("comments")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("car_id", carId)
        .order("created_at", { ascending: true });
      setComments((data as DbComment[]) || []);
      setLoading(false);
    }
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${carId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `car_id=eq.${carId}` },
        async (payload) => {
          // Fetch the full comment with profile join
          const { data } = await supabase
            .from("comments")
            .select("*, profiles!user_id(username, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setComments((prev) => {
              if (prev.some((c) => c.id === data.id)) return prev;
              return [...prev, data as DbComment];
            });
          }
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
      supabase.removeChannel(channel);
    };
  }, [carId]);

  async function handleSubmit() {
    if (!content.trim() || !userId) return;
    setSending(true);
    const { error } = await supabase.from("comments").insert({
      car_id: carId,
      user_id: userId,
      content: content.trim(),
    });
    if (!error) {
      setContent("");
    }
    setSending(false);
    inputRef.current?.focus();
  }

  async function handleDelete(commentId: string) {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="font-mono text-sm font-semibold">
        {t("评论")} ({comments.length})
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
      </div>

      {/* Comments list — 桌面条目间距略放大,长列表扫读更省力 */}
      <div className="mt-4 space-y-3 md:mt-5 md:space-y-4">
        {loading ? (
          <p className="font-mono text-xs text-muted-foreground">{t("加载中...")}</p>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs text-muted-foreground">
            {t("暂无评论，来说两句吧")}
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
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
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {timeAgo(comment.created_at, t)}
                  </span>
                  {userId === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
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
  );
}
