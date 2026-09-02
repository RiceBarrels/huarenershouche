// Public API 库存写入核心(docs/public-api-v0.md §4.2/§4.3、待定 2/3):
// 请求体 schema、定位解析、cars 行组装、幂等 upsert / 下架 / 对账、库存序列化。
// 路由层只做 HTTP 进出;这里的每个写操作自己扣配额(consumeQuota),超限不写库。
// Server-only(ctx.supabase 为 service role)。

import { z } from "zod";
import { after, type NextResponse } from "next/server";
import type { DbCar, DbDealerStore } from "@/lib/types";
import { SITE_URL } from "@/lib/seo-pages";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { isValidVinFormat } from "@/lib/vin";
import { geocodeCity, geocodeZipToCoords, lookupZip } from "@/lib/geocode";
import { CITY_ZH } from "@/lib/sources/sync";
import { deleteMirroredImages, isMirroredUrl } from "@/lib/sources/images";
import type { ApiContext, ApiErrorDetail, ApiLang, QuotaInfo } from "./types";
import { LISTING_EXPIRY_DAYS, LISTING_MAX_IMAGES } from "./types";
import { enumField, enumSlugs, enumToDb, enumToSlug } from "./enums";
import { apiError } from "./response";
import { recordUsage } from "./auth";
import { consumeQuota, getQuota, quotaExceededResponse } from "./quota";
import { processListingAsync, processingSteps, type ProcessOptions } from "./process";

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
  description: optionalText(5000),
  description_lang: z.enum(["zh", "en"]).nullish(),
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

function expiresAt(): string {
  return new Date(Date.now() + LISTING_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** 与发帖页相同的标题规则 */
export function buildTitles(input: Pick<ListingInput, "year" | "make" | "model" | "trim">): {
  title: string;
  title_zh: string;
} {
  const tail = `${input.model}${input.trim ? " " + input.trim : ""}`;
  return {
    title: `${input.year} ${input.make} ${tail}`,
    title_zh: `${input.year} ${MAKES_ZH[input.make] ?? input.make} ${tail}`,
  };
}

/** 描述按 description_lang 落列(未声明 → 有中文字符算 zh),另一列留空由翻译补 */
function descriptionColumns(input: ListingInput): { description: string | null; description_zh: string | null } {
  if (!input.description) return { description: null, description_zh: null };
  const lang = input.description_lang ?? (/[一-鿿]/.test(input.description) ? "zh" : "en");
  return lang === "zh"
    ? { description: null, description_zh: input.description }
    : { description: input.description, description_zh: null };
}

export function buildCarRow(ctx: ApiContext, input: ListingInput, loc: ResolvedLocation): Record<string, unknown> {
  const owner = ctx.owner!;
  const now = new Date().toISOString();
  return {
    seller_id: owner.id,
    ...buildTitles(input),
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
    ...descriptionColumns(input),
    features: input.features,
    images: input.images,
    image_url: input.images[0] ?? null,
    carfax_url: input.carfax_url ?? null,
    seller_name: owner.username,
    phone: owner.phone,
    status: "active",
    expires_at: expiresAt(),
    external_id: input.external_id,
    api_key_id: ctx.key?.id ?? null,
    last_seen_at: now,
  };
}

// ─── Upsert ─────────────────────────────────────────────────────────

interface ExistingCar {
  id: string;
  external_id: string | null;
  status: string;
  price: number;
  vin: string | null;
  description: string | null;
  description_zh: string | null;
  features: string[] | null;
  images: string[] | null;
  source_images: string[] | null;
}

const EXISTING_COLS = "id, external_id, status, price, vin, description, description_zh, features, images, source_images";

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** 输入标签是否都已在库里(库里是双语超集,只能单向比) */
function featuresCovered(input: string[], stored: string[]): boolean {
  const have = new Set(stored.map((s) => s.trim().toLowerCase()));
  return input.every((f) => have.has(f.trim().toLowerCase()));
}

export type UpsertResult =
  | { ok: true; id: string; created: boolean; status: string; processing: string[]; quota: QuotaInfo }
  | { ok: false; response: NextResponse };

/**
 * 幂等 upsert(PUT /inventory/{external_id}):
 * 1. 按 (seller_id, external_id) 找;没有 → 查同 seller 同 VIN 未 removed 的车:
 *    手动帖(无 external_id)且 ?adopt=true → 接管;否则 409 附 existing_id。
 * 2. 校验通过后才扣配额(新建 insert / 其余 update),超限 429 不写库。
 * 3. 更新:每次 PUT 刷新 expires_at;removed / sold 的车被显式 PUT 视为重新上架
 *    (pending 保持);价格变动记 price_updated_at;图片列表与 source_images 不同
 *    才重置为原始外链并重新转存,否则不动已转存的图。
 * 4. after():VIN 核对 / AI 审核 / 翻译 / 转存(见 lib/api/process.ts)。
 */
export async function upsertListing(
  ctx: ApiContext,
  input: ListingInput,
  opts: { adopt?: boolean } = {},
): Promise<UpsertResult> {
  const { supabase } = ctx;
  const ownerId = ctx.owner!.id;

  // 1. 已有记录
  const { data: byExt, error: findErr } = await supabase
    .from("cars")
    .select(EXISTING_COLS)
    .eq("seller_id", ownerId)
    .eq("external_id", input.external_id)
    .maybeSingle();
  if (findErr) throw new Error(`find by external_id: ${findErr.message}`);
  let existing = (byExt as ExistingCar | null) ?? null;

  // 2. 同 seller 同 VIN 去重(待定 2)
  if (!existing) {
    const { data: dups, error: dupErr } = await supabase
      .from("cars")
      .select(EXISTING_COLS)
      .eq("seller_id", ownerId)
      .eq("vin", input.vin)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(1);
    if (dupErr) throw new Error(`vin lookup: ${dupErr.message}`);
    const dup = (dups?.[0] as ExistingCar | undefined) ?? null;
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

  const row = buildCarRow(ctx, input, loc);
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
    const proc: ProcessOptions = {
      verifyVin: true,
      moderate: true,
      translate: true,
      mirrorImages: input.images.length > 0,
    };
    after(() => processListingAsync(id, proc));
    return { ok: true, id, created: true, status: "active", processing: processingSteps(proc), quota: q.quota };
  }

  // 4b. 更新
  const update: Record<string, unknown> = { ...row };
  const status = existing.status === "pending" ? "pending" : "active";
  update.status = status;
  if (input.price !== existing.price) update.price_updated_at = now;

  // 描述 / 标签是否变了:变了就重写(另一语言列清空待译),没变则保留库里已翻译好的
  const incoming = descriptionColumns(input);
  const storedSource = incoming.description_zh != null ? existing.description_zh : existing.description;
  const incomingSource = incoming.description_zh ?? incoming.description;
  const descChanged = (incomingSource ?? null) !== (storedSource ?? null);
  const featuresChanged = !featuresCovered(input.features, existing.features ?? []);
  const contentChanged = descChanged || featuresChanged;
  const counterpartMissing =
    !!incomingSource && (incoming.description_zh != null ? !existing.description : !existing.description_zh);
  if (!contentChanged) {
    delete update.description;
    delete update.description_zh;
    delete update.features;
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
  const proc: ProcessOptions = {
    verifyVin: existing.vin !== input.vin,
    moderate: contentChanged,
    translate: contentChanged || counterpartMissing,
    mirrorImages: needMirror,
  };
  const clearOld = alreadyMirrored && sourceChanged;
  if (processingSteps(proc).length > 0 || clearOld) {
    after(async () => {
      // 换图:先清旧转存文件(新列表可能更短,避免孤儿文件)
      if (clearOld) {
        try {
          await deleteMirroredImages(supabase, id);
        } catch (err) {
          console.error(`[api/v1:process] ${id} clear old mirrors: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      await processListingAsync(id, proc);
    });
  }
  return { ok: true, id, created: false, status, processing: processingSteps(proc), quota: q.quota };
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

export const INVENTORY_COLS =
  "id, external_id, status, title, title_zh, year, make, model, trim, price, mileage, vin, images, image_url, " +
  "fuel_type, transmission, drivetrain, location, location_zh, description, description_zh, created_at, updated_at, expires_at";

export type InventoryCar = Pick<
  DbCar,
  | "id"
  | "external_id"
  | "status"
  | "title"
  | "title_zh"
  | "year"
  | "make"
  | "model"
  | "trim"
  | "price"
  | "mileage"
  | "vin"
  | "images"
  | "image_url"
  | "fuel_type"
  | "transmission"
  | "drivetrain"
  | "location"
  | "location_zh"
  | "description"
  | "description_zh"
  | "created_at"
  | "updated_at"
  | "expires_at"
>;

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
  updated_at: string;
  expires_at: string | null;
  /** 仍在后台处理的步骤:images_pending / translation_pending;空数组 = 就绪 */
  processing_state: string[];
}

export function listingUrl(id: string): string {
  return `${SITE_URL}/zh/car/${id}`;
}

export function serializeInventoryItem(car: InventoryCar, lang: ApiLang): InventoryItem {
  const images = car.images ?? [];
  const processing: string[] = [];
  if (images.some((u) => !isMirroredUrl(u))) processing.push("images_pending");
  const hasDesc = !!(car.description || car.description_zh);
  if (hasDesc && (!car.description || !car.description_zh)) processing.push("translation_pending");
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
    updated_at: car.updated_at,
    expires_at: car.expires_at ?? null,
    processing_state: processing,
  };
}
