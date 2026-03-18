"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

// Global flag: after the app hydrates, any new PageTransition mount is a client-side nav
let appHydrated = false;
if (typeof window !== "undefined") {
  Promise.resolve().then(() => { appHydrated = true; });
}

// Store scroll position before navigation for the frozen background effect
let _snapshotScrollY = 0;
if (typeof window !== "undefined") {
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("a[href]");
    if (link && link.getAttribute("href")?.startsWith("/")) {
      _snapshotScrollY = window.scrollY;
    }
  }, { capture: true });
}

/**
 * iOS-style native push transition.
 * Shows the previous page (frozen) sliding left while the new page slides in from right.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const prevChildren = useRef<React.ReactNode>(null);
  const [phase, setPhase] = useState<"idle" | "animating">(
    appHydrated ? "animating" : "idle"
  );
  const snapshotScrollY = useRef(0);

  // Animate on pathname changes within this layout
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    snapshotScrollY.current = _snapshotScrollY;
    setPhase("animating");
    const timer = setTimeout(() => setPhase("idle"), 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Keep a ref of the previous children for the background
  useEffect(() => {
    if (phase === "idle") {
      prevChildren.current = children;
    }
  }, [phase, children]);

  if (phase === "idle") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Previous page frozen in background, sliding slightly left */}
      {prevChildren.current && (
        <div
          className="fixed inset-0 z-998 overflow-hidden bg-background pointer-events-none"
          style={{
            animation: "ios-push-back 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
          }}
        >
          <div style={{ transform: `translateY(-${snapshotScrollY.current}px)` }}>
            {prevChildren.current}
          </div>
        </div>
      )}
      {/* Dim overlay */}
      <div
        className="fixed inset-0 z-999 bg-black pointer-events-none"
        style={{
          animation: "dim-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
        }}
      />
      {/* New page sliding in from right */}
      <div
        className="fixed inset-0 z-1000 overflow-y-auto bg-background"
        style={{
          animation: "ios-push-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
        }}
        onAnimationEnd={() => setPhase("idle")}
      >
        {children}
      </div>
    </>
  );
}
