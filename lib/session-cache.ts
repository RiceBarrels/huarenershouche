// 会话级数据缓存(sessionStorage):同一浏览器会话内已拉过的数据直接复用,
// 页面重进不再重复请求;关闭标签页自动失效。
// readDualCache/writeDualCache 为社区 feed 同款双层缓存:
// sessionStorage(会话内命中即新鲜)+ localStorage(冷启动兜底,
// 命中视为 stale,先展示后台刷新)。
export interface SessionCached<T> {
  at: number;
  data: T;
}

export interface DualCached<T> extends SessionCached<T> {
  /** true = 来自 localStorage 的旧数据:先展示,调用方应后台刷新 */
  stale: boolean;
}

export function readSessionCache<T>(key: string): SessionCached<T> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCached<T>;
    if (typeof parsed?.at !== "number" || parsed.data === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* 超配额等错误直接放弃缓存 */
  }
}

function readLocalCache<T>(key: string): SessionCached<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCached<T>;
    if (typeof parsed?.at !== "number" || parsed.data === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 双层读:session 命中 = 新鲜(stale=false);local 命中 = 兜底(stale=true) */
export function readDualCache<T>(key: string): DualCached<T> | null {
  const fresh = readSessionCache<T>(key);
  if (fresh) return { ...fresh, stale: false };
  const local = readLocalCache<T>(key);
  if (local) return { ...local, stale: true };
  return null;
}

/** 双层写:sessionStorage + localStorage 各存一份 */
export function writeDualCache<T>(key: string, data: T): void {
  const raw = JSON.stringify({ at: Date.now(), data });
  try {
    sessionStorage.setItem(key, raw);
  } catch {
    /* 超配额等错误直接放弃缓存 */
  }
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* ignore */
  }
}
