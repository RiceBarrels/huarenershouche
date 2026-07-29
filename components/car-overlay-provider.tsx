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
  useRef,
  useState,
  type ComponentType,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { SwipeSheet, type OriginRect } from "@/components/swipe-sheet";
import { CarSheetActions } from "@/components/car-sheet-actions";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";
import type { DbCar, DbCommunityPost } from "@/lib/types";

// 动态载入,打断 detail → card → 本文件 的循环依赖,并分包
const CarDetail = dynamic(() => import("@/app/(backnav)/car/car-detail"), {
  ssr: false,
});
const CommunityDetail = dynamic(
  () => import("@/app/(backnav)/community/community-detail"),
  { ssr: false },
);
const UserDetail = dynamic(() => import("@/app/(backnav)/user/user-detail"), {
  ssr: false,
});

// 手机端以浮层栈打开的普通页面(上一页保持挂载,真实垫在后面):
// 仅收录无复杂内链的叶子页;浮层内发生真实路由跳转时会自动清栈。
const PAGE_ROUTES: Record<string, ComponentType> = {
  "/tools/loan": dynamic(() => import("@/app/(backnav)/tools/loan/page"), { ssr: false }),
  "/tools/fuel": dynamic(() => import("@/app/(backnav)/tools/fuel/page"), { ssr: false }),
  "/tools/budget": dynamic(() => import("@/app/(backnav)/tools/budget/page"), { ssr: false }),
  "/tools/units": dynamic(() => import("@/app/(backnav)/tools/units/page"), { ssr: false }),
  "/tools/parking": dynamic(() => import("@/app/(backnav)/tools/parking/page"), { ssr: false }),
  "/tools/luck": dynamic(() => import("@/app/(backnav)/tools/luck/page"), { ssr: false }),
  "/tools/plate": dynamic(() => import("@/app/(backnav)/tools/plate/page"), { ssr: false }),
  "/tools/haggle": dynamic(() => import("@/app/(backnav)/tools/haggle/page"), { ssr: false }),
  "/vin": dynamic(() => import("@/app/(backnav)/vin/page"), { ssr: false }),
  "/guide": dynamic(() => import("@/app/(backnav)/guide/page"), { ssr: false }),
  "/guide/buying": dynamic(() => import("@/app/(backnav)/guide/buying/page"), { ssr: false }),
  "/guide/loan": dynamic(() => import("@/app/(backnav)/guide/loan/page"), { ssr: false }),
  "/guide/insurance": dynamic(() => import("@/app/(backnav)/guide/insurance/page"), { ssr: false }),
  "/guide/dmv": dynamic(() => import("@/app/(backnav)/guide/dmv/page"), { ssr: false }),
  "/business": dynamic(() => import("@/app/(backnav)/business/page"), { ssr: false }),
  "/contact": dynamic(() => import("@/app/(backnav)/contact/page"), { ssr: false }),
};

interface OverlayCtx {
  enabled: boolean;
  /** 当前是否有移动端详情浮层打开(CompareBar 等全局固定元素需避让/提层) */
  overlayOpen: boolean;
  openCar: (car: DbCar, rect?: OriginRect | null, heroHtml?: string | null) => void;
  openPost: (post: DbCommunityPost, rect?: OriginRect | null, heroHtml?: string | null) => void;
  openUser: (userId: string) => void;
  /** 手机端把注册过的普通页面以浮层栈打开(上一页保持挂载);不可嵌入时返回 false */
  openPage: (href: string) => boolean;
}

const Ctx = createContext<OverlayCtx>({
  enabled: false,
  overlayOpen: false,
  openCar: () => {},
  openPost: () => {},
  openUser: () => {},
  openPage: () => false,
});

export const useOverlay = () => useContext(Ctx);
// 兼容既有引用
export const useCarOverlay = useOverlay;

type CarLayerInput = { kind: "car"; car: DbCar; rect: OriginRect | null; heroHtml: string | null };
type PostLayerInput = { kind: "post"; post: DbCommunityPost; rect: OriginRect | null; heroHtml: string | null };
type UserLayerInput = { kind: "user"; userId: string; rect: OriginRect | null; heroHtml: string | null };
type PageLayerInput = { kind: "page"; href: string; rect: OriginRect | null; heroHtml: string | null };
type LayerInput = CarLayerInput | PostLayerInput | UserLayerInput | PageLayerInput;
type Layer = LayerInput & { key: number };

// 卖家主页浮层外壳:底部 drawer(挂载后再置 open 以播放进场动画;
// 拖拽/点遮罩关闭时等退场动画放完再出栈)
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
    setOpen(true);
  }, []);
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          setTimeout(onClose, 250);
        }
      }}
    >
      <DrawerContent
        className="max-h-[92vh]"
        style={{ zIndex }}
        overlayStyle={{ zIndex }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
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

  // 任一详情浮层打开期间隐藏 iOS 原生底部导航
  const overlayOpen = stack.length > 0;
  useEffect(() => {
    if (!overlayOpen) return;
    return acquireNativeBarHideLock();
  }, [overlayOpen]);

  const push = useCallback((layer: LayerInput) => {
    setStack((s) => [...s, { ...layer, key: ++counter.current }]);
    // 压一条历史:系统返回键/浏览器返回逐层关闭,且不改变地址栏
    window.history.pushState({ overlay: true }, "");
  }, []);

  const openCar = useCallback(
    (car: DbCar, rect?: OriginRect | null, heroHtml?: string | null) =>
      push({ kind: "car", car, rect: rect ?? null, heroHtml: heroHtml ?? null }),
    [push],
  );
  const openPost = useCallback(
    (post: DbCommunityPost, rect?: OriginRect | null, heroHtml?: string | null) =>
      push({ kind: "post", post, rect: rect ?? null, heroHtml: heroHtml ?? null }),
    [push],
  );
  // 主页从底部滑入(头像/名字太扁,不做卡片放大)
  const openUser = useCallback(
    (userId: string) => push({ kind: "user", userId, rect: null, heroHtml: null }),
    [push],
  );
  const openPage = useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      if (!enabled || !PAGE_ROUTES[path]) return false;
      push({ kind: "page", href: path, rect: null, heroHtml: null });
      return true;
    },
    [enabled, push],
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
    <Ctx.Provider value={{ enabled, overlayOpen: stack.length > 0, openCar, openPost, openUser, openPage }}>
      {children}
      <AnimatePresence>
        {stack.map((layer, i) => {
          // 逐层递增:后开的层盖住前面的(含「主页 drawer 里再点车」的场景)。
          // 封顶 69:始终低于对比条(70)与工具类 drawer(80)
          const z = Math.min(55 + i, 69);
          return layer.kind === "car" ? (
            <SwipeSheet
              key={layer.key}
              originRect={layer.rect}
              heroHtml={layer.heroHtml}
              onClose={closeTop}
              topBarExtra={<CarSheetActions car={layer.car} />}
              zIndex={z}
            >
              <CarDetail initialCar={layer.car} embedded onClose={closeTop} />
            </SwipeSheet>
          ) : layer.kind === "post" ? (
            <SwipeSheet key={layer.key} originRect={layer.rect} heroHtml={layer.heroHtml} onClose={closeTop} zIndex={z}>
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
    </Ctx.Provider>
  );
}
