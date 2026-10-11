// 新用户默认随机用户名:
//   [形容词][地区] 或 [地区][形容词]  +  [老/小][姓或名]  +  先生/女士/酱
// - 地区来自 IP 定位(lib/ip-geo.ts → regions.ts),如 纽约 / NY / ny
// - 姓或名来自 Google/Apple 的 full_name;没有就用小名词(车友、包子…)顶位
// - 称谓按性别;Google/Apple 默认都不给性别,拿不到时用中性称谓(酱)
// - 每一段都按随机数可能被跳过,词库与拼接规则按界面语言(words.ts)

import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";
import type { IpGeo } from "@/lib/ip-geo";
import { NAME_RULES, type Gender } from "./words";
import { regionVariants } from "./regions";

export interface UsernameHints {
  /** OAuth 提供的全名(Google/Apple full_name) */
  fullName?: string | null;
  gender?: Gender | null;
}

export interface UsernameSeed extends UsernameHints {
  locale: Locale;
  geo?: IpGeo | null;
}

type Rand = () => number;

const pick = <T,>(list: readonly T[], rand: Rand): T => list[Math.floor(rand() * list.length)];
const chance = (p: number, rand: Rand) => rand() < p;
const charCount = (s: string) => [...s].length;

const COMPOUND_SURNAMES = [
  "欧阳", "司马", "上官", "诸葛", "东方", "皇甫", "令狐", "司徒", "慕容", "夏侯",
  "尉迟", "公孙", "长孙", "宇文", "轩辕", "端木", "南宫", "西门", "独孤",
];
const CJK_ONLY = /^[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]+$/u;

/** 全名拆成可用的「姓 / 名」候选(顺序无意义,生成时随机取一个) */
export function nameCandidates(fullName?: string | null): string[] {
  const s = fullName?.replace(/[^\p{L}\p{M}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (!s || fullName?.includes("@")) return [];

  let parts: string[];
  if (s.includes(" ")) {
    // 拉丁名 "Muheng Fan":首段与末段,不猜哪个是姓
    const tokens = s.split(" ");
    parts = [tokens[0], tokens[tokens.length - 1]].map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1),
    );
  } else if (CJK_ONLY.test(s) && charCount(s) >= 2) {
    // 连写的中日韩名:韩文 1 字姓;汉字复姓或 4 字名按 2 字姓,其余 1 字姓
    const chars = [...s];
    const n =
      /\p{Script=Hangul}/u.test(s) ? 1
        : COMPOUND_SURNAMES.some((c) => s.startsWith(c)) || chars.length >= 4 ? 2
          : 1;
    parts = [chars.slice(0, n).join(""), chars.slice(n).join("")];
  } else {
    parts = [s];
  }
  return [...new Set(parts)].filter((p) => p && charCount(p) <= 10);
}

function normalizeGender(v: unknown): Gender | null {
  if (typeof v !== "string") return null;
  if (/^(m|male|man|男)$/i.test(v.trim())) return "male";
  if (/^(f|female|woman|女)$/i.test(v.trim())) return "female";
  return null;
}

/** 从 Supabase 用户的 OAuth 元数据里取姓名/性别线索 */
export function hintsFromUser(user?: User | null): UsernameHints {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = [meta.full_name, meta.name].find(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  return { fullName: fullName ?? null, gender: normalizeGender(meta.gender) };
}

/** 生成一个随机用户名;rand 可注入以便复现 */
export function generateUsername(seed: UsernameSeed, rand: Rand = Math.random): string {
  const rules = NAME_RULES[seed.locale] ?? NAME_RULES.zh;
  const regions = regionVariants(seed.geo, seed.locale);
  const names = nameCandidates(seed.fullName);
  const allAdjectives = [...rules.adjectives, ...rules.prefixAdjectives];

  for (let attempt = 0; attempt < 30; attempt++) {
    // 前半段:形容词 + 地区,顺序可互换(只能前置的修饰语不换)
    const adj = chance(0.8, rand) ? pick(allAdjectives, rand) : null;
    let region = regions.length && chance(0.7, rand) ? pick(regions, rand) : null;
    // 无空格语言里拉丁地区词偶尔小写,更像网名:ny留学生
    if (region && !rules.innerJoin && /^[A-Za-z]+$/.test(region) && chance(0.35, rand)) {
      region = region.toLowerCase();
    }
    const swappable = adj !== null && !rules.prefixAdjectives.includes(adj);
    const head = (swappable && chance(0.5, rand) ? [region, adj] : [adj, region])
      .filter(Boolean)
      .join(rules.innerJoin);

    // 后半段:[老/小] + 姓或名(没有则小名词) + 称谓
    const base = names.length && chance(0.75, rand)
      ? pick(names, rand)
      : chance(0.55, rand) ? pick(rules.nouns, rand) : null;
    const elder = base && chance(0.45, rand) ? pick(rules.elders, rand) : null;
    let tail = [elder, base].filter(Boolean).join(rules.innerJoin);
    if (tail && chance(0.65, rand)) {
      tail = pick(rules.titles[seed.gender ?? "neutral"], rand).replace("{n}", tail);
    }

    const pieces = [adj, region, base].filter(Boolean).length;
    const name = [head, tail].filter(Boolean).join(rules.outerJoin).trim();
    if (pieces >= 2 && charCount(name) <= rules.maxLength) return name;
  }

  // 兜底:形容词 + 小名词,保证一定有名字
  return [pick(rules.adjectives, rand), pick(rules.nouns, rand)].join(rules.outerJoin);
}
