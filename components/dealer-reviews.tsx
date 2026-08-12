"use client";

import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { DbDealerReview } from "@/lib/types";

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={readonly ? "cursor-default" : "cursor-pointer"}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

export function DealerReviews({ dealerId }: { dealerId: string }) {
  const [reviews, setReviews] = useState<DbDealerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<DbDealerReview | null>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function load() {
      const [reviewsRes, authRes] = await Promise.all([
        supabase
          .from("dealer_reviews")
          .select("*, profiles!dealer_reviews_user_id_profiles_fkey(username, avatar_url)")
          .eq("dealer_id", dealerId)
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);

      const all = (reviewsRes.data as DbDealerReview[]) || [];
      setReviews(all);
      setLoading(false);

      const uid = authRes.data.user?.id || null;
      setUserId(uid);

      if (uid) {
        const mine = all.find((r) => r.user_id === uid);
        if (mine) {
          setMyReview(mine);
          setRating(mine.rating);
          setContent(mine.content);
        }
      }
    }
    load();
  }, [dealerId]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  async function handleSubmit() {
    if (!userId || rating === 0 || !content.trim()) return;
    setSubmitting(true);

    if (myReview) {
      // Update existing
      const { data, error } = await supabase
        .from("dealer_reviews")
        .update({ rating, content: content.trim() })
        .eq("id", myReview.id)
        .select("*, profiles!dealer_reviews_user_id_profiles_fkey(username, avatar_url)")
        .single();
      if (!error && data) {
        const updated = data as DbDealerReview;
        setMyReview(updated);
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        setEditing(false);
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("dealer_reviews")
        .insert({
          dealer_id: dealerId,
          user_id: userId,
          rating,
          content: content.trim(),
        })
        .select("*, profiles!dealer_reviews_user_id_profiles_fkey(username, avatar_url)")
        .single();
      if (!error && data) {
        const created = data as DbDealerReview;
        setMyReview(created);
        setReviews((prev) => [created, ...prev]);
      }
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!myReview) return;
    await supabase.from("dealer_reviews").delete().eq("id", myReview.id);
    setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
    setMyReview(null);
    setRating(0);
    setContent("");
  }

  const isOwner = userId === dealerId;
  const canReview = userId && !isOwner;
  const showForm = canReview && (!myReview || editing);

  return (
    <div className="mt-8 border-t border-border pt-6">
      {/* Header with average */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm font-semibold">
          车行评价 ({reviews.length})
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating value={Math.round(avgRating)} readonly />
            <span className="font-mono text-xs font-semibold">
              {avgRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4">
          <p className="font-mono text-[11px] font-medium">
            {myReview ? "修改评价" : "写评价"}
          </p>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            className="mt-3 w-full rounded-xl bg-muted px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
            rows={3}
            placeholder="分享你与这家车行的交易体验..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 gap-1 font-mono text-[11px]"
              disabled={rating === 0 || !content.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting && (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              )}
              {myReview ? "更新评价" : "提交评价"}
            </Button>
            {editing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 font-mono text-[11px]"
                onClick={() => {
                  setEditing(false);
                  setRating(myReview!.rating);
                  setContent(myReview!.content);
                }}
              >
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* My review (read-only) */}
      {canReview && myReview && !editing && (
        <div className="mt-4 rounded-xl bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-medium">我的评价</span>
              <StarRating value={myReview.rating} readonly />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 font-mono text-[10px] text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                修改
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 font-mono text-[10px] text-destructive"
                onClick={handleDelete}
              >
                删除
              </Button>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {myReview.content}
          </p>
        </div>
      )}

      {/* Login prompt */}
      {!userId && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border p-4">
          <span className="font-mono text-xs text-muted-foreground">
            登录后可以评价此车行
          </span>
          <Link href="/login">
            <Button size="sm" className="h-7 font-mono text-[11px]">
              登录
            </Button>
          </Link>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
          暂无评价
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews
            .filter((r) => r.id !== myReview?.id)
            .map((review) => (
              <div key={review.id} className="rounded-xl bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    <img
                      src={avatarUrl(review.profiles?.avatar_url, review.profiles?.username)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">
                        {review.profiles?.username || "匿名用户"}
                      </span>
                      <StarRating value={review.rating} readonly />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {timeAgo(review.created_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                  {review.content}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
