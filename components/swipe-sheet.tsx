"use client";

// 通用移动端浮层:在当前页面(不跳链接)以浮层打开内容。
// 打开:从被点卡片放大,~50% 时由卡片图渐变成浮层内容(originRect + heroImage)。
// 返回:始终缩回原来的卡片位置(共享元素);拖动到阈值松手时,从当前位置连续缩回。
//   · 横向拖动(左/右)任意位置;纵向在滚到顶下拉 / 滚到底上推时,否则正常滚动。
// 需放在 <AnimatePresence> 内,并带唯一 key。

import { type ReactNode, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronLeft } from "lucide-react";

const DISMISS_PX = 90; // 位移阈值
const DISMISS_V = 0.5; // 速度阈值 px/ms
const ZOOM = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SwipeSheet({
  children,
  onClose,
  originRect,
  heroHtml,
  topBarExtra,
  zIndex = 60,
}: {
  children: ReactNode;
  onClose: () => void;
  // 被点卡片的位置尺寸;提供则播放「卡片放大溶解」进场,否则从底部滑入
  originRect?: OriginRect | null;
  // 被点卡片的真实 DOM(outerHTML):作为放大的主体,~50% 时溶解成内容
  heroHtml?: string | null;
  // 顶部返回栏右侧的快捷操作(如详情页的 收藏/对比/分享)
  topBarExtra?: ReactNode;
  // 逐层递增的层级(浮层栈里后开的盖前面的),须 <70(对比条)/<80(工具 drawer)
  zIndex?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 拖动时轻微缩小(跟手,保持实心)
  const dragScale = useTransform(
    () => 1 - Math.min(0.12, Math.hypot(x.get(), y.get()) / 320 * 0.12),
  );

  const hero = !!(originRect && heroHtml);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1;
  // 等比缩放(按宽度):卡片与内容都不变形。起点 = 卡片宽/屏宽
  const startScale = originRect ? originRect.width / Math.max(1, vw) : 1;
  const rectVariant = originRect
    ? { x: originRect.left, y: originRect.top, scale: startScale }
    : { y: "100%" as const };

  // 锁定 body 滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const st = {
      active: false,
      axis: "" as "" | "x" | "y" | "scroll",
      sx: 0,
      sy: 0,
      lx: 0,
      ly: 0,
      lt: 0,
      vx: 0,
      vy: 0,
      inHScroll: false,
    };

    // 起点是否在可横向滚动的元素内(如图片轮播):是则横滑交给原生滚动,
    // 不触发浮层拖拽关闭
    const isInHScroller = (start: EventTarget | null): boolean => {
      let node = start instanceof HTMLElement ? start : null;
      while (node && node !== el) {
        if (node.scrollWidth > node.clientWidth + 1) {
          const ox = getComputedStyle(node).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const springBack = () => {
      // 慢慢复原(较软的弹簧),从当前拖动位置连续回位
      animate(x, 0, { type: "spring", stiffness: 320, damping: 38 });
      animate(y, 0, { type: "spring", stiffness: 320, damping: 38 });
    };

    const onStart = (e: TouchEvent) => {
      // 「静态层」(如图片灯箱)内的手势完全不接管:既不横拖也不下拉关闭
      if (e.target instanceof HTMLElement && e.target.closest("[data-sheet-static]")) {
        st.active = false;
        return;
      }
      const t = e.touches[0];
      st.active = true;
      st.axis = "";
      st.sx = st.lx = t.clientX;
      st.sy = st.ly = t.clientY;
      st.lt = e.timeStamp;
      st.vx = st.vy = 0;
      // 左缘起手豁免:返回手势优先于轮播横滑(与系统边缘返回一致),
      // 否则起手落在轮播上时第一滑被轮播吃掉,要滑两次才能关闭
      st.inHScroll = t.clientX > 24 && isInHScroller(e.target);
    };

    const onMove = (e: TouchEvent) => {
      if (!st.active) return;
      const t = e.touches[0];
      const dx = t.clientX - st.sx;
      const dy = t.clientY - st.sy;
      const dt = Math.max(1, e.timeStamp - st.lt);
      st.vx = (t.clientX - st.lx) / dt;
      st.vy = (t.clientY - st.ly) / dt;
      st.lx = t.clientX;
      st.ly = t.clientY;
      st.lt = e.timeStamp;

      const sc = scrollRef.current;
      const atTop = !sc || sc.scrollTop <= 0;
      const atBottom = !sc || sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;

      if (!st.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          st.axis = st.inHScroll ? "scroll" : "x";
        } else if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
          st.axis = "y";
        } else {
          st.axis = "scroll"; // 交给原生滚动
        }
      }

      if (st.axis === "x") {
        e.preventDefault();
        x.set(dx);
      } else if (st.axis === "y") {
        if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
          e.preventDefault();
          y.set(dy);
        } else {
          st.axis = "scroll";
          y.set(0);
        }
      }
    };

    const onEnd = () => {
      if (!st.active) return;
      st.active = false;
      const lx = x.get();
      const ly = y.get();
      const goX = st.axis === "x" && (Math.abs(lx) > DISMISS_PX || Math.abs(st.vx) > DISMISS_V);
      const goY = st.axis === "y" && (Math.abs(ly) > DISMISS_PX || Math.abs(st.vy) > DISMISS_V);
      if (goX || goY) {
        // 从当前拖动位置连续缩回原卡片:拖动位移与退场用同一时长/曲线一起归零,
        // 不再先弹回中间再缩,整段是一次连续的「缩回原位」。
        animate(x, 0, ZOOM);
        animate(y, 0, ZOOM);
        onClose();
        return;
      }
      springBack();
      st.axis = "";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [x, y, onClose]);

  // 内容(上层)始终与卡片同轨放大 / 缩回;进/退场都在整段 ~50% 处由内层透明度交叉。
  const contentExit = { ...rectVariant, transition: ZOOM };

  return (
    // 根节点为 motion 组件,AnimatePresence 才能在卸载前播放子层退场动画
    <motion.div className="fixed inset-0 md:hidden" style={{ zIndex }}>
      {/* 下层:被点卡片的真实 DOM,始终不透明,从原位连续放大到全屏、退场反向缩回。
          进场前 ~50% 由它露出(内容还透明),之后被内容盖上;返回时内容淡出重新露出它。
          它一直不透明,内容在其上淡入淡出,故交叉过程不会漏出背景、不闪。 */}
      {hero && originRect && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed origin-top-left overflow-hidden rounded-xl border border-border bg-card"
          style={{
            top: originRect.top,
            left: originRect.left,
            width: originRect.width,
            height: originRect.height,
          }}
          initial={{ x: 0, y: 0, scale: 1 }}
          animate={{
            x: -originRect.left,
            y: -originRect.top,
            scale: vw / Math.max(1, originRect.width),
          }}
          exit={{ x: 0, y: 0, scale: 1, transition: ZOOM }}
          transition={ZOOM}
          dangerouslySetInnerHTML={{ __html: heroHtml! }}
        />
      )}

      {/* 上层:浮层内容,与卡片同轨放大 / 缩小;内层透明度在整段 ~10% 处交叉:
          进场时卡片放大到 10% 即溶解成浮层内容,返回时浮层缩到 10% 即溶解回卡片。 */}
      <motion.div
        className="absolute inset-0 origin-top-left"
        initial={rectVariant}
        animate={{ x: 0, y: 0, scale: 1 }}
        exit={contentExit}
        transition={ZOOM}
      >
        <motion.div
          className="absolute inset-0"
          initial={hero ? { opacity: 0 } : false}
          animate={hero ? { opacity: 1, transition: { duration: 0.08, delay: 0.05 } } : {}}
          exit={hero ? { opacity: 0, transition: { duration: 0.08, delay: 0.05 } } : {}}
        >
          <motion.div
            ref={panelRef}
            className="relative flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl"
            style={{ x, y, scale: dragScale, touchAction: "pan-y" }}
          >
            {/* 顶部返回栏:左侧返回,右侧快捷操作(垫出刘海安全区) */}
            <div
              className="flex h-11 shrink-0 items-center justify-between border-b border-border px-1"
              style={{
                paddingTop: "env(safe-area-inset-top, 0px)",
                height: "calc(2.75rem + env(safe-area-inset-top, 0px))",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="返回"
                className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:text-muted-foreground"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              {topBarExtra}
            </div>
            {/* 可滚动内容 */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
