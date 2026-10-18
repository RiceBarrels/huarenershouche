// /browse 服务端分页的预计算字段(car_browse_meta,见 supabase/browse-cars.sql):
// 车身类型、拼音搜索串、好价评级。它们依赖前端词库或要拿全部在售车源比价,
// SQL 里不好算,由 /api/sync 每小时(及 scripts/refresh-browse-meta.ts 手动)整表重算。
// 只在服务端用(service client 写库)。

import { pinyin } from "pinyin-pro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyBodyStyle } from "@/lib/body-style";
import { getPriceInsight, toStoredDeal } from "@/lib/price-insight";
import { MAKES_ZH } from "@/lib/mock-data";
import type { DbCar } from "@/lib/types";

const META_CAR_COLUMNS =
  "id, make, model, year, price, mileage, vin, title_zh, location_zh, seller_name, features";

type MetaCar = Pick<
  DbCar,
  "id" | "make" | "model" | "year" | "price" | "mileage" | "vin" | "title_zh" | "location_zh" | "seller_name" | "features"
>;

const PAGE_SIZE = 1000; // PostgREST 单次上限
const UPSERT_BATCH = 500;

/**
 * 拼音搜索串:与 carMatchesKeyword 的 zhOnly 同一组字段,只取汉字,
 * 存「全拼 + 空格 + 首字母」,搜 kaimeirui / kmr 都能命中
 */
export function searchPinyin(car: MetaCar): string | null {
  const zhOnly = [
    car.title_zh, MAKES_ZH[car.make], car.location_zh, car.seller_name,
    (car.features || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[^一-鿿]/g, "");
  if (!zhOnly) return null;
  const full = pinyin(zhOnly, { toneType: "none", type: "array" }).join("");
  const initials = pinyin(zhOnly, { pattern: "first", toneType: "none", type: "array" }).join("");
  return `${full} ${initials}`.toLowerCase();
}

async function fetchActiveCars(supabase: SupabaseClient): Promise<MetaCar[]> {
  const cars: MetaCar[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("cars")
      .select(META_CAR_COLUMNS)
      .eq("status", "active")
      .eq("owner_hidden", false)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`browse meta: load cars failed: ${error.message}`);
    cars.push(...((data as MetaCar[]) || []));
    if (!data || data.length < PAGE_SIZE) return cars;
  }
}

/** 重算全部在售车源的预计算字段并写回,返回写入行数 */
export async function refreshBrowseMeta(supabase: SupabaseClient): Promise<number> {
  const cars = await fetchActiveCars(supabase);
  // 比价池 = 全部在售车源(与 /browse 原来前端 getPriceInsight(car, cars) 的基准一致)
  const pool = cars as DbCar[];
  const now = new Date().toISOString();
  const rows = cars.map((car) => ({
    car_id: car.id,
    body_style: classifyBodyStyle(car),
    search_pinyin: searchPinyin(car),
    deal: toStoredDeal(getPriceInsight(car as DbCar, pool)),
    updated_at: now,
  }));
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const { error } = await supabase
      .from("car_browse_meta")
      .upsert(rows.slice(i, i + UPSERT_BATCH), { onConflict: "car_id" });
    if (error) throw new Error(`browse meta: upsert failed: ${error.message}`);
  }
  return rows.length;
}
