"use client";

// 车行评价:用户主页「评价」tab 与车详情(卖家为车行时)共用。
// 正文是评价者原文,按界面语言显示 DB 翻译管线的译文(useLocalized),带「已从 X 翻译 · 显示原文」;
// AI 审核屏蔽(status = blocked)的评价不公开展示,作者本人仍能看到并修改/删除自己的那条。

import { useEffect, useMemo, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { requestModeration } from "@/lib/moderation-client";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { invalidateEntries } from "@/lib/i18n/content/store";
import { useLocalized, useLocalizedPrefetch } from "@/hooks/use-localized";
import { useI18n } from "@/components/i18n-provider";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import { Button } from "@/components/ui/button";
import Link from "@/components/localized-navigation";
import type { DbDealerReview } from "@/lib/types";

const REVIEW_SELECT = "*, profiles!dealer_reviews_user_id_profiles_fkey(username, avatar_url)";

// /user/[id]/reviews 服务端首屏注入的条数(须与该页 limit 一致):注入满一页说明可能还有更早的,挂载后补齐
const SSR_PAGE_SIZE = 20;

// 与数据库上限一致(i18n-v2.sql dealer_reviews_text_len:评价正文 ≤ 5000 字)
const MAX_REVIEW_CHARS = 5000;

/** 车行的公开评价(新→旧,从第 offset 条起);status 列未建(迁移前)时退回不带过滤的旧查询 */
async function fetchPublicReviews(dealerId: string, offset: number): Promise<DbDealerReview[]> {
  const run = (activeOnly: boolean) => {
    let query = supabase.from("dealer_reviews").select(REVIEW_SELECT).eq("dealer_id", dealerId);
    if (activeOnly) query = query.eq("status", "active");
    return query.order("created_at", { ascending: false }).range(offset, offset + 999);
  };
  let res = await run(true);
  if (res.error && isMissingColumnError(res.error)) res = await run(false);
  return ((res.data as DbDealerReview[] | null) ?? []).filter((r) => r.status !== "blocked");
}

/** 我对该车行的评价(不论审核状态):找得到才能修改/删除,也避免重复评价 */
async function fetchMyReview(dealerId: string, uid: string): Promise<DbDealerReview | null> {
  const { data } = await supabase
    .from("dealer_reviews")
    .select(REVIEW_SELECT)
    .eq("dealer_id", dealerId)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DbDealerReview | null) ?? null;
}

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
  const months = Math.floor(days / 30);
  if (months < 12) return t("{n}个月前", { n: months });
  return t("{n}年前", { n: Math.floor(months / 12) });
}

/** 他人的一条评价:正文按界面语言显示译文,可切回原文 */
function ReviewCard({ review }: { review: DbDealerReview }) {
  const { t } = useI18n();
  const view = useLocalized("dealer_review", review.id, { content: review.content });
  return (
    <div className="rounded-xl bg-card p-4">
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
              {review.profiles?.username || t("匿名用户")}
            </span>
            <StarRating value={review.rating} readonly />
          </div>
          {/* 相对时间在服务端渲染(/user/[id]/reviews)与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
          <span className="font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
            {timeAgo(review.created_at, t)}
          </span>
        </div>
      </div>
      <LocalizedText
        view={view}
        field="content"
        as="p"
        className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground"
      />
      <TranslationNotice view={view} className="mt-1.5" />
    </div>
  );
}

export function DealerReviews({
  dealerId,
  initialReviews,
}: {
  dealerId: string;
  // 服务端预取的首屏公开评价(/user/[id]/reviews 注入,SSR 直出利于 SEO);不传则客户端拉取
  initialReviews?: DbDealerReview[];
}) {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<DbDealerReview[]>(initialReviews ?? []);
  const [loading, setLoading] = useState(!initialReviews);
  const [userId, setUserId] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<DbDealerReview | null>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // 已注入首屏:只在注入满一页时补齐更早的评价;未注入则整表在客户端拉取
    const offset = initialReviews?.length ?? 0;
    const needList = !initialReviews || offset >= SSR_PAGE_SIZE;
    async function load() {
      const [rows, authRes] = await Promise.all([
        needList ? fetchPublicReviews(dealerId, offset) : null,
        supabase.auth.getUser(),
      ]);
      if (cancelled) return;
      if (rows) {
        setReviews((prev) => {
          if (offset === 0) return rows;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }
      setLoading(false);

      const uid = authRes.data.user?.id || null;
      setUserId(uid);
      // 车行本人不能评价自己
      const mine = uid && uid !== dealerId ? await fetchMyReview(dealerId, uid) : null;
      if (cancelled) return;
      // 查询期间刚提交的那条(同一车行)以本地为准,避免被较早发出的查询结果覆盖
      setMyReview((prev) => (prev?.dealer_id === dealerId ? prev : mine));
      if (mine) {
        setRating(mine.rating);
        setContent(mine.content);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dealerId, initialReviews]);

  // 列表评价的译文一次批量请求(每条卡片自己的 useLocalized 读同一份缓存)
  const reviewIds = useMemo(() => reviews.map((r) => r.id), [reviews]);
  useLocalizedPrefetch("dealer_review", reviewIds);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // AI 审核(不阻塞提交;通过后服务端立即翻译):违规评价移出公开列表,作者本人那条标为已拦截
  function moderate(id: string) {
    requestModeration("dealer_review", id).then((mod) => {
      if (!mod.blocked) return;
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setMyReview((prev) => (prev?.id === id ? { ...prev, status: "blocked" } : prev));
    });
  }

  async function handleSubmit() {
    if (!userId || rating === 0 || !content.trim()) return;
    setSubmitting(true);
    setSubmitError("");

    if (myReview) {
      // Update existing
      const { data, error } = await supabase
        .from("dealer_reviews")
        .update({ rating, content: content.trim() })
        .eq("id", myReview.id)
        .select(REVIEW_SELECT)
        .single();
      if (!error && data) {
        const updated = data as DbDealerReview;
        if (updated.content !== myReview.content) {
          // 原文变了:旧译文作废(管线重新审核 + 翻译,缓存重新拉取)
          invalidateEntries("dealer_review", [updated.id]);
          moderate(updated.id);
        }
        setMyReview(updated);
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        setEditing(false);
      } else {
        // 写入失败(网络、权限等):保留表单内容并提示,用户可直接重试
        setSubmitError(t("提交失败，请稍后再试"));
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
        .select(REVIEW_SELECT)
        .single();
      if (!error && data) {
        const created = data as DbDealerReview;
        setMyReview(created);
        setReviews((prev) => [created, ...prev]);
        moderate(created.id);
      } else {
        setSubmitError(t("提交失败，请稍后再试"));
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
          {t("车行评价")} ({reviews.length})
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
            {myReview ? t("修改评价") : t("写评价")}
          </p>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            className="mt-3 w-full rounded-xl bg-muted px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
            rows={3}
            placeholder={t("分享你与这家车行的交易体验...")}
            maxLength={MAX_REVIEW_CHARS}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {submitError && (
            <p className="mt-1 font-mono text-[10px] text-destructive">{submitError}</p>
          )}
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
              {myReview ? t("更新评价") : t("提交评价")}
            </Button>
            {editing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 font-mono text-[11px]"
                onClick={() => {
                  setEditing(false);
                  setSubmitError("");
                  setRating(myReview!.rating);
                  setContent(myReview!.content);
                }}
              >
                {t("取消")}
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
              <span className="font-mono text-xs font-medium">{t("我的评价")}</span>
              <StarRating value={myReview.rating} readonly />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 font-mono text-[10px] text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                {t("修改")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 font-mono text-[10px] text-destructive"
                onClick={handleDelete}
              >
                {t("删除")}
              </Button>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {myReview.content}
          </p>
          {myReview.status === "blocked" && (
            <p className="mt-2 font-mono text-[10px] text-destructive">
              {t("内容涉嫌违反社区规范，已被系统拦截，将由管理员复核")}
            </p>
          )}
        </div>
      )}

      {/* Login prompt */}
      {!userId && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border p-4">
          <span className="font-mono text-xs text-muted-foreground">
            {t("登录后可以评价此车行")}
          </span>
          <Link href="/login">
            <Button size="sm" className="h-7 font-mono text-[11px]">
              {t("登录")}
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
          {t("暂无评价")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews
            .filter((r) => r.id !== myReview?.id)
            .map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
        </div>
      )}
    </div>
  );
}
