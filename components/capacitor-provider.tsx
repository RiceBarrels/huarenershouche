"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import {
  setupStatusBar,
  hideSplash,
  setupKeyboard,
  setupBackButton,
  setupDeepLinkListener,
  isNative,
  checkNotificationPermission,
  registerPushNotifications,
} from "@/lib/capacitor";
import { initDeviceCorner } from "@/lib/device-corner";
import { WelcomeScreen } from "@/components/welcome-screen";
import { PermissionPrompt } from "@/components/permission-prompt";

function OfflinePage() {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 font-mono">
      <WifiOff className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
      <h1 className="mt-6 text-xl font-semibold">无法连接网络</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        请检查你的网络连接后重试
      </p>
      <button
        type="button"
        onClick={() => {
          setRetrying(true);
          setTimeout(() => {
            if (navigator.onLine) {
              window.location.reload();
            } else {
              setRetrying(false);
            }
          }, 1000);
        }}
        disabled={retrying}
        className="mt-8 flex items-center gap-2 bg-muted px-6 py-2.5 text-sm transition-colors hover:bg-muted/70 active:bg-muted/70 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} strokeWidth={1.5} />
        {retrying ? "正在重试..." : "重试"}
      </button>
      <p className="mt-12 text-[10px] text-muted-foreground">常來車網 · CLC Auto</p>
    </div>
  );
}

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [offline, setOffline] = useState(false);

  // Monitor network status
  useEffect(() => {
    function goOffline() { setOffline(true); }
    function goOnline() { setOffline(false); }

    if (!navigator.onLine) setOffline(true);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // 原生壳:外部域名链接统一走 AppLauncher(UIApplication.open)。
  // WKWebView 会吞掉 target="_blank"/window.open 的弹窗导航,导致
  // 地图、车行网站等外链点了没反应;universal link 经系统打开还能
  // 直接唤起对应 App(Apple/Google 地图等)
  useEffect(() => {
    if (!isNative()) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      // 只拦 http(s) 外部域名;站内相对链接、tel:/mailto: 等保持原生为
      if (!/^https?:\/\//i.test(href)) return;
      try {
        if (new URL(href).origin === window.location.origin) return;
      } catch {
        return;
      }
      e.preventDefault();
      import("@/lib/open-external").then(({ openExternal }) => openExternal(href));
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (!isNative()) return;

    // Initialize native features
    setupStatusBar();
    setupKeyboard();
    setupBackButton();
    // 把设备屏幕圆角写入 --device-corner(抽屉/浮层/返回转场的圆角随之对齐)
    initDeviceCorner();

    // 已授权过通知的设备:每次启动都重新注册,刷新并同步推送 token
    checkNotificationPermission().then((state) => {
      if (state === "granted") registerPushNotifications();
    });

    // Sync native WebView background with theme to prevent black edges on overscroll
    function syncNativeBg() {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
      if (bg) {
        // Set the webview scroll background via a meta theme-color tag
        let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = "theme-color";
          document.head.appendChild(meta);
        }
        meta.content = getComputedStyle(document.body).backgroundColor;
      }
    }
    syncNativeBg();
    // Watch for theme changes
    const observer = new MutationObserver(syncNativeBg);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Listen for OAuth deep link callbacks
    setupDeepLinkListener(() => {
      localStorage.setItem("huaren_welcome_seen", "1");
      setShowWelcome(false);
      router.push("/");
      router.refresh();
    });

    // Check if first launch
    if (!localStorage.getItem("huaren_welcome_seen")) {
      setShowWelcome(true);
    }

    // Hide splash after a short delay to let the app render
    const timer = setTimeout(() => hideSplash(), 300);

    // Add safe area CSS variables
    document.documentElement.classList.add("capacitor-native");

    return () => clearTimeout(timer);
  }, [router]);

  if (offline) {
    return <OfflinePage />;
  }

  return (
    <>
      {children}
      {showWelcome && (
        <WelcomeScreen onComplete={() => setShowWelcome(false)} />
      )}
      <PermissionPrompt active={!showWelcome} />
    </>
  );
}
