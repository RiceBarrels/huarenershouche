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
