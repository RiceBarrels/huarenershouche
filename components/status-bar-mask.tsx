"use client";

// 状态栏遮罩:仅刘海机型显示(safe-area-pill-container 控制),且只在页面
// 滚动越过安全区高度后淡入——顶部未滚动时不压渐变,滚动后保证状态栏文字
// 在滚过的内容上可读。

import { useEffect, useRef, useState } from "react";

export function StatusBarMask() {
  const ref = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    // 阈值 = 遮罩自身高度(env(safe-area-inset-top)),无刘海时为 0(反正 display:none)
    const onScroll = () =>
      setPast(window.scrollY > (ref.current?.offsetHeight ?? 0));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      className={`pointer-events-none z-50 fixed top-0 left-0 right-0 bg-linear-to-b from-background from-20% to-transparent safe-area-pill-container transition-opacity duration-200 ${past ? "opacity-100" : "opacity-0"}`}
      style={{ height: "env(safe-area-inset-top, 0px)" }}
    />
  );
}
