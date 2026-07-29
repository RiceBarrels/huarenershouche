"use client";

import { useEffect } from "react";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";

/**
 * 挂载期间持有 iOS 原生底栏的隐藏锁。
 * 必须放在"仅打开时才挂载"的子树里(如 Radix/vaul Content 的 children);
 * 放在 Content 的 wrapper 组件顶层会在页面加载时就加锁——wrapper 本身
 * 始终挂载,只有 Portal 内部才随 open 状态挂载/卸载。
 */
export function NativeBarHideLock() {
  useEffect(() => acquireNativeBarHideLock(), []);
  return null;
}
