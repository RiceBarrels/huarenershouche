"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

// Global flag: after the app hydrates, any new PageTransition mount is a client-side nav
let appHydrated = false;
if (typeof window !== "undefined") {
  // Set after a microtask so the initial hydration mount sees false
  Promise.resolve().then(() => { appHydrated = true; });
}

/**
 * iOS-style native push transition.
 * Animates on every client-side navigation into or within this layout.
 * Skips animation on hard page loads (direct URL visit / refresh).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  // If appHydrated is true at mount time, this is a client-side nav → animate
  const [phase, setPhase] = useState<"idle" | "animating">(
    appHydrated ? "animating" : "idle"
  );

  // Animate on pathname changes within this layout
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setPhase("animating");
    const timer = setTimeout(() => setPhase("idle"), 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (phase === "idle") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Dim overlay simulating the "previous page" darkening */}
      <div
        className="fixed inset-0 z-999 bg-black pointer-events-none shadow-lg"
        style={{
          animation: "dim-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      />
      {/* New page sliding in from right */}
      <div
        className="fixed inset-0 z-1000 overflow-y-auto bg-background rounded-[48px]"
        style={{
          animation: "ios-push-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
        onAnimationEnd={() => setPhase("idle")}
      >
        {children}
      </div>
    </>
  );
}
