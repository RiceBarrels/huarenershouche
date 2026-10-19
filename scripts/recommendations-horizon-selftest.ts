// 持有年限加权(lib/recommendations.ts horizonBonus / rankCars horizon)自测:bun scripts/recommendations-horizon-selftest.ts
import { buildHorizonPool, horizonBonus, rankCars } from "../lib/recommendations";
import type { DbCar } from "../lib/types";

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failed++;
    console.error("FAIL", name);
  } else console.log("ok  ", name);
}

const now = new Date(Date.now() - 30 * 86400000).toISOString();
const car = (id: string, make: string, price: number, mileage: number, year: number): DbCar =>
  ({ id, make, model: "X", price, mileage, year, fuel_type: "汽油", created_at: now, title: "", title_zh: "", source_id: "s" }) as unknown as DbCar;

const cheapToyota = car("a", "Toyota", 8000, 150000, 2012);
const pricyBmw = car("b", "BMW", 60000, 5000, 2024);
const mid = car("c", "Ford", 30000, 60000, 2018);
const pool = buildHorizonPool([cheapToyota, pricyBmw, mid]);

check("pool ranges", pool.price[0] === 8000 && pool.price[1] === 60000 && pool.year[1] === 2024);
check("short 偏好便宜保值", horizonBonus(cheapToyota, "short", pool) > horizonBonus(pricyBmw, "short", pool));
check("long 偏好低里程新车", horizonBonus(pricyBmw, "long", pool) > horizonBonus(cheapToyota, "long", pool));
check("bonus 上限 12", horizonBonus(cheapToyota, "short", pool) <= 12 && horizonBonus(pricyBmw, "long", pool) <= 12);
check("退化区间不抛错", Number.isFinite(horizonBonus(mid, "long", buildHorizonPool([mid]))));
check("无 pool 只看品牌", horizonBonus(cheapToyota, "short") > 0 && horizonBonus(pricyBmw, "long") === 0);

// localStorage 不存在(Bun)时 rankCars 也要能跑
const empty = { favorites: [], viewed: [] };
check("short 排序首位", rankCars([pricyBmw, mid, cheapToyota], empty, { horizon: "short" })[0].id === "a");
check("long 排序首位", rankCars([cheapToyota, mid, pricyBmw], empty, { horizon: "long" })[0].id === "b");
const base = rankCars([pricyBmw, mid, cheapToyota], empty).map((c) => c.id).join();
check("不传 horizon 不变", rankCars([pricyBmw, mid, cheapToyota], empty, { horizon: null }).map((c) => c.id).join() === base);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
