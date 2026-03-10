"use client";

import { useEffect } from "react";
import { useWebHaptics } from "web-haptics/react";

const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], [role='tab'], [role='menuitem'], input[type='checkbox'], input[type='radio']";

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const { trigger } = useWebHaptics();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(INTERACTIVE_SELECTOR)) {
        trigger();
      }
    }
    function handleFocus(e: FocusEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        trigger();
      }
    }
    document.addEventListener("click", handleClick, true);
    document.addEventListener("focusin", handleFocus, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("focusin", handleFocus, true);
    };
  }, [trigger]);

  return <>{children}</>;
}
