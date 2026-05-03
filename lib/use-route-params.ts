"use client";

import { useParams, useSearchParams } from "next/navigation";

/**
 * useRouteParams — works in both dynamic routes and static export.
 *
 * Dynamic mode: reads from Next.js `useParams()` (e.g. /builder/[siteId])
 * Static mode:  reads from `useSearchParams()` (e.g. /builder?siteId=xxx)
 *
 * Automatically picks whichever has values.
 *
 * Usage:
 *   const { siteId } = useRouteParams<{ siteId: string }>();
 *   // Works with both /builder/abc123 and /builder?siteId=abc123
 */
export function useRouteParams<T extends Record<string, string>>(): Partial<T> {
  const params = useParams();
  const searchParams = useSearchParams();

  // If useParams() returned values, use them (dynamic route mode)
  const paramKeys = Object.keys(params);
  if (paramKeys.length > 0 && paramKeys.some((k) => params[k])) {
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === "string") result[key] = val;
      else if (Array.isArray(val)) result[key] = val[0];
    }
    return result as Partial<T>;
  }

  // Fallback to searchParams (static export / query param mode)
  const result: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    result[key] = val;
  });
  return result as Partial<T>;
}
