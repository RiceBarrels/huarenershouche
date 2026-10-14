"use client";

// 「排除管理员」开关:默认开,记在 localStorage(仪表盘与车辆浏览者面板共用同一个键)。
// localStorage 不可用(隐私模式等)时退回进程内变量,本次打开期间仍然生效。

import { useCallback, useSyncExternalStore } from "react";

const KEY = "clc_admin_an_excl";
const listeners = new Set<() => void>();
let fallback = true;

function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? fallback : v !== "0";
  } catch {
    return fallback;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useExcludeAdmins(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => true);
  const set = useCallback((next: boolean) => {
    fallback = next;
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* 存不下就只用进程内变量 */
    }
    listeners.forEach((l) => l());
  }, []);
  return [value, set];
}
