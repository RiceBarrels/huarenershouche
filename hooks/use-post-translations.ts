"use client";

// 帖子列表按需 AI 翻译:非中文界面,把未翻译的帖子分批(12/批)送
// /api/translate-post 批量翻译,通过 merge 回调把 {postId: 译文} 合并回状态。
// in-flight 集合防重复请求;缓存写在 community_posts.other_i18n,全站共享。

import { useEffect, useRef } from "react";
import { needsContentTranslation, type Locale } from "@/lib/i18n";
import { apiOrigin } from "@/lib/capacitor";
import type { DbCommunityPost } from "@/lib/types";

export type PostI18nMap = Record<string, { title?: string | null; content?: string | null }>;

export function usePostTranslations(
  posts: DbCommunityPost[],
  locale: Locale,
  merge: (map: PostI18nMap) => void
) {
  const inflight = useRef<Set<string>>(new Set());
  // merge 回调随渲染变化,不进依赖(用 ref 固定住最新值)
  const mergeRef = useRef(merge);
  useEffect(() => {
    mergeRef.current = merge;
  });

  useEffect(() => {
    if (posts.length === 0) return;
    // other_i18n[locale] === undefined 表示"从未尝试过";失败会写入 {} 标记,
    // 让 skeleton 收起、回退原文,且不再重试
    const need = posts.filter(
      (p) =>
        needsContentTranslation(`${p.title}\n${p.content}`, locale) &&
        p.other_i18n?.[locale] === undefined &&
        !inflight.current.has(p.id)
    );
    if (need.length === 0) return;
    const ids = need.slice(0, 12).map((p) => p.id);
    ids.forEach((id) => inflight.current.add(id));
    fetch(`${apiOrigin()}/api/translate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds: ids, locale }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { ok?: boolean; i18n?: PostI18nMap } | null) => {
        const map: PostI18nMap = { ...(json?.ok ? json.i18n : undefined) };
        // 服务端没翻出来的也标记 {}(收起 skeleton,显示原文)
        for (const id of ids) if (!(id in map)) map[id] = {};
        mergeRef.current(map);
      })
      .catch(() => {
        // 整批失败:全部标记 {},回退原文
        mergeRef.current(Object.fromEntries(ids.map((id) => [id, {}])));
      })
      .finally(() => {
        ids.forEach((id) => inflight.current.delete(id));
      });
  }, [posts, locale]);
}
