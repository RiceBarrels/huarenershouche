"use client";

// 写死中文正文的页面(购车 / 过户 / 保险指南)在繁體界面下整段转繁体。
// 这些页面既有服务端渲染,也会在手机端浮层里纯客户端渲染(car-overlay-provider),所以不能用服务端的 hantTree:
// 这里走 ZhHantContentProvider 的转换函数 —— SSR 时完整转换并写种子,水合与浮层里查种子 / 懒加载 opencc。
// 只转换文本节点和常见文本属性,不展开组件。

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useZhHantContent } from "@/components/content/zh-hant-content";
import type { HantFn } from "@/lib/i18n/content/hant";

const TEXT_PROPS = ["title", "alt", "aria-label", "placeholder"] as const;

function convertNode(node: ReactNode, fn: HantFn): ReactNode {
  if (typeof node === "string") return fn(node);
  if (Array.isArray(node)) return Children.map(node, (child) => convertNode(child, fn));
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<Record<string, unknown>>;
  const patch: Record<string, unknown> = {};
  for (const key of TEXT_PROPS) {
    const value = el.props[key];
    if (typeof value === "string") patch[key] = fn(value);
  }
  if (el.props.children !== undefined) patch.children = convertNode(el.props.children as ReactNode, fn);
  return Object.keys(patch).length > 0 ? cloneElement(el, patch) : el;
}

export function HantProse({ children }: { children: ReactNode }) {
  const fn = useZhHantContent();
  return <>{fn ? convertNode(children, fn) : children}</>;
}
