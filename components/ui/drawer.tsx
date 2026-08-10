"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"
import { triggerHaptic } from "@/lib/haptics"
import { NativeBarHideLock } from "@/components/native-bar-hide-lock"
import { useKeyboardHeight } from "@/hooks/use-keyboard-height"

// 打开/关闭都给一次轻触觉(非受控 drawer:vaul 的 onOpenChange 覆盖
// Trigger 打开与拖拽/点外关闭)
function withHaptic(
  onOpenChange?: (open: boolean) => void
): (open: boolean) => void {
  return (open: boolean) => {
    triggerHaptic();
    onOpenChange?.(open);
  };
}

// 注意:背景缩放会给 [vaul-drawer-wrapper] 加 transform,内部 fixed 元素会
// 失去视口参照 —— 需要保持 fixed 的全局元素(如底部导航)须 portal 到 body
function Drawer({
  shouldScaleBackground = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  // 受控 drawer:程序化 setOpen(true) 不经过 vaul 的 onOpenChange,
  // 统一由 open prop 的变化触发开/关触觉(首帧不触发)
  const controlled = props.open !== undefined
  const prevOpen = React.useRef(props.open)
  React.useEffect(() => {
    if (!controlled || prevOpen.current === props.open) return
    prevOpen.current = props.open
    triggerHaptic()
  }, [controlled, props.open])
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      shouldScaleBackground={shouldScaleBackground}
      onOpenChange={controlled ? onOpenChange : withHaptic(onOpenChange)}
      {...props}
    />
  )
}

function DrawerNested({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.NestedRoot>) {
  return <DrawerPrimitive.NestedRoot data-slot="drawer-nested" onOpenChange={withHaptic(onOpenChange)} {...props} />
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-[80] bg-black/40 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  overlayStyle,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  // 遮罩的内联样式(如动态 zIndex,需与内容同层时用)
  overlayStyle?: React.CSSProperties
}) {
  const kbHeight = useKeyboardHeight()

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay style={overlayStyle} />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        // --kb 供 max-height 钳制用;动画由底部常驻 spacer 的 height 过渡完成
        // (vaul 会往 content 写内联 transition,这里不能依赖 content 自身的过渡类)
        style={{ "--kb": `${kbHeight}px` } as React.CSSProperties}
        className={cn(
          "group/drawer-content fixed z-[80] flex h-auto flex-col bg-card text-sm data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[min(80vh,calc(100dvh-var(--kb,0px)-1.5rem))] data-[vaul-drawer-direction=bottom]:rounded-t-[32px] data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {/* 打开期间隐藏 iOS 原生底部导航(children 才随 open 挂载,wrapper 本身常驻) */}
        <NativeBarHideLock />
        <div className="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 cursor-grab rounded-full bg-muted active:cursor-grabbing group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
        {/* 键盘垫高层:常驻渲染,height 0 <-> 键盘高度之间过渡,曲线贴近 iOS 键盘动画 */}
        <div
          aria-hidden
          className="shrink-0 transition-[height] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
          style={{ height: kbHeight }}
        />
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerNested,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
