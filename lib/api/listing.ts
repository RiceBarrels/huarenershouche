// Public API 库存写入核心(docs/public-api-v0.md §4.2/§4.3、待定 2/3):
// 请求体 schema、定位解析、cars 行组装、幂等 upsert / 下架 / 对账、库存序列化。
// 路由层只做 HTTP 进出;这里的每个写操作自己扣配额(consumeQuota),超限不写库。
// 文本只写原文列(description_original / features_original,任意语言原样保存)和确定性标题,
// 翻译与兼容投影归 i18n 管线。Server-only(ctx.supabase 为 service role)。

import { z } from "zod";
import { after, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { DbCar, DbDealerStore } from "@/lib/types";
import { SITE_URL } from "@/lib/seo-pages";
import { MAKES } from "@/lib/mock-data";
import { isValidVinFormat } from "@/lib/vin";
import { geocodeCity, geocodeZipToCoords, lookupZip } from "@/lib/geocode";
import { buildCarTitles } from "@/lib/i18n/car-title";
import { legacyOriginal } from "@/lib/i18n/content/resolve";
import { getBundles } from "@/lib/i18n/content/server";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { CITY_ZH, isRelistBlocked, originalColumns, sameOriginal, sameTagSet } from "@/lib/sources/sync";
import { deleteMirroredImages, isMirroredUrl } from "@/lib/sources/images";
import type { ApiContext, ApiErrorDetail, ApiLang, QuotaInfo } from "./types";
import { LISTING_MAX_IMAGES } from "./types";
import { enumField, enumSlugs, enumToDb, enumToSlug } from "./enums";
import { apiError } from "./response";
import { recordUsage } from "./auth";
import { consumeQuota, getQuota, quotaExceededResponse } from "./quota";
import { processListingAsync, processingSteps, type ListingTask, type ProcessOptions } from "./process";

// ─── Schema ─────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/** 品牌大小写归一:与 MAKES 表大小写不敏感命中则用表里的写法(honda → Honda) */
function canonicalMake(raw: string): string {
  const lower = raw.toLowerCase();
  return (MAKES as readonly string[]).find((m) => m.toLowerCase() === lower) ?? raw;
}

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url({ message: "must be a valid URL" })
  .refine((u) => u.startsWith("https://"), { message: "must be an https URL" });

const enumSlug = (kind: "fuel_type" | "transmission" | "drivetrain") =>
  z
    .string()
    .trim()
    .refine((s) => enumToDb(kind, s) != null, {
      message: `must be one of: ${enumSlugs(kind).join(", ")}`,
    });

/** 可选字符串:空串/空白视为 null */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const listingSchema = z.object({
  external_id: z.string().trim().min(1).max(64),
  vin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine(isValidVinFormat, { message: "must be a 17-character VIN (no I/O/Q)" }),
  year: z.number().int().min(1980).max(CURRENT_YEAR + 1),
  make: z.string().trim().min(1).max(40).transform(canonicalMake),
  model: z.string().trim().min(1).max(60),
  trim: optionalText(60),
  /** 整数美元;0 = 电议 */
  price: z.number().int().min(0),
  original_price: z.number().int().min(0).nullish(),
  mileage: z.number().int().min(0),
  fuel_type: enumSlug("fuel_type"),
  transmission: enumSlug("transmission"),
  drivetrain: enumSlug("drivetrain").nullish(),
  exterior_color: optionalText(30),
  interior_color: optionalText(30),
  /** 任一语言,原样保存为原文;其他语言由 i18n 管线自动翻译 */
  description: optionalText(5000),
  /** 已弃用:接受但忽略(原文语言由管线自动检测) */
  description_lang: z.enum(["zh", "en", "ko", "ja", "es", "fr"]).nullish(),
  features: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
  images: z.array(httpsUrl).max(LISTING_MAX_IMAGES).default([]),
  carfax_url: httpsUrl.nullish(),
  store_id: z.string().uuid().nullish(),
  /** 个人档必填:"City, ST" 或 5 位 zip;车行省略则跟随门店 */
  location: optionalText(80),
});

export type ListingInput = z.infer<typeof listingSchema>;

export function formatZodError(err: z.ZodError): ApiErrorDetail[] {
  return err.issues.map((i) => ({ field: i.path.join(".") || "body", issue: i.message }));
}

export function validationResponse(details: ApiErrorDetail[]): NextResponse {
  return apiError(400, "validation_failed", "Request body failed validation", details);
}

/** 路由层统一出口:4xx/5xx 计入该 key 当日 errors(记录失败不影响响应) */
export async function finalize(ctx: ApiContext | null, res: NextResponse): Promise<NextResponse> {
  if (ctx && res.status >= 400) {
    try {
      await recordUsage(ctx, { errors: 1 });
    } catch {
      /* 用量记录失败不影响响应 */
    }
  }
  return res;
}

/** 读 JSON body;非法 JSON 返回 null */
export async function readJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// ─── Location ───────────────────────────────────────────────────────

export interface ResolvedLocation {
  location: string;
  location_zh: string;
  lat: number | null;
  lng: number | null;
}

function cityZh(city: string | null, state: string | null, fallback: string): string {
  if (city && state && CITY_ZH[city]) return `${CITY_ZH[city]}, ${state}`;
  return fallback;
}

/** 与 lib/sources/sync.ts loadStoreLocation 同一套门店地址 → "City, ST" 解析 */
function storeLocation(store: DbDealerStore): ResolvedLocation {
  const m = store.address.match(/,\s*([^,]+),\s*([A-Z]{2})\b/);
  const city = m?.[1]?.trim() ?? null;
  const state = m?.[2] ?? null;
  const location = city && state ? `${city}, ${state}` : store.address;
  return { location, location_zh: cityZh(city, state, location), lat: store.lat ?? null, lng: store.lng ?? null };
}

/**
 * 车行:门店地址(store_id 指定或第一家已认证门店);个人 / 车行显式传 location:
 * 5 位 zip → 反查城市 + 坐标;否则按 "City, ST" 文本 geocode。地理编码失败只丢坐标,不报错。
 */
export async function resolveLocation(
  ctx: ApiContext,
  input: ListingInput,
): Promise<ResolvedLocation | { error: ApiErrorDetail }> {
  if (input.store_id) {
    const store = ctx.stores.find((s) => s.id === input.store_id);
    if (!store) return { error: { field: "store_id", issue: "not one of your verified stores" } };
    if (!input.location) return storeLocation(store);
  }
  if (!input.location && ctx.tier === "dealer" && ctx.stores.length > 0) {
    return storeLocation(ctx.stores[0]);
  }

  const raw = input.location?.trim();
  if (!raw) {
    return {
      error: {
        field: "location",
        issue: ctx.tier === "dealer" ? "required when no verified store" : 'required ("City, ST" or 5-digit zip)',
      },
    };
  }

  if (/^\d{5}$/.test(raw)) {
    const [coords, geo] = await Promise.all([geocodeZipToCoords(raw), lookupZip(raw).catch(() => null)]);
    const city = geo?.city?.trim() || null;
    const state = geo?.stateCode?.trim().toUpperCase() || null;
    if (!coords && !city) return { error: { field: "location", issue: "unrecognized US zip code" } };
    const location = city && state ? `${city}, ${state}` : raw;
    return { location, location_zh: cityZh(city, state, location), lat: coords?.lat ?? null, lng: coords?.lng ?? null };
  }

  const text = raw.replace(/\s+/g, " ");
  const m = text.match(/^(.+?),\s*([A-Za-z]{2})$/);
  const city = m ? m[1].trim() : null;
  const state = m ? m[2].toUpperCase() : null;
  const location = city && state ? `${city}, ${state}` : text;
  const coords = await geocodeCity(location);
  return { location, location_zh: cityZh(city, state, location), lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

// ─── Row assembly ───────────────────────────────────────────────────

/**
 * cars 行:标题确定性生成(buildCarTitles,与 SQL i18n.car_title 一致);描述 / 标签原样写原文列,
 * 从不写 description / description_zh / features(管线维护的兼容投影)。
 * legacy = 库里还没有原文列(i18n-v2.sql 未执行),原文退回旧列(见 originalColumns)。
 */
export function buildCarRow(
  ctx: ApiContext,
  input: ListingInput,
  loc: ResolvedLocation,
  legacy: boolean,
): Record<string, unknown> {
  const owner = ctx.owner!;
  const now = new Date().toISOString();
  return {
    seller_id: owner.id,
    ...buildCarTitles(input),
    year: input.year,
    make: input.make,
    model: input.model,
    trim: input.trim ?? null,
    price: input.price,
    original_price: input.original_price ?? null,
    mileage: input.mileage,
    location: loc.location,
    location_zh: loc.location_zh,
    lat: loc.lat,
    lng: loc.lng,
    fuel_type: enumToDb("fuel_type", input.fuel_type),
    transmission: enumToDb("transmission", input.transmission),
    drivetrain: enumToDb("drivetrain", input.drivetrain),
    exterior_color: input.exterior_color ?? null,
    interior_color: input.interior_color ?? null,
    vin: input.vin,
    ...originalColumns(input.description ?? null, input.features, legacy),
    images: input.images,
    image_url: input.images[0] ?? null,
    carfax_url: input.carfax_url ?? null,
    seller_name: owner.username,
    phone: owner.phone,
    status: "active",
    external_id: input.external_id,
    api_key_id: ctx.key?.id ?? null,
    last_seen_at: now,
  };
}

// ─── Upsert ─────────────────────────────────────────────────────────

/** 已有记录;原文 / 标签已按库结构归一(见 findExisting) */
interface ExistingCar {
  id: string;
  external_id: string | null;
  status: string;
  price: number;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  images: string[] | null;
  source_images: string[] | null;
  /** 当前原文(旧库按 legacyOriginal 从 description / description_zh 推出) */
  original: string | null;
  /** 当前标签原文(旧库为 features) */
  features: string[];
  removal_reason: DbCar["removal_reason"];
}

/** 两套列集查回来的原始行(各只有其中一部分可选列) */
interface ExistingRow {
  id: string;
  external_id: string | null;
  status: string;
  price: number;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  images: string[] | null;
  source_images: string[] | null;
  description_original?: string | null;
  features_original?: string[] | null;
  removal_reason?: DbCar["removal_reason"];
  source_id?: string | null;
  api_key_id?: string | null;
  description?: string | null;
  description_zh?: string | null;
  features?: string[] | null;
}

const BASE_EXISTING_COLS = "id, external_id, status, price, vin, year, make, model, trim, images, source_images";
const EXISTING_COLS = `${BASE_EXISTING_COLS}, description_original, features_original, removal_reason`;
/** supabase/i18n-v2.sql 执行前的列集(没有原文列与 removal_reason) */
const LEGACY_EXISTING_COLS = `${BASE_EXISTING_COLS}, source_id, api_key_id, description, description_zh, features`;

function toExistingCar(row: ExistingRow, legacy: boolean): ExistingCar {
  return {
    id: row.id,
    external_id: row.external_id,
    status: row.status,
    price: row.price,
    vin: row.vin,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    images: row.images,
    source_images: row.source_images,
    original: legacy ? legacyOriginal(row) : (row.description_original ?? null),
    features: (legacy ? row.features : row.features_original) ?? [],
    removal_reason: row.removal_reason ?? null,
  };
}

/**
 * 查一条已有记录:先按 v2 列查,库里还没有原文列(i18n-v2.sql 未执行)时用旧列集重查并返回
 * legacy=true(本次写入也走旧列)。build 每次都要返回新的 builder(builder 不可复用)。
 */
async function findExisting(
  build: (cols: string) => PromiseLike<{ data: unknown; error: PostgrestError | null }>,
  legacy: boolean,
  what: string,
): Promise<{ car: ExistingCar | null; legacy: boolean }> {
  const first = (data: unknown) => ((data as ExistingRow[] | null) ?? [])[0];
  if (!legacy) {
    const { data, error } = await build(EXISTING_COLS);
    if (!error) {
      const row = first(data);
      return { car: row ? toExistingCar(row, false) : null, legacy: false };
    }
    if (!isMissingColumnError(error)) throw new Error(`${what}: ${error.message}`);
  }
  const { data, error } = await build(LEGACY_EXISTING_COLS);
  if (error) throw new Error(`${what}: ${error.message}`);
  const row = first(data);
  return { car: row ? toExistingCar(row, true) : null, legacy: true };
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** 重复 PUT 相对库里已有记录,哪些文本变了 */
export interface ListingTextChanges {
  /** 描述原文(首尾空白不算) */
  description: boolean;
  /** 标签集合(顺序无关、大小写敏感) */
  features: boolean;
  /** 年份 / 品牌 / 车型 / 配置:确定性标题由它们生成,品牌 / 车型 / 配置是自由文本 */
  title: boolean;
  /** 以上任一变了 → 重新审核(送审文本 = 品牌 / 车型 / 配置 + 描述 + 标签;年份随标题一并算) */
  moderate: boolean;
}

export function listingTextChanges(
  existing: Pick<ExistingCar, "original" | "features" | "year" | "make" | "model" | "trim">,
  input: Pick<ListingInput, "description" | "features" | "year" | "make" | "model" | "trim">,
): ListingTextChanges {
  const description = !sameOriginal(input.description, existing.original);
  const features = !sameTagSet(input.features, existing.features);
  const title =
    input.year !== existing.year ||
    input.make !== existing.make ||
    input.model !== existing.model ||
    (input.trim ?? null) !== (existing.trim ?? null);
  return { description, features, title, moderate: description || features || title };
}

export interface UpsertOptions {
  /** 同 VIN 手动帖存在时接管(?adopt=true) */
  adopt?: boolean;
  /** 请求开始时间:后台处理截止 startedAt + 55 s(缺省为调用时刻) */
  startedAt?: number;
  /** true:不在这里排 after(),把后台任务放进结果的 deferred,由调用方整批执行(batch) */
  deferProcessing?: boolean;
}

export type UpsertResult =
  | {
      ok: true;
      id: string;
      created: boolean;
      status: string;
      processing: string[];
      quota: QuotaInfo;
      /** deferProcessing 时留给调用方的后台任务;没有后台步骤(或已在这里排好)为 null */
      deferred: ListingTask | null;
    }
  | { ok: false; response: NextResponse };

/** 有后台步骤才排:deferProcessing 时交给调用方,否则这里直接排 after()(单车处理链) */
function scheduleTask(task: ListingTask, opts: UpsertOptions, startedAt: number): ListingTask | null {
  if (processingSteps(task.opts).length === 0 && !task.clearMirrors) return null;
  if (opts.deferProcessing) return task;
  after(() => processListingAsync(task.carId, task.opts, { startedAt, clearMirrors: task.clearMirrors }));
  return null;
}

/**
 * 幂等 upsert(PUT /inventory/{external_id}):
 * 1. 按 (seller_id, external_id) 找;没有 → 查同 seller 同 VIN 未 removed 的车:
 *    手动帖(无 external_id)且 ?adopt=true → 接管;否则 409 附 existing_id。
 *    审核 / 管理员下架的车(removal_reason moderation / admin)→ 409 listing_blocked。
 * 2. 校验通过后才扣配额(新建 insert / 其余 update),超限 429 不写库。
 * 3. 更新:removed(removal_reason 为空或 other)/ sold 的车被显式 PUT 视为重新上架
 *    (pending 保持);价格变动记 price_updated_at;原文 / 标签没变就不写原文列
 *    (同一哈希,不会重新翻译,B12),再加上年份 / 品牌 / 车型 / 配置也没变就不重新审核
 *    (listingTextChanges);图片列表与 source_images 不同才重置为原始外链并重新转存。
 * 4. after():VIN 核对 / 转存 / 审核 / 翻译(见 lib/api/process.ts);batch 用 deferProcessing 整批排一次。
 */
export async function upsertListing(
  ctx: ApiContext,
  input: ListingInput,
  opts: UpsertOptions = {},
): Promise<UpsertResult> {
  const startedAt = opts.startedAt ?? Date.now();
  const { supabase } = ctx;
  const ownerId = ctx.owner!.id;

  // 1. 已有记录(同时确定库结构:legacy = 还没有原文列)
  const byExt = await findExisting(
    (cols) => supabase.from("cars").select(cols).eq("seller_id", ownerId).eq("external_id", input.external_id).limit(1),
    false,
    "find by external_id",
  );
  const legacy = byExt.legacy;
  let existing = byExt.car;

  // PUT 会把 removed 的车改回在售:审核 / 管理员下架的不允许(B10)。cars_before 触发器对
  // service 写入是静默保持下架,这里提前拦下给出明确错误
  if (existing?.status === "removed" && isRelistBlocked(existing.removal_reason)) {
    return {
      ok: false,
      response: apiError(
        409,
        "listing_blocked",
        "This listing was removed by moderation or an administrator and can't be relisted.",
      ),
    };
  }

  // 2. 同 seller 同 VIN 去重(待定 2)
  if (!existing) {
    const { car: dup } = await findExisting(
      (cols) =>
        supabase
          .from("cars")
          .select(cols)
          .eq("seller_id", ownerId)
          .eq("vin", input.vin)
          .neq("status", "removed")
          .order("created_at", { ascending: false })
          .limit(1),
      legacy,
      "vin lookup",
    );
    if (dup) {
      if (dup.external_id && dup.external_id !== input.external_id) {
        return {
          ok: false,
          response: apiError(
            409,
            "conflict",
            `VIN ${input.vin} is already listed under external_id "${dup.external_id}"`,
            undefined,
            { existing_id: dup.id, existing_external_id: dup.external_id },
          ),
        };
      }
      if (!dup.external_id && !opts.adopt) {
        return {
          ok: false,
          response: apiError(
            409,
            "conflict",
            `VIN ${input.vin} already exists as a manually posted listing. Re-send this PUT with ?adopt=true to attach external_id "${input.external_id}" to it.`,
            undefined,
            { existing_id: dup.id },
          ),
        };
      }
      // 接管手动帖
      existing = dup;
    }
  }

  // 定位(校验类错误在扣配额之前返回)
  const loc = await resolveLocation(ctx, input);
  if ("error" in loc) return { ok: false, response: validationResponse([loc.error]) };

  // 3. 配额
  const created = !existing;
  const q = await consumeQuota(ctx, created ? "insert" : "update");
  if (!q.ok) return { ok: false, response: quotaExceededResponse(q.quota) };

  const row = buildCarRow(ctx, input, loc, legacy);
  const now = new Date().toISOString();

  // 4a. 新建
  if (!existing) {
    const { data: inserted, error } = await supabase
      .from("cars")
      .insert({ ...row, source_images: input.images })
      .select("id")
      .single();
    if (error) {
      // 并发同 external_id 撞唯一索引
      if (error.code === "23505") {
        return {
          ok: false,
          response: apiError(409, "conflict", `external_id "${input.external_id}" was created concurrently; retry`),
        };
      }
      throw new Error(`insert: ${error.message}`);
    }
    const id = inserted.id as string;
    // 审核看标题 + 标签 + 描述;只有描述需要翻译(标签走术语表)
    const proc: ProcessOptions = {
      verifyVin: true,
      moderate: true,
      translate: !!input.description,
      mirrorImages: input.images.length > 0,
    };
    const deferred = scheduleTask({ carId: id, opts: proc, clearMirrors: false }, opts, startedAt);
    return {
      ok: true,
      id,
      created: true,
      status: "active",
      processing: processingSteps(proc),
      quota: q.quota,
      deferred,
    };
  }

  // 4b. 更新
  const update: Record<string, unknown> = { ...row };
  const status = existing.status === "pending" ? "pending" : "active";
  update.status = status;
  if (input.price !== existing.price) update.price_updated_at = now;

  // 原文 / 标签(顺序无关、大小写敏感)都没变 → 不写原文列(buildCarRow 经 originalColumns 加进来的那几列):
  // 同一哈希,不会重新翻译(B12)
  const changed = listingTextChanges(existing, input);
  if (!changed.description && !changed.features) {
    for (const col of Object.keys(originalColumns(null, [], legacy))) delete update[col];
  }

  // 图片:原始列表没变且已转存 → 不动;否则重置为外链并排队转存
  const alreadyMirrored = (existing.images ?? []).some(isMirroredUrl);
  const sourceChanged = !sameArray(input.images, existing.source_images ?? []);
  const needMirror = input.images.length > 0 && (sourceChanged || !alreadyMirrored);
  if (sourceChanged) {
    update.source_images = input.images;
  } else {
    delete update.images;
    delete update.image_url;
  }

  const { error: upErr } = await supabase.from("cars").update(update).eq("id", existing.id);
  if (upErr) throw new Error(`update: ${upErr.message}`);

  const id = existing.id;
  // 描述、标签或年份 / 品牌 / 车型 / 配置任一变了才重新审核(结论按送审文本的哈希缓存,没变的直接复用);
  // 只有描述要翻译(标签走术语表)
  const proc: ProcessOptions = {
    verifyVin: existing.vin !== input.vin,
    moderate: changed.moderate,
    translate: changed.description && !!input.description,
    mirrorImages: needMirror,
  };
  // 换图:先清旧转存文件(新列表可能更短,避免孤儿文件)
  const clearMirrors = alreadyMirrored && sourceChanged;
  const deferred = scheduleTask({ carId: id, opts: proc, clearMirrors }, opts, startedAt);
  return { ok: true, id, created: false, status, processing: processingSteps(proc), quota: q.quota, deferred };
}

// ─── Remove ─────────────────────────────────────────────────────────

export type RemoveResult =
  | { ok: true; id: string; status: "sold" | "removed"; quota: QuotaInfo }
  | { ok: false; response: NextResponse };

/**
 * DELETE /inventory/{external_id}:sold(默认)或 removed。
 * removed 时 images 回退原始外链并删除我方转存文件(与 cleanupRemovedMirrors 同一做法)。
 */
export async function removeListing(
  ctx: ApiContext,
  externalId: string,
  reason: "sold" | "removed",
): Promise<RemoveResult> {
  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("cars")
    .select("id, status, images, source_images")
    .eq("seller_id", ctx.owner!.id)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw new Error(`find: ${error.message}`);
  if (!data) return { ok: false, response: apiError(404, "not_found", `No listing with external_id "${externalId}"`) };

  const q = await consumeQuota(ctx, "update");
  if (!q.ok) return { ok: false, response: quotaExceededResponse(q.quota) };

  const car = data as { id: string; status: string; images: string[] | null; source_images: string[] | null };
  const update: Record<string, unknown> = { status: reason };
  const hasMirrored = (car.images ?? []).some(isMirroredUrl);
  if (reason === "removed" && hasMirrored) {
    const fallback = car.source_images ?? [];
    update.images = fallback;
    update.image_url = fallback[0] ?? null;
  }
  const { error: upErr } = await supabase.from("cars").update(update).eq("id", car.id);
  if (upErr) throw new Error(`update: ${upErr.message}`);

  if (reason === "removed" && hasMirrored) {
    after(async () => {
      try {
        await deleteMirroredImages(supabase, car.id);
      } catch (err) {
        console.error(`[api/v1:process] ${car.id} delete mirrors: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }
  return { ok: true, id: car.id, status: reason, quota: q.quota };
}

// ─── Reconcile ──────────────────────────────────────────────────────

export interface ReconcileItem {
  id: string;
  external_id: string;
  ok: boolean;
  error?: string;
}

export interface ReconcileResult {
  dryRun: boolean;
  items: ReconcileItem[];
  quota: QuotaInfo;
}

/**
 * POST /inventory/reconcile:在售且带 external_id、但不在 activeIds 里的车 → removed。
 * 逐条扣配额;首次超限即停止,其余条目标记 quota_exceeded(已下架的不回滚)。
 */
export async function reconcileInventory(
  ctx: ApiContext,
  activeIds: string[],
  dryRun: boolean,
): Promise<ReconcileResult> {
  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("cars")
    .select("id, external_id")
    .eq("seller_id", ctx.owner!.id)
    .eq("status", "active")
    .not("external_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`list active: ${error.message}`);

  const keep = new Set(activeIds.map((s) => s.trim()));
  const stale = ((data ?? []) as { id: string; external_id: string }[]).filter((c) => !keep.has(c.external_id));

  if (dryRun) {
    return {
      dryRun: true,
      items: stale.map((c) => ({ id: c.id, external_id: c.external_id, ok: true })),
      quota: await getQuota(ctx),
    };
  }

  const items: ReconcileItem[] = [];
  let quota: QuotaInfo | null = null;
  let quotaHit = false;
  for (const c of stale) {
    if (quotaHit) {
      items.push({ id: c.id, external_id: c.external_id, ok: false, error: "quota_exceeded" });
      continue;
    }
    const q = await consumeQuota(ctx, "update");
    quota = q.quota;
    if (!q.ok) {
      quotaHit = true;
      items.push({ id: c.id, external_id: c.external_id, ok: false, error: "quota_exceeded" });
      continue;
    }
    const { error: upErr } = await supabase.from("cars").update({ status: "removed" }).eq("id", c.id);
    items.push(
      upErr
        ? { id: c.id, external_id: c.external_id, ok: false, error: upErr.message }
        : { id: c.id, external_id: c.external_id, ok: true },
    );
  }
  return { dryRun: false, items, quota: quota ?? (await getQuota(ctx)) };
}

// ─── Serialize ──────────────────────────────────────────────────────

/** 库存列(都是 i18n-v2.sql 之前就有的列:不做缺列重试的单条查询也安全) */
const INVENTORY_FIELDS = [
  "id",
  "external_id",
  "status",
  "title",
  "title_zh",
  "year",
  "make",
  "model",
  "trim",
  "price",
  "mileage",
  "vin",
  "images",
  "image_url",
  "fuel_type",
  "transmission",
  "drivetrain",
  "location",
  "location_zh",
  "created_at",
  "updated_at",
  "expires_at",
] as const satisfies readonly (keyof DbCar)[];

export const INVENTORY_COLS = INVENTORY_FIELDS.join(", ");
/** 再加内容时钟 content_updated_at(i18n-v2.sql);查询遇到缺列错误时退回 INVENTORY_COLS 重试 */
export const INVENTORY_COLS_V2 = [...INVENTORY_FIELDS, "content_updated_at" satisfies keyof DbCar].join(", ");

/** content_updated_at 只有按 INVENTORY_COLS_V2 查才有 */
export type InventoryCar = Pick<DbCar, (typeof INVENTORY_FIELDS)[number] | "content_updated_at">;

export interface InventoryItem {
  id: string;
  external_id: string | null;
  url: string;
  status: string | null;
  title: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: number;
  mileage: number;
  vin: string | null;
  images: string[];
  image_url: string | null;
  fuel_type: { value: string | null; label: string | null };
  transmission: { value: string | null; label: string | null };
  drivetrain: { value: string | null; label: string | null };
  location: string;
  created_at: string;
  /** 可见内容最后一次变化(content_updated_at;没查到该列时为 updated_at) */
  updated_at: string;
  expires_at: string | null;
  /**
   * 仍在后台处理的步骤:images_pending(还有未转存的外链图)/ translation_pending
   * (描述的中文或英文译文还没生成);空数组 = 就绪
   */
  processing_state: string[];
}

export function listingUrl(id: string): string {
  return `${SITE_URL}/zh/car/${id}`;
}

/** translationPending:见 loadTranslationPending;调用方没查 bundle 时缺省 false */
export function serializeInventoryItem(car: InventoryCar, lang: ApiLang, translationPending = false): InventoryItem {
  const images = car.images ?? [];
  const processing: string[] = [];
  if (images.some((u) => !isMirroredUrl(u))) processing.push("images_pending");
  if (translationPending) processing.push("translation_pending");
  return {
    id: car.id,
    external_id: car.external_id ?? null,
    url: listingUrl(car.id),
    status: enumToSlug("status", car.status),
    title: lang === "zh" ? car.title_zh || car.title : car.title || car.title_zh,
    year: car.year,
    make: car.make,
    model: car.model,
    trim: car.trim ?? null,
    price: car.price,
    mileage: car.mileage,
    vin: car.vin ?? null,
    images,
    image_url: car.image_url ?? null,
    fuel_type: enumField("fuel_type", car.fuel_type, lang),
    transmission: enumField("transmission", car.transmission, lang),
    drivetrain: enumField("drivetrain", car.drivetrain, lang),
    location: lang === "zh" ? car.location_zh || car.location : car.location,
    created_at: car.created_at,
    updated_at: car.content_updated_at ?? car.updated_at,
    expires_at: car.expires_at ?? null,
    processing_state: processing,
  };
}

/**
 * translation_pending 判定:按页各查一次 zh / en 的 i18n_bundle(只含公开车源;RPC 不可用时为空),
 * 任一语言为 pending 的车返回在集合里。
 */
export async function loadTranslationPending(ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const [zh, en] = await Promise.all([getBundles("car", ids, "zh"), getBundles("car", ids, "en")]);
  const pending = (id: string) => zh[id.toLowerCase()]?.s === "pending" || en[id.toLowerCase()]?.s === "pending";
  return new Set(ids.filter(pending));
}
