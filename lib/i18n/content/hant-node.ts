// 只有中文正文的服务端页面(/cars/*、/terms、购车 / 过户 / 保险指南)在 zh-hant 树里整页转繁体:
// 递归转换 JSX 里的文本节点与常见文本属性。只用于 server component;客户端组件不会被展开
// (它们的 props 里的文本照样转换,内部文案自己走 t())。

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { serverHant } from "./server";

const CLIENT_REFERENCE = Symbol.for("react.client.reference");

const TEXT_PROPS = ["title", "subtitle", "alt", "aria-label", "placeholder", "label", "description"] as const;

function convertNode(node: ReactNode): ReactNode {
  if (typeof node === "string") return serverHant(node);
  if (Array.isArray(node)) return Children.map(node, convertNode);
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<Record<string, unknown>>;
  const patch: Record<string, unknown> = {};
  for (const key of TEXT_PROPS) {
    const value = el.props[key];
    if (typeof value === "string") patch[key] = serverHant(value);
  }
  if (el.props.children !== undefined) patch.children = convertNode(el.props.children as ReactNode);
  const converted = Object.keys(patch).length > 0 ? cloneElement(el, patch) : el;
  // 同文件里的同步 server 小组件(如指南页的 Section):直接展开,连它自己写死的文字(「展开」)一起转。
  // 客户端组件(client reference)与 async 组件不展开
  const type = el.type as unknown;
  if (typeof type === "function" && (type as { $$typeof?: symbol }).$$typeof !== CLIENT_REFERENCE) {
    try {
      const out = (type as (props: unknown) => unknown)(converted.props);
      if (!(out && typeof (out as Promise<unknown>).then === "function")) return convertNode(out as ReactNode);
    } catch {
      // 展开失败(用了只能在渲染期调用的 API 等)就保留元素本身
    }
  }
  return converted;
}

/** zh-hant 时整棵 JSX 转繁体,其他语言原样返回 */
export function hantTree(locale: Locale | string, node: ReactNode): ReactNode {
  return locale === "zh-hant" ? convertNode(node) : node;
}

/** zh-hant 时转换一段文字(metadata 等) */
export function hantString(locale: Locale | string, text: string): string {
  return locale === "zh-hant" ? serverHant(text) : text;
}

/** 正文 lang:繁體树标 zh-Hant,其余中文树标 zh-CN */
export function zhContentLang(locale: Locale | string): "zh-CN" | "zh-Hant" {
  return locale === "zh-hant" ? "zh-Hant" : "zh-CN";
}
