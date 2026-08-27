"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import type { DbPlatformReview } from "@/lib/types";

interface SeedReview {
  id: string;
  rating: number;
  content: string;
  reviewer: string;
  transactionType: "购车" | "卖车";
  date: string; // ISO date of the review
}

const SEED_REVIEWS: SeedReview[] = [
  {
    id: "r1",
    rating: 5,
    content:
      "在这里找到了一辆低里程的丰田凯美瑞，价格比Carvana便宜两千多。卖家是华人车行，沟通很顺畅，整个交易过程很放心。",
    reviewer: "kevinz626",
    transactionType: "购车",
    date: "2026-07-06",
  },
  {
    id: "r2",
    rating: 5,
    content:
      "发布车辆后第二天就有人来看车，一周内就卖掉了。中文平台确实方便，不用在Craigslist上跟人来回解释。",
    reviewer: "老周",
    transactionType: "卖车",
    date: "2026-07-01",
  },
  {
    id: "r3",
    rating: 4,
    content:
      "VIN查询功能很实用，买车前查到了一条未公开的召回记录，避免了不少麻烦。整体体验不错。",
    reviewer: "Ethan L.",
    transactionType: "购车",
    date: "2026-06-24",
  },
  {
    id: "r4",
    rating: 5,
    content:
      "从纽约搬到加州，在这个平台上找到了一辆合适的二手车。按距离筛选很方便，卖家就在附近。",
    reviewer: "xy_2019",
    transactionType: "购车",
    date: "2026-06-17",
  },
  {
    id: "r5",
    rating: 4,
    content:
      "车行入驻后生意明显好了，不少客户都是通过平台找过来的。免费发布很良心，希望能加个微信推送功能。",
    reviewer: "SunriseAuto",
    transactionType: "卖车",
    date: "2026-06-05",
  },
  {
    id: "r6",
    rating: 5,
    content:
      "第一次在美国买车，全中文界面让我安心很多。降价提醒帮我省了$1,500，非常推荐给刚来美国的朋友。",
    reviewer: "yuchen_w",
    transactionType: "购车",
    date: "2026-05-28",
  },
];

function formatTimeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

// 统一渲染用的评价条目（种子数据 + 数据库真实评价）
interface DisplayReview {
  id: string;
  rating: number;
  content: string;
  reviewer: string;
  avatarUrl: string | null;
  transactionType: "购车" | "卖车";
  date: string;
  isOwn: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < rating
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground/30"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)}>
          <Star
            className={`h-5 w-5 transition-colors ${
              i <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30 hover:text-amber-500"
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export function TrustReviews() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dbReviews, setDbReviews] = useState<DbPlatformReview[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [transactionType, setTransactionType] = useState<"购车" | "卖车">("购车");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase
      .from("platform_reviews")
      .select("*, profiles!user_id(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setDbReviews((data as DbPlatformReview[]) || []));
  }, []);

  const ownReview = dbReviews.find((r) => r.user_id === userId);

  const reviews: DisplayReview[] = [
    ...dbReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      reviewer: r.profiles?.username || "用户",
      avatarUrl: r.profiles?.avatar_url ?? null,
      transactionType: (r.transaction_type === "sell" ? "卖车" : "购车") as "购车" | "卖车",
      date: r.created_at,
      isOwn: r.user_id === userId,
    })),
    ...SEED_REVIEWS.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      reviewer: r.reviewer,
      avatarUrl: null,
      transactionType: r.transactionType,
      date: r.date,
      isOwn: false,
    })),
  ];

  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
  ).toFixed(1);

  function openForm() {
    if (ownReview) {
      setRating(ownReview.rating);
      setContent(ownReview.content);
      setTransactionType(ownReview.transaction_type === "sell" ? "卖车" : "购车");
    }
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!userId || content.trim().length < 10) return;
    setSending(true);
    setError("");
    const payload = {
      user_id: userId,
      rating,
      content: content.trim(),
      transaction_type: transactionType === "卖车" ? "sell" : "buy",
    };
    const { error: err } = ownReview
      ? await supabase.from("platform_reviews").update(payload).eq("id", ownReview.id)
      : await supabase.from("platform_reviews").insert(payload);
    if (err) {
      setError("提交失败，请稍后再试");
    } else {
      const { data } = await supabase
        .from("platform_reviews")
        .select("*, profiles!user_id(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(30);
      setDbReviews((data as DbPlatformReview[]) || []);
      setFormOpen(false);
      setContent("");
      setRating(5);
    }
    setSending(false);
  }

  async function handleDelete() {
    if (!ownReview) return;
    await supabase.from("platform_reviews").delete().eq("id", ownReview.id);
    setDbReviews((prev) => prev.filter((r) => r.id !== ownReview.id));
    setFormOpen(false);
    setContent("");
    setRating(5);
  }

  return (
    // 桌面端 px/py 与容器宽度交给首页外层 section 统一控制,内边距和 max-w 只留手机端,
    // 避免双重缩进导致楼层左边缘错位
    <section className="px-4 pb-10 md:p-0">
      <div className="mx-auto max-w-5xl md:max-w-none">
        {/* 桌面沿用 SectionHeader 的视觉语言(微标签+大标题+细线);
            因右侧需保留评分与写评价入口,这里手写同构 markup 而非直接复用组件 */}
        <div className="mb-2 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:flex">
          <span>Reviews</span>
        </div>
        <div className="mb-4 flex items-center justify-between md:mb-0 md:items-end">
          <div className="flex items-center gap-3 md:items-end">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 md:hidden" strokeWidth={1.5} />
              <h2 className="font-mono text-sm font-medium md:font-logo md:text-2xl md:font-normal md:tracking-tight">用户评价</h2>
            </div>
            {userId ? (
              <button
                type="button"
                onClick={() => (formOpen ? setFormOpen(false) : openForm())}
                className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-ink/50 md:mb-1"
              >
                <Pencil className="h-2.5 w-2.5" strokeWidth={1.5} />
                {ownReview ? "修改我的评价" : "写评价"}
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-ink/50 md:mb-1"
              >
                登录后写评价
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:mb-1">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.round(parseFloat(avgRating))
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground/30"
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {avgRating} / 5.0
            </span>
          </div>
        </div>
        {/* 桌面补上 SectionHeader 同款 1px 细线,收束标题区 */}
        <div className="mb-6 mt-3 hidden h-px w-full bg-border md:block" />

        {/* Write review form */}
        {formOpen && userId && (
          <div className="mb-4 rounded-xl bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <StarPicker value={rating} onChange={setRating} />
              <div className="flex gap-1.5">
                {(["购车", "卖车"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] transition-colors ${
                      transactionType === t
                        ? "bg-foreground text-background"
                        : "bg-muted hover:bg-muted/70"
                    }`}
                    onClick={() => setTransactionType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="mt-3 w-full resize-none rounded-xl bg-muted px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
              placeholder="分享你在平台买车/卖车的真实体验（至少 10 个字）..."
              rows={3}
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`font-mono text-[10px] ${
                  error
                    ? "rounded-lg bg-destructive/10 px-2 py-1 text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {error || `${content.trim().length}/500`}
              </span>
              <div className="flex items-center gap-2">
                {ownReview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 font-mono text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    删除
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 font-mono text-[11px]"
                  disabled={content.trim().length < 10 || sending}
                  onClick={handleSubmit}
                >
                  {sending && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
                  {ownReview ? "更新评价" : "提交评价"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Review cards — horizontal scroll on mobile, grid on desktop */}
        {/* 2xl 容器放宽到 88rem 后,3 列文字卡片会过宽,升到 4 列保持可读行长 */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-3 md:overflow-visible md:pb-0 2xl:grid-cols-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`w-[260px] shrink-0 rounded-xl bg-card p-4 md:w-auto ${review.isOwn ? "ring-1 ring-foreground/30" : ""}`}
            >
              {/* Rating */}
              <StarRating rating={review.rating} />

              {/* Review text */}
              <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-foreground line-clamp-4">
                {review.content}
              </p>

              {/* Reviewer info */}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    <img
                      src={avatarUrl(review.avatarUrl, review.reviewer)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="font-mono text-xs font-medium">
                    {review.reviewer}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {review.transactionType}
                  </span>
                </div>
                <span
                  className="font-mono text-[10px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  {formatTimeAgo(review.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
