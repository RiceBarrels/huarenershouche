"use client";

import { useEffect } from "react";
import {
  setupStatusBar,
  hideSplash,
  setupKeyboard,
  setupBackButton,
  isNative,
} from "@/lib/capacitor";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isNative()) return;

    // Initialize native features
    setupStatusBar();
    setupKeyboard();
    setupBackButton();

    // Hide splash after a short delay to let the app render
    const timer = setTimeout(() => hideSplash(), 300);

    // Add safe area CSS variables
    document.documentElement.classList.add("capacitor-native");

    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}
