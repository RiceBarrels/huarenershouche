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
} from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { SwipeSheet, type OriginRect } from "@/components/swipe-sheet";
import { CarSheetActions } from "@/components/car-sheet-actions";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
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

interface OverlayCtx {
  enabled: boolean;
  /** 当前是否有移动端详情浮层打开(CompareBar 等全局固定元素需避让/提层) */
  overlayOpen: boolean;
  openCar: (car: DbCar, rect?: OriginRect | null, heroHtml?: string | null) => void;
  openPost: (post: DbCommunityPost, rect?: OriginRect | null, heroHtml?: string | null) => void;
  openUser: (userId: string) => void;
}

const Ctx = createContext<OverlayCtx>({
  enabled: false,
  overlayOpen: false,
  openCar: () => {},
  openPost: () => {},
  openUser: () => {},
});

export const useOverlay = () => useContext(Ctx);
// 兼容既有引用
export const useCarOverlay = useOverlay;

type CarLayerInput = { kind: "car"; car: DbCar; rect: OriginRect | null; heroHtml: string | null };
type PostLayerInput = { kind: "post"; post: DbCommunityPost; rect: OriginRect | null; heroHtml: string | null };
type UserLayerInput = { kind: "user"; userId: string; rect: OriginRect | null; heroHtml: string | null };
type LayerInput = CarLayerInput | PostLayerInput | UserLayerInput;
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

  const closeTop = useCallback(() => {
    if (window.history.state?.overlay) window.history.back();
    else setStack((s) => s.slice(0, -1));
  }, []);

  useEffect(() => {
    const onPop = () => setStack((s) => s.slice(0, -1));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <Ctx.Provider value={{ enabled, overlayOpen: stack.length > 0, openCar, openPost, openUser }}>
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
