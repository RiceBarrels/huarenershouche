// LiquidGlassNav 本地 Capacitor 插件的 JS 桥接
// 原生实现见 ios/App/App/LiquidGlassNavPlugin.swift(仅 iOS,web/Android 不可用)

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface LiquidGlassNavTab {
  /** 唯一标识,选中事件回传;本项目直接用路由 href */
  id: string;
  title: string;
  /** PNG 图标的 base64(不带 data: 前缀) */
  icon: string;
  /** 图标像素密度,默认 3(即 78px → 26pt) */
  scale?: number;
  /** template = 随选中态着色(默认);original = 保留原色(如发布按钮) */
  mode?: "template" | "original";
}

export interface LiquidGlassNavMenuItem {
  /** 选中后经 tabSelected 事件回传 */
  id: string;
  title: string;
  /** SF Symbol 名称(如 "car.fill"),显示在菜单行左侧 */
  symbol?: string;
}

export interface LiquidGlassNavPlugin {
  configure(options: {
    tabs: LiquidGlassNavTab[];
    /** 右下角独立的圆形液态玻璃动作按钮(如"发布")。
     * 无 menu 时点击直接走 tabSelected;有 menu 时点击弹出系统菜单再回传所选项 */
    action?: LiquidGlassNavTab & { menu?: LiquidGlassNavMenuItem[] };
    selectedId?: string;
    /** 选中色,默认微信绿 #07C160 */
    tint?: string;
  }): Promise<void>;
  select(options: { id: string }): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  /** 底部被占用的总高度(pt,含悬浮间距与安全区);隐藏时为 0 */
  getHeight(): Promise<{ height: number }>;
  /** 调试:把 JS 侧状态打进原生统一日志 */
  debug(options: { msg: string }): Promise<void>;
  addListener(
    eventName: "tabSelected",
    listener: (event: { id: string }) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const LiquidGlassNav = registerPlugin<LiquidGlassNavPlugin>("LiquidGlassNav");

/* —— 可见性协调 ——
 * 原生 bar 永远浮在所有网页内容之上(包括欢迎页、全屏浮层),
 * 所以显隐由两个条件共同决定:tab 栏已配置 && 没有浮层加锁隐藏。
 * 各组件只声明自己的状态,由这里统一下发 show/hide,避免相互覆盖。 */

let configured = false;
let hideLocks = 0;
let lastVisible: boolean | null = null;

// 调试:控制台查看协调器状态(web/native 通用)
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__lgNavState = () => ({
    configured,
    hideLocks,
    lastVisible,
  });
}

export function nativeBarAvailable(): boolean {
  return (
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable("LiquidGlassNav")
  );
}

function dbg(msg: string) {
  if (!nativeBarAvailable()) return;
  LiquidGlassNav.debug({ msg }).catch(() => {});
}

function syncVisibility() {
  if (!nativeBarAvailable()) return;
  const visible = configured && hideLocks === 0;
  dbg(`sync configured=${configured} locks=${hideLocks} visible=${visible} last=${lastVisible}`);
  // 去重:状态未变不重复下发(多个浮层叠加时避免连发 hide/show 触发原生动画竞态)
  if (visible === lastVisible) return;
  lastVisible = visible;
  (visible ? LiquidGlassNav.show() : LiquidGlassNav.hide()).catch(() => {});
}

/** tab 栏组件 configure 成功后传 true;卸载(如进入无底栏页面)时传 false */
export function setNativeBarConfigured(on: boolean) {
  configured = on;
  syncVisibility();
}

/** 全屏浮层(欢迎页等)挂载期间隐藏原生 bar;返回幂等的解锁函数,卸载时调用 */
export function acquireNativeBarHideLock(): () => void {
  hideLocks++;
  dbg(`acquire -> ${hideLocks}`);
  syncVisibility();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    hideLocks--;
    dbg(`release -> ${hideLocks}`);
    syncVisibility();
  };
}

/**
 * 把页面里已渲染的 lucide <svg> 栅格化成 base64 PNG 交给原生侧。
 * template 模式的图标只取 alpha 通道着色,颜色画黑即可。
 */
export function rasterizeSvgIcon(
  svg: SVGSVGElement,
  options: {
    /** 画布像素尺寸(正方形),默认 78(= 26pt @3x) */
    size?: number;
    /** 描边颜色,默认黑(template 模式下由原生 tint 决定最终颜色) */
    color?: string;
    /** 图标缩进比例(0~0.5),给背景徽章留边 */
    inset?: number;
    /** 先于图标绘制的背景(如发布按钮的渐变圆) */
    background?: (ctx: CanvasRenderingContext2D, size: number) => void;
  } = {}
): Promise<string> {
  const { size = 78, color = "#000000", inset = 0, background } = options;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("stroke", color);
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  const markup = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas 2d context unavailable"));
        return;
      }
      background?.(ctx, size);
      const pad = size * inset;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      // 去掉 "data:image/png;base64," 前缀
      resolve(canvas.toDataURL("image/png").split(",")[1]);
    };
    img.onerror = () => reject(new Error("svg rasterize failed"));
    img.src = url;
  });
}
