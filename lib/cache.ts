// 双层缓存(与社区 feed 同款逻辑):
// sessionStorage(本次会话状态,命中即视为新鲜,不再重拉)
// + localStorage(冷启动兜底,命中视为 stale,先展示后台刷新)。
const CACHE_PREFIX = "merchiva_";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function readEntry<T>(storage: Storage, key: string): CacheEntry<T> | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

/** stale=true 表示来自 localStorage 的旧数据:先展示,调用方应后台刷新 */
export function getCached<T>(key: string): { data: T; stale: boolean } | null {
  const k = CACHE_PREFIX + key;
  const fresh = readEntry<T>(sessionStorage, k);
  if (fresh) return { data: fresh.data, stale: false };
  const local = readEntry<T>(localStorage, k);
  if (local) return { data: local.data, stale: true };
  return null;
}

export function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  const raw = JSON.stringify(entry);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, raw);
  } catch {} // 超配额等错误直接放弃缓存
  try {
    localStorage.setItem(CACHE_PREFIX + key, raw);
  } catch {}
}

export function clearCache(key?: string): void {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      if (key) {
        storage.removeItem(CACHE_PREFIX + key);
      } else {
        // Clear all app cache
        Object.keys(storage)
          .filter((k) => k.startsWith(CACHE_PREFIX))
          .forEach((k) => storage.removeItem(k));
      }
    } catch {}
  }
}
