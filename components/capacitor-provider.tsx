"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setupStatusBar,
  hideSplash,
  setupKeyboard,
  setupBackButton,
  setupDeepLinkListener,
  isNative,
} from "@/lib/capacitor";
import { WelcomeScreen } from "@/components/welcome-screen";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);

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

  return (
    <>
      {children}
      {showWelcome && (
        <WelcomeScreen onComplete={() => setShowWelcome(false)} />
      )}
    </>
  );
}
