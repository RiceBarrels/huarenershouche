"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

/**
 * 全局键盘占位:原生键盘弹起时在页面底部(文档流内)垫一段与键盘等高的空白。
 * webview 配置为 resize=None(键盘不缩 webview),页面底部的输入框会被键盘
 * 盖住且没有滚动空间可以让出来——垫高后把被盖住的聚焦元素滚到键盘上方。
 * 仅 iOS 原生壳生效:web 键盘高度恒为 0;Android webview 自带 resize。
 */
export function KeyboardSpacer() {
  const height = useKeyboardHeight();
  const [ios] = useState(
    () => Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform(),
  );
  const active = ios && height > 0;

  // 垫高就位后,若聚焦元素仍被键盘盖住,滚到可视区中间。
  // WebKit 自己的聚焦滚动发生在 focus 一刻,那时垫高还没渲染、没有空间可滚
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - height - 16) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [active, height]);

  if (!active) return null;
  return <div style={{ height }} aria-hidden />;
}
