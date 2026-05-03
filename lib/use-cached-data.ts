"use client";

import { useState, useEffect, useCallback } from "react";
import { getCached, setCache } from "./cache";

/**
 * Stale-while-revalidate data hook backed by localStorage.
 *
 * - `loading`    = true only when no cache exists and fetch is in progress
 * - `refreshing` = true when cached data is shown and a background fetch is running
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
      setDataState(cached);
      setLoading(false);
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
