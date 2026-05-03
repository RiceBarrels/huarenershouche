const CACHE_PREFIX = "merchiva_";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch { return null; }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {} // localStorage might be full
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  } else {
    // Clear all app cache
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }
}
