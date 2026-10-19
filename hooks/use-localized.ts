"use client";

// 内容翻译 hooks(车源描述、帖子、评论、问答、评价):按显示语言读 lib/i18n/content/store
// (SSR 种子 + 挂载后按需请求 i18n_bundle),用 resolve.localize 得出每个字段该显示的文本与 lang,
// 并提供「显示原文 / 显示翻译」切换。
// - 水合期间 useSyncExternalStore 取 ContentI18nProvider 的种子,输出与服务端 HTML 完全一致;
// - useI18n().localeReady 之前不发请求(原生端显示语言还会从 zh 切到系统语言),enabled === false 也不发;
// - 要不要(再)请求全由 store 判断(没有行、pending 待重查、缓存过期、出错冷却已过),hook 只负责在挂载
//   与记录变化时问一声;
// - 原文校验:行的 h 与页面原文的哈希(store.sourceHash)对不上 = 译文是另一份原文的(原文在本会话里被改过
//   或清空、页面是路由缓存恢复的旧版本)→ 不用它;Provider 的种子译文对得上就用种子,否则显示原文,store 按需重查;
// - pending(「翻译中…」)只在挂载后、该行仍是 pending 且还有重查次数时为 true —— SSR 永远不输出它。

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n-provider";
import { useSeedEntry } from "@/components/content/content-i18n-provider";
import { useZhHantContent } from "@/components/content/zh-hant-content";
import { localize, type Localized } from "@/lib/i18n/content/resolve";
import {
  IDLE_ENTRY,
  MAX_POLLS,
  checkOriginal,
  getEntry,
  isSuperseded,
  requestEntries,
  sourceHash,
  subscribe,
} from "@/lib/i18n/content/store";
import { hantRowLabels } from "@/lib/i18n/content/resolve";
import type { BundleRow, ContentEntity } from "@/lib/i18n/content/types";

export interface LocalizedView<F extends string> extends Localized<F> {
  /** 当前显示的文本(切到原文时 = original) */
  shown: Record<F, string>;
  /** shown 对应的 lang 属性 */
  shownLang: Record<F, string | undefined>;
  showOriginal: boolean;
  toggleOriginal(): void;
  /** 挂载后才可能为 true:译文还在生成,前端仍在重查 */
  pending: boolean;
}

const noopSubscribe = () => () => {};
const getFalse = () => false;

/** 读一条记录,并在挂载后按需请求 / 续约重查(useLocalized 与 useBundleRow 共用) */
function useContentEntry(entity: ContentEntity, id: string | null | undefined, enabled: boolean) {
  const { locale, localeReady } = useI18n();
  const seed = useSeedEntry(entity, id, locale);
  const getSnapshot = useCallback(
    () => (id ? getEntry(entity, id, locale) : IDLE_ENTRY),
    [entity, id, locale],
  );
  const getServerSnapshot = useCallback(() => seed ?? IDLE_ENTRY, [seed]);
  const entry = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = Boolean(id) && enabled && localeReady;

  // 挂载时与记录每变一次都交给 store 判断:刚取到的行不会重查,过期的(重新挂载时)立即重查,
  // 排队 / 在途 / 已排期的不会重复请求
  useEffect(() => {
    if (active && id) requestEntries(entity, [id], locale);
  }, [active, entity, id, locale, entry]);

  return { entry, seed, locale, active };
}

export function useLocalized<F extends string>(
  entity: ContentEntity,
  id: string | null | undefined,
  original: Record<F, string | null | undefined>,
  opts?: { enabled?: boolean },
): LocalizedView<F> {
  const { entry, seed, locale, active } = useContentEntry(entity, id, opts?.enabled !== false);
  const row = entry.row ?? undefined;

  // 调用方每次渲染都新建 original 对象:按字段值做 key,值不变就不重算(localize 里有语言检测)。
  // undefined 先转成 null,保证字段不会在 JSON 里丢掉
  const originalKey = JSON.stringify(original, (_key, value: unknown) => (value === undefined ? null : value));
  const stableOriginal = useMemo(
    () => JSON.parse(originalKey) as Record<F, string | null>,
    [originalKey],
  );
  // 原文哈希只认调用方真正给了的字段:undefined(没拿到)在这里丢掉,sourceHash 据此返回 null(不校验)
  const hashKey = JSON.stringify(original);
  const hash = useMemo(
    () => sourceHash(entity, JSON.parse(hashKey) as Record<string, string | null>),
    [entity, hashKey],
  );

  // 原文校验:行与页面原文对不上(如浮层重开时车源描述已被改写 / 清空)→ 按没有行显示原文,store 按需重查;
  // 服务端与水合首帧固定 false
  const clientSuperseded = isSuperseded(row, hash);
  const getSuperseded = useCallback(() => clientSuperseded, [clientSuperseded]);
  const superseded = useSyncExternalStore(noopSubscribe, getSuperseded, getFalse);
  useEffect(() => {
    if (active && id) checkOriginal(entity, id, locale, row, hash);
  }, [active, entity, id, locale, row, hash]);

  // 被取代时:路由缓存恢复的旧页面,种子与页面原文同出一次服务端渲染,对得上就照旧显示种子的译文
  const seedRow = seed?.row;
  const shownRow = superseded ? (seedRow?.s === "ok" && seedRow.h === hash ? seedRow : undefined) : row;
  // zh-hant:整句转繁体(SSR 与水合首帧经种子表保持一致,见 components/content/zh-hant-content.tsx)
  const hant = useZhHantContent();
  const base = useMemo(
    () => localize(stableOriginal, shownRow, locale, hant),
    [stableOriginal, shownRow, locale, hant],
  );

  // 「显示原文」只对当前这条 (entity, id, locale) 生效:组件换了内容自动回到默认显示
  const viewKey = `${entity}|${id ?? ""}|${locale}`;
  const [toggle, setToggle] = useState({ key: viewKey, on: false });
  const showOriginal = toggle.key === viewKey && toggle.on;
  const toggleOriginal = useCallback(
    () => setToggle((prev) => ({ key: viewKey, on: !(prev.key === viewKey && prev.on) })),
    [viewKey],
  );

  // 服务端与水合首帧固定 false;挂载后取实际值(值相同则不会多渲染)
  const clientPending =
    active && entry.status !== "error" && shownRow?.s === "pending" && entry.polls < MAX_POLLS;
  const getPending = useCallback(() => clientPending, [clientPending]);
  const pending = useSyncExternalStore(noopSubscribe, getPending, getFalse);

  return useMemo(
    () => ({
      ...base,
      shown: showOriginal ? base.original : base.text,
      shownLang: showOriginal ? base.originalLang : base.textLang,
      showOriginal,
      toggleOriginal,
      pending,
    }),
    [base, showOriginal, toggleOriginal, pending],
  );
}

/** 列表预取:把一屏的 id 合批请求进 store(各卡片的 useLocalized 随后直接命中) */
export function useLocalizedPrefetch(
  entity: ContentEntity,
  ids: readonly string[],
  opts?: { enabled?: boolean },
): void {
  const { locale, localeReady } = useI18n();
  const enabled = opts?.enabled !== false;
  const idsKey = ids.join(",");
  useEffect(() => {
    if (!enabled || !localeReady || !idsKey) return;
    requestEntries(entity, idsKey.split(","), locale);
  }, [enabled, localeReady, entity, idsKey, locale]);
}

/** 当前显示语言下的 bundle 行(话题 / 配置标签 x、可用语言等);没有行时按需请求 */
export function useBundleRow(entity: ContentEntity, id: string | null | undefined): BundleRow | undefined {
  const { entry, locale } = useContentEntry(entity, id, true);
  const row = entry.row ?? undefined;
  // zh-hant:话题 / 配置标签的显示名逐字转繁体(同步查表,SSR 与水合一致);raw / norm / slug 不变
  return useMemo(() => (locale === "zh-hant" ? hantRowLabels(row) : row), [locale, row]);
}
