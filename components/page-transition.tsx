"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

let appHydrated = false;
if (typeof window !== "undefined") {
  Promise.resolve().then(() => { appHydrated = true; });
}

let _snapshotScrollY = 0;
if (typeof window !== "undefined") {
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("a[href]");
    if (link && link.getAttribute("href")?.startsWith("/")) {
      _snapshotScrollY = window.scrollY;
    }
  }, { capture: true });
}

// BackNav sets this to true before calling router.back()
let _isBackNavigation = false;
export function setBackNavigation() { _isBackNavigation = true; }

const DURATION = 350;
const EASING = "cubic-bezier(0.2, 0.9, 0.3, 1)";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const prevChildren = useRef<React.ReactNode>(null);
  const [phase, setPhase] = useState<"idle" | "push" | "pop">(
    appHydrated ? "push" : "idle"
  );
  const snapshotScrollY = useRef(0);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    snapshotScrollY.current = _snapshotScrollY;

    if (_isBackNavigation) {
      _isBackNavigation = false;
      setPhase("pop");
    } else {
      setPhase("push");
    }
    const timer = setTimeout(() => setPhase("idle"), DURATION);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (phase === "idle") {
      prevChildren.current = children;
    }
  }, [phase, children]);

  if (phase === "idle") {
    return <>{children}</>;
  }

  if (phase === "push") {
    return (
      <>
        {prevChildren.current && (
          <div
            className="fixed inset-0 z-[998] overflow-hidden bg-background pointer-events-none"
            style={{ animation: `ios-push-back ${DURATION}ms ${EASING} both` }}
          >
            <div style={{ transform: `translateY(-${snapshotScrollY.current}px)` }}>
              {prevChildren.current}
            </div>
          </div>
        )}
        <div
          className="fixed inset-0 z-[999] bg-black pointer-events-none"
          style={{ animation: `dim-in ${DURATION}ms ${EASING} both` }}
        />
        <div
          className="fixed inset-0 z-[1000] overflow-y-auto bg-background"
          style={{ animation: `ios-push-in ${DURATION}ms ${EASING} both` }}
          onAnimationEnd={() => setPhase("idle")}
        >
          {children}
        </div>
      </>
    );
  }

  // phase === "pop": back navigation
  return (
    <>
      {/* Destination page (new children) slides in from left behind */}
      <div
        className="fixed inset-0 z-[998] overflow-y-auto bg-background"
        style={{ animation: `ios-pop-reveal ${DURATION}ms ${EASING} both` }}
      >
        {children}
      </div>
      {/* Dim overlay fading out */}
      <div
        className="fixed inset-0 z-[999] bg-black pointer-events-none"
        style={{ animation: `dim-out ${DURATION}ms ${EASING} both` }}
      />
      {/* Previous page (old children) slides out to right */}
      {prevChildren.current && (
        <div
          className="fixed inset-0 z-[1000] overflow-hidden bg-background pointer-events-none"
          style={{
            animation: `ios-pop-out ${DURATION}ms ${EASING} both`,
          }}
          onAnimationEnd={() => setPhase("idle")}
        >
          <div style={{ transform: `translateY(-${snapshotScrollY.current}px)` }}>
            {prevChildren.current}
          </div>
        </div>
      )}
    </>
  );
}
