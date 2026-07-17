import type { Variants } from "framer-motion";

// Shared easing — same curve as the iOS page transition (page-transition.tsx)
export const EASE = [0.2, 0.9, 0.3, 1] as const;

// Shared whileInView viewport config: reveal once, slightly before fully on-screen
export const viewportOnce = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -48px 0px",
} as const;

// Fade in from below
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// Fade in from above
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// Simple fade in
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

// Scale up from slightly smaller
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
};

// Staggered children container
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

// Stagger with slower delay
export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

// Slide in from right
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};
