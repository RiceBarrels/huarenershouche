"use client";

import { useEffect } from "react";

/**
 * Enables native iOS swipe-back gesture (WKWebView).
 * Sends a message to the native layer to toggle allowsBackForwardNavigationGestures.
 * Only rendered inside (backnav) layout.
 */
export function SwipeBack() {
  useEffect(() => {
    try {
      (window as any).webkit?.messageHandlers?.swipeBack?.postMessage(true);
    } catch {}

    return () => {
      try {
        (window as any).webkit?.messageHandlers?.swipeBack?.postMessage(false);
      } catch {}
    };
  }, []);

  return null;
}
