"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setupStatusBar,
  hideSplash,
  setupKeyboard,
  setupBackButton,
  setupDeepLinkListener,
  isNative,
} from "@/lib/capacitor";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;

    // Initialize native features
    setupStatusBar();
    setupKeyboard();
    setupBackButton();

    // Listen for OAuth deep link callbacks
    setupDeepLinkListener(() => {
      router.push("/");
      router.refresh();
    });

    // Hide splash after a short delay to let the app render
    const timer = setTimeout(() => hideSplash(), 300);

    // Add safe area CSS variables
    document.documentElement.classList.add("capacitor-native");

    return () => clearTimeout(timer);
  }, [router]);

  return <>{children}</>;
}
