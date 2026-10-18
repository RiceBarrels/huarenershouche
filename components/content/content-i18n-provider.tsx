"use client";

// SSR 页面把服务端取到的 i18n_bundle 行交给客户端内容翻译 hooks(useLocalized / useBundleRow)。
// - 服务端渲染与水合:hooks 的 getServerSnapshot 读这里的种子 → 水合输出与 SSR HTML 逐字一致;
// - 客户端:在 useState 初始化里静默写入 store(seedEntries)。种子与 store 里是同一个记录对象,
//   水合后 getSnapshot 引用不变,不会多渲染一次;之后状态以 store 为准(pending 重查、作者编辑失效)。
// 种子只对同一 locale 生效(原生端显示语言可能与路径语言不同)。可以嵌套:内层查不到时回落到外层。

import { createContext, useContext, useState, type JSX, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { BundleMap, ContentEntity } from "@/lib/i18n/content/types";
import { getEntry, seedEntries, type Entry } from "@/lib/i18n/content/store";

interface SeedScope {
  locale: Locale;
  /** `${entity}|${id}` → 种子记录 */
  entries: ReadonlyMap<string, Entry>;
  parent: SeedScope | null;
}

const SeedContext = createContext<SeedScope | null>(null);

function buildScope(
  locale: Locale,
  rows: Partial<Record<ContentEntity, BundleMap>>,
  parent: SeedScope | null,
): SeedScope {
  const onClient = typeof window !== "undefined";
  const entries = new Map<string, Entry>();
  for (const entity of Object.keys(rows) as ContentEntity[]) {
    const map = rows[entity];
    if (!map) continue;
    if (onClient) seedEntries(entity, locale, map);
    for (const [id, row] of Object.entries(map)) {
      if (!row) continue;
      // 客户端优先复用 store 里刚写入的同一对象;store 保留了更新的状态时用自己的种子(仅供水合)
      const stored = onClient ? getEntry(entity, id, locale) : null;
      entries.set(`${entity}|${id}`, stored?.row === row ? stored : { row, status: "ready", polls: 0 });
    }
  }
  return { locale, entries, parent };
}

export function ContentI18nProvider({
  locale,
  rows,
  children,
}: {
  locale: Locale;
  rows: Partial<Record<ContentEntity, BundleMap>>;
  children: ReactNode;
}): JSX.Element {
  const parent = useContext(SeedContext);
  // 只在首次渲染播种:之后的状态变化都走 store(同一路由换 id 时 Next 会重新挂载本组件)
  const [scope] = useState(() => buildScope(locale, rows, parent));
  return <SeedContext.Provider value={scope}>{children}</SeedContext.Provider>;
}

/** 最近一层(及外层)Provider 里这条内容的种子;没有种子或 locale 不同时为 undefined */
export function useSeedEntry(
  entity: ContentEntity,
  id: string | null | undefined,
  locale: Locale,
): Entry | undefined {
  const scope = useContext(SeedContext);
  if (!id) return undefined;
  for (let s = scope; s; s = s.parent) {
    if (s.locale !== locale) continue;
    const hit = s.entries.get(`${entity}|${id}`);
    if (hit) return hit;
  }
  return undefined;
}
