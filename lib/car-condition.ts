// 结构化车况清单(cars.condition jsonb,supabase/car-condition.sql)—— 纯模块(server / client / Bun 通用)。
//
// 键与取值和 SQL CHECK 一一对应(改一处两边一起改;scripts/car-condition-selftest.ts 会比对 SQL 文件):
//   service_records bool   有保养记录
//   one_owner       bool   一手车
//   smoker          bool   车内吸烟
//   keys_count      int    钥匙数量 0..5
//   tires_condition text   轮胎状况:新 / 良好 / 一般 / 需更换
//   known_issues    text[] 已知问题:固定清单里多选
// 和 fuel_type 等枚举一样库里存中文,界面用 t(值) 渲染;Public API 的英文 slug 见 lib/api/enums.ts。
// 没有自由文本:已知问题只能从固定清单里选。自由文本会绕开翻译管线和 AI 审核(两者只覆盖 description_original),
// 细节请卖家写在描述里。
// 没填的项不存键;{} = 整张清单没填(详情页整块不显示)。known_issues: [] = 卖家明确表示「无已知问题」,和没填不同。

export const TIRES_CONDITIONS = ["新", "良好", "一般", "需更换"] as const;
export type TiresCondition = (typeof TIRES_CONDITIONS)[number];

export const KNOWN_ISSUES = ["发动机", "变速箱", "空调", "电子系统", "漏油", "车身锈蚀", "事故修复", "悬挂"] as const;
export type KnownIssue = (typeof KNOWN_ISSUES)[number];

export const KEYS_COUNT_MAX = 5;

export const CONDITION_BOOL_KEYS = ["service_records", "one_owner", "smoker"] as const;
export type ConditionBoolKey = (typeof CONDITION_BOOL_KEYS)[number];

/** 全部合法键(顺序即展示顺序) */
export const CONDITION_KEYS = [...CONDITION_BOOL_KEYS, "keys_count", "tires_condition", "known_issues"] as const;
export type ConditionKey = (typeof CONDITION_KEYS)[number];

export interface CarCondition {
  service_records?: boolean;
  one_owner?: boolean;
  smoker?: boolean;
  keys_count?: number;
  tires_condition?: TiresCondition;
  known_issues?: KnownIssue[];
}

/** 每一项的标题(中文作 i18n key,界面 t() 渲染) */
export const CONDITION_LABELS: Record<ConditionKey, string> = {
  service_records: "保养记录",
  one_owner: "一手车",
  smoker: "车内吸烟",
  keys_count: "钥匙数量",
  tires_condition: "轮胎状况",
  known_issues: "已知问题",
};

export function isTiresCondition(v: unknown): v is TiresCondition {
  return typeof v === "string" && (TIRES_CONDITIONS as readonly string[]).includes(v);
}

export function isKnownIssue(v: unknown): v is KnownIssue {
  return typeof v === "string" && (KNOWN_ISSUES as readonly string[]).includes(v);
}

export function isKeysCount(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= KEYS_COUNT_MAX;
}

/** 已知问题去重 + 按清单顺序排列(非法值丢掉) */
export function sortKnownIssues(list: readonly unknown[]): KnownIssue[] {
  const set = new Set(list.filter(isKnownIssue));
  return KNOWN_ISSUES.filter((v) => set.has(v));
}

/**
 * 任意值 → 合法清单:非对象 → {};未知键、类型不对、超范围的值都丢掉;已知问题去重排序。
 * 已知问题数组里全是非法值时整项丢掉(当成没填),不能把它变成 [](= 卖家说「无已知问题」)。
 * 读库(列不存在时是 undefined)、表单、API 写入前都过一遍,保证写进去的一定过得了 SQL CHECK。
 */
export function normalizeCarCondition(raw: unknown): CarCondition {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: CarCondition = {};
  for (const k of CONDITION_BOOL_KEYS) {
    if (typeof r[k] === "boolean") out[k] = r[k] as boolean;
  }
  if (isKeysCount(r.keys_count)) out.keys_count = r.keys_count;
  if (isTiresCondition(r.tires_condition)) out.tires_condition = r.tires_condition;
  if (Array.isArray(r.known_issues)) {
    const issues = sortKnownIssues(r.known_issues);
    if (issues.length > 0 || r.known_issues.length === 0) out.known_issues = issues;
  }
  return out;
}

/** 整张清单没填(详情页不显示、发布向导显示「跳过」) */
export function isConditionEmpty(raw: unknown): boolean {
  return Object.keys(normalizeCarCondition(raw)).length === 0;
}

/** 两份清单内容相同(都先归一) */
export function sameCondition(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeCarCondition(a)) === JSON.stringify(normalizeCarCondition(b));
}

/** 设置 / 清除一项(value 为 undefined 即清除),返回新对象 */
export function setConditionField<K extends ConditionKey>(
  c: CarCondition,
  key: K,
  value: CarCondition[K] | undefined,
): CarCondition {
  const next: CarCondition = { ...c };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return normalizeCarCondition(next);
}

/**
 * 已知问题点选:点某一项 → 加入 / 移出;点「无已知问题」(issue = null)→ 置为 [](再点一次清除,回到没填)。
 * 选了具体问题就不再是「无已知问题」;最后一项被移出时回到没填,而不是变成「无已知问题」。
 */
export function toggleKnownIssue(c: CarCondition, issue: KnownIssue | null): CarCondition {
  const current = c.known_issues;
  if (issue === null) {
    return setConditionField(c, "known_issues", current && current.length === 0 ? undefined : []);
  }
  const list = current ?? [];
  const next = list.includes(issue) ? list.filter((v) => v !== issue) : [...list, issue];
  return setConditionField(c, "known_issues", next.length > 0 ? sortKnownIssues(next) : undefined);
}
