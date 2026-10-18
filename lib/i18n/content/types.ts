// 内容翻译(content i18n v2)共享类型 —— 纯模块,server / client / Bun 脚本通用。
// 读取路径:rpc i18n_bundle(supabase/i18n-v2.sql)→ BundleRow → lib/i18n/content/resolve.ts。

import type { Locale } from "@/lib/i18n";

export type ContentEntity =
  | "car"
  | "post"
  | "post_comment"
  | "car_comment"
  | "qa_question"
  | "qa_answer"
  | "dealer_review";

/** 每种实体参与翻译的原文字段(与 SQL i18n.payload_of 一致) */
export const ENTITY_FIELDS: {
  car: readonly ["description"];
  post: readonly ["title", "content"];
  post_comment: readonly ["content"];
  car_comment: readonly ["content"];
  qa_question: readonly ["title", "content"];
  qa_answer: readonly ["content"];
  dealer_review: readonly ["content"];
} = {
  car: ["description"],
  post: ["title", "content"],
  post_comment: ["content"],
  car_comment: ["content"],
  qa_question: ["title", "content"],
  qa_answer: ["content"],
  dealer_review: ["content"],
};

/**
 * 某语言下的状态(i18n.locale_states):
 * ok 有校验通过的译文;source 无需翻译(原文即该语言);pending 待翻译;unavailable 放弃(显示原文)
 */
export type BundleState = "ok" | "source" | "pending" | "unavailable";

/** 帖子话题:raw 原始标签,norm 归一化 key,slug 已解析的话题(未解析为 null),label 当前语言显示文案 */
export interface TopicLabel {
  raw: string;
  norm: string;
  slug: string | null;
  label: string;
}

/** 车辆配置标签:key 为 't:slug'(已解析词条)或 'r:norm'(未解析原文) */
export interface FeatureLabel {
  raw: string;
  key: string;
  label: string;
}

/**
 * i18n_bundle 一行:
 * s 状态 · h 原文哈希 · f 译文字段 · sl 译文来源语言(「已从 X 翻译」标签用)·
 * pl 原文主语言(检测后才有;sourceLocale / x-default 用)· fl 各字段原文语言 ·
 * ta 翻译时间 · al 可用语言(未检测时为 null)· x 话题/配置标签
 */
export interface BundleRow {
  id: string;
  s: BundleState;
  h: string;
  f: Record<string, string> | null;
  sl: string | null;
  pl: string | null;
  fl: Record<string, string> | null;
  ta: string | null;
  al: Locale[] | null;
  x: { topics?: TopicLabel[]; features?: FeatureLabel[] } | null;
}

/** id → BundleRow(非公开 / 未知 id 不会出现) */
export type BundleMap = Record<string, BundleRow>;

/** 与 useI18n().t / serverT(locale) 同签名 */
export type TFn = (text: string, vars?: Record<string, string | number>) => string;
