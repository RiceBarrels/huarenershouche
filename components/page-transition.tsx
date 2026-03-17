"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/**
 * iOS-style native push transition.
 * New page slides in from right over the old content, with shadow and dimming.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "animating">("idle");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // New page entered — play push animation
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
        className="fixed inset-0 z-[999] bg-black pointer-events-none"
        style={{
          animation: "dim-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      />
      {/* New page sliding in from right */}
      <div
        className="fixed inset-0 z-1000 overflow-y-auto bg-background"
        style={{
          animation: "ios-push-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1) both",
          paddingTop: "env(safe-area-inset-top, 0px)",
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
