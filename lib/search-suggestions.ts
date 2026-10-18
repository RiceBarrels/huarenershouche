// 社区搜索「猜你想搜」算法(候选池,页面端再按语言/输入过滤):
// 仅社区使用 —— 买车搜索走独立的 lib/car-search-suggestions.ts,勿混用。
// 主源:全站搜索词统计(supabase community_search_terms,见 supabase/search-terms.sql)
//   —— 最近 30 天按天分桶,得分 = Σ 当日次数 × 0.5^(距今天数 / 7),半衰期 7 天
// 补充:主源不足时用帖子 tags/品牌 的热度榜补齐
//   —— 得分 = Σ 所在帖子 (1 + 点赞×2 + 评论×3) × 0.5^(帖龄天数 / 14)
// 候选项分三类(展示规则见 presentSuggestions):
// - term:用户搜过的自由文本,原样显示、原样搜索,非中文界面只展示与界面同语言的词;
// - tag:帖子标签与搜过的 #xxx,显示当前语言的话题名(useTermLabels('topic')),点选按 '#' + 原始标签
//   搜索,跨语言命中同一话题;
// - keyword:兜底词与只来自品牌(make)的词,同样显示当前语言的名称,但按原词全文搜索
//   ('#' 搜索只匹配帖子标签,这些词多半只出现在标题 / 正文里);搜过的兜底词仍归为 keyword。
// 会话内缓存,一次会话只算一次。候选池合成与展示规则是纯函数,导入本文件不建 Supabase 客户端。

import type { Locale } from "./i18n";
import { detectLang } from "./i18n/detect";

export interface SuggestionItem {
  term: string;
  kind: "term" | "tag" | "keyword";
}

/** 页面上的一个推荐词:label 显示文案,search 点选后实际搜索的串 */
export interface ShownSuggestion {
  key: string;
  label: string;
  search: string;
}

/** 帖子标签 / 品牌的热度;fromTags = 在某篇帖子的 tags 里出现过(否则只来自品牌) */
export interface TagHeat {
  score: number;
  fromTags: boolean;
}

/** 算标签热度用的帖子列 */
export interface PostHeatRow {
  tags: string[] | null;
  make: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

const CACHE_KEY = "clc_search_suggestions_v5";
// 兜底词:新手购车 与发帖快捷话题同一写法(预置话题,各语言都有名称),其余显示词典译名
const FALLBACK_TERMS = ["新手购车", "二手车避坑", "保养", "验车", "贷款", "保险"];
const FALLBACK: SuggestionItem[] = FALLBACK_TERMS.map(
  (term): SuggestionItem => ({ term, kind: "keyword" }),
);
const FALLBACK_KEYS = new Set(FALLBACK_TERMS.map((term) => term.toLowerCase()));
const POOL_SIZE = 40;

// anon client 用到时才加载(lib/supabase 导入即建客户端,缺环境变量会抛错)
const anonClient = () => import("./supabase").then((m) => m.supabase);

/** 记一次全站搜索词(RPC 内做长度校验与去空白);失败静默 */
export function logSearchTerm(term: string) {
  const t = term.trim();
  if (!t || t.length > 20) return;
  anonClient()
    .then((supabase) => supabase.rpc("log_search_term", { p_term: t }))
    .then(
      () => {},
      () => {},
    );
}

async function fetchSearchTermScores(): Promise<Map<string, number>> {
  const supabase = await anonClient();
  const score = new Map<string, number>();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("community_search_terms")
    .select("term, day, count")
    .gte("day", since)
    .limit(2000);
  if (error || !data) return score;
  const today = Date.now();
  for (const r of data as { term: string; day: string; count: number }[]) {
    const ageDays = Math.max(0, (today - new Date(r.day).getTime()) / 86_400_000);
    const decay = Math.pow(0.5, ageDays / 7);
    score.set(r.term, (score.get(r.term) || 0) + (r.count || 0) * decay);
  }
  return score;
}

async function fetchTagHeatScores(): Promise<Map<string, TagHeat>> {
  const supabase = await anonClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select("tags, make, likes_count, comments_count, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return new Map();
  return tagHeatScores(data as PostHeatRow[], Date.now());
}

/** 给一个词累加热度(空串与超过 12 字的不计) */
function addHeat(score: Map<string, TagHeat>, value: string, heat: number, fromTags: boolean) {
  const term = value.trim();
  if (!term || term.length > 12) return;
  const prev = score.get(term);
  score.set(term, { score: (prev?.score ?? 0) + heat, fromTags: fromTags || prev?.fromTags === true });
}

/** 帖子 → 标签 / 品牌热度(纯函数);同一个词既是某帖的标签又是某帖的品牌时 fromTags 为 true */
export function tagHeatScores(rows: readonly PostHeatRow[], now: number): Map<string, TagHeat> {
  const score = new Map<string, TagHeat>();
  for (const r of rows) {
    const ageDays = Math.max(0, (now - new Date(r.created_at).getTime()) / 86_400_000);
    const decay = Math.pow(0.5, ageDays / 14);
    const heat = (1 + (r.likes_count || 0) * 2 + (r.comments_count || 0) * 3) * decay;
    for (const t of r.tags || []) addHeat(score, String(t), heat, true);
    if (r.make) addHeat(score, r.make, heat, false);
  }
  return score;
}

/** 搜索词 → 候选项:'#xxx' 是话题搜索,归为 tag(去掉 #);兜底词归为 keyword;其余为自由文本 */
function searchTermItem(term: string): SuggestionItem | null {
  if (!/^[#＃]/.test(term)) {
    return { term, kind: FALLBACK_KEYS.has(term.toLowerCase()) ? "keyword" : "term" };
  }
  const tag = term.replace(/^[#＃]+/, "").trim();
  return tag ? { term: tag, kind: "tag" } : null;
}

/** 同一个词(大小写不敏感)只保留先放进来的一项(热度高者在前) */
function pushUnique(list: SuggestionItem[], have: Set<string>, item: SuggestionItem | null) {
  if (!item) return;
  const key = item.term.toLowerCase();
  if (have.has(key)) return;
  have.add(key);
  list.push(item);
}

/** 搜索词热度 → 候选项(纯函数):热度降序,同一个词只留一项 */
export function rankSearchTerms(termScores: ReadonlyMap<string, number>): SuggestionItem[] {
  const ranked: SuggestionItem[] = [];
  const have = new Set<string>();
  [...termScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([t]) => pushUnique(ranked, have, searchTermItem(t)));
  return ranked;
}

/**
 * 候选池(纯函数):搜过的词在前,帖子标签 / 品牌热度补齐(帖子标签为 tag,只来自品牌的词为 keyword,
 * 已有的词不重复),取前 POOL_SIZE 个;不足 3 个时只用兜底词,否则兜底词垫底(排除已有词)
 */
export function buildSuggestionPool(
  searched: readonly SuggestionItem[],
  tagHeat: ReadonlyMap<string, TagHeat>,
): SuggestionItem[] {
  const ranked = [...searched];
  const have = new Set(searched.map((item) => item.term.toLowerCase()));
  [...tagHeat.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .forEach(([term, heat]) => pushUnique(ranked, have, { term, kind: heat.fromTags ? "tag" : "keyword" }));
  const top = ranked.slice(0, POOL_SIZE);
  if (top.length < 3) return FALLBACK;
  const topKeys = new Set(top.map((item) => item.term.toLowerCase()));
  return [...top, ...FALLBACK.filter((f) => !topKeys.has(f.term.toLowerCase()))];
}

function isSuggestionItem(v: unknown): v is SuggestionItem {
  if (!v || typeof v !== "object") return false;
  const item = v as Partial<SuggestionItem>;
  return (
    typeof item.term === "string" &&
    (item.kind === "term" || item.kind === "tag" || item.kind === "keyword")
  );
}

/** 按热度排序的候选池(top 40 + 兜底词,会话内缓存);页面端再按语言/输入过滤 */
export async function getSuggestionPool(): Promise<SuggestionItem[]> {
  if (typeof window === "undefined") return FALLBACK;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: unknown = JSON.parse(raw);
      if (Array.isArray(cached) && cached.every(isSuggestionItem)) return cached;
    }
  } catch {
    /* ignore */
  }

  let result = FALLBACK;
  try {
    // 主源:全站搜索词;不足时用帖子 tags/品牌热度补齐
    const searched = rankSearchTerms(await fetchSearchTermScores());
    const tagHeat = searched.length < POOL_SIZE ? await fetchTagHeatScores() : new Map<string, TagHeat>();
    result = buildSuggestionPool(searched, tagHeat);
  } catch {
    /* 拉取失败用兜底词 */
  }

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
  return result;
}

/**
 * 候选项 → 页面展示项(纯函数,页面在 useMemo 里调用)。
 * labels:useTermLabels('topic') 对每个 tag / keyword 候选的结果 —— 已归并的话题 key 为 't:<slug>'、
 * label 为当前语言的话题名;未归并为 'r:<规范化标签>' + t(原词)。
 * - tag 显示 '#名称',按 '#原始标签' 搜索;keyword 显示名称,按原词全文搜索;term 原样显示、原样搜索;
 * - 同一话题(key 相同,如 特斯拉 / Tesla)只留热度最高的一个;不带 # 的同一显示文字也只留一个;
 * - 非中文界面:term,以及没有任何本地化名称(未归并、词典里也没有)的 keyword,
 *   只展示与界面同语言(或无语言特征)的词。
 */
export function presentSuggestions(
  pool: readonly SuggestionItem[],
  labels: Readonly<Record<string, { key: string; label: string }>>,
  locale: Locale,
): ShownSuggestion[] {
  const seenTopics = new Set<string>();
  const seenLabels = new Set<string>();
  const inUiLanguage = (text: string) => {
    if (locale === "zh") return true;
    const { lang } = detectLang(text);
    return lang === locale || lang === "und";
  };
  return pool.flatMap((item): ShownSuggestion[] => {
    if (item.kind === "term") {
      const labelKey = item.term.toLowerCase();
      if (seenLabels.has(labelKey) || !inUiLanguage(item.term)) return [];
      seenLabels.add(labelKey);
      return [{ key: `term:${item.term}`, label: item.term, search: item.term }];
    }
    // useTermLabels 对传入的每个原词都有值;缺了按未本地化的原词处理
    const { key, label } = labels[item.term] ?? { key: `r:${item.term}`, label: item.term };
    if (seenTopics.has(key)) return [];
    if (item.kind === "tag") {
      seenTopics.add(key);
      return [{ key: `tag:${item.term}`, label: `#${label}`, search: `#${item.term}` }];
    }
    const labelKey = label.toLowerCase();
    const localized = key.startsWith("t:") || label !== item.term;
    if (seenLabels.has(labelKey) || (!localized && !inUiLanguage(item.term))) return [];
    seenTopics.add(key);
    seenLabels.add(labelKey);
    return [{ key: `keyword:${item.term}`, label, search: item.term }];
  });
}
