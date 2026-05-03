"use client";

import { Star } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  content: string;
  reviewer: string;
  transactionType: "购车" | "卖车";
  timeAgo: string;
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: "r1",
    rating: 5,
    content:
      "在这里找到了一辆低里程的丰田凯美瑞，价格比Carvana便宜两千多。卖家是华人车行，沟通很顺畅，整个交易过程很放心。",
    reviewer: "张*生",
    transactionType: "购车",
    timeAgo: "3 天前",
  },
  {
    id: "r2",
    rating: 5,
    content:
      "发布车辆后第二天就有人来看车，一周内就卖掉了。中文平台确实方便，不用在Craigslist上跟人来回解释。",
    reviewer: "李*华",
    transactionType: "卖车",
    timeAgo: "1 周前",
  },
  {
    id: "r3",
    rating: 4,
    content:
      "VIN查询功能很实用，买车前查到了一条未公开的召回记录，避免了不少麻烦。整体体验不错。",
    reviewer: "王*明",
    transactionType: "购车",
    timeAgo: "2 周前",
  },
  {
    id: "r4",
    rating: 5,
    content:
      "从纽约搬到加州，在这个平台上找到了一辆合适的二手车。按距离筛选很方便，卖家就在附近。",
    reviewer: "陈*萍",
    transactionType: "购车",
    timeAgo: "3 周前",
  },
  {
    id: "r5",
    rating: 4,
    content:
      "车行入驻后生意明显好了，不少客户都是通过平台找过来的。免费发布很良心，希望能加个微信推送功能。",
    reviewer: "赵*东",
    transactionType: "卖车",
    timeAgo: "1 个月前",
  },
  {
    id: "r6",
    rating: 5,
    content:
      "第一次在美国买车，全中文界面让我安心很多。降价提醒帮我省了$1,500，非常推荐给刚来美国的朋友。",
    reviewer: "刘*文",
    transactionType: "购车",
    timeAgo: "1 个月前",
  },
];

function getAverageRating(): string {
  const sum = SAMPLE_REVIEWS.reduce((acc, r) => acc + r.rating, 0);
  return (sum / SAMPLE_REVIEWS.length).toFixed(1);
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

export function TrustReviews() {
  const avgRating = getAverageRating();

  return (
    <section className="px-4 pb-10">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" strokeWidth={1.5} />
            <h2 className="font-mono text-sm font-medium">用户评价</h2>
          </div>
          <div className="flex items-center gap-1.5">
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

        {/* Review cards — horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-3 md:overflow-visible">
          {SAMPLE_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="w-[260px] shrink-0 border border-border bg-card p-4 md:w-auto"
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
                  <span className="font-mono text-xs font-medium">
                    {review.reviewer}
                  </span>
                  <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {review.transactionType}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {review.timeAgo}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
