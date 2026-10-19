"use client";

// 偏好(lib/preferences.ts)的 React 接口:模块级外部 store + useSyncExternalStore,
// 不需要包 Provider —— 任何组件 usePreferences() 拿到的都是同一份,一处改动全站立即生效;
// 另一个标签页改了(storage 事件)也会同步。SSR / 首次水合用默认值,避免水合不一致。
// Capacitor 静态包同样可用(只依赖 localStorage)。

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_PREFERENCES,
  PREFS_STORAGE_KEY,
  mergePreferences,
  parsePreferences,
  readPreferencesRaw,
  writePreferences,
  type Preferences,
} from "@/lib/preferences";

const listeners = new Set<() => void>();
// 快照按原文缓存:原文不变就返回同一个对象,useSyncExternalStore 才不会无限重渲染
let cachedRaw: string | null | undefined;
let cached: Preferences = DEFAULT_PREFERENCES;
// 存储不可用时(隐私模式)改动只留在内存里,本次会话内照样生效
let memoryOverride: Preferences | null = null;

function snapshot(): Preferences {
  if (memoryOverride) return memoryOverride;
  const raw = readPreferencesRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parsePreferences(raw);
  }
  return cached;
}

function serverSnapshot(): Preferences {
  return DEFAULT_PREFERENCES;
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key === null || e.key === PREFS_STORAGE_KEY) {
    memoryOverride = null;
    emit();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** 非组件代码读当前偏好(如推荐排序);SSR 返回默认值 */
export function getPreferences(): Preferences {
  return typeof window === "undefined" ? DEFAULT_PREFERENCES : snapshot();
}

/** 改偏好并通知所有订阅组件;返回合并后的新值 */
export function updatePreferences(patch: Partial<Omit<Preferences, "v">>): Preferences {
  const next = mergePreferences(getPreferences(), patch);
  memoryOverride = writePreferences(next) ? null : next;
  emit();
  return next;
}

export function usePreferences(): {
  prefs: Preferences;
  update: (patch: Partial<Omit<Preferences, "v">>) => Preferences;
} {
  const prefs = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const update = useCallback((patch: Partial<Omit<Preferences, "v">>) => updatePreferences(patch), []);
  return { prefs, update };
}

const noopSubscribe = () => () => {};

/**
 * 是否已在客户端拿到真实偏好(SSR / 水合期间为 false)。依赖本机偏好决定「出不出现」的 UI
 * (首页卡片、设置页表单)用它挡一下,避免先按默认值渲染再闪掉。
 */
export function usePreferencesReady(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
