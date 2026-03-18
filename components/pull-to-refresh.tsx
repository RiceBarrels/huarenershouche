"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 60;
const MAX_PULL = 100;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentPull = useRef(0);
  const isDragging = useRef(false);
  const isRefreshing = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const updateIndicator = useCallback((distance: number) => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.height = `calc(${distance}px + env(safe-area-inset-top, 0px))`;
    const progress = Math.min(distance / THRESHOLD, 1);
    if (arrowRef.current) {
      arrowRef.current.style.transform = `rotate(${progress * 180}deg)`;
      arrowRef.current.style.opacity = String(progress);
    }
    if (textRef.current) {
      textRef.current.textContent = progress >= 1 ? "松开刷新" : "下拉刷新";
      textRef.current.style.opacity = String(progress);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (isRefreshing.current) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
      currentPull.current = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current || isRefreshing.current) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff <= 0) {
        if (currentPull.current > 0) {
          currentPull.current = 0;
          updateIndicator(0);
        }
        return;
      }
      const distance = Math.min(diff * 0.35, MAX_PULL);
      currentPull.current = distance;
      updateIndicator(distance);
    }

    async function onTouchEnd() {
      if (!isDragging.current) return;
      isDragging.current = false;
      const pull = currentPull.current;

      if (pull >= THRESHOLD) {
        isRefreshing.current = true;
        setRefreshing(true);
        updateIndicator(40);
        try {
          await onRefresh();
        } finally {
          isRefreshing.current = false;
          setRefreshing(false);
          updateIndicator(0);
        }
      } else {
        updateIndicator(0);
      }
      currentPull.current = 0;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, updateIndicator]);

  return (
    <div ref={containerRef}>
      <div
        ref={indicatorRef}
        className="flex items-center justify-center overflow-hidden"
        style={{ height: 0 }}
      >
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
              下拉刷新
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
