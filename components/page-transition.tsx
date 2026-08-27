"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { triggerHaptic } from "@/lib/haptics";

// 起手点在横向交互区(轮播/横向滚动、地图、滑杆、文本输入)内时
// 不启动全屏返回手势,避免抢占其自身的水平拖拽;可用 data-no-swipe-back 显式豁免
function inHorizontalPanRegion(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      if (el.dataset.noSwipeBack !== undefined) return true;
      if (el.classList.contains("leaflet-container")) return true;
      if (el.classList.contains("native-map-container")) return true;
      if (el.classList.contains("native-map-hole")) return true;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
        return true;
      if (el.scrollWidth > el.clientWidth + 1) {
        const ox = getComputedStyle(el).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

// 绘制前切换动画相位,避免新页先原样闪现一帧(SSR 下退回 useEffect 免警告)
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

let appHydrated = false;
if (typeof window !== "undefined") {
  Promise.resolve().then(() => { appHydrated = true; });
}

// 离场快照:导航前抓取当前页 DOM 与滚动位置,用于渲染"旧页"图层。
// 不能用保存的 children React 节点当旧页:App Router 的 children 是稳定引用,
// 路由切换后再渲染它得到的是【新页】内容,会造成"旧页闪变成新页"。
let _snapshotScrollY = 0;
let _exitHtml: string | null = null;
let _snapshotAt = 0;

function captureSnapshot() {
  _snapshotScrollY = window.scrollY;
  const el = document.getElementById("page-transition-content");
  if (el) {
    // 快照经 dangerouslySetInnerHTML 重新 parse 时 <img> 是全新节点,WebKit 默认
    // 异步解码,即使命中缓存也可能先画一帧空白。标成同步解码(已加载的活图无感)
    el.querySelectorAll("img").forEach((img) => {
      if (img.decoding !== "sync") img.decoding = "sync";
    });
  }
  _exitHtml = el ? el.innerHTML : null;
  _snapshotAt = Date.now();
}

// BackNav sets this to true before calling router.back()
let _isBackNavigation = false;
export function setBackNavigation() {
  _isBackNavigation = true;
  captureSnapshot();
}

// 快照栈:每层是「返回一步会露出的页面」。单格 _exitHtml 只够一次转场用,
// 多级返回时(A→B→回A→再回)上一层快照已被覆盖,拖拽底层会变空白。
// 前进压栈、返回弹栈,拖拽/返回按钮动画的底层永远读栈顶。
const SNAPSHOT_STACK_MAX = 10;
const _snapshotStack: { html: string | null; scrollY: number; path: string }[] = [];
let _currentPath = typeof window !== "undefined" ? window.location.pathname : "";

// 原生边缘滑动返回(WKWebView / 系统手势)自带转场动画,JS 侧跳过,避免播两遍
let _edgeSwipeAt = 0;
let _skipAnimation = false;
// 最近一次「跨路由」popstate 的时刻:手势提交后据此判断返回导航是否已在途
// (在途 = RSC/页面还在加载,覆盖层要继续垫着上一页快照,不能过早弹回)
let _popstateRouteChangeAt = 0;

// 跨布局组返回((backnav) → (bottomnav))时,正在播滑出动画的 PageTransition
// 实例会随旧组 layout 一起卸载,动画被掐断。手势提交时把滑出动画的解析参数
// 存到这里,新组实例按时间轴在同一条曲线上续播剩余动画。
// 不能存每帧采样的位移:commit 落在两次采样之间时拿到的是上一帧的值,
// 接手瞬间画面会倒退一小步(肉眼可见的闪一帧)。
let _gestureHandoff: {
  x0: number; // 松手时顶层位移(px),即滑出动画起点
  vw: number;
  ms: number; // 滑出动画总时长
  start: number; // 动画开始时刻;接手时按 elapsed 续播,播完后过期
} | null = null;

if (typeof window !== "undefined") {
  // 边缘起手先记时间戳;若抬手时几乎无水平位移则是「点按」(如左上角返回按钮),
  // 撤销标记——否则 popstate 会误以为系统手势已播过转场而跳过动画。
  // 真正的原生边缘手势要么有位移,要么被系统接管(touchcancel),标记保留。
  let _edgeTouch: { id: number; x: number } | null = null;
  document.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    const x = t?.clientX ?? 9999;
    if (t && (x <= 32 || x >= window.innerWidth - 32)) {
      _edgeSwipeAt = Date.now();
      _edgeTouch = { id: t.identifier, x };
    }
  }, { capture: true, passive: true });
  document.addEventListener("touchend", (e) => {
    if (!_edgeTouch) return;
    const t = Array.from(e.changedTouches).find((c) => c.identifier === _edgeTouch!.id);
    if (!t) return;
    if (Math.abs(t.clientX - _edgeTouch.x) < 10) _edgeSwipeAt = 0;
    _edgeTouch = null;
  }, { capture: true, passive: true });

  // 点内链 = 前进:抓快照并清返回标记(仅路径变化的链接;查询参数类不算导航)
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("a[href]");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("/")) return;
    try {
      if (new URL(href, window.location.href).pathname === window.location.pathname) return;
    } catch {
      return;
    }
    _isBackNavigation = false;
    _skipAnimation = false;
    captureSnapshot();
  }, { capture: true });

  // 兜底捕获所有前进导航(含按钮里的 router.push/replace,click 监听抓不到的):
  // 包一层 history.pushState/replaceState,URL 变更前 DOM 还是旧页,此刻抓快照。
  // 只在路径真的变化时抓(浮层 pushState、滚动恢复 replaceState 都是同路径,
  // 不能覆盖快照);300ms 内已有快照(链接点击路径)也不覆盖,防止抓到新页。
  const captureIfRouteChange = (url: string | URL | null | undefined, kind: "push" | "replace") => {
    if (url == null) return;
    let destPath: string;
    try {
      destPath = new URL(String(url), window.location.href).pathname;
    } catch {
      return;
    }
    if (destPath === window.location.pathname) return;
    if (Date.now() - _snapshotAt > 300) {
      _isBackNavigation = false;
      captureSnapshot();
    }
    _skipAnimation = false;
    // push = 新开一层,返回时露出的是当前页 → 压栈;replace = 原地替换,下层不变
    if (kind === "push") {
      // path = 此刻还未跳转的当前页,即返回一步会回到的路由(供进入新页后预取)
      _snapshotStack.push({
        html: _exitHtml,
        scrollY: _snapshotScrollY,
        path: window.location.pathname,
      });
      if (_snapshotStack.length > SNAPSHOT_STACK_MAX) _snapshotStack.shift();
    }
    _currentPath = destPath;
  };
  const origPushState = window.history.pushState.bind(window.history);
  window.history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    captureIfRouteChange(url, "push");
    return origPushState(data as never, unused, url);
  } as typeof window.history.pushState;

  const origReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    captureIfRouteChange(url, "replace");
    return origReplaceState(data as never, unused, url);
  } as typeof window.history.replaceState;

  // 浏览器返回键/手势返回/SwipeBack 都走 popstate,自动标记为返回
  window.addEventListener("popstate", () => {
    // popstate 时 URL 已更新:路径真的变了才算返回导航,弹掉已消费的栈顶
    const routeChanged = window.location.pathname !== _currentPath;
    if (routeChanged) {
      _currentPath = window.location.pathname;
      _snapshotStack.pop();
      _popstateRouteChangeAt = Date.now();
    }
    _isBackNavigation = true;
    // 起手在屏幕边缘 → 原生手势导航,系统已有转场。已被 finish() 主动置 true
    // (返回按钮/慢速拖拽已播过滑出动画)时不得覆盖,否则 pop 动画会再播一遍
    _skipAnimation = _skipAnimation || Date.now() - _edgeSwipeAt < 700;
    captureSnapshot();
    // 只有浮层关闭这类「不换路由」的 popstate 需要超时清残留;真实返回导航的
    // 标记留给路由 commit 消费——渲染慢(dev 编译/未缓存页)超过定时也不能丢,
    // 否则返回会被误判成前进(新页从右滑入)
    if (!routeChanged) {
      setTimeout(() => {
        _isBackNavigation = false;
        _skipAnimation = false;
      }, 600);
    }
  });
}

// iOS 导航转场的标准减速曲线(UINavigationController 手感),时长略放宽到 420ms
const DURATION = 420;
const EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
// 手势松手后的收尾曲线:起步就带着手指的速度走,只做减速,不能先慢后快
const RELEASE_EASING = "cubic-bezier(0.17, 0.84, 0.44, 1)";

// 外部做 history.replaceState 浅更新 URL(如主页 tab 同步 /user/[id]/posts)时调用:
// 告知 PageTransition 跳过本次 pathname 变化的转场——否则会进 push 相位,
// children 挂进另一棵容器树导致页面组件重挂载、内部状态被重置
export function skipNextTransition() {
  _skipAnimation = true;
}

// 前页压暗强度随主题走(--push-dim:浅色 0.08 / 深色更重),拖拽起手时刷新。
// JS 驱动的帧(跟手/WAAPI)用不了 CSS 变量做乘法,所以读一次缓存成数值
let _pushDim = 0.08;
function refreshPushDim() {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--push-dim"),
  );
  if (!Number.isNaN(v)) _pushDim = v;
}

// Tab 间切换(bottomnav ↔ bottomnav)用缩放弹出转场,更快更轻
const TAB_DURATION = 260;

// 桌面(md+)不做 iOS 式方向滑动:前进/返回一律用默认的缩放弹出(dynamic)转场。
// 每次转场时实时判断,窗口拖宽/拖窄后立即生效
const isDesktop = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

// (bottomnav) 组内路由:两端都命中才算 tab 切换
const TAB_EXACT = new Set(["/", "/browse", "/community", "/account"]);
const isTabPath = (p: string) =>
  TAB_EXACT.has(p) || p === "/cars" || p.startsWith("/cars/");

// 跨组手势返回接手动画的剩余时长(ms);无进行中的接手返回 0。
// 供随 (bottomnav) layout 在滑出中途挂载的固定元素(DOM tab bar)同步淡入,
// 避免 commit 瞬间在还在滑出的旧页上方凭空闪现。须在渲染期调用
// (PageTransition 的挂载 effect 会清掉断点,effect 里读到的恒为 0)
export function gestureHandoffRemaining(): number {
  const h = _gestureHandoff;
  if (!h) return 0;
  return Math.max(0, h.start + h.ms - Date.now());
}

// BackNav 返回按钮触发与手势一致的「当前页滑出」动画;被 edgeBack 实例接管时返回 true
export function animatedBack(): boolean {
  if (typeof window === "undefined") return false;
  const ev = new CustomEvent("app-animated-back", { cancelable: true });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
}

// Inline keyframe animations can't be disabled from CSS, so gate in JS
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PageTransition({
  children,
  edgeBack = false,
}: {
  children: React.ReactNode;
  /** 启用交互式左缘滑动返回(上一页实时垫在后面,跟手可取消) */
  edgeBack?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPath = useRef(pathname);
  // 首挂载(跨布局组导航)也按方向播动画;tab 切换不跨组,无需在此判断
  const [phase, setPhase] = useState<"idle" | "push" | "pop" | "tab">(() => {
    if (!appHydrated || prefersReducedMotion || _skipAnimation) return "idle";
    if (isDesktop()) return "tab";
    return _isBackNavigation ? "pop" : "push";
  });
  const snapshotScrollY = useRef(_snapshotScrollY);
  const exitHtmlRef = useRef<string | null>(_exitHtml);

  // ---- 交互式边缘返回手势 ----
  const [drag, setDrag] = useState(false);
  const dragRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const topLayerRef = useRef<HTMLDivElement>(null);
  const underLayerRef = useRef<HTMLDivElement>(null);
  const dimLayerRef = useRef<HTMLDivElement>(null);
  const dragScrollY = useRef(0);
  const dragVW = useRef(1);
  // 手势提交后滑出动画的结束时刻:导航 commit 太快时也要等动画播完再撤覆盖层
  const dragHoldUntil = useRef(0);
  // 退出 drag 时要恢复的滚动位置(内容 fixed 期间 body 高度塌缩,浏览器把
  // window.scrollY 钳到 0,路由层的滚动恢复也因此失效):取消 = 拖拽前的位置,
  // 提交 = 目的页离开时的位置(快照栈里存的 scrollY)
  const restoreScrollTarget = useRef<number | null>(null);
  // 滑出途中路由已 commit 时,顶层 children 会瞬间变成目的页内容;
  // 用导航前抓的旧页快照盖在上面,滑出层看起来始终是旧页,不闪变
  const [dragExit, setDragExit] = useState<string | null>(null);
  // 拖拽底层内容:起手时取快照栈顶(返回一步露出的页面)
  const dragUnder = useRef<{ html: string | null; scrollY: number } | null>(null);

  // 跨组接手:挂载瞬间若存在新鲜的转场断点(旧组实例已随 layout 卸载),
  // 本实例用旧页快照从断点把剩余的滑出动画播完。
  // 只读不清,StrictMode 下初始化器可能跑两次;模块变量由挂载 effect 统一清
  const [handoff, setHandoff] = useState(() => {
    const h = _gestureHandoff;
    // 有效期 = 动画时间轴 + 余量:commit 落在滑出播完之后(慢加载)时接手已无
    // 可播内容,直接走 idle 硬切(与旧行为一致)
    if (h && Date.now() - h.start < h.ms + 300 && _exitHtml) {
      // 快照 HTML 内已含拖拽期的 translateY 滚动包装,渲染时不再叠加偏移
      return { html: _exitHtml, ...h };
    }
    return null;
  });
  const handoffTopRef = useRef<HTMLDivElement>(null);
  const handoffDimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!edgeBack) return;
    // past = 手指已越过「松手即提交」的位置阈值(vw/3),用于穿越时触发触觉反馈
    const g = { armed: false, fromEdge: true, sx: 0, sy: 0, st: 0, lastX: 0, lastT: 0, px: 0, pt: 0, past: false };

    function setLayers(dx: number, transition: string) {
      const vw = dragVW.current;
      const top = topLayerRef.current;
      const under = underLayerRef.current;
      const dim = dimLayerRef.current;
      if (top) {
        top.style.transition = transition;
        top.style.transform = `translateX(${dx}px)`;
      }
      if (under) {
        under.style.transition = transition;
        under.style.transform = `translateX(${-0.3 * vw + 0.3 * dx}px)`;
      }
      if (dim) {
        dim.style.transition = transition ? transition.replace(/transform/g, "opacity") : "";
        dim.style.opacity = String(_pushDim * (1 - dx / vw));
      }
    }

    function finish(commit: boolean, dx = 0, velocity = 0) {
      const vw = dragVW.current;
      // 收尾时长由「剩余距离 ÷ 手速」决定:快甩迅速收尾、慢慢松手则从容滑完,
      // 比固定时长更接近真实物理;手速太慢时按 1.1px/ms 的基准速度兜底
      const remaining = commit ? vw - dx : dx;
      const ms = Math.round(
        Math.min(400, Math.max(150, remaining / Math.max(velocity, 1.1))),
      );
      setLayers(commit ? vw : 0, `transform ${ms}ms ${RELEASE_EASING}`);
      if (commit) {
        // 立即触发返回导航,与滑出动画并行(上一页 RSC/数据在动画期间就开始加载,
        // 而不是等动画播完才起步);动画播完前不撤覆盖层,由 hold 兜住
        dragHoldUntil.current = Date.now() + ms;
        _skipAnimation = true;
        _isBackNavigation = true;
        // 供跨组接手:存动画解析参数,新实例用负 delay 在同一条曲线上续播,
        // 与本实例被卸载前的最后一帧逐像素衔接
        _gestureHandoff = { x0: dx, vw, ms, start: Date.now() };
        const backAt = Date.now();
        router.back();
        setTimeout(() => {
          if (!dragRef.current) return;
          if (_popstateRouteChangeAt >= backAt) {
            // 返回导航已在途(目的页还在加载):继续垫着上一页快照等 commit,
            // 只留一个硬性兜底防止加载失败时页面卡死在快照上
            setTimeout(() => {
              if (dragRef.current) {
                dragRef.current = false;
                restoreScrollTarget.current = dragScrollY.current;
                setDrag(false);
              }
            }, 2400);
          } else {
            // 无历史可退(没发生跨路由 popstate):撤掉覆盖层弹回当前页,
            // 断点作废,防止之后某次正常挂载误接手
            _gestureHandoff = null;
            dragRef.current = false;
            restoreScrollTarget.current = dragScrollY.current;
            setDrag(false);
          }
        }, 600);
      } else {
        setTimeout(() => {
          dragRef.current = false;
          restoreScrollTarget.current = dragScrollY.current;
          setDrag(false);
        }, ms);
      }
    }

    function onStart(e: TouchEvent) {
      if (phaseRef.current !== "idle" || dragRef.current) return;
      // 桌面统一缩放转场,滑动返回的方向语义不再成立(触屏宽窗同理)
      if (isDesktop()) return;
      // 一级 tab 页(首页/买车/社区/我的)不做左滑返回
      if (TAB_EXACT.has(window.location.pathname)) return;
      // 详情浮层(SwipeSheet/ProfileDrawer 压了 overlay 历史)或 vaul 抽屉打开时,
      // 关闭手势归浮层自己管;这里再接管会造成双重 history.back(过头返回/需滑两次)
      if (window.history.state?.overlay) return;
      if (document.querySelector("[data-vaul-drawer]")) return;
      const t = e.touches[0];
      if (!t) return;
      // 全屏任意位置左滑均可返回(原生壳与 web 一致);
      // 左缘起手门槛更低,全屏起手要避开横向交互区且需有底层快照
      const fromEdge = t.clientX <= 24;
      if (!fromEdge) {
        if (inHorizontalPanRegion(e.target)) return;
        // 无底层快照(刷新/深链)时拖出去只会露空白,不接管
        if (!_snapshotStack[_snapshotStack.length - 1]?.html) return;
      }
      g.armed = true;
      g.fromEdge = fromEdge;
      g.sx = t.clientX;
      g.sy = t.clientY;
      g.st = e.timeStamp;
      g.lastX = t.clientX;
      g.lastT = e.timeStamp;
    }

    function onMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      if (g.armed && !dragRef.current) {
        const dx = t.clientX - g.sx;
        const dy = t.clientY - g.sy;
        // 全屏起手对水平意图要求更严(dx 明显大于 dy),避免抢竖向滚动/斜滑
        if (Math.abs(dy) * (g.fromEdge ? 1 : 1.4) > Math.abs(dx) || dx < 0) {
          g.armed = false;
          return;
        }
        if (dx > (g.fromEdge ? 10 : 18)) {
          g.armed = false;
          g.past = false;
          dragRef.current = true;
          dragScrollY.current = window.scrollY;
          dragVW.current = window.innerWidth;
          refreshPushDim();
          dragUnder.current = _snapshotStack[_snapshotStack.length - 1] ?? null;
          setDrag(true);
        }
        return;
      }
      if (!dragRef.current) return;
      e.preventDefault();
      const dx = Math.max(0, t.clientX - g.sx);
      // 越过提交阈值轻震一下;往回带退到阈值内(= 松手会取消)再震一下提示
      const past = dx > dragVW.current * 0.33;
      if (past !== g.past) {
        g.past = past;
        triggerHaptic();
      }
      g.px = g.lastX;
      g.pt = g.lastT;
      g.lastX = t.clientX;
      g.lastT = e.timeStamp;
      setLayers(dx, "none");
    }

    function onEnd(e: TouchEvent) {
      g.armed = false;
      if (!dragRef.current) return;
      const t = e.changedTouches[0];
      const endX = t?.clientX ?? g.lastX;
      const dx = Math.max(0, endX - g.sx);
      // 瞬时速度(最后两次采样间),正 = 继续向右;手指停住再松手时趋近 0
      const iv = (endX - g.px) / Math.max(1, e.timeStamp - g.pt);
      // 快甩直接提交;过了 1/3 且松手时手指没在往回带才提交(往回带 = 反悔)
      const commit = iv > 0.6 || (dx > dragVW.current * 0.33 && iv > -0.15);
      finish(commit, dx, Math.max(0, commit ? iv : -iv));
    }

    // BackNav 返回按钮:程序化播放同款「当前页滑出」动画。
    // 没有底层快照(刷新/深链后栈是空的)时不接管——退回 CSS pop 路径,
    // 目的页用真实内容从左滑入(与系统返回一致),而不是滑出后露空白。
    function onProgrammaticBack(e: Event) {
      if (phaseRef.current !== "idle" || dragRef.current) return;
      // 桌面不接管:走普通 router.back() → popstate → 统一缩放转场
      if (isDesktop()) return;
      const under = _snapshotStack[_snapshotStack.length - 1] ?? null;
      if (!under?.html) return;
      e.preventDefault();
      dragRef.current = true;
      dragScrollY.current = window.scrollY;
      dragVW.current = window.innerWidth;
      refreshPushDim();
      dragUnder.current = under;
      setDrag(true);
      // 等覆盖层挂载完成再播滑出
      requestAnimationFrame(() => {
        requestAnimationFrame(() => finish(true));
      });
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    window.addEventListener("app-animated-back", onProgrammaticBack);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("app-animated-back", onProgrammaticBack);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeBack]);

  // 首挂载消费掉标记与快照(路径未变时下面的 effect 不会跑)
  useEffect(() => {
    _isBackNavigation = false;
    _exitHtml = null;
    _skipAnimation = false;
    _gestureHandoff = null;
  }, []);

  // 播放接手的剩余滑出动画:用负 delay 把旧实例那条 RELEASE 曲线原样续播
  // (完整关键帧 + 已流逝时长),位置与压暗都落在同一条时间轴上,无接缝;
  // 旧页快照继续滑出,新页(children)视差跟进
  useIsoLayoutEffect(() => {
    if (!handoff) return;
    const elapsed = Math.min(handoff.ms, Date.now() - handoff.start);
    const opts: KeyframeAnimationOptions = {
      duration: handoff.ms,
      delay: -elapsed,
      easing: RELEASE_EASING,
      fill: "forwards",
    };
    const anims = [
      topLayerRef.current?.animate(
        [
          { transform: `translateX(${-0.3 * (handoff.vw - handoff.x0)}px)` },
          { transform: "translateX(0px)" },
        ],
        opts,
      ),
      handoffTopRef.current?.animate(
        [
          { transform: `translateX(${handoff.x0}px)` },
          { transform: `translateX(${handoff.vw}px)` },
        ],
        opts,
      ),
      handoffDimRef.current?.animate(
        [{ opacity: _pushDim * (1 - handoff.x0 / handoff.vw) }, { opacity: 0 }],
        opts,
      ),
    ];
    // 只触发重渲染,cancel 留给 cleanup(随卸载 commit 同帧执行):
    // 先 cancel 会让快照层回弹到行内样式的起点,重渲染前可能闪现一帧
    const t = setTimeout(() => setHandoff(null), handoff.ms - elapsed + 40);
    return () => {
      clearTimeout(t);
      anims.forEach((a) => a?.cancel());
    };
  }, [handoff]);

  // 进入新页的那一刻就预取返回目标(快照栈顶路由),返回手势提交时 RSC 已在
  // 路由缓存里,避免「第一次滑才触发加载、超时弹回,第二次滑才成功」。
  // 注:prefetch 在 dev 模式是 no-op,效果要在生产构建里验证
  useEffect(() => {
    const prev = _snapshotStack[_snapshotStack.length - 1]?.path;
    if (prev && prev !== pathname) router.prefetch(prev);
  }, [pathname, router]);

  // 退出拖拽回到常规布局:清掉 setLayers 直接写在内容节点上的行内样式
  // (transform/transition 不经 React style prop,React 不会帮忙清),
  // 取消场景下同帧恢复滚动位置,避免闪跳
  useIsoLayoutEffect(() => {
    if (drag) return;
    setDragExit(null);
    const el = topLayerRef.current;
    if (el) {
      el.style.transform = "";
      el.style.transition = "";
    }
    if (restoreScrollTarget.current != null) {
      const y = restoreScrollTarget.current;
      restoreScrollTarget.current = null;
      window.scrollTo(0, y);
    }
  }, [drag]);

  // 兜底:动画 phase 到时归位(某些图层缺席时没有 onAnimationEnd 可触发)
  useEffect(() => {
    if (phase === "idle") return;
    const t = setTimeout(() => setPhase("idle"), DURATION + 60);
    return () => clearTimeout(t);
  }, [phase]);

  // layout effect:在浏览器绘制前切好相位,否则新页会先原样闪现一帧
  useIsoLayoutEffect(() => {
    if (prevPath.current === pathname) return;
    const tabToTab = isTabPath(prevPath.current) && isTabPath(pathname);
    prevPath.current = pathname;
    snapshotScrollY.current = _snapshotScrollY;
    exitHtmlRef.current = _exitHtml;
    _exitHtml = null;

    if (dragRef.current) {
      // 同组返回:本实例自己播完收尾动画,不需要(也不能被)新实例接手
      _gestureHandoff = null;
      // 路由已切换,顶层的 children 此刻起是目的页——盖上旧页快照继续滑出,
      // 否则滑到一半的内容会从旧页闪变成新页
      setDragExit(exitHtmlRef.current);
      // 结束撤层时手动恢复目的页的滚动位置(此刻 body 塌缩,原生恢复已被钳 0)
      restoreScrollTarget.current = dragUnder.current?.scrollY ?? 0;
      const wait = dragHoldUntil.current - Date.now();
      if (wait > 0) {
        setTimeout(() => {
          dragRef.current = false;
          setDrag(false);
        }, wait);
      } else {
        dragRef.current = false;
        setDrag(false);
      }
    }
    if (_skipAnimation) {
      // 边缘滑动手势已播过转场,JS 不再重复
      _skipAnimation = false;
      _isBackNavigation = false;
      setPhase("idle");
    } else if (tabToTab || isDesktop()) {
      // tab 间切换无方向感,前进/返回统一播缩放弹出;桌面所有导航同款(只限电脑版)
      _isBackNavigation = false;
      setPhase("tab");
    } else if (_isBackNavigation) {
      _isBackNavigation = false;
      setPhase("pop");
    } else {
      setPhase("push");
    }
  }, [pathname]);

  if (prefersReducedMotion || phase === "idle" || drag || handoff) {
    // 关键:children 的容器(#page-transition-content)在 idle ↔ drag ↔ handoff
    // 之间必须是同一个 DOM 节点,状态切换只改样式、不重建结构——若重建,手指
    // 按住的元素被销毁,浏览器不再派发后续 touchmove/touchend,手势会卡死
    // (表现为要滑两次,且 children 重挂载像"页面重新加载了一遍")
    return (
      <>
        {drag && (
          <>
            {/* 底层:上一页(快照栈顶),一直在后面(视差跟随) */}
            <div
              ref={underLayerRef}
              className="fixed inset-0 z-[30] overflow-hidden bg-background pointer-events-none"
              style={{ transform: `translateX(${-0.3 * dragVW.current}px)` }}
            >
              {dragUnder.current?.html && (
                <div
                  style={{ transform: `translateY(-${dragUnder.current.scrollY}px)` }}
                  dangerouslySetInnerHTML={{ __html: dragUnder.current.html }}
                />
              )}
            </div>
            <div
              ref={dimLayerRef}
              className="fixed inset-0 z-[31] bg-black pointer-events-none"
              style={{ opacity: _pushDim }}
            />
          </>
        )}
        {/* 接手层压过 DOM tab bar(z-50):(bottomnav) 在滑出中途挂载时,
            tab bar 不得凭空盖在还在滑出的旧页上,只能随左侧露出区域出现 */}
        {handoff && (
          <div
            ref={handoffDimRef}
            className="fixed inset-0 z-[55] bg-black pointer-events-none"
            style={{ opacity: _pushDim * (1 - handoff.x0 / handoff.vw) }}
          />
        )}
        {/* 顶层:当前页,跟手拖动(transform 由 setLayers 直接写行内样式,
            不走 React style prop,避免拖拽中的重渲染把位移重置回 0);
            接手播放时它是目的页,由 WAAPI 做视差跟进 */}
        <div
          id="page-transition-content"
          ref={topLayerRef}
          className={drag ? "fixed inset-0 z-[32] overflow-hidden rounded-[var(--page-corner)] bg-background" : undefined}
          style={drag ? { boxShadow: "var(--push-shadow)" } : undefined}
        >
          <div style={drag ? { transform: `translateY(-${dragScrollY.current}px)` } : undefined}>
            {children}
          </div>
          {/* commit 后盖住已变成目的页的 children;快照抓自拖拽期的本节点,
              已含 translateY 滚动包装,原样渲染即与被盖内容逐像素对齐 */}
          {drag && dragExit && (
            <div
              className="absolute inset-0 overflow-hidden bg-background"
              dangerouslySetInnerHTML={{ __html: dragExit }}
            />
          )}
        </div>
        {handoff && (
          // 跨组接手的旧页快照:从断点位置继续滑出屏幕
          <div
            ref={handoffTopRef}
            className="fixed inset-0 z-[60] overflow-hidden rounded-[var(--page-corner)] bg-background pointer-events-none"
            style={{
              transform: `translateX(${handoff.x0}px)`,
              boxShadow: "var(--push-shadow)",
            }}
          >
            {handoff.html && (
              <div dangerouslySetInnerHTML={{ __html: handoff.html }} />
            )}
          </div>
        )}
      </>
    );
  }

  // 旧页图层内容:一律用导航前抓的 DOM 快照(children 是稳定引用,渲染出来是新页)
  const exitLayer = exitHtmlRef.current ? (
    <div
      style={{ transform: `translateY(-${snapshotScrollY.current}px)` }}
      dangerouslySetInnerHTML={{ __html: exitHtmlRef.current }}
    />
  ) : null;

  if (phase === "tab") {
    return (
      <>
        {/* 旧 tab 页:原地缩小淡出 */}
        {exitLayer && (
          <div
            className="fixed inset-0 z-[30] overflow-hidden bg-background pointer-events-none"
            style={{ animation: `tab-shrink ${TAB_DURATION}ms ${EASING} both` }}
          >
            {exitLayer}
          </div>
        )}
        {/* 新 tab 页:从略小弹入 */}
        <div
          className="fixed inset-0 z-[31] overflow-y-auto"
          style={{ animation: `tab-pop ${TAB_DURATION}ms ${EASING} both` }}
          onAnimationEnd={() => setPhase("idle")}
        >
          {children}
        </div>
      </>
    );
  }

  if (phase === "push") {
    return (
      <>
        {exitLayer && (
          <div
            className="fixed inset-0 z-[30] overflow-hidden bg-background pointer-events-none"
            style={{ animation: `ios-push-back ${DURATION}ms ${EASING} both` }}
          >
            {exitLayer}
          </div>
        )}
        <div
          className="fixed inset-0 z-[31] bg-black pointer-events-none"
          style={{ animation: `dim-in ${DURATION}ms ${EASING} both` }}
        />
        <div
          className="fixed inset-0 z-[32] overflow-y-auto bg-background"
          style={{ animation: `ios-push-in ${DURATION}ms ${EASING} both` }}
          onAnimationEnd={() => setPhase("idle")}
        >
          {children}
        </div>
      </>
    );
  }

  // phase === "pop": back navigation
  return (
    <>
      {/* Destination page (new children) slides in from left behind */}
      <div
        className="fixed inset-0 z-[30] overflow-y-auto bg-background"
        style={{ animation: `ios-pop-reveal ${DURATION}ms ${EASING} both` }}
      >
        {children}
      </div>
      {/* Dim overlay fading out */}
      <div
        className="fixed inset-0 z-[31] bg-black pointer-events-none"
        style={{ animation: `dim-out ${DURATION}ms ${EASING} both` }}
      />
      {/* Previous page slides out to right */}
      {exitLayer && (
        <div
          className="fixed inset-0 z-[32] overflow-hidden bg-background pointer-events-none"
          style={{ animation: `ios-pop-out ${DURATION}ms ${EASING} both` }}
          onAnimationEnd={() => setPhase("idle")}
        >
          {exitLayer}
        </div>
      )}
    </>
  );
}
