"use client";

// corner-shape(superellipse 圆角)的 Safari/Firefox 回退。
// Chrome 等原生支持的浏览器完全不加载 polyfill(globals.css 里的
// corner-shape 规则已覆盖,注册反而会注入 var() 桥干扰全局规则);
// 仅在不支持时动态加载 hyperellipse,按 globals.css 中声明了
// --corner-shape 的选择器渲染 clip-path/SVG 回退。
// pendingRadiusScale: 1 —— 处理前保持原圆角,不做预缩(避免新挂载
// 元素圆角闪变;代价是应用前一两帧看起来"更圆",不可感知)。

import { useEffect } from "react";

export function CornerShapePolyfill() {
  useEffect(() => {
    if (typeof CSS === "undefined" || CSS.supports("corner-shape", "squircle")) return;
    import("hyperellipse").then(({ registerHyperellipse }) => {
      registerHyperellipse({ pendingRadiusScale: 1 });
    });
  }, []);
  return null;
}
