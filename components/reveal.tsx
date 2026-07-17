"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { fadeInUp, staggerContainer, staggerContainerSlow, viewportOnce } from "@/lib/motion";

type RevealTag = "div" | "section" | "li" | "article" | "span";

interface RevealProps {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
  // "some" = any pixel visible (past the -48px margin). Numeric ratios can
  // NEVER be reached by elements taller than amount×viewport (Safari leaves
  // them stuck at opacity 0), so only pass a number for small elements.
  amount?: number | "some";
  as?: RevealTag;
}

// Single-element scroll reveal. Long lists: wrap each item in its own <Reveal>
// (no group orchestration) so items animate as they enter individually.
export function Reveal({
  children,
  variants = fadeInUp,
  className,
  delay = 0,
  amount = "some",
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = as;
  if (reduced) return <Tag className={className}>{children}</Tag>;
  const M = motion[as];
  return (
    <M
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ ...viewportOnce, amount }}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </M>
  );
}

interface RevealGroupProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  amount?: number | "some";
  as?: RevealTag;
}

// Staggered container for small grids (3-8 items). Children use <RevealItem>.
export function RevealGroup({
  children,
  className,
  stagger = 0.06,
  amount = "some",
  as = "div",
}: RevealGroupProps) {
  const reduced = useReducedMotion();
  const Tag = as;
  if (reduced) return <Tag className={className}>{children}</Tag>;
  const M = motion[as];
  return (
    <M
      className={className}
      variants={stagger >= 0.1 ? staggerContainerSlow : staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ ...viewportOnce, amount }}
    >
      {children}
    </M>
  );
}

interface RevealItemProps {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  as?: RevealTag;
}

// Child of RevealGroup — inherits orchestration from the parent container.
export function RevealItem({ children, variants = fadeInUp, className, as = "div" }: RevealItemProps) {
  const reduced = useReducedMotion();
  const Tag = as;
  if (reduced) return <Tag className={className}>{children}</Tag>;
  const M = motion[as];
  return (
    <M className={className} variants={variants}>
      {children}
    </M>
  );
}
