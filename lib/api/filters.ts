// GET /api/v1/cars 的 query 解析:筛选 → Supabase 查询条件、排序、游标分页。
// 枚举参数收英文 slug(enumToDb 转库内值),非法值汇总成 validation_failed details。
// 分页:sort=newest 用 (created_at, id) keyset 游标,稳定不漏不重;
// 其他排序(price/mileage/year)v0 用 offset 游标(排序列非唯一,keyset 需要复合比较,
// 数据量上来再换)。游标里带 sort,换排序不带旧游标。

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type ApiErrorDetail } from "./types";
import { decodeCursor, encodeCursor, intParam } from "./response";
import { enumSlugs, enumToDb, type EnumKind } from "./enums";

/** 只声明用到的 PostgREST builder 方法,让 lib 不绑死 supabase 泛型签名 */
export interface CarFilterQuery {
  eq(column: string, value: unknown): this;
  in(column: string, values: readonly unknown[]): this;
  ilike(column: string, pattern: string): this;
  gte(column: string, value: unknown): this;
  lte(column: string, value: unknown): this;
  or(filters: string): this;
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this;
  range(from: number, to: number): this;
  limit(count: number): this;
}

export const CAR_SORTS = ["newest", "price_asc", "price_desc", "mileage_asc", "year_desc"] as const;
export type CarSort = (typeof CAR_SORTS)[number];

const SORT_SPEC: Record<CarSort, { column: string; ascending: boolean }> = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  mileage_asc: { column: "mileage", ascending: true },
  year_desc: { column: "year", ascending: false },
};

/** newest:keyset;其他:offset */
export type CarCursor =
  | { s: "newest"; t: string; id: string }
  | { s: Exclude<CarSort, "newest">; o: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}

/** LIKE 通配符转义(用户输入里的 % _ \ 当字面量) */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** PostgREST or() 里的值加双引号,内部引号/反斜杠转义,防止逗号/括号破坏语法 */
export function quoteOrValue(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function intFilter(
  sp: URLSearchParams,
  name: string,
  errors: ApiErrorDetail[],
  opts: { min: number; max: number },
): number | null {
  const raw = sp.get(name);
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < opts.min || n > opts.max) {
    errors.push({ field: name, issue: `must be an integer between ${opts.min} and ${opts.max}` });
    return null;
  }
  return n;
}

/** 逗号分隔的 slug 列表 → 库内值列表;任一非法即报错 */
function enumFilter(sp: URLSearchParams, name: EnumKind, errors: ApiErrorDetail[]): string[] | null {
  const raw = sp.get(name);
  if (!raw || raw.trim() === "") return null;
  const slugs = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const dbValues: string[] = [];
  for (const slug of slugs) {
    const db = enumToDb(name, slug);
    if (!db) {
      errors.push({ field: name, issue: `unknown value "${slug}"; expected one of: ${enumSlugs(name).join(", ")}` });
      return null;
    }
    dbValues.push(db);
  }
  return dbValues.length ? dbValues : null;
}

/**
 * 把 query 参数套到 cars 查询上(不含 status/owner_hidden 公共可见性,路由自己加)。
 * anonymous=true 时 seller_id 直接报错(防匿名按卖家整站扒)。
 */
export function applyCarQueryFilters<Q extends CarFilterQuery>(
  query: Q,
  sp: URLSearchParams,
  opts: { anonymous: boolean },
): { query: Q; errors: ApiErrorDetail[] } {
  const errors: ApiErrorDetail[] = [];
  let q = query;

  const make = sp.get("make")?.trim();
  if (make) q = q.ilike("make", escapeLike(make));

  const model = sp.get("model")?.trim();
  if (model) q = q.ilike("model", `%${escapeLike(model)}%`);

  const yearMin = intFilter(sp, "year_min", errors, { min: 1900, max: 2100 });
  if (yearMin != null) q = q.gte("year", yearMin);
  const yearMax = intFilter(sp, "year_max", errors, { min: 1900, max: 2100 });
  if (yearMax != null) q = q.lte("year", yearMax);
  if (yearMin != null && yearMax != null && yearMin > yearMax) {
    errors.push({ field: "year_min", issue: "must be <= year_max" });
  }

  const priceMin = intFilter(sp, "price_min", errors, { min: 0, max: 100_000_000 });
  if (priceMin != null) q = q.gte("price", priceMin);
  const priceMax = intFilter(sp, "price_max", errors, { min: 0, max: 100_000_000 });
  if (priceMax != null) q = q.lte("price", priceMax);
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    errors.push({ field: "price_min", issue: "must be <= price_max" });
  }

  const mileageMax = intFilter(sp, "mileage_max", errors, { min: 0, max: 10_000_000 });
  if (mileageMax != null) q = q.lte("mileage", mileageMax);

  for (const kind of ["fuel_type", "transmission", "drivetrain"] as const) {
    const values = enumFilter(sp, kind, errors);
    if (!values) continue;
    q = values.length === 1 ? q.eq(kind, values[0]) : q.in(kind, values);
  }

  const location = sp.get("location")?.trim();
  if (location) {
    const pat = quoteOrValue(`%${escapeLike(location)}%`);
    q = q.or(`location.ilike.${pat},location_zh.ilike.${pat}`);
  }

  const sellerId = sp.get("seller_id")?.trim();
  if (sellerId) {
    if (opts.anonymous) {
      errors.push({ field: "seller_id", issue: "seller_id requires an API key" });
    } else if (!isUuid(sellerId)) {
      errors.push({ field: "seller_id", issue: "must be a uuid" });
    } else {
      q = q.eq("seller_id", sellerId);
    }
  }

  const updatedSince = sp.get("updated_since")?.trim();
  if (updatedSince) {
    const ms = Date.parse(updatedSince);
    if (Number.isNaN(ms)) {
      errors.push({ field: "updated_since", issue: "must be an ISO 8601 timestamp" });
    } else {
      q = q.gte("updated_at", new Date(ms).toISOString());
    }
  }

  return { query: q, errors };
}

export interface CarPageParams {
  sort: CarSort;
  limit: number;
  cursor: CarCursor | null;
}

/** 解析 sort / limit / cursor;游标与 sort 不匹配或格式坏掉都报错 */
export function parseCarPageParams(sp: URLSearchParams): { params: CarPageParams; errors: ApiErrorDetail[] } {
  const errors: ApiErrorDetail[] = [];
  const rawSort = sp.get("sort")?.trim() || "newest";
  const sort: CarSort = (CAR_SORTS as readonly string[]).includes(rawSort) ? (rawSort as CarSort) : "newest";
  if (sort !== rawSort) {
    errors.push({ field: "sort", issue: `expected one of: ${CAR_SORTS.join(", ")}` });
  }

  const limit = intParam(sp, "limit", DEFAULT_PAGE_SIZE, { min: 1, max: MAX_PAGE_SIZE }) ?? DEFAULT_PAGE_SIZE;

  let cursor: CarCursor | null = null;
  const rawCursor = sp.get("cursor");
  if (rawCursor) {
    const decoded = decodeCursor<Record<string, unknown>>(rawCursor);
    const valid =
      decoded &&
      decoded.s === sort &&
      (sort === "newest"
        ? typeof decoded.t === "string" && isUuid(decoded.id as string)
        : typeof decoded.o === "number" && Number.isInteger(decoded.o) && decoded.o >= 0);
    if (!valid) {
      errors.push({ field: "cursor", issue: "invalid cursor for this sort" });
    } else {
      cursor = decoded as unknown as CarCursor;
    }
  }

  return { params: { sort, limit, cursor }, errors };
}

/** 套排序 + 游标 + limit+1(多取一条用于判断 next_cursor) */
export function applyCarSortAndPage<Q extends CarFilterQuery>(query: Q, params: CarPageParams): Q {
  const spec = SORT_SPEC[params.sort];
  let q = query.order(spec.column, { ascending: spec.ascending }).order("id", { ascending: spec.ascending });
  const { cursor, limit } = params;
  if (cursor?.s === "newest") {
    const t = quoteOrValue(cursor.t);
    q = q.or(`created_at.lt.${t},and(created_at.eq.${t},id.lt.${cursor.id})`);
    q = q.limit(limit + 1);
  } else if (cursor) {
    q = q.range(cursor.o, cursor.o + limit);
  } else {
    q = q.limit(limit + 1);
  }
  return q;
}

/** rows 是 limit+1 查询结果;返回裁到 limit 的页与 next_cursor */
export function paginateCarRows<T extends { id: string; created_at: string }>(
  rows: T[],
  params: CarPageParams,
): { page: T[]; next_cursor: string | null } {
  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;
  if (!hasMore || page.length === 0) return { page, next_cursor: null };
  const last = page[page.length - 1];
  const cursor: CarCursor =
    params.sort === "newest"
      ? { s: "newest", t: last.created_at, id: last.id }
      : { s: params.sort, o: (params.cursor && "o" in params.cursor ? params.cursor.o : 0) + params.limit };
  return { page, next_cursor: encodeCursor(cursor) };
}

/** 通用 offset 游标(门店列表等小表用) */
export function parseOffsetCursor(sp: URLSearchParams): { offset: number; error: ApiErrorDetail | null } {
  const raw = sp.get("cursor");
  if (!raw) return { offset: 0, error: null };
  const decoded = decodeCursor<{ o?: unknown }>(raw);
  const o = decoded?.o;
  if (typeof o !== "number" || !Number.isInteger(o) || o < 0) {
    return { offset: 0, error: { field: "cursor", issue: "invalid cursor" } };
  }
  return { offset: o, error: null };
}

export function offsetCursor(offset: number): string {
  return encodeCursor({ o: offset });
}

/**
 * 分批把一个查询的全部行拉下来(PostgREST 单次最多 max-rows,默认 1000),
 * 上限 maxRows。build 每次都要返回一个新的 builder(builder 不可复用)。
 */
export async function collectRows<T>(
  build: () => CarFilterQuery,
  maxRows: number,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize, maxRows) - 1;
    const res = (await (build().range(from, to) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>));
    if (res.error) throw new Error(res.error.message);
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < to - from + 1) break;
  }
  return out;
}
