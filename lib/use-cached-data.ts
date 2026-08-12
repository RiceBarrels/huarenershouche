"use client";

import { useState, useEffect, useCallback } from "react";
import { getCached, setCache } from "./cache";

/**
 * 双层缓存 data hook(与社区 feed 同款逻辑):
 * sessionStorage 命中 = 本会话新鲜,直接复用不再重拉;
 * localStorage 命中 = 冷启动兜底,先展示、后台刷新。
 *
 * - `loading`    = true only when no cache exists and fetch is in progress
 * - `refreshing` = true when stale cached data is shown and a background fetch is running
 * - `mutate`     = update state + cache in one call (use after add/edit/delete)
 */
export function useCachedData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = []
): {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  mutate: (updater: T | ((prev: T | null) => T | null)) => void;
} {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!key) {
      setLoading(true);
      setRefreshing(false);
      return;
    }

    const cached = getCached<T>(key);
    if (cached !== null) {
      setDataState(cached.data);
      setLoading(false);
      // 本会话已拉过(sessionStorage 命中)就直接复用,不重复请求
      if (!cached.stale) {
        setRefreshing(false);
        return;
      }
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let cancelled = false;
    fetcher()
      .then((fresh) => {
        if (cancelled) return;
        setDataState(fresh);
        setCache(key, fresh);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`[cache] Fetch failed for "${key}":`, err);
        setLoading(false);
        setRefreshing(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  const mutate = useCallback(
    (updater: T | ((prev: T | null) => T | null)) => {
      setDataState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T | null) => T | null)(prev)
            : updater;
        if (key && next !== null) setCache(key, next);
        return next;
      });
    },
    [key]
  );

  return { data, loading, refreshing, mutate };
}
