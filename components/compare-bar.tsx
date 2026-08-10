"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { X, GitCompare, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { CompareContent } from "@/components/compare-content";
import { getCompareIds, removeFromCompare, clearCompare } from "@/lib/compare";
import { useCarOverlay } from "@/components/car-overlay-provider";
import { supabase } from "@/lib/supabase";
import type { DbCar } from "@/lib/types";

// 全局对比指示条:portal 到 body(躲开 drawer 背景缩放的 transform),
// 任何页面都显示,有底部导航时自动抬到导航上方,直到用户清空或进入对比页。
export function CompareBar() {
  const router = useRouter();
  const pathname = usePathname();
  // 移动端详情浮层(swipe-sheet, z-60)打开时:提层到其上方,并贴屏幕底(导航已被浮层盖住)
  // enabled = 移动端(<md):「对比」在 drawer 里打开,不跳 /compare(浮层下跳页看不见)
  const { enabled: isMobile, overlayOpen } = useCarOverlay();
  const [mounted, setMounted] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [cars, setCars] = useState<Map<string, DbCar>>(new Map());
  const [navHeight, setNavHeight] = useState(0);
  // 底部导航是 iOS 原生 liquid glass 胶囊时,对比条改为悬浮圆角卡片
  const [nativeNav, setNativeNav] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIds(getCompareIds());
    function onCompareChange() {
      setIds(getCompareIds());
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, []);

  // 实测底部导航高度(md 以上或无导航的页面为 0)。导航也是 portal 挂载,
  // 首次渲染可能晚于本组件,补一次延迟重测。
  useEffect(() => {
    function measure() {
      const nav = document.querySelector("[data-bottom-nav]");
      setNavHeight(nav instanceof HTMLElement ? nav.offsetHeight : 0);
      setNativeNav(
        nav instanceof HTMLElement && nav.dataset.bottomNav === "native",
      );
    }
    measure();
    const t = setTimeout(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  // Fetch car data when ids change
  useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter((id) => !cars.has(id));
    if (missing.length === 0) return;
    supabase
      .from("cars")
      .select("*")
      .in("id", missing)
      .then(({ data }) => {
        if (data) {
          setCars((prev) => {
            const next = new Map(prev);
            for (const car of data as DbCar[]) {
              next.set(car.id, car);
            }
            return next;
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  if (!mounted) return null;

  const visible = ids.length > 0 && pathname !== "/compare";
  // 原生 liquid glass 胶囊上方:悬浮卡片样式,并与胶囊留 8px 间距
  const floating = nativeNav && !overlayOpen && navHeight > 0;
  // 浮层打开时导航被盖住,贴屏幕底部即可
  const bottomOffset = overlayOpen ? 0 : navHeight + (floating ? 8 : 0);

  return createPortal(
    <>
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`fixed inset-x-0 md:px-4 ${overlayOpen ? "z-[70]" : "z-40"} ${floating ? "px-3" : ""}`}
          style={{ bottom: bottomOffset }}
        >
          {/* 手机端通栏贴底(DOM 导航)/ 悬浮圆角卡片(原生 liquid glass 胶囊);
              桌面端悬浮居中卡片 */}
          <div
            className={`mx-auto flex w-full items-center gap-2 px-3 py-2 backdrop-blur-md md:mb-4 md:max-w-2xl md:rounded-xl md:border md:shadow-sm ${
              floating
                ? "rounded-xl border border-border bg-background/85 shadow-lg"
                : "border-t border-border bg-background/95"
            }`}
            style={
              bottomOffset === 0
                ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }
                : undefined
            }
          >
            <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground md:flex">
              <GitCompare className="h-4 w-4" strokeWidth={1.5} />
              车辆对比
            </span>

            {/* 已选车辆 */}
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
              {ids.map((id) => {
                const car = cars.get(id);
                return (
                  <div
                    key={id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card p-1 pr-1.5"
                  >
                    {car?.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.title_zh || ""}
                        className="h-8 w-11 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-11 items-center justify-center rounded-lg bg-muted font-mono text-[9px] text-muted-foreground">
                        ···
                      </span>
                    )}
                    <span className="hidden max-w-[110px] truncate font-mono text-[11px] md:block">
                      {car?.title_zh || "加载中..."}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCompare(id)}
                      aria-label="移出对比"
                      className="p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
              {ids.length < 3 && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                  还可加 {3 - ids.length} 辆
                </span>
              )}
            </div>

            {/* 操作 */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => clearCompare()}
                title="取消对比"
                aria-label="取消对比"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <Button
                size="sm"
                className="h-8 gap-1 font-mono text-xs"
                disabled={ids.length < 2}
                onClick={() => {
                  if (isMobile) setCompareOpen(true);
                  else router.push("/compare");
                }}
              >
                对比 ({ids.length})
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 移动端:对比内容在 drawer 里打开(浮层/任意页面上都可见);
        非 modal,避免锁死悬浮层手势 */}
    <NonModalDrawer
      open={compareOpen}
      onOpenChange={setCompareOpen}
      contentClassName="max-h-[85vh]"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={() => setCompareOpen(false)}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="font-mono text-sm font-semibold">车辆对比</span>
        <div className="h-8 w-8" />
      </div>
      <div className="overflow-y-auto px-4 pb-8">
        <CompareContent />
      </div>
    </NonModalDrawer>
    </>,
    document.body
  );
}
