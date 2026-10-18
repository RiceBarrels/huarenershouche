// Public API 枚举双向表:对外用英文 slug,库里存中文(fuel_type / transmission / title_status / 车况清单)
// 或大写英文(drivetrain)。内部值绝不外露;*_label 按 lang 走 i18n 词典。
// 新增 DB 枚举值时在这里补一行即可,读写两侧自动生效。

import { en } from "@/lib/i18n/en";
import { ko } from "@/lib/i18n/ko";
import { ja } from "@/lib/i18n/ja";
import { es } from "@/lib/i18n/es";
import { fr } from "@/lib/i18n/fr";
import type { ApiLang } from "./types";

export type EnumKind =
  | "fuel_type"
  | "transmission"
  | "drivetrain"
  | "title_status"
  | "tires_condition"
  | "known_issue"
  | "status";

/** slug → DB 值(顺序即文档/OpenAPI 里列出的顺序) */
const SLUG_TO_DB: Record<EnumKind, Record<string, string>> = {
  fuel_type: {
    gasoline: "汽油",
    diesel: "柴油",
    electric: "纯电",
    hybrid: "混动",
    phev: "插电混动",
    hydrogen: "氢燃料",
  },
  transmission: {
    automatic: "AT 自动",
    manual: "MT 手动",
    cvt: "CVT 无级",
    dct: "DCT 双离合",
    amt: "AMT 机械自动",
    single_speed: "单速(电动车)",
  },
  drivetrain: {
    fwd: "FWD",
    rwd: "RWD",
    awd: "AWD",
    "4wd": "4WD",
  },
  // 产权状态(cars.title_status,lib/title-status.ts;supabase/title-status.sql)
  title_status: {
    clean: "清白产权",
    rebuilt: "重建产权",
    salvage: "残值产权",
    lemon_buyback: "柠檬回购",
  },
  // 车况清单(cars.condition,lib/car-condition.ts;supabase/car-condition.sql):轮胎状况单选、已知问题多选
  tires_condition: {
    new: "新",
    good: "良好",
    fair: "一般",
    needs_replacement: "需更换",
  },
  known_issue: {
    engine: "发动机",
    transmission: "变速箱",
    air_conditioning: "空调",
    electrical: "电子系统",
    oil_leak: "漏油",
    rust: "车身锈蚀",
    accident_repair: "事故修复",
    suspension: "悬挂",
  },
  status: {
    active: "active",
    pending: "pending",
    sold: "sold",
    removed: "removed",
  },
};

const DB_TO_SLUG: Record<EnumKind, Record<string, string>> = Object.fromEntries(
  (Object.keys(SLUG_TO_DB) as EnumKind[]).map((kind) => [
    kind,
    Object.fromEntries(Object.entries(SLUG_TO_DB[kind]).map(([slug, db]) => [db, slug])),
  ]),
) as Record<EnumKind, Record<string, string>>;

/** 请求体校验用:某枚举全部合法 slug */
export function enumSlugs(kind: EnumKind): string[] {
  return Object.keys(SLUG_TO_DB[kind]);
}

/** slug → DB 值;大小写/连字符宽松(`PHEV`、`plug-in` 不认,`Phev` 认)。未知返回 null */
export function enumToDb(kind: EnumKind, slug: string | null | undefined): string | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase().replace(/-/g, "_");
  return SLUG_TO_DB[kind][key] ?? null;
}

/** DB 值 → slug;库里出现表外值时退化为小写下划线形式,保证永不外露中文 */
export function enumToSlug(kind: EnumKind, dbValue: string | null | undefined): string | null {
  if (!dbValue) return null;
  const hit = DB_TO_SLUG[kind][dbValue];
  if (hit) return hit;
  const ascii = dbValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ascii || "other";
}

const DICTS: Partial<Record<ApiLang, Record<string, string>>> = { en, ko, ja, es, fr };

/**
 * 任意库内中文文案(枚举值、颜色等)按 lang 取展示文案:
 * zh 原样;其他语言查对应词典,缺失回退英文,再回退原文。
 */
export function labelFor(dbValue: string | null | undefined, lang: ApiLang): string | null {
  if (!dbValue) return null;
  if (lang === "zh") return dbValue;
  return DICTS[lang]?.[dbValue] ?? en[dbValue] ?? dbValue;
}

/** 枚举的 { value, label } 对,给响应体和 /meta 用 */
export function enumField(
  kind: EnumKind,
  dbValue: string | null | undefined,
  lang: ApiLang,
): { value: string | null; label: string | null } {
  return { value: enumToSlug(kind, dbValue), label: labelFor(dbValue, lang) };
}

/** OpenAPI / 文档页用:每个枚举的 slug + 各语言 label */
export function enumCatalog(lang: ApiLang): Record<EnumKind, { value: string; label: string }[]> {
  return Object.fromEntries(
    (Object.keys(SLUG_TO_DB) as EnumKind[]).map((kind) => [
      kind,
      Object.entries(SLUG_TO_DB[kind]).map(([slug, db]) => ({
        value: slug,
        label: labelFor(db, lang) ?? slug,
      })),
    ]),
  ) as Record<EnumKind, { value: string; label: string }[]>;
}
