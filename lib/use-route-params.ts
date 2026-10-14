"use client";

import { useParams, useSearchParams } from "next/navigation";

/**
 * useRouteParams — works in both dynamic routes and static export.
 *
 * Dynamic mode: reads from Next.js `useParams()` (e.g. /car/[id])
 * Static mode:  reads from `useSearchParams()` (e.g. /car?id=xxx)
 *
 * 两者合并:先放 query,再用路径参数覆盖(同名时路径参数优先)。
 * [locale] 段出现在每一条路由里(静态导出时 useParams() 也恒有 { locale }),不是页面自己的参数,跳过;
 * 否则静态导出的 /zh/car?id=X 会因为有 locale 而永远读不到 ?id=。
 *
 * Usage:
 *   const { id } = useRouteParams<{ id: string }>();
 *   // Works with both /car/abc123 and /car?id=abc123
 */
export function useRouteParams<T extends Record<string, string>>(): Partial<T> {
  const params = useParams();
  const searchParams = useSearchParams();

  const result: Record<string, string> = {};
  searchParams?.forEach((val, key) => {
    result[key] = val;
  });
  for (const [key, val] of Object.entries(params ?? {})) {
    if (key === "locale") continue;
    if (typeof val === "string") result[key] = val;
    else if (Array.isArray(val)) result[key] = val[0];
  }
  return result as Partial<T>;
}
