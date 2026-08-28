"use client";

import { usePathname, useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, User, Users, Home, Car, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { gestureHandoffRemaining } from "@/components/page-transition";
import {
  LiquidGlassNav,
  rasterizeSvgIcon,
  setNativeBarConfigured,
  type LiquidGlassNavTab,
} from "@/lib/liquid-glass-nav";
import { useI18n } from "@/components/i18n-provider";

const TABS = [
  { href: "/", icon: Home, label: "首页", match: (p: string) => p === "/" },
  { href: "/browse", icon: Search, label: "买车", match: (p: string) => p === "/browse" },
  { href: "/post", icon: Plus, label: "发布", match: (p: string) => p === "/post" },
  { href: "/community", icon: Users, label: "社区", match: (p: string) => p.startsWith("/community") || p.startsWith("/qa") },
  { href: "/account", icon: User, label: "我的", match: (p: string) => p === "/account" || p === "/messages" },
];

const activeHref = (pathname: string) =>
  TABS.find((t) => t.match(pathname))?.href ?? "";

/**
 * iOS 原生 App 内使用 LiquidGlassNav 插件渲染原生液态玻璃 tab 栏;
 * web / Android 保持原有 DOM 实现。
 * "init" = iOS 上探测/配置原生 bar 中,"native" = 原生已接管,"dom" = 走 DOM。
 */
type BarMode = "init" | "native" | "dom";

export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(false);
  // portal 挂载点:必须渲染在 [vaul-drawer-wrapper] 之外,否则 drawer 打开时
  // 背景缩放的 transform 会让本组件的 fixed 定位失去视口参照、跑出屏幕
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<BarMode>(() =>
    typeof window !== "undefined" &&
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isNativePlatform()
      ? "init"
      : "dom"
  );
  const [nativeHeight, setNativeHeight] = useState(0);
  // 网页版:点发布弹出「发布车辆 / 社区发帖」选择菜单(与原生 UIMenu 行为一致)
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  // 跨组手势返回时本组件在旧页还在滑出的中途挂载(接手快照层已压在 z-60):
  // DOM bar 随剩余滑出时长淡入,而不是 commit 瞬间凭空出现。渲染期读一次即可
  const [handoffFadeMs] = useState(() => {
    const left = gestureHandoffRemaining();
    return left > 0 ? Math.max(left, 150) : 0;
  });
  const iconsRef = useRef<HTMLDivElement>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // 路由变化后收起发布菜单
  useEffect(() => {
    setPostMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // iOS:栅格化 lucide 图标 → 配置原生 bar;失败(如旧壳没有插件)回退 DOM。
  // 注意:不能依赖 mode,否则 setMode("native") 会触发本 effect 的 cleanup
  // 把刚显示的原生 bar hide 掉——cleanup 只应在组件卸载时执行
  useEffect(() => {
    if (!mounted) return;
    if (!(Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform())) return;
    if (!Capacitor.isPluginAvailable("LiquidGlassNav")) {
      setMode("dom");
      return;
    }
    let cancelled = false;
    let listener: PluginListenerHandle | undefined;

    (async () => {
      const svgs = iconsRef.current?.querySelectorAll("svg");
      if (!svgs || svgs.length !== TABS.length) throw new Error("icons not rendered");

      // 分离式布局:发布不进左侧胶囊,单独作为右下角玻璃动作按钮
      const all: LiquidGlassNavTab[] = await Promise.all(
        TABS.map(async (tab, i) => ({
          id: tab.href,
          title: t(tab.label),
          scale: 3,
          mode: "template" as const,
          icon: await rasterizeSvgIcon(svgs[i], { size: 66 }),
        }))
      );
      if (cancelled) return;

      const post = all.find((t) => t.id === "/post");
      await LiquidGlassNav.configure({
        tabs: all.filter((t) => t.id !== "/post"),
        // 点加号弹系统菜单:发布车辆 / 社区发帖
        action: post && {
          ...post,
          menu: [
            { id: "/post", title: t("发布车辆"), symbol: "car.fill" },
            { id: "/community/new", title: t("社区发帖"), symbol: "text.bubble" },
          ],
        },
        selectedId: activeHref(pathnameRef.current),
        tint: "#89fcd2",
      });
      listener = await LiquidGlassNav.addListener("tabSelected", ({ id }) => {
        router.push(id);
      });
      // 经由协调器显示:若欢迎页等浮层正加锁隐藏,这里不会强行盖上去
      setNativeBarConfigured(true);
      const { height } = await LiquidGlassNav.getHeight();
      if (!cancelled) {
        setNativeHeight(height);
        setMode("native");
      }
    })().catch(() => {
      if (!cancelled) setMode("dom");
    });

    return () => {
      cancelled = true;
      listener?.remove();
      setNativeBarConfigured(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 路由变化 → 同步原生选中态
  useEffect(() => {
    if (mode !== "native") return;
    LiquidGlassNav.select({ id: activeHref(pathname) }).catch(() => {});
  }, [pathname, mode]);

  if (!mounted) return null;

  // iOS 原生模式(含探测期):离屏渲染 lucide 图标供栅格化取源;
  // 该元素同时按原生 bar 高度占位,compare-bar 依赖 [data-bottom-nav] 测高,
  // 值 "native" 标记 liquid glass 原生 bar(compare-bar 据此换悬浮卡片样式)
  if (mode !== "dom") {
    return (
      <div
        ref={iconsRef}
        data-bottom-nav="native"
        aria-hidden
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          height: nativeHeight,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {TABS.map((tab) => (
          <tab.icon key={tab.href} strokeWidth={tab.href === "/post" ? 2.4 : 1.8} />
        ))}
      </div>
    );
  }

  return createPortal(
    <>
      {/* 发布菜单的点击遮罩 */}
      {postMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 md:hidden"
          onClick={() => setPostMenuOpen(false)}
        />
      )}
      <nav
        data-bottom-nav=""
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm md:hidden"
        style={
          handoffFadeMs
            ? { animation: `tab-bar-fade-in ${handoffFadeMs}ms ease-out both` }
            : undefined
        }
      >
        {/* 发布选择菜单:发布车辆 / 社区发帖 */}
        <AnimatePresence>
          {postMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.2, 0.9, 0.3, 1] }}
              className="absolute bottom-full left-1/2 mb-3 w-56 overflow-hidden rounded-2xl bg-background shadow-xl"
            >
              <button
                onClick={() => router.push("/post")}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted"
              >
                <Car className="h-5 w-5 text-brand-ink" strokeWidth={1.8} />
                <span className="text-sm">{t("发布车辆")}</span>
              </button>
              <div className="h-px bg-border" />
              <button
                onClick={() => router.push("/community/new")}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted"
              >
                <MessageSquare className="h-5 w-5 text-brand-ink" strokeWidth={1.8} />
                <span className="text-sm">{t("社区发帖")}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-stretch">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const isPost = tab.href === "/post";

            if (isPost) {
              return (
                <button
                  key={tab.href}
                  onClick={() => setPostMenuOpen((v) => !v)}
                  className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Plus
                      className={`h-5 w-5 transition-transform duration-200 ${postMenuOpen ? "rotate-45" : ""}`}
                      strokeWidth={2}
                    />
                  </span>
                  <span className="mt-0.5 font-mono text-[10px]">{t(tab.label)}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                <span className="font-mono text-[10px]">{t(tab.label)}</span>
              </Link>
            );
          })}
        </div>
        {/* Safe area padding for native */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </>,
    document.body
  );
}
