"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { useI18n } from "@/components/i18n-provider";
import { needsContentTranslation } from "@/lib/i18n";
import { apiOrigin } from "@/lib/capacitor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { t, locale } = useI18n();
  const [comments, setComments] = useState<DbComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // 逐条「显示原文」切换(评论列表是内联 map,状态集中放父组件)
  const [showOriginalIds, setShowOriginalIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ---- 车源评论按需批量翻译(40/批,一次模型调用),结果合并回 comments ----
  const translating = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (comments.length === 0) return;
    // undefined = 从未尝试;失败写入 {} 标记(skeleton 收起、回退原文、不再重试)
    const need = comments.filter(
      (c) =>
        needsContentTranslation(c.content, locale) &&
        c.other_i18n?.[locale] === undefined &&
        !translating.current.has(c.id)
    );
    if (need.length === 0) return;
    const ids = need.slice(0, 40).map((c) => c.id);
    ids.forEach((id) => translating.current.add(id));
    const applyMap = (map: Record<string, { content?: string | null }>) =>
      setComments((prev) =>
        prev.map((c) =>
          map[c.id] ? { ...c, other_i18n: { ...(c.other_i18n ?? {}), [locale]: map[c.id] } } : c
        )
      );
    fetch(`${apiOrigin()}/api/translate-comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "car", ids, locale }),
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
        ids.forEach((id) => translating.current.delete(id));
      });
  }, [comments, locale]);

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
          comments.map((comment) => {
            // 非中文界面显示 AI 译文,可按条切回原文;翻译在途显示 skeleton
            const cNeeds = needsContentTranslation(comment.content, locale);
            const translated = cNeeds ? comment.other_i18n?.[locale]?.content : undefined;
            const cPending = cNeeds && comment.other_i18n?.[locale] === undefined;
            const showOrig = showOriginalIds.has(comment.id);
            return (
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
                {cPending ? (
                  <div className="mt-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap font-mono text-sm text-foreground/90">
                    {translated && !showOrig ? translated : comment.content}
                  </p>
                )}
                {translated && (
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <span>{/[一-鿿]/.test(comment.content) ? t("已从中文翻译") : t("已从英文翻译")}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setShowOriginalIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(comment.id)) next.delete(comment.id);
                          else next.add(comment.id);
                          return next;
                        })
                      }
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {showOrig ? t("显示翻译") : t("显示原文")}
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}
