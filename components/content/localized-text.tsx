"use client";

// 显示 useLocalized 的一个字段:当前文本(译文或原文)+ 该文本的 lang 属性,
// data-i18n-field / data-i18n-state 供样式与 SEO 检查脚本识别(SSR 时就有,不出骨架屏)。
// hashtags:正文里的 #话题 渲染成链接 —— 显示译文时换成当前语言的话题名,显示原文时保持作者原样。
// 显示译文时以原文里作者写的 #话题 为边界(含超出话题上限或缓存之后新增的)。

import type { JSX } from "react";
import { HashtagText } from "@/components/hashtag-text";
import type { LocalizedView } from "@/hooks/use-localized";
import type { TopicLabel } from "@/lib/i18n/content/types";

export function LocalizedText<F extends string>({
  view,
  field,
  as: Tag = "p",
  className,
  hashtags = false,
  topics,
}: {
  view: LocalizedView<F>;
  field: F;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "div";
  className?: string;
  hashtags?: boolean;
  topics?: TopicLabel[];
}): JSX.Element {
  const text = view.shown[field];
  // 按字段判断:帖子标题与正文可能只有一个需要翻译,另一个本来就是界面语言(显示的就是原文)
  const showingTranslation = view.translated && !view.showOriginal && view.text[field] !== view.original[field];
  return (
    <Tag
      lang={view.shownLang[field]}
      data-i18n-field={field}
      data-i18n-state={showingTranslation ? "translated" : "original"}
      className={className}
    >
      {hashtags ? (
        <HashtagText text={text} original={view.original[field]} topics={topics} mode={showingTranslation ? "display" : "original"} />
      ) : (
        text
      )}
    </Tag>
  );
}
