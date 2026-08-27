"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      // 桌面按设计规范收敛为 1px 描边 + 轻阴影;手机端样式(无边框大阴影)保持原样
      className="group fixed right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg transition-colors hover:bg-muted md:bottom-6 md:right-6 md:border md:border-border md:shadow-sm"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 80px)",
      }}
      aria-label="回到顶部"
    >
      {/* hover 箭头上移半格,暗示"回到顶部"方向;仅桌面生效 */}
      <ArrowUp className="h-4 w-4 transition-transform duration-150 md:group-hover:-translate-y-0.5" strokeWidth={1.5} />
    </button>
  );
}
