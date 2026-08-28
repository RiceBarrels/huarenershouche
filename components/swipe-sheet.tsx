"use client";

// 通用移动端浮层:在当前页面(不跳链接)以浮层打开内容。
// 动画借鉴 iOS 主屏打开/关闭 App:弹簧曲线、缩放中窗口带圆角;
// 打开时卡片放大、内容早早淡入(图标→App);
// 关闭时内容保持可见随窗口缩小,临近落回卡片才溶解回卡片(App→图标)。
// 返回:始终缩回原来的卡片位置(共享元素);拖动到阈值松手时,从当前位置连续缩回。
//   · 横向拖动(左/右)任意位置;纵向在滚到顶下拉 / 滚到底上推时,否则正常滚动。
// 需放在 <AnimatePresence> 内,并带唯一 key。

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useMotionValue,
  useTransform,
  useIsPresent,
  animate,
} from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { triggerHaptic } from "@/lib/haptics";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";
import { getDeviceCornerPx, hasDeviceCorner } from "@/lib/device-corner";

const DISMISS_PX = 90; // 位移阈值
const DISMISS_V = 0.5; // 速度阈值 px/ms
// iOS 打开/关闭 App 式的弹簧(近临界阻尼,无明显回弹,~0.45s 收敛)
const ZOOM = { type: "spring", stiffness: 400, damping: 40, mass: 0.9 } as const;
// 无卡片起点时:iOS push 式从右滑入,与 backnav 页面转场同款曲线/时长
const PUSH = { duration: 0.42, ease: [0.32, 0.72, 0, 1] } as const;
const PUSH_CSS = "transform 420ms cubic-bezier(0.32, 0.72, 0, 1)";

// push 模式下被推到后面的页面内容(#page-transition-content)的视差管理:
// 多层 push 叠开时计数,最后一层退场才把内容滑回原位/清内联样式
let pushUnderLayers = 0;

function releasePushUnder(el: HTMLElement | null, animated: boolean) {
  pushUnderLayers = Math.max(0, pushUnderLayers - 1);
  if (!el || pushUnderLayers > 0) return;
  if (animated) {
    el.style.transition = PUSH_CSS;
    el.style.transform = "translateX(0px)";
    setTimeout(() => {
      if (pushUnderLayers > 0) return; // 退场期间又开了新的 push 层
      el.style.transition = "";
      el.style.transform = "";
      el.style.willChange = "";
    }, 440);
  } else {
    el.style.transition = "";
    el.style.transform = "";
    el.style.willChange = "";
  }
}
// 内容与卡片的交叉溶解:打开时内容早早淡入(图标→App);
// 关闭时内容保持可见随窗口缩小,窗口 clip 已收敛到卡片矩形后才溶解回卡片
// (App→图标),所以可以溶解得很晚
const CONTENT_IN = { duration: 0.1, delay: 0.05 };
const CONTENT_OUT = { duration: 0.14, delay: 0.18 };
// 全屏(无裁剪)状态的 clip 值;进场的终点、退场 keyframes 的显式起点
const FULL_CLIP = "inset(0px 0px 0px 0px round 0px)";

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
  const { t } = useI18n();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  // 进场动画收敛后置 true:清掉外层残留 clip、隐藏被盖死的 hero 层
  const [settled, setSettled] = useState(false);
  // 关闭手势起手即置 true:提前恢复 hero 层可见,让 Safari 在拖动中就把
  // 这张全屏层重新光栅化好,而不是压在松手退场的第一帧(那一帧还有三条
  // 弹簧同时起步,最容易掉帧)。松手不关闭时复位
  const [dragActive, setDragActive] = useState(false);

  // 拖动时轻微缩小(跟手,保持实心)——仅卡片模式(缩小是「缩回卡片」的前奏);
  // push 模式(无卡片)与 backnav 手势一致,只位移不缩放
  const dragScale = useTransform(() =>
    originRect
      ? 1 - Math.min(0.12, (Math.hypot(x.get(), y.get()) / 320) * 0.12)
      : 1,
  );
  // 关闭手势的窗口圆角(iOS 关 App 同款)。border-radius 一变全屏面板就整层
  // 重绘,所以绝不逐帧跟位移:
  // · 圆角屏真机:常驻设备圆角,被屏幕物理圆角遮住,零动画零重绘;
  // · 直角屏/web:起手一次性淡入 48px(rounded-lg),松手回弹/关闭淡出
  const maxDragRadius = getDeviceCornerPx(48);
  const staticRadius = hasDeviceCorner();
  const dragRadius = useMotionValue(staticRadius ? maxDragRadius : 0);

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
    : // 无卡片起点:从右滑入(backnav push 同款),转场中带设备圆角
      { x: "100%" as const, borderRadius: getDeviceCornerPx(48) };
  // push 模式的窗口圆角:border-radius 一变全屏层就整帧重绘(Safari 尤甚),
  // 绝不与位移同帧动画:
  // · 圆角屏真机:常驻设备圆角(被物理圆角遮住),零动画零重绘;
  // · 直角屏/web:滑动全程保持 48px 纯 transform 移动,落点瞬间切成直角;
  //   退场起步瞬间切回 48px 后纯 transform 滑出。只各重绘一帧
  const pushAnimate = {
    x: 0,
    borderRadius: staticRadius ? getDeviceCornerPx(48) : 0,
  };
  const pushEnterTransition = staticRadius
    ? PUSH
    : ({ default: PUSH, borderRadius: { delay: PUSH.duration, duration: 0 } } as const);
  const pushExitTransition = staticRadius
    ? PUSH
    : ({ default: PUSH, borderRadius: { duration: 0 } } as const);

  // push 模式背后压暗强度(--push-dim 随主题),挂载时读一次
  const [pushDim] = useState(() =>
    typeof window === "undefined"
      ? 0.08
      : parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--push-dim"),
        ) || 0.08,
  );

  // —— push 模式:后面的页面内容跟着往左(-30% 视差,与 backnav 前页一致)——
  const isPresent = useIsPresent();
  const underElRef = useRef<HTMLElement | null>(null);
  const underReleasedRef = useRef(false);

  // 进场滑到 -30%;拖拽关闭时跟手回移(0.3 × dx,同 backnav 手势的底层)
  useEffect(() => {
    if (originRect) return;
    const el = document.getElementById("page-transition-content");
    underElRef.current = el;
    if (!el) return;
    // 每次挂载都重新武装(StrictMode 下 effect 会跑两遍,cleanup 置过 true;
    // 不复位的话真正退场时会被误判为已释放,内容卡在 -30% 不归位)
    underReleasedRef.current = false;
    pushUnderLayers++;
    const vw = window.innerWidth;
    // 提前提升为合成层:拖拽中逐帧写 transform 不再触发整页重绘/重光栅化
    el.style.willChange = "transform";
    el.style.transition = PUSH_CSS;
    const raf = requestAnimationFrame(() => {
      el.style.transform = `translateX(${-0.3 * vw}px)`;
    });
    const unsub = x.on("change", (v) => {
      if (underReleasedRef.current) return;
      const dx = Math.max(0, v);
      el.style.transition = "none";
      el.style.transform = `translateX(${-0.3 * vw + 0.3 * dx}px)`;
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      // 未经退场动画直接卸载(如路由跳转清栈):立刻归位
      if (!underReleasedRef.current) {
        underReleasedRef.current = true;
        releasePushUnder(el, false);
      }
    };
  }, [originRect, x]);

  // 退场开始(AnimatePresence 移除本层):内容与 sheet 并行滑回原位
  useEffect(() => {
    if (isPresent || originRect || underReleasedRef.current) return;
    underReleasedRef.current = true;
    releasePushUnder(underElRef.current, true);
  }, [isPresent, originRect]);

  // 进场收敛后把外层残留的 no-op clip 换成 none:面板(合成层)拖拽时不再
  // 每帧被祖先 clip 重新裁剪。退场 keyframes 自带显式起点,不依赖这个值
  useEffect(() => {
    if (!settled || !originRect || !isPresent) return;
    outerRef.current?.style.setProperty("clip-path", "none");
  }, [settled, originRect, isPresent]);

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
      // 起手目标,轴向判定为横向时才做 isInHScroller 祖先链遍历(scrollWidth/
      // getComputedStyle 都是强制布局读),点按和纵向滚动完全不付这笔钱
      startTarget: null as EventTarget | null,
      // 轴向判定时采样一次;y 拖动中 preventDefault 挡住了滚动,值不会变。
      // 每帧读 scrollTop/scrollHeight 会在布局脏时强制整页同步 reflow,掉帧
      atTop: false,
      atBottom: false,
      // 已越过「松手即关闭」的位移阈值,穿越(双向)时触发触觉反馈
      past: false,
      // 起手在 data-sheet-static="y" 内:纵向交给内容自己滚,横滑关闭仍可用
      yOff: false,
    };

    // 越过关闭阈值轻震一下;往回带退到阈值内(= 松手会取消)再震一下提示
    const syncPast = (d: number) => {
      const past = d > DISMISS_PX;
      if (past !== st.past) {
        st.past = past;
        triggerHaptic();
      }
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
      if (!staticRadius) animate(dragRadius, 0, { duration: 0.3, ease: "easeOut" });
    };

    const onStart = (e: TouchEvent) => {
      // 「静态层」内的手势不接管:默认(如图片灯箱)横竖全放行;
      // ="y" 时(如聊天)只放行纵向滚动,横滑关闭仍然可用
      const staticEl =
        e.target instanceof HTMLElement
          ? e.target.closest("[data-sheet-static]")
          : null;
      if (staticEl && staticEl.getAttribute("data-sheet-static") !== "y") {
        st.active = false;
        return;
      }
      st.yOff = !!staticEl;
      const t = e.touches[0];
      st.active = true;
      st.axis = "";
      st.sx = st.lx = t.clientX;
      st.sy = st.ly = t.clientY;
      st.lt = e.timeStamp;
      st.vx = st.vy = 0;
      st.past = false;
      st.startTarget = e.target;
    };

    const onMove = (e: TouchEvent) => {
      // 已交给原生滚动:立刻返回,不再算速度/位移
      if (!st.active || st.axis === "scroll") return;
      const t = e.touches[0];
      const dx = t.clientX - st.sx;
      const dy = t.clientY - st.sy;
      const dt = Math.max(1, e.timeStamp - st.lt);
      st.vx = (t.clientX - st.lx) / dt;
      st.vy = (t.clientY - st.ly) / dt;
      st.lx = t.clientX;
      st.ly = t.clientY;
      st.lt = e.timeStamp;

      if (!st.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        const sc = scrollRef.current;
        st.atTop = !sc || sc.scrollTop <= 0;
        st.atBottom = !sc || sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
        if (Math.abs(dx) > Math.abs(dy)) {
          // 左缘起手豁免:返回手势优先于轮播横滑(与系统边缘返回一致),
          // 否则起手落在轮播上时第一滑被轮播吃掉,要滑两次才能关闭
          const inHScroll = st.sx > 24 && isInHScroller(st.startTarget);
          st.axis = inHScroll ? "scroll" : "x";
        } else if (!st.yOff && ((dy > 0 && st.atTop) || (dy < 0 && st.atBottom))) {
          st.axis = "y";
        } else {
          st.axis = "scroll"; // 交给原生滚动
        }
        // 关闭手势起手:窗口圆角一次性淡入(拖动中不再逐帧变化;圆角屏常驻免动画),
        // 并提前唤醒 hero 层(见 dragActive)
        if (st.axis === "x" || st.axis === "y") {
          if (!staticRadius) {
            animate(dragRadius, maxDragRadius, { duration: 0.18, ease: "easeOut" });
          }
          setDragActive(true);
        }
      }

      if (st.axis === "x") {
        e.preventDefault();
        x.set(dx);
        syncPast(Math.abs(dx));
      } else if (st.axis === "y") {
        if ((dy > 0 && st.atTop) || (dy < 0 && st.atBottom)) {
          e.preventDefault();
          y.set(dy);
          syncPast(Math.abs(dy));
        } else {
          st.axis = "scroll";
          y.set(0);
          if (!staticRadius) animate(dragRadius, 0, { duration: 0.2, ease: "easeOut" });
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
        // 圆角保持现值不再动画:退场中窗口等比缩小,48px 圆角随 scale 收敛到
        // ≈ 卡片的 rounded-xl;圆角差额处露出的是背后不透明的 hero 卡片本身,
        // 视觉无碍,而整个退场的逐帧 border-radius 重绘直接归零
        animate(x, 0, ZOOM);
        animate(y, 0, ZOOM);
        onClose();
        return;
      }
      springBack();
      // 纯点按(axis 未定,如按返回钮)不复位:touchend 先于 click 触发,
      // 复位会把刚唤醒的 hero 层又藏回去,click 关闭时白唤醒一场
      if (st.axis) setDragActive(false);
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
  }, [x, y, dragRadius, maxDragRadius, staticRadius, onClose]);

  // 内容(上层)始终与卡片同轨放大 / 缩回;进/退场都在整段 ~50% 处由内层透明度交叉。
  // 无卡片起点时退场沿 push 曲线滑回右侧。
  // 进场收敛后行内 clip 被直接换成 none(绕过 framer,省拖拽时的逐帧祖先
  // 裁剪);framer 内部的 clipPath 值仍是 FULL_CLIP,退场从内部值起播、
  // 第一帧就覆盖掉 none——收敛后关闭与进场中途打断关闭都平滑
  const contentExit = {
    ...rectVariant,
    transition: originRect ? ZOOM : pushExitTransition,
  };

  return (
    // 根节点为 motion 组件,AnimatePresence 才能在卸载前播放子层退场动画
    // data-app-overlay:原生地图页据此把整屏触摸放行给 webview(见 app-map)
    <motion.div className="fixed inset-0 md:hidden" style={{ zIndex }} data-app-overlay="">
      {/* push 模式(无卡片起点):背后页面压暗层,与 backnav 转场一致 */}
      {!originRect && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: pushDim }}
          exit={{ opacity: 0, transition: PUSH }}
          transition={PUSH}
        />
      )}
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
            style={{
              x,
              y,
              scale: dragScale,
              zIndex: heroZIndex,
              willChange: "transform",
              // 进场交叉溶解完成后它被不透明面板盖死,隐藏掉省一张全屏合成层
              // (拖拽时也不再逐帧跟着变换);关闭手势起手 / 退场开始时恢复
              visibility: settled && isPresent && !dragActive ? "hidden" : "visible",
            }}
          >
            <motion.div
              className="fixed origin-top-left overflow-hidden rounded-xl bg-card"
              style={{
                top: originRect.top,
                left: originRect.left,
                width: originRect.width,
                height: originRect.height,
                // 缩放弹簧逐帧写 transform:不提升的话 Safari 每帧重绘父层
                willChange: "transform",
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
        ref={outerRef}
        className="absolute inset-0 origin-top-left"
        // willChange:进/退场逐帧写 transform/clip-path/border-radius,提前提升
        // 为合成层,Safari 才把 clip/圆角挪到合成器做,不再每帧重光栅化整层
        style={
          originRect
            ? { willChange: "transform, clip-path" }
            : {
                overflow: "hidden",
                boxShadow: "var(--push-shadow)",
                willChange: "transform, border-radius",
              }
        }
        initial={rectVariant}
        animate={
          originRect
            ? { x: 0, y: 0, scale: 1, clipPath: FULL_CLIP }
            : pushAnimate
        }
        exit={contentExit}
        transition={originRect ? ZOOM : pushEnterTransition}
        onAnimationComplete={() => setSettled(true)}
      >
        <motion.div
          className="absolute inset-0"
          // 交叉溶解逐帧写 opacity:自持合成层后只改层透明度,不触发重绘
          style={hero ? { willChange: "opacity" } : undefined}
          initial={hero ? { opacity: 0 } : false}
          animate={hero ? { opacity: 1, transition: CONTENT_IN } : {}}
          exit={hero ? { opacity: 0, transition: CONTENT_OUT } : {}}
        >
          <motion.div
            ref={panelRef}
            className="relative flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl"
            style={{ x, y, scale: dragScale, borderRadius: dragRadius, touchAction: "pan-y", willChange: "transform" }}
          >
            {/* 顶部返回栏:左侧返回,右侧快捷操作(垫出刘海安全区) */}
            <div
              className="flex h-11 shrink-0 items-center justify-between border-b border-border px-1 bg-card"
              style={{
                paddingTop: "env(safe-area-inset-top, 0px)",
                height: "calc(2.75rem + env(safe-area-inset-top, 0px))",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                // 手指落上就先唤醒 hero 层,点按松开触发关闭时层已光栅化好
                onTouchStart={() => setDragActive(true)}
                aria-label={t("返回")}
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
