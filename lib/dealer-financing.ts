// 车行贷款 / 付款方式标签(dealer_stores.financing,supabase/dealer-financing.sql)—— 纯模块(server / client / Bun 通用)。
//
// 和 fuel_type 等枚举一样库里存中文,界面用 t(值) 渲染。标签由车行在「门店与车行认证」里自己勾选,
// 本站只做展示,不提供、不撮合贷款(详情页标签下固定一行 FINANCING_DISCLAIMER)。
// /browse「可贷款(无信用/ITIN)」筛选:卖家名下任一门店带 LOAN_FILTER_TAGS 之一即命中
// (browse-cars.sql 的 browse_filtered 与 lib/car-filters.ts 两份同步)。

export const FINANCING_TAGS = ["支持ITIN贷款", "无信用记录可贷", "自营分期", "接受现金"] as const;
export type FinancingTag = (typeof FINANCING_TAGS)[number];

/** 「可贷款(无信用/ITIN)」筛选认的标签:新移民(没有 SSN / 本地信用记录)最关心这两项 */
export const LOAN_FILTER_TAGS: readonly FinancingTag[] = ["支持ITIN贷款", "无信用记录可贷"];

/** 筛选开关的文案(中文作 i18n key) */
export const LOAN_FILTER_LABEL = "可贷款(无信用/ITIN)";

/** 详情页标签下的合规提示(所有语言都显示) */
export const FINANCING_DISCLAIMER = "具体条件以车行为准，本站不提供贷款";

/**
 * 每个标签一句白话解释(中文作 i18n key,门店设置与详情页 t() 渲染)。
 * 美国、加拿大车行共用同一套解释,除 ITIN(本身就是美国报税号,只有美国车行会勾)外措辞不写死国家,
 * 「无信用记录可贷」说「本地信用记录」而不是「美国信用记录」。
 */
export const FINANCING_EXPLAIN: Record<FinancingTag, string> = {
  支持ITIN贷款: "没有 SSN 也可用 ITIN(个人报税识别号)申请车贷",
  无信用记录可贷: "没有本地信用记录也可申请车贷",
  自营分期: "车行自己提供分期付款,不经银行",
  接受现金: "可用现金付款",
};

export function isFinancingTag(v: unknown): v is FinancingTag {
  return typeof v === "string" && (FINANCING_TAGS as readonly string[]).includes(v);
}

/**
 * 任意输入 → 合法标签数组:去掉不认识的值与重复项,按 FINANCING_TAGS 的顺序排列。
 * 列不存在(读到 undefined)/ null / 非数组一律当作空。
 */
export function normalizeFinancing(v: unknown): FinancingTag[] {
  if (!Array.isArray(v)) return [];
  const set = new Set(v.filter(isFinancingTag));
  return FINANCING_TAGS.filter((tag) => set.has(tag));
}

/** 勾选 / 取消一个标签(返回新数组,顺序同 FINANCING_TAGS) */
export function toggleFinancing(current: readonly string[], tag: FinancingTag): FinancingTag[] {
  const list = normalizeFinancing(current);
  return list.includes(tag) ? list.filter((x) => x !== tag) : normalizeFinancing([...list, tag]);
}

/** 卖家多家门店的标签取并集(详情页卖家卡片展示) */
export function mergeStoreFinancing(stores: readonly { financing?: unknown }[] | null | undefined): FinancingTag[] {
  return normalizeFinancing((stores ?? []).flatMap((s) => (Array.isArray(s.financing) ? s.financing : [])));
}

/** 门店是否命中「可贷款(无信用/ITIN)」筛选(与 browse_filtered 的 financing && LOAN_FILTER_TAGS 一致) */
export function hasLoanFinancing(financing: unknown): boolean {
  return normalizeFinancing(financing).some((tag) => LOAN_FILTER_TAGS.includes(tag));
}

/** 两组标签是否相同(忽略顺序与非法值;保存前判断有没有改动) */
export function sameFinancing(a: unknown, b: unknown): boolean {
  const x = normalizeFinancing(a);
  const y = normalizeFinancing(b);
  return x.length === y.length && x.every((tag, i) => tag === y[i]);
}
