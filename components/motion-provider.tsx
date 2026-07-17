"use client";

import { MotionConfig } from "framer-motion";

// Honors the OS-level "reduce motion" setting for all framer-motion animations.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
