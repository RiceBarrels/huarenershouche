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
} from "@/lib/capacitor";
import { WelcomeScreen } from "@/components/welcome-screen";

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
        className="mt-8 flex items-center gap-2 border border-border px-6 py-2.5 text-sm transition-colors hover:bg-muted active:bg-muted disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} strokeWidth={1.5} />
        {retrying ? "正在重试..." : "重试"}
      </button>
      <p className="mt-12 text-[10px] text-muted-foreground">常来车网 · CLC Auto</p>
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

  useEffect(() => {
    if (!isNative()) return;

    // Initialize native features
    setupStatusBar();
    setupKeyboard();
    setupBackButton();

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
    </>
  );
}
