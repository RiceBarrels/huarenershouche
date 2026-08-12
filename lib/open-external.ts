// 统一的外部链接打开:
// 原生壳里 WKWebView 会吞掉 target="_blank" / window.open 的弹窗导航,
// 须走 AppLauncher(UIApplication.open)——https universal link 会直接唤起
// 对应 App(Apple/Google 地图等),没有对应 App 则落到系统浏览器。
// Web 端保持新标签页行为。

import { Capacitor } from "@capacitor/core";

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { AppLauncher } = await import("@capacitor/app-launcher");
      await AppLauncher.openUrl({ url });
      return;
    } catch {
      /* 插件不可用时退回 window.open */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
