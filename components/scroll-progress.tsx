"use client";

import { motion, useReducedMotion, useScroll } from "framer-motion";

// 2px reading-progress bar along the top edge. Desktop only.
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className={`fixed inset-x-0 top-0 z-[60] hidden h-0.5 origin-left bg-brand md:block ${className ?? ""}`}
    />
  );
}
