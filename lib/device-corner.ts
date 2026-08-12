// DeviceCorner 本地 Capacitor 插件的 JS 桥接
// 原生实现见 ios/App/App/DeviceCornerPlugin.swift(仅 iOS,web/Android 不可用)
//
// 启动时读取设备屏幕的物理圆角(pt = CSS px),写入根元素的 --device-corner
// 变量,供抽屉/浮层/返回转场的圆角与真机屏幕圆角对齐;
// 直角屏或非原生环境不写入,CSS 端默认值 var(--radius)(即 rounded-lg)生效。

import { Capacitor, registerPlugin } from "@capacitor/core";

interface DeviceCornerPlugin {
  /** 屏幕物理圆角半径(pt);直角屏返回 0 */
  getRadius(): Promise<{ radius: number }>;
}

const DeviceCorner = registerPlugin<DeviceCornerPlugin>("DeviceCorner");

const STORAGE_KEY = "clc_device_corner";

// JS 侧消费者(如 SwipeSheet 拖拽圆角封顶)用的数值缓存;
// null = 未知/无物理圆角,由调用方自带默认值
let cornerPx: number | null = null;

function apply(px: number) {
  cornerPx = px;
  document.documentElement.style.setProperty("--device-corner", `${px}px`);
}

/** 当前设备圆角(px);读不到时返回 fallback */
export function getDeviceCornerPx(fallback: number): number {
  return cornerPx ?? fallback;
}

/** 启动时调用一次:先用上次缓存立即生效,再向原生端取最新值 */
export async function initDeviceCorner() {
  if (typeof window === "undefined") return;
  const cached = parseFloat(localStorage.getItem(STORAGE_KEY) ?? "");
  if (cached > 0) apply(cached);

  if (
    Capacitor.getPlatform() !== "ios" ||
    !Capacitor.isNativePlatform() ||
    !Capacitor.isPluginAvailable("DeviceCorner")
  )
    return;
  try {
    const { radius } = await DeviceCorner.getRadius();
    if (radius > 0) {
      apply(radius);
      localStorage.setItem(STORAGE_KEY, String(radius));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // 插件不可用:保持 CSS 默认值
  }
}
