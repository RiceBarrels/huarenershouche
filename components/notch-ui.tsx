"use client";

import { useEffect, useState } from "react";

export function NotchUI() {
  const [hasNotch, setHasNotch] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const { SafeArea } = await import("capacitor-plugin-safe-area");
        const { insets } = await SafeArea.getSafeAreaInsets();
        if (insets && insets.top > 0) {
          setHasNotch(true);
        }
      } catch {
        // Not running in Capacitor or plugin unavailable
      }
    }
    check();
  }, []);

  if (!hasNotch) return null;

  return (
    <div className="text-white bg-black font-mono text-[11px] px-3 py-1 rounded-full">
      车来车网
    </div>
  );
}
