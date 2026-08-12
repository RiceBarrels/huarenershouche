"use client";

// 通用移动端浮层:在当前页面(不跳链接)以浮层打开内容。
// 动画借鉴 iOS 主屏打开/关闭 App:弹簧曲线、缩放中窗口带圆角;
// 打开时卡片放大、内容早早淡入(图标→App);
// 关闭时内容保持可见随窗口缩小,临近落回卡片才溶解回卡片(App→图标)。
// 返回:始终缩回原来的卡片位置(共享元素);拖动到阈值松手时,从当前位置连续缩回。
//   · 横向拖动(左/右)任意位置;纵向在滚到顶下拉 / 滚到底上推时,否则正常滚动。
// 需放在 <AnimatePresence> 内,并带唯一 key。

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";
import { getDeviceCornerPx } from "@/lib/device-corner";

const DISMISS_PX = 90; // 位移阈值
const DISMISS_V = 0.5; // 速度阈值 px/ms
// iOS 打开/关闭 App 式的弹簧(近临界阻尼,无明显回弹,~0.45s 收敛)
const ZOOM = { type: "spring", stiffness: 400, damping: 40, mass: 0.9 } as const;
// 内容与卡片的交叉溶解:打开时内容早早淡入(图标→App);
// 关闭时内容保持可见随窗口缩小,窗口 clip 已收敛到卡片矩形后才溶解回卡片
// (App→图标),所以可以溶解得很晚
const CONTENT_IN = { duration: 0.1, delay: 0.05 };
const CONTENT_OUT = { duration: 0.14, delay: 0.18 };

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
  heroZIndex = zIndex - 1,
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
  // hero 卡片层单独的层级(portal 到 body,须低于 zIndex):首层设为低于
  // 底部 nav(z-50),放大/缩回时卡片从 nav 底下钻过;sheet 本身层级不受影响
  heroZIndex?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 拖动时轻微缩小(跟手,保持实心)
  const dragScale = useTransform(
    () => 1 - Math.min(0.12, Math.hypot(x.get(), y.get()) / 320 * 0.12),
  );
  // 开始关闭手势即给窗口上圆角(iOS 关 App 同款):随拖动距离渐入,
  // 封顶到设备屏幕圆角(直角屏/web 退回 48px = rounded-lg);
  // 松手回弹时随位移归零自动退回直角
  const maxDragRadius = getDeviceCornerPx(48);
  const dragRadius = useTransform(() =>
    Math.min(maxDragRadius, Math.hypot(x.get(), y.get()) * 2),
  );

  const hero = !!(originRect && heroHtml);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1;
  // 等比缩放(按宽度):卡片与内容都不变形。起点 = 卡片宽/屏宽
  const startScale = originRect ? originRect.width / Math.max(1, vw) : 1;
  // 卡片按宽度放大到全屏后高度不足一屏,落点纵向居中(而非贴顶)
  const heroScale = originRect ? vw / Math.max(1, originRect.width) : 1;
  const heroEndY = originRect
    ? -originRect.top + (vh - originRect.height * heroScale) / 2
    : 0;
  // iOS 式「窗口从卡片矩形长出来」:sheet 除了等比缩放,还用 clip-path 裁成
  // 卡片矩形(高度对齐卡片,而非整屏的瘦长条),随动画展开成全屏。
  // clip 的数值在元素本地(未缩放)坐标系,故除以 startScale 补偿;
  // round 圆角同理补偿,缩到卡片大小时视觉 ≈ 卡片的 rounded-xl(22px)
  const rectVariant = originRect
    ? {
        x: originRect.left,
        y: originRect.top,
        scale: startScale,
        clipPath: `inset(0px 0px ${Math.max(0, vh - originRect.height / Math.max(0.05, startScale))}px 0px round ${22 / Math.max(0.05, startScale)}px)`,
      }
    : { y: "100%" as const };

  // 锁定 body 滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 打开期间隐藏 iOS 原生底部导航(锁计数,独立调用时也生效)
  useEffect(() => acquireNativeBarHideLock(), []);

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
    // data-app-overlay:原生地图页据此把整屏触摸放行给 webview(见 app-map)
    <motion.div className="fixed inset-0 md:hidden" style={{ zIndex }} data-app-overlay="">
      {/* 下层:被点卡片的真实 DOM,始终不透明,从原位连续放大到全屏、退场反向缩回。
          进场前 ~50% 由它露出(内容还透明),之后被内容盖上;返回时内容淡出重新露出它。
          它一直不透明,内容在其上淡入淡出,故交叉过程不会漏出背景、不闪。
          portal 到 body 并单独持较低的 z(heroZIndex):卡片钻到底部 nav(z-50)
          之下,而放大后的 sheet 内容(根节点 zIndex)层级保持不变。 */}
      {hero &&
        originRect &&
        createPortal(
          // 外层跟随拖拽位移/缩放(与内容面板同一组 motion value),返回手势时
          // 卡片与内容一体跟手;内层维持原有的 原位 ↔ 全屏 缩放动画
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 md:hidden"
            style={{ x, y, scale: dragScale, zIndex: heroZIndex }}
          >
            <motion.div
              className="fixed origin-top-left overflow-hidden rounded-xl bg-card"
              style={{
                top: originRect.top,
                left: originRect.left,
                width: originRect.width,
                height: originRect.height,
              }}
              initial={{ x: 0, y: 0, scale: 1 }}
              animate={{
                x: -originRect.left,
                y: heroEndY,
                scale: heroScale,
              }}
              exit={{ x: 0, y: 0, scale: 1, transition: ZOOM }}
              transition={ZOOM}
              dangerouslySetInnerHTML={{ __html: heroHtml! }}
            />
          </motion.div>,
          document.body,
        )}

      {/* 上层:浮层内容,与卡片同轨放大 / 缩小(带圆角的「App 窗口」);
          进场时内容早早淡入盖住卡片,退场时内容缩到临近卡片才溶解回卡片。 */}
      <motion.div
        className="absolute inset-0 origin-top-left"
        initial={rectVariant}
        animate={{ x: 0, y: 0, scale: 1, clipPath: "inset(0px 0px 0px 0px round 0px)" }}
        exit={contentExit}
        transition={ZOOM}
      >
        <motion.div
          className="absolute inset-0"
          initial={hero ? { opacity: 0 } : false}
          animate={hero ? { opacity: 1, transition: CONTENT_IN } : {}}
          exit={hero ? { opacity: 0, transition: CONTENT_OUT } : {}}
        >
          <motion.div
            ref={panelRef}
            className="relative flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl"
            style={{ x, y, scale: dragScale, borderRadius: dragRadius, touchAction: "pan-y" }}
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
