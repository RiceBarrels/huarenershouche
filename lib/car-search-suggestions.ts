// 买车搜索「猜你想搜」算法(候选池,页面端再按输入过滤):
// 与社区搜索(lib/search-suggestions.ts)完全独立 —— 独立词频表、独立 RPC、独立缓存。
// 主源:买车搜索词统计(supabase car_search_terms,见 supabase/car-search-terms.sql)
//   —— 最近 30 天按天分桶,得分 = Σ 当日次数 × 0.5^(距今天数 / 7),半衰期 7 天
// 补充:主源不足时用在售车源 品牌/车型 的热度榜补齐
//   —— 得分 = Σ 所在车源 (1 + 收藏×3 + 浏览×0.1) × 0.5^(挂牌天数 / 30)
// 会话内缓存,一次会话只算一次

import { supabase } from "./supabase";

const CACHE_KEY = "clc_car_search_suggestions_v1";
const FALLBACK = ["特斯拉", "Camry", "汉兰达", "SUV", "油电混动", "低里程"];
const POOL_SIZE = 40;

/** 记一次买车搜索词(RPC 内做长度校验与去空白);失败静默 */
export function logCarSearchTerm(term: string) {
  const t = term.trim();
  if (!t || t.length > 20) return;
  supabase.rpc("log_car_search_term", { p_term: t }).then(
    () => {},
    () => {},
  );
}

async function fetchSearchTermScores(): Promise<Map<string, number>> {
  const score = new Map<string, number>();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("car_search_terms")
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

async function fetchListingHeatScores(): Promise<Map<string, number>> {
  const score = new Map<string, number>();
  const { data, error } = await supabase
    .from("cars")
    .select("make, model, views_count, favorites_count, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return score;
  const now = Date.now();
  for (const r of data as {
    make: string | null;
    model: string | null;
    views_count: number;
    favorites_count: number;
    created_at: string;
  }[]) {
    const ageDays = Math.max(0, (now - new Date(r.created_at).getTime()) / 86_400_000);
    const decay = Math.pow(0.5, ageDays / 30);
    const heat = (1 + (r.favorites_count || 0) * 3 + (r.views_count || 0) * 0.1) * decay;
    for (const t of [r.make, r.model]) {
      const term = String(t || "").trim();
      if (!term || term.length > 12) continue;
      score.set(term, (score.get(term) || 0) + heat);
    }
  }
  return score;
}

/** 按热度排序的候选词池(top 40,会话内缓存);页面端再按输入过滤/排除 */
export async function getCarSuggestionPool(): Promise<string[]> {
  if (typeof window === "undefined") return FALLBACK;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }

  let result = FALLBACK;
  try {
    // 主源:买车搜索词
    const termScores = await fetchSearchTermScores();
    const ranked = [...termScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    // 不足时用在售车源 品牌/车型 热度补齐(排除已有词)
    if (ranked.length < POOL_SIZE) {
      const listingScores = await fetchListingHeatScores();
      const have = new Set(ranked);
      const extra = [...listingScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t)
        .filter((t) => !have.has(t));
      ranked.push(...extra);
    }

    const top = ranked.slice(0, POOL_SIZE);
    if (top.length >= 3) {
      result = [...top, ...FALLBACK.filter((f) => !top.includes(f))];
    }
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
