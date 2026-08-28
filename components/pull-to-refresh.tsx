"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

const THRESHOLD = 64;
const MAX_PULL = 110;
// 只动 transform(合成器动画),不动 height——每帧改 height 会整页 reflow,拖起来掉帧
const SETTLE = "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)";

// 达到阈值时轻震一下(原生走 Capacitor Haptics,网页退化到 vibrate)
function haptic() {
  import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
    .catch(() => {
      navigator?.vibrate?.(8);
    });
}

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startX = useRef(0);
  // 轴向锁定:横向滑动(轮播/横滚列表)不触发下拉
  const axis = useRef<"" | "y" | "x">("");
  const currentPull = useRef(0);
  const crossed = useRef(false);
  const isDragging = useRef(false);
  const isRefreshing = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 内容整体 translateY 露出挂在上方的指示条;归零后清掉行内 transform,
  // 不留 stacking context(transform 祖先会改变 fixed 子元素的参照系)
  const updateIndicator = useCallback((distance: number, animate: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    el.style.transition = animate ? SETTLE : "none";
    el.style.transform = `translateY(${distance}px)`;
    if (animate && distance === 0) {
      settleTimer.current = setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, 300);
    }
    const progress = Math.min(distance / THRESHOLD, 1);
    if (arrowRef.current) {
      arrowRef.current.style.transform = `rotate(${progress * 180}deg)`;
      arrowRef.current.style.opacity = String(progress);
    }
    if (textRef.current) {
      textRef.current.textContent = progress >= 1 ? t("松开刷新") : t("下拉刷新");
      textRef.current.style.opacity = String(progress);
    }
  }, [t]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (isRefreshing.current) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      axis.current = "";
      isDragging.current = true;
      crossed.current = false;
      currentPull.current = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current || isRefreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - startX.current;

      if (axis.current === "") {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        axis.current = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
        if (axis.current === "x") {
          isDragging.current = false;
          return;
        }
      }

      if (dy <= 0) {
        if (currentPull.current > 0) {
          currentPull.current = 0;
          updateIndicator(0, false);
        }
        return;
      }
      // 阻尼:越拉越费劲
      const distance = Math.min(MAX_PULL * (1 - 1 / (1 + dy / 180)) * 2.2, MAX_PULL);
      currentPull.current = distance;
      updateIndicator(distance, false);

      const over = distance >= THRESHOLD;
      if (over !== crossed.current) {
        crossed.current = over;
        haptic();
      }
    }

    async function onTouchEnd() {
      if (!isDragging.current) return;
      isDragging.current = false;
      const pull = currentPull.current;
      currentPull.current = 0;

      if (pull >= THRESHOLD) {
        isRefreshing.current = true;
        setRefreshing(true);
        updateIndicator(44, true);
        try {
          await onRefresh();
        } finally {
          isRefreshing.current = false;
          setRefreshing(false);
          updateIndicator(0, true);
        }
      } else {
        // 没到阈值:平滑弹回
        updateIndicator(0, true);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, updateIndicator]);

  return (
    <div ref={containerRef} className="relative">
      {/* 指示条挂在内容上方屏幕外,内容下移时被露出(高度恒定,不参与布局变化) */}
      <div
        className="absolute inset-x-0 bottom-full flex items-end justify-center"
        style={{ height: MAX_PULL }}
      >
        <div className="flex items-center justify-center pb-3">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <div ref={arrowRef} className="text-muted-foreground" style={{ opacity: 0 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 2v10M4 8l4 4 4-4" />
                </svg>
              </div>
              <span ref={textRef} className="font-mono text-[10px] text-muted-foreground" style={{ opacity: 0 }}>
                {t("下拉刷新")}
              </span>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
