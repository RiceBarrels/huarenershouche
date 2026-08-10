"use client";

// 浮层栈的注册 context:自渲染的浮层(NonModalDrawer / OverlaySheet)打开时
// 注册进 car-overlay-provider 的统一栈——层级按开启顺序递增、系统返回键逐层
// 关闭。注册 api(稳定引用)与 id→zIndex 查表(随栈变化)分两个 context,
// 注册 effect 只依赖前者,不因栈变化反复重跑。

import { createContext } from "react";

export interface OverlayLayerRegistry {
  /** 打开时注册:close 会在系统返回/清栈移除该层时被调用 */
  register: (id: string, close: () => void) => void;
  /** 关闭/卸载时注销(层已被系统返回移除时为空操作) */
  release: (id: string) => void;
}

export const OverlayLayerRegistryCtx =
  createContext<OverlayLayerRegistry | null>(null);
export const OverlayLayerZCtx =
  createContext<ReadonlyMap<string, number> | null>(null);
