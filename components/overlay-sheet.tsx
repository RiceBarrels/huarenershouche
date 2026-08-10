"use client";

// 通用悬浮层:像 shadcn Drawer 一样随处组合调用 ——
//   <OverlaySheet>
//     <OverlaySheetTrigger asChild><CardLink /></OverlaySheetTrigger>
//     <OverlaySheetContent topBarExtra={...}>详情内容</OverlaySheetContent>
//   </OverlaySheet>
// Trigger 点击时捕获被点元素的位置与 DOM 克隆,Content 用 <SwipeSheet />
// 播放 iOS 式「卡片放大成全屏」动画(返回手势/缩回同 SwipeSheet)。
// 打开期间注册进 car-overlay-provider 的浮层栈:层级按开启顺序分配、系统
// 返回键逐层关闭;原元素隐藏至退场动画完全落回原位。
// 仅移动端(<768px)拦截打开;桌面端 Trigger 不拦截,子元素自身的
// 链接/点击行为照常执行。也支持受控用法(open/onOpenChange)。

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import { SwipeSheet, type OriginRect } from "@/components/swipe-sheet";
import {
  OverlayLayerRegistryCtx,
  OverlayLayerZCtx,
} from "@/components/overlay-stack";
import { triggerHaptic } from "@/lib/haptics";

interface OriginData {
  rect: OriginRect;
  heroHtml: string;
}

interface SheetCtxValue {
  open: boolean;
  setOpen: (o: boolean) => void;
  origin: OriginData | null;
  /** 记录放大起点并隐藏原元素(hero 克隆即它本身) */
  setOrigin: (origin: OriginData, sourceEl: HTMLElement) => void;
  /** 退场落回原位/卸载后恢复原元素 */
  restoreSource: () => void;
}

const SheetCtx = createContext<SheetCtxValue | null>(null);

function useSheetCtx(component: string): SheetCtxValue {
  const ctx = useContext(SheetCtx);
  if (!ctx) throw new Error(`<${component}> 必须放在 <OverlaySheet> 内`);
  return ctx;
}

export function OverlaySheet({
  open: openProp,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolled;
  const setOpen = useCallback(
    (o: boolean) => {
      onOpenChange?.(o);
      if (!controlled) setUncontrolled(o);
    },
    [controlled, onOpenChange],
  );

  // sourceEl 只存在 ref 里(不进 state/context 值),显隐通过下面两个回调操作
  const [origin, setOriginState] = useState<OriginData | null>(null);
  const sourceElRef = useRef<HTMLElement | null>(null);
  const setOrigin = useCallback((o: OriginData, sourceEl: HTMLElement) => {
    sourceElRef.current = sourceEl;
    sourceEl.style.visibility = "hidden";
    setOriginState(o);
  }, []);
  const restoreSource = useCallback(() => {
    const el = sourceElRef.current;
    if (el) el.style.visibility = "";
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, origin, setOrigin, restoreSource }),
    [open, setOpen, origin, setOrigin, restoreSource],
  );
  return <SheetCtx.Provider value={value}>{children}</SheetCtx.Provider>;
}

export function OverlaySheetTrigger({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen, setOrigin } = useSheetCtx("OverlaySheetTrigger");

  const capture = (e: MouseEvent) => {
    // 桌面端不拦截:子元素自己的链接/点击照常
    if (window.matchMedia("(min-width: 768px)").matches) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    setOrigin(
      {
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        heroHtml: el.outerHTML,
      },
      el,
    );
    setOpen(true);
  };

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (e: MouseEvent) => void;
    }>;
    return cloneElement(child, {
      onClick: (e: MouseEvent) => {
        child.props.onClick?.(e);
        capture(e);
      },
    });
  }
  return (
    <button type="button" onClick={capture} {...props}>
      {children}
    </button>
  );
}

export function OverlaySheetClose({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useSheetCtx("OverlaySheetClose");
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (e: MouseEvent) => void;
    }>;
    return cloneElement(child, {
      onClick: (e: MouseEvent) => {
        child.props.onClick?.(e);
        setOpen(false);
      },
    });
  }
  return (
    <button type="button" onClick={() => setOpen(false)} {...props}>
      {children}
    </button>
  );
}

export function OverlaySheetContent({
  children,
  topBarExtra,
}: {
  children: ReactNode;
  topBarExtra?: ReactNode;
}) {
  const { open, setOpen, origin, restoreSource } =
    useSheetCtx("OverlaySheetContent");
  const registry = useContext(OverlayLayerRegistryCtx);
  const zMap = useContext(OverlayLayerZCtx);
  const id = useId();
  const setOpenRef = useRef(setOpen);
  useEffect(() => {
    setOpenRef.current = setOpen;
  });

  // 注册浮层栈:统一层级 + 系统返回逐层关闭(关闭/卸载注销)
  useEffect(() => {
    if (!registry || !open) return;
    registry.register(id, () => setOpenRef.current(false));
    return () => registry.release(id);
  }, [registry, open, id]);

  // 开/关触觉
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === open) return;
    prevOpen.current = open;
    triggerHaptic();
  }, [open]);

  // 卸载兜底:退场没走完也要恢复原元素
  useEffect(() => restoreSource, [restoreSource]);

  const z = zMap?.get(id) ?? 60;
  return (
    <AnimatePresence onExitComplete={restoreSource}>
      {open && (
        <SwipeSheet
          originRect={origin?.rect}
          heroHtml={origin?.heroHtml}
          onClose={() => setOpen(false)}
          topBarExtra={topBarExtra}
          zIndex={z}
          heroZIndex={z <= 55 ? 45 : z - 1}
        >
          {children}
        </SwipeSheet>
      )}
    </AnimatePresence>
  );
}
