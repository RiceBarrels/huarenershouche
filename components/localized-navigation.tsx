"use client";

// 语言感知的导航层:站内链接/跳转自动带上当前语言前缀(/zh 或 /en),
// usePathname 返回去掉前缀的"逻辑路径",让 pathname === "/community"
// 这类既有判断在两棵语言树下都成立。
//
// 用法与 next/link、next/navigation 完全同形,全站统一从本模块导入:
//   import Link from "@/components/localized-navigation";
//   import { useRouter, usePathname } from "@/components/localized-navigation";

import NextLink from "next/link";
import {
  usePathname as useRawPathname,
  useRouter as useRawRouter,
} from "next/navigation";
import { forwardRef, useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import { localizePath, stripLocale } from "@/lib/i18n";

type NextLinkProps = React.ComponentProps<typeof NextLink>;

const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(function LocalizedLink(
  { href, ...rest },
  ref
) {
  const { pathLocale } = useI18n();
  const localized = typeof href === "string" ? localizePath(href, pathLocale) : href;
  return <NextLink ref={ref} href={localized} {...rest} />;
});

export default Link;

/** 当前逻辑路径(去掉 /zh|/en 前缀):"/en/browse" → "/browse" */
export function usePathname(): string {
  return stripLocale(useRawPathname() ?? "/");
}

/** push/replace/prefetch 自动补语言前缀;back/forward/refresh 原样透传 */
export function useRouter(): ReturnType<typeof useRawRouter> {
  const raw = useRawRouter();
  const { pathLocale } = useI18n();
  return useMemo(
    () => ({
      ...raw,
      push: (href, options) => raw.push(localizePath(href, pathLocale), options),
      replace: (href, options) => raw.replace(localizePath(href, pathLocale), options),
      prefetch: (href, options) => raw.prefetch(localizePath(href, pathLocale), options),
    }),
    [raw, pathLocale]
  );
}

// 便于整行替换 import 的透传(仅客户端 API;redirect/notFound 请继续从
// next/navigation 导入 —— 它们多用于 Server Component)
export { useSearchParams, useParams } from "next/navigation";
