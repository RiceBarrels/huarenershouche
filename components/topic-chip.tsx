"use client";

// 话题标签胶囊(帖子详情的标签行等):显示当前语言的 #label,点击进话题聚合页;
// 未解析的原始标签({ raw })显示 #raw,点击跳社区搜索 #raw。
// 渲染为真实 <a>(话题页可被抓取),不要放进另一个 Link 里 —— 卡片内的行内话题用 HashtagText。

import Link from "@/components/localized-navigation";
import { useOverlay } from "@/components/car-overlay-provider";
import { hashtagSearchHref, topicHref } from "@/lib/i18n/topics";
import { cn } from "@/lib/utils";
import type { TopicLabel } from "@/lib/i18n/content/types";

export function TopicChip({
  topic,
  className,
}: {
  topic: TopicLabel | { raw: string };
  className?: string;
}) {
  const { closeAll } = useOverlay();
  const resolved = "slug" in topic ? topic : null;
  const href = resolved?.slug ? topicHref(resolved.slug) : hashtagSearchHref(topic.raw);
  const strip = (s: string) => s.replace(/^[#＃]+/u, "");
  const label = strip(resolved?.label || topic.raw);
  const raw = strip(topic.raw);
  return (
    <Link
      href={href}
      title={label === raw ? undefined : `#${raw}`}
      onClick={(e) => {
        // 浮层里的帖子详情:跳转前清空浮层栈(只变 query 的跳转不会触发 pathname 清栈)
        e.stopPropagation();
        closeAll();
      }}
      className={cn(
        "inline-flex max-w-full items-center rounded-[0.3rem] border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
        className,
      )}
    >
      <span className="truncate">#{label}</span>
    </Link>
  );
}
