"use client";

// 悬浮层(SwipeSheet)内可用的底部 drawer:modal 抽屉会把 body 置
// pointer-events:none,浮层的触摸手势会被整体掐断(开着时被直接卸载还可能
// 残留锁死整页);故用 modal={false} + 自绘遮罩(点按关闭,淡入淡出与抽屉
// 动画同步)。
// 默认 stacked:打开时注册进 car-overlay-provider 的浮层栈——层级按开启
// 顺序递增,系统返回键优先逐层关闭 drawer,与 SwipeSheet/ProfileDrawer
// 同一套交互模型;无 provider 或 stacked={false} 时退回固定 zIndex 独立打开。

import {
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  OverlayLayerRegistryCtx,
  OverlayLayerZCtx,
} from "@/components/overlay-stack";

export function NonModalDrawer({
  open,
  onOpenChange,
  zIndex = 80,
  stacked = true,
  contentClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // stacked 生效时层级由浮层栈分配;此值仅作无 provider 时的回退
  zIndex?: number;
  // 关闭后不进浮层栈(如 ProfileDrawer 本身就是栈中的一层)
  stacked?: boolean;
  contentClassName?: string;
  children: ReactNode;
}) {
  const registry = useContext(OverlayLayerRegistryCtx);
  const zMap = useContext(OverlayLayerZCtx);
  const id = useId();
  // 遮罩必须 portal 到 body:本组件可能被嵌在别的 vaul drawer 内容里
  // (如卖家主页 ProfileDrawer 里开私信),vaul 内容节点带 will-change/内联
  // transform,会把内联渲染的 fixed 遮罩钳在 drawer 自己的盒子里而盖不满视口
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  // 打开期间挂在浮层栈上;关闭/卸载时注销(系统返回移除的场景下注销为空操作)
  const useStack = stacked && !!registry;
  useEffect(() => {
    if (!useStack || !open) return;
    registry!.register(id, () => onOpenChangeRef.current(false));
    return () => registry!.release(id);
  }, [useStack, open, registry, id]);

  const z = (useStack ? zMap?.get(id) : undefined) ?? zIndex;

  return (
    <>
      {/* 自绘遮罩:常驻挂载以便关帧淡出;关闭态不拦截任何指针事件 */}
      {mounted &&
        createPortal(
          <div
            {...(open ? { "data-app-overlay": "" } : {})}
            className="fixed inset-0 bg-black/40 transition-opacity supports-backdrop-filter:backdrop-blur-xs"
            style={{
              zIndex: z,
              opacity: open ? 1 : 0,
              pointerEvents: open ? "auto" : "none",
              transitionDuration: "250ms",
              touchAction: "none",
            }}
            onClick={() => onOpenChange(false)}
          />,
          document.body,
        )}
      <Drawer open={open} modal={false} onOpenChange={onOpenChange}>
        <DrawerContent className={contentClassName} style={{ zIndex: z }}>
          {children}
        </DrawerContent>
      </Drawer>
    </>
  );
}
