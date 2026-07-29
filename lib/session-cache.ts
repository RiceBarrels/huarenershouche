// 会话级数据缓存(sessionStorage):同一浏览器会话内已拉过的数据直接复用,
// 页面重进不再重复请求;关闭标签页自动失效。配合 TTL 做「过期后台静默刷新」。
export interface SessionCached<T> {
  at: number;
  data: T;
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
