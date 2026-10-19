// 用户偏好(/account/setup 三个问题):界面密度 / 居住地 / 计划持有年限。纯模块,server / client / Bun 通用。
//
// 只存在本机 localStorage 的 `clc_prefs`(登录与否都一样),不写 profiles 或任何表 —— 居住地(国家 + 邮编)
// 属于个人信息,绝不公开展示、绝不上传;埋点(setup_answer)只记选项,不带邮编。
// 读写一律 try/catch:隐私模式 / SSR / 存储被禁用时读回默认值,写入静默失败。
// 「没回答」= 默认值 = 现在的界面行为(ui 默认 detailed:今天的车卡本来就显示燃油 / 卖家语言等细节)。

import { normalizeCountry, normalizePostalCode, isPostalCodeFor, type Country } from "@/lib/postal";
import { unitsForCountry, type Currency, type MileageUnit } from "@/lib/currency";

export const PREFS_STORAGE_KEY = "clc_prefs";
export const PREFS_VERSION = 1;

export const UI_DENSITIES = ["simple", "detailed"] as const;
export type UiDensity = (typeof UI_DENSITIES)[number];

/** 四个市场之外选「其他」 */
export const PREF_COUNTRIES = ["US", "CA", "AU", "NZ", "other"] as const;
export type PrefCountry = (typeof PREF_COUNTRIES)[number];

/** 计划持有:不到 1 年 / 1–3 年 / 3–5 年 / 5 年以上 */
export const OWNERSHIP_LENGTHS = ["lt1", "1to3", "3to5", "5plus"] as const;
export type OwnershipLength = (typeof OWNERSHIP_LENGTHS)[number];

export type SetupDone = "completed" | "skipped";

export interface Preferences {
  v: 1;
  ui: UiDensity;
  /** 没回答时为 undefined(调用方按各自原有逻辑:IP 国家 / 邮编 / 美国) */
  country?: PrefCountry;
  /** 只在 country 是四国之一且格式对得上时保留(规范写法) */
  postal?: string;
  ownership?: OwnershipLength;
  setupDone?: SetupDone;
  updatedAt?: string;
}

/** 默认 detailed = 现有界面,没回答的用户什么都不变 */
export const DEFAULT_UI: UiDensity = "detailed";

export const DEFAULT_PREFERENCES: Preferences = Object.freeze({ v: 1, ui: DEFAULT_UI }) as Preferences;

/** 选项文案(中文 key,界面用 t() 翻译) */
export const UI_DENSITY_LABELS: Record<UiDensity, string> = { simple: "简洁", detailed: "详细" };
export const PREF_COUNTRY_LABELS: Record<PrefCountry, string> = {
  US: "美国",
  CA: "加拿大",
  AU: "澳大利亚",
  NZ: "新西兰",
  other: "其他地区",
};
export const OWNERSHIP_LABELS: Record<OwnershipLength, string> = {
  lt1: "不到 1 年",
  "1to3": "1–3 年",
  "3to5": "3–5 年",
  "5plus": "5 年以上",
};

function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

/** 任意 JSON → 合法 Preferences;不认识的字段丢掉、取值不对回默认。永不抛错 */
export function normalizePreferences(input: unknown): Preferences {
  if (!input || typeof input !== "object") return { ...DEFAULT_PREFERENCES };
  const o = input as Record<string, unknown>;
  const out: Preferences = { v: 1, ui: isOneOf(UI_DENSITIES, o.ui) ? o.ui : DEFAULT_UI };
  if (isOneOf(PREF_COUNTRIES, o.country)) out.country = o.country;
  if (out.country && out.country !== "other" && typeof o.postal === "string") {
    const p = normalizePostalCode(o.postal);
    if (isPostalCodeFor(p, out.country)) out.postal = p;
  }
  if (isOneOf(OWNERSHIP_LENGTHS, o.ownership)) out.ownership = o.ownership;
  if (o.setupDone === "completed" || o.setupDone === "skipped") out.setupDone = o.setupDone;
  if (typeof o.updatedAt === "string" && o.updatedAt.length <= 40) out.updatedAt = o.updatedAt;
  return out;
}

/** localStorage 原文 → Preferences(null / 坏 JSON → 默认值) */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/** 合并一次修改(patch 里 undefined = 清掉该项),顺带规范化并刷新 updatedAt */
export function mergePreferences(
  prev: Preferences,
  patch: Partial<Omit<Preferences, "v">>,
  now: Date = new Date()
): Preferences {
  const next: Record<string, unknown> = { ...prev };
  for (const [k, val] of Object.entries(patch)) {
    if (val === undefined) delete next[k];
    else next[k] = val;
  }
  // 换了国家而邮编对不上新国家 → normalize 会丢掉邮编
  return { ...normalizePreferences(next), updatedAt: now.toISOString() };
}

// ---------- 存储(注入 Storage 方便自测;不传时取 window.localStorage) ----------

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): MinimalStorage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPreferencesRaw(storage: MinimalStorage | null = defaultStorage()): string | null {
  try {
    return storage ? storage.getItem(PREFS_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

export function readPreferences(storage: MinimalStorage | null = defaultStorage()): Preferences {
  return parsePreferences(readPreferencesRaw(storage));
}

/** 写入;存储不可用 / 配额满 → false(界面照常按内存里的新值显示) */
export function writePreferences(prefs: Preferences, storage: MinimalStorage | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify(normalizePreferences(prefs)));
    return true;
  } catch {
    return false;
  }
}

// ---------- 给各处效果用的派生值(S2 接入) ----------

/** 居住国(四国之一);没回答 / 选了「其他」→ null,调用方回落到原有默认 */
export function preferredCountry(prefs: Preferences): Country | null {
  return prefs.country && prefs.country !== "other" ? normalizeCountry(prefs.country) : null;
}

/** 居住国对应的默认币种 / 里程单位;null = 按原有逻辑 */
export function preferredUnits(prefs: Preferences): { currency: Currency; mileage_unit: MileageUnit } | null {
  const c = preferredCountry(prefs);
  return c ? unitsForCountry(c) : null;
}

/** 持有年限 → 首页推荐权重方向:short(低价 + 保值)/ long(低里程 + 车龄新);没回答 → null 不加权 */
export function ownershipHorizon(prefs: Preferences): "short" | "long" | null {
  if (!prefs.ownership) return null;
  return prefs.ownership === "lt1" || prefs.ownership === "1to3" ? "short" : "long";
}

/** 首页一次性卡片:回答过或跳过过就再也不出 */
export function shouldShowSetupCard(prefs: Preferences): boolean {
  return !prefs.setupDone;
}

// ---------- 埋点(click_events kind = setup_answer) ----------

/** setup_answer 的 target 白名单:`问题:选项`;邮编从不上报。服务端按此校验,SQL CHECK 用同一格式 */
export const SETUP_ANSWER_TARGETS = [
  ...UI_DENSITIES.map((v) => `ui:${v}` as const),
  ...PREF_COUNTRIES.map((v) => `country:${v}` as const),
  ...OWNERSHIP_LENGTHS.map((v) => `own:${v}` as const),
  "setup:completed",
  "setup:skipped",
] as const;
export type SetupAnswerTarget = (typeof SETUP_ANSWER_TARGETS)[number];

export function isSetupAnswerTarget(v: unknown): v is SetupAnswerTarget {
  return typeof v === "string" && (SETUP_ANSWER_TARGETS as readonly string[]).includes(v);
}
