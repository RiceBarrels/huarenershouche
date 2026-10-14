"use client";

// 移动端通用「原地浮层」:任意车卡片 / 社区帖卡片点开都在当前页浮层打开详情
// (不跳链接),从卡片放大成全屏;详情里的推荐(车 / 帖)再点也在浮层内逐层打开,
// 可逐层返回。桌面端(enabled=false)保持原来的链接跳转。
// 浮层外壳统一复用 <SwipeSheet />。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { usePathname } from "@/components/localized-navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { SwipeSheet, type OriginRect } from "@/components/swipe-sheet";
import { CarSheetActions } from "@/components/car-sheet-actions";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import {
  OverlayLayerRegistryCtx,
  OverlayLayerZCtx,
} from "@/components/overlay-stack";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";
import { triggerHaptic } from "@/lib/haptics";
import { trackPageview } from "@/lib/analytics/client";
import { useI18n } from "@/components/i18n-provider";
import type { DbCar, DbCommunityPost } from "@/lib/types";

// 动态载入,打断 detail → card → 本文件 的循环依赖,并分包
const CarDetail = dynamic(() => import("@/app/[locale]/(backnav)/car/car-detail"), {
  ssr: false,
});
const CommunityDetail = dynamic(
  () => import("@/app/[locale]/(backnav)/community/community-detail"),
  { ssr: false },
);
const UserDetail = dynamic(() => import("@/app/[locale]/(backnav)/user/user-detail"), {
  ssr: false,
});

// 手机端以浮层栈打开的普通页面(上一页保持挂载,真实垫在后面):
// 仅收录无复杂内链的叶子页;浮层内发生真实路由跳转时会自动清栈。
const PAGE_ROUTES: Record<string, ComponentType> = {
  "/tools/loan": dynamic(() => import("@/app/[locale]/(backnav)/tools/loan/page"), { ssr: false }),
  "/tools/fuel": dynamic(() => import("@/app/[locale]/(backnav)/tools/fuel/page"), { ssr: false }),
  "/tools/budget": dynamic(() => import("@/app/[locale]/(backnav)/tools/budget/page"), { ssr: false }),
  "/tools/units": dynamic(() => import("@/app/[locale]/(backnav)/tools/units/page"), { ssr: false }),
  "/tools/parking": dynamic(() => import("@/app/[locale]/(backnav)/tools/parking/page"), { ssr: false }),
  "/tools/luck": dynamic(() => import("@/app/[locale]/(backnav)/tools/luck/page"), { ssr: false }),
  "/tools/plate": dynamic(() => import("@/app/[locale]/(backnav)/tools/plate/page"), { ssr: false }),
  "/tools/haggle": dynamic(() => import("@/app/[locale]/(backnav)/tools/haggle/page"), { ssr: false }),
  "/vin": dynamic(() => import("@/app/[locale]/(backnav)/vin/page"), { ssr: false }),
  "/guide": dynamic(() => import("@/app/[locale]/(backnav)/guide/page"), { ssr: false }),
  "/guide/buying": dynamic(() => import("@/app/[locale]/(backnav)/guide/buying/page"), { ssr: false }),
  "/guide/loan": dynamic(() => import("@/app/[locale]/(backnav)/guide/loan/page"), { ssr: false }),
  "/guide/insurance": dynamic(() => import("@/app/[locale]/(backnav)/guide/insurance/page"), { ssr: false }),
  "/guide/dmv": dynamic(() => import("@/app/[locale]/(backnav)/guide/dmv/page"), { ssr: false }),
  "/business": dynamic(() => import("@/app/[locale]/(backnav)/business/page"), { ssr: false }),
  "/contact": dynamic(() => import("@/app/[locale]/(backnav)/contact/page"), { ssr: false }),
};

interface OverlayCtx {
  enabled: boolean;
  /** 当前是否有移动端详情浮层打开(CompareBar 等全局固定元素需避让/提层) */
  overlayOpen: boolean;
  openCar: (car: DbCar, rect?: OriginRect | null, heroHtml?: string | null, sourceEl?: HTMLElement | null) => void;
  openPost: (post: DbCommunityPost, rect?: OriginRect | null, heroHtml?: string | null, sourceEl?: HTMLElement | null) => void;
  openUser: (userId: string) => void;
  /** 手机端把注册过的普通页面以浮层栈打开(上一页保持挂载);不可嵌入时返回 false */
  openPage: (href: string) => boolean;
  /** 清空整个浮层栈(浮层内做「pathname 不变、仅 query 变」的跳转前调用,
      如点 hashtag 跳 /community?q=…;pathname 变化的跳转会自动清栈) */
  closeAll: () => void;
}

const Ctx = createContext<OverlayCtx>({
  enabled: false,
  overlayOpen: false,
  openCar: () => {},
  openPost: () => {},
  openUser: () => {},
  openPage: () => false,
  closeAll: () => {},
});

export const useOverlay = () => useContext(Ctx);
// 兼容既有引用
export const useCarOverlay = useOverlay;

type CarLayerInput = { kind: "car"; car: DbCar; rect: OriginRect | null; heroHtml: string | null; sourceEl?: HTMLElement | null };
type PostLayerInput = { kind: "post"; post: DbCommunityPost; rect: OriginRect | null; heroHtml: string | null; sourceEl?: HTMLElement | null };
type UserLayerInput = { kind: "user"; userId: string; rect: OriginRect | null; heroHtml: string | null };
type PageLayerInput = { kind: "page"; href: string; rect: OriginRect | null; heroHtml: string | null };
// 自渲染的外部浮层(NonModalDrawer / OverlaySheet):栈里只占位协调层级与
// 系统返回,渲染由注册方自己负责;close 在该层被返回键/清栈移除时调用
type ExternalLayerInput = { kind: "external"; id: string; close: () => void };
type LayerInput = CarLayerInput | PostLayerInput | UserLayerInput | PageLayerInput;
type Layer = (LayerInput | ExternalLayerInput) & { key: number };

// 卖家主页浮层外壳:底部 drawer(挂载后再置 open 以播放进场动画;
// 拖拽/点遮罩关闭时等退场动画放完再出栈)。
// 非 modal + 自绘遮罩的外壳复用 <NonModalDrawer />(modal 抽屉会把 body 置
// pointer-events:none,浮层栈里的手势/点击会被整体掐断)。
function ProfileDrawer({
  onClose,
  zIndex,
  children,
}: {
  onClose: () => void;
  zIndex: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // 先画一帧关闭态再置 open,确保进场动画可靠播放
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <NonModalDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          // 等退场动画放完再出栈
          setTimeout(onClose, 250);
        }
      }}
      zIndex={zIndex}
      // 本身就是浮层栈中的一层(user),不再重复注册
      stacked={false}
      contentClassName="max-h-[92vh]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </NonModalDrawer>
  );
}

export function CarOverlayProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [stack, setStack] = useState<Layer[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const q = window.matchMedia("(max-width: 767px)");
    const update = () => setEnabled(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);

  // 被点的原卡片在浮层存在期间隐藏(悬浮的 hero 克隆即它本身,避免出现两份);
  // push 时隐藏(事件回调里做 DOM 修改),直到退场动画播完、克隆落回原位
  // (AnimatePresence onExitComplete)才恢复显示,缩回途中不会出现两份
  const hiddenSources = useRef(new Map<number, HTMLElement>());
  const stackKeys = useRef<number[]>([]);
  const externalIds = useRef(new Set<string>());
  useEffect(() => {
    stackKeys.current = stack.map((l) => l.key);
    externalIds.current = new Set(
      stack.filter((l) => l.kind === "external").map((l) => l.id),
    );
  }, [stack]);
  const restoreExitedSources = useCallback(() => {
    const alive = new Set(stackKeys.current);
    for (const [key, el] of hiddenSources.current) {
      if (!alive.has(key)) {
        el.style.visibility = "";
        hiddenSources.current.delete(key);
      }
    }
  }, []);

  // 悬浮层(SwipeSheet)开/关时给一次轻触觉;user 层的外壳是 drawer、
  // external 层(NonModalDrawer/OverlaySheet)自带 haptic,排除避免双震
  const prevSheetCount = useRef(0);
  useEffect(() => {
    const n = stack.filter(
      (l) => l.kind !== "user" && l.kind !== "external",
    ).length;
    if (n === prevSheetCount.current) return;
    prevSheetCount.current = n;
    triggerHaptic();
  }, [stack]);

  // 任一详情浮层打开期间隐藏 iOS 原生底部导航
  // (external 层不算:drawer 内容自带 NativeBarHideLock,SwipeSheet 自己加锁)
  const overlayOpen = stack.some((l) => l.kind !== "external");
  useEffect(() => {
    if (!overlayOpen) return;
    return acquireNativeBarHideLock();
  }, [overlayOpen]);

  // —— 外部浮层注册(NonModalDrawer / OverlaySheet)——
  // 打开时占一层:统一 z 分配 + 系统返回逐层关闭
  const registerLayer = useCallback((id: string, close: () => void) => {
    const key = ++counter.current;
    setStack((s) =>
      s.some((l) => l.kind === "external" && l.id === id)
        ? s
        : [...s, { kind: "external", id, close, key }],
    );
    window.history.pushState({ overlay: true }, "");
  }, []);
  const releaseLayer = useCallback((id: string) => {
    // 已被系统返回/清栈移除:不再消费历史
    if (!externalIds.current.has(id)) return;
    if (window.history.state?.overlay) window.history.back();
    else setStack((s) => s.filter((l) => !(l.kind === "external" && l.id === id)));
  }, []);
  const registry = useMemo(
    () => ({ register: registerLayer, release: releaseLayer }),
    [registerLayer, releaseLayer],
  );
  // id → 层级(55 起按栈序递增,封顶 69)
  const layerZ = useMemo(() => {
    const m = new Map<string, number>();
    stack.forEach((l, i) => {
      if (l.kind === "external") m.set(l.id, Math.min(55 + i, 69));
    });
    return m;
  }, [stack]);
  // 被返回键/清栈移除的 external 层:通知注册方 setOpen(false) 播放退场
  const prevLayers = useRef<Layer[]>([]);
  useEffect(() => {
    const alive = new Set(stack.map((l) => l.key));
    for (const l of prevLayers.current) {
      if (l.kind === "external" && !alive.has(l.key)) l.close();
    }
    prevLayers.current = stack;
  }, [stack]);

  const push = useCallback((layer: LayerInput) => {
    const key = ++counter.current;
    const sourceEl =
      layer.kind === "car" || layer.kind === "post" ? layer.sourceEl : null;
    if (sourceEl) {
      sourceEl.style.visibility = "hidden";
      hiddenSources.current.set(key, sourceEl);
    }
    setStack((s) => [...s, { ...layer, key }]);
    // 压一条历史:系统返回键/浏览器返回逐层关闭,且不改变地址栏
    window.history.pushState({ overlay: true }, "");
  }, []);

  // 访问统计:浮层不改 URL(路由 pageview 记不到),帖子 / 主页 / 工具页按其逻辑路径各记一次 pageview;
  // 车辆浮层不在这里记,由 car-detail 加载到车辆时记 car_view
  const { locale } = useI18n();

  const openCar = useCallback(
    (car: DbCar, rect?: OriginRect | null, heroHtml?: string | null, sourceEl?: HTMLElement | null) =>
      push({ kind: "car", car, rect: rect ?? null, heroHtml: heroHtml ?? null, sourceEl }),
    [push],
  );
  const openPost = useCallback(
    (post: DbCommunityPost, rect?: OriginRect | null, heroHtml?: string | null, sourceEl?: HTMLElement | null) => {
      push({ kind: "post", post, rect: rect ?? null, heroHtml: heroHtml ?? null, sourceEl });
      trackPageview({ rawPathname: `/community/${post.id}`, search: "", locale });
    },
    [push, locale],
  );
  // 主页从底部滑入(头像/名字太扁,不做卡片放大)
  const openUser = useCallback(
    (userId: string) => {
      push({ kind: "user", userId, rect: null, heroHtml: null });
      trackPageview({ rawPathname: `/user/${userId}`, search: "", locale });
    },
    [push, locale],
  );
  const openPage = useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      if (!enabled || !PAGE_ROUTES[path]) return false;
      push({ kind: "page", href: path, rect: null, heroHtml: null });
      trackPageview({ rawPathname: path, search: "", locale });
      return true;
    },
    [enabled, push, locale],
  );

  // 浮层内触发了真实路由跳转(内链/按钮)时,清空浮层栈交还给页面
  const pathname = usePathname();
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    setStack([]);
  }, [pathname]);

  const closeTop = useCallback(() => {
    if (window.history.state?.overlay) window.history.back();
    else setStack((s) => s.slice(0, -1));
  }, []);

  // 清空浮层栈:与 pathname 清栈同款(残留的 overlay 历史条目由 popstate
  // 处理器落上去时自动再退一步消费)
  const closeAll = useCallback(() => setStack([]), []);

  // popstate 的 e.state 是「落到的那条历史」的 state
  const stackLen = useRef(0);
  useEffect(() => {
    stackLen.current = stack.length;
  }, [stack.length]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      // 栈已空却退到了 overlay 条目:浮层内发生真实路由跳转时清栈只清了
      // React 栈,pushState 的条目残留在历史里。落上来就自动再退一步消费掉,
      // 否则返回要多滑一次,且 PageTransition 的 overlay guard 会把手势挡死
      if (stackLen.current === 0 && e.state?.overlay) {
        window.history.back();
        return;
      }
      setStack((s) => s.slice(0, -1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <Ctx.Provider value={{ enabled, overlayOpen, openCar, openPost, openUser, openPage, closeAll }}>
      <OverlayLayerRegistryCtx.Provider value={registry}>
      <OverlayLayerZCtx.Provider value={layerZ}>
      {children}
      <AnimatePresence onExitComplete={restoreExitedSources}>
        {stack.map((layer, i) => {
          // external 层(NonModalDrawer / OverlaySheet)由注册方自渲染
          if (layer.kind === "external") return null;
          // 逐层递增:后开的层盖住前面的(含「主页 drawer 里再点车」的场景)。
          // 封顶 69:始终低于对比条(70)
          const z = Math.min(55 + i, 69);
          // 首层的 hero 卡片压在底部 nav(z-50)之下、页面头部(z-40)之上:
          // 放大/缩回时卡片从 nav 底下钻过。嵌套层用 z-1:与下层 sheet 同 z 但
          // portal 在 DOM 里靠后,仍盖住下层、低于自己的 sheet
          const heroZ = i === 0 ? 45 : z - 1;
          return layer.kind === "car" ? (
            <SwipeSheet
              key={layer.key}
              originRect={layer.rect}
              heroHtml={layer.heroHtml}
              onClose={closeTop}
              topBarExtra={<CarSheetActions car={layer.car} />}
              zIndex={z}
              heroZIndex={heroZ}
            >
              <CarDetail initialCar={layer.car} embedded onClose={closeTop} />
            </SwipeSheet>
          ) : layer.kind === "post" ? (
            <SwipeSheet key={layer.key} originRect={layer.rect} heroHtml={layer.heroHtml} onClose={closeTop} zIndex={z} heroZIndex={heroZ}>
              <CommunityDetail initialPost={layer.post} embedded onClose={closeTop} />
            </SwipeSheet>
          ) : layer.kind === "page" ? (
            (() => {
              const PageComp = PAGE_ROUTES[layer.href];
              return (
                <SwipeSheet key={layer.key} onClose={closeTop} zIndex={z}>
                  <PageComp />
                </SwipeSheet>
              );
            })()
          ) : (
            // 卖家主页:用 drawer 打开(非全屏浮层)
            <ProfileDrawer key={layer.key} onClose={closeTop} zIndex={z}>
              <UserDetail userId={layer.userId} embedded onClose={closeTop} />
            </ProfileDrawer>
          );
        })}
      </AnimatePresence>
      </OverlayLayerZCtx.Provider>
      </OverlayLayerRegistryCtx.Provider>
    </Ctx.Provider>
  );
}
