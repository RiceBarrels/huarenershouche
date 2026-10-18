// 车行贷款 / 付款方式标签的客户端读写(浏览器 / 原生壳)。纯规则见 lib/dealer-financing.ts。
//
// 数据在 dealer_stores.financing(supabase/dealer-financing.sql),沿用门店表现有的 RLS:
// 公开可读;门店 owner 或其认领人(can_act_as)可改。
// 代码先于 SQL 上线:列不存在时读到的一律当作空数组(详情页不显示标签、筛选一辆也不命中),
// 门店设置页隐藏勾选区,保存返回 unavailable 静默跳过。

import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import {
  LOAN_FILTER_TAGS,
  mergeStoreFinancing,
  normalizeFinancing,
  type FinancingTag,
} from "@/lib/dealer-financing";

/** 卖家名下全部门店的标签并集(详情页卖家卡片);没有门店 / 列不存在 / 出错 → [] */
export async function loadSellerFinancing(sellerId: string): Promise<FinancingTag[]> {
  try {
    const { data, error } = await supabase.from("dealer_stores").select("financing").eq("owner_id", sellerId);
    if (error || !data) return [];
    return mergeStoreFinancing(data as { financing?: unknown }[]);
  } catch {
    return [];
  }
}

// 「可贷款(无信用/ITIN)」的卖家集合:同一会话里筛选来回切换不重复查,5 分钟过期
const SELLER_SET_TTL_MS = 5 * 60 * 1000;
let sellerSetCache: { at: number; ids: Set<string> } | null = null;
let sellerSetInflight: Promise<Set<string> | null> | null = null;

/**
 * 名下有门店带 LOAN_FILTER_TAGS 之一的卖家 id(与 browse_filtered 的 financing 筛选同一规则)。
 * 地图找车的前端筛选、以及 browse_cars 还是旧版(忽略该筛选)时的兜底用。
 * 列不存在 → 空集合(没有任何车行设置过,筛选一辆也不命中,与 SQL 一致);网络等其他错误 → null(调用方不做兜底过滤)。
 */
export function fetchLoanFinancingSellerIds(): Promise<Set<string> | null> {
  if (sellerSetCache && Date.now() - sellerSetCache.at < SELLER_SET_TTL_MS) {
    return Promise.resolve(sellerSetCache.ids);
  }
  if (sellerSetInflight) return sellerSetInflight;
  sellerSetInflight = (async () => {
    try {
      const { data, error } = await supabase
        .from("dealer_stores")
        .select("owner_id")
        .overlaps("financing", [...LOAN_FILTER_TAGS])
        .limit(10000);
      if (error) {
        if (!isMissingColumnError(error)) return null;
        const ids = new Set<string>();
        sellerSetCache = { at: Date.now(), ids };
        return ids;
      }
      const ids = new Set(((data as { owner_id: string }[] | null) ?? []).map((r) => r.owner_id));
      sellerSetCache = { at: Date.now(), ids };
      return ids;
    } catch {
      return null;
    } finally {
      sellerSetInflight = null;
    }
  })();
  return sellerSetInflight;
}

export type SaveFinancingResult = "saved" | "unavailable" | "error";

/** 整体覆盖一家门店的标签(先规范化);改完清掉卖家集合缓存,本会话里的筛选立即反映 */
export async function saveStoreFinancing(storeId: string, tags: readonly string[]): Promise<SaveFinancingResult> {
  try {
    const { data, error } = await supabase
      .from("dealer_stores")
      .update({ financing: normalizeFinancing(tags) })
      .eq("id", storeId)
      .select("id");
    if (error) return isMissingColumnError(error) ? "unavailable" : "error";
    // RLS 拦下的 update 不报错,只是 0 行
    if (!data || data.length === 0) return "error";
    sellerSetCache = null;
    return "saved";
  } catch {
    return "error";
  }
}
