"use client";

// 原始标签(帖子话题 / 车源配置)→ 当前界面语言的词条标签,走 anon RPC i18n_term_labels。
// - 模块级缓存按 (kind, locale, raw) 存、整个会话共享;25 ms 内的请求合批,每次 ≤ 100 个标签,10 s 超时;
// - key:已归并词条为 't:<slug>'(各语言写法相同,调用方据此去重),未归并为 'r:<规范化标签>';
// - 未归并 / 还没取到 / 出错 / RPC 未上线时 label 回退 t(raw),与旧版直接 t(标签) 一致,
//   词典里的常用标签(倒车影像、改装…)首屏就是本地化文案;
// - 服务端与水合首帧只用回退值(与 SSR 一致),挂载后再换成缓存里的结果;
// - 返回值逐字以传入的原始标签作键,只有这组标签的结果变了才换引用(调用方可直接作 useMemo 依赖)。

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";
import { normTag } from "@/lib/i18n/hashtags";
import { supabase } from "@/lib/supabase";
import { isMissingFunctionError } from "@/lib/supabase-compat";

type TermKind = "topic" | "feature";
type TermLabel = { key: string; label: string };

const BATCH_WINDOW_MS = 25;
const MAX_RAWS_PER_CALL = 100;
const REQUEST_TIMEOUT_MS = 10_000;
/** 请求失败的标签至少隔这么久才重新请求 */
const ERROR_COOLDOWN_MS = 30_000;

/** `${kind}|${locale}|${raw}` → 服务端结果;null = 服务端没返回(不再请求) */
const labels = new Map<string, TermLabel | null>();
const busy = new Set<string>();
const failedAt = new Map<string, number>();
const queues = new Map<string, { kind: TermKind; locale: Locale; raws: Set<string> }>();
const listeners = new Set<() => void>();
let rpcMissing = false;

const cacheKey = (kind: TermKind, locale: Locale, raw: string) => `${kind}|${locale}|${raw}`;

function subscribeLabels(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 这组标签在缓存里的命中,序列化成字符串作 useSyncExternalStore 的快照(按值比较):
 * 别的标签批次写入时快照不变,组件不重渲染、返回值也不换引用。没有命中为 "",与服务端快照相同
 */
function hitsSnapshot(kind: TermKind, locale: Locale, raws: readonly string[]): string {
  const hits: [number, string, string][] = [];
  raws.forEach((raw, i) => {
    const hit = labels.get(cacheKey(kind, locale, raw));
    if (hit) hits.push([i, hit.key, hit.label]);
  });
  return hits.length > 0 ? JSON.stringify(hits) : "";
}
/** 服务端 / 水合:不读缓存,全部用回退值 */
const getServerHits = () => "";

function requestLabels(kind: TermKind, locale: Locale, raws: readonly string[]) {
  if (rpcMissing) return;
  const now = Date.now();
  const qkey = `${kind}|${locale}`;
  for (const raw of raws) {
    // 规范化后为空的标签服务端不会返回,不必请求
    if (normTag(raw) === null) continue;
    const key = cacheKey(kind, locale, raw);
    if (labels.has(key) || busy.has(key)) continue;
    if (now - (failedAt.get(key) ?? -Infinity) < ERROR_COOLDOWN_MS) continue;
    busy.add(key);
    let queue = queues.get(qkey);
    if (!queue) {
      queue = { kind, locale, raws: new Set() };
      queues.set(qkey, queue);
      setTimeout(() => flush(qkey), BATCH_WINDOW_MS);
    }
    queue.raws.add(raw);
  }
}

function flush(qkey: string) {
  const queue = queues.get(qkey);
  queues.delete(qkey);
  if (!queue) return;
  const raws = [...queue.raws];
  for (let i = 0; i < raws.length; i += MAX_RAWS_PER_CALL) {
    void fetchLabels(queue.kind, queue.locale, raws.slice(i, i + MAX_RAWS_PER_CALL));
  }
}

async function fetchLabels(kind: TermKind, locale: Locale, raws: string[]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let rows: { raw: string; key: string; label: string }[] | null = null;
  try {
    const { data, error } = await supabase
      .rpc("i18n_term_labels", { p_kind: kind, p_raws: raws, p_locale: locale })
      .abortSignal(controller.signal);
    if (!error) rows = (data ?? []) as { raw: string; key: string; label: string }[];
    else if (isMissingFunctionError(error)) rpcMissing = true;
  } catch {
    // 网络异常:按失败处理
  } finally {
    clearTimeout(timer);
  }
  const now = Date.now();
  if (rows) {
    for (const row of rows) labels.set(cacheKey(kind, locale, row.raw), { key: row.key, label: row.label });
  }
  for (const raw of raws) {
    const key = cacheKey(kind, locale, raw);
    busy.delete(key);
    if (!rows) failedAt.set(key, now);
    else if (!labels.has(key)) labels.set(key, null);
  }
  if (rows) {
    for (const listener of [...listeners]) listener();
  }
}

/** raws 里每个原始标签 → {key, label}(每个都有值;见文件头的回退规则) */
export function useTermLabels(
  kind: TermKind,
  raws: readonly string[],
): Record<string, { key: string; label: string }> {
  const { locale, localeReady, t } = useI18n();
  // 按内容记忆:调用方每次渲染新建同内容的数组时,不重复请求、也不换返回值引用
  const rawsKey = JSON.stringify(raws);
  const list = useMemo(() => JSON.parse(rawsKey) as string[], [rawsKey]);
  const getHits = useCallback(() => hitsSnapshot(kind, locale, list), [kind, locale, list]);
  const hits = useSyncExternalStore(subscribeLabels, getHits, getServerHits);

  useEffect(() => {
    if (localeReady) requestLabels(kind, locale, list);
  }, [kind, locale, localeReady, list]);

  return useMemo(() => {
    const byIndex = new Map<number, TermLabel>();
    if (hits) {
      for (const [i, key, label] of JSON.parse(hits) as [number, string, string][]) {
        byIndex.set(i, { key, label });
      }
    }
    const out: Record<string, TermLabel> = {};
    list.forEach((raw, i) => {
      const hit = byIndex.get(i);
      out[raw] =
        hit && hit.key.startsWith("t:")
          ? hit
          : { key: hit?.key ?? `r:${normTag(raw) ?? raw}`, label: t(raw) };
    });
    return out;
  }, [hits, list, t]);
}
