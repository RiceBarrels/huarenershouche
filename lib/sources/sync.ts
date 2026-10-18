// Sync engine: crawls a whitelisted source site and syndicates its inventory
// into `cars` under the source's system account. Server-only (service role).
// 文本只写原文列(description_original / features_original,任意语言原样保存)和确定性标题;
// 翻译、compat 投影(description / description_zh / features)与标签术语都归 i18n 管线
// (supabase/i18n-v2.sql 触发器按原文哈希排队,/api/sync 收尾与 /api/i18n/drain cron 执行)。

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { DbCar, DbListingSource } from "@/lib/types";
import { buildCarTitles } from "@/lib/i18n/car-title";
import { legacyOriginal } from "@/lib/i18n/content/resolve";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { getAdapter } from "./index";
import { fetchHtml, sleep, type ParsedListing, type SourceListingRef } from "./types";
import { createServiceClient } from "./service-client";
import { mirrorCarImages, cleanupRemovedMirrors, deleteMirroredImages, isMirroredUrl } from "./images";

/** 有界并发:同时最多 concurrency 个 worker 处理队列,全部完成后返回。 */
async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  };
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, run));
}

export interface SyncResult {
  key: string;
  status: "success" | "partial" | "error" | "skipped";
  found: number;
  inserted: number;
  updated: number;
  delisted: number;
  /** 本轮完成图片转存(压缩入库)的车辆数 */
  mirrored: number;
  errors: string[];
  duration_ms: number;
}

export interface SyncOptions {
  /** Reuse an existing service client (otherwise one is created). */
  client?: SupabaseClient;
  /** 并发抓取/写库的数量(默认 5)。 */
  concurrency?: number;
}

/**
 * 每个源的同步间隔:约两天一次(1.9 天,留出 cron 整点对齐的余量)。
 * cron 每小时检查一次,只处理到期的源;未到期时直接跳过,几乎零开销。
 */
const MIN_SYNC_GAP_MS = 1.9 * 24 * 60 * 60 * 1000;
/**
 * 每个源每轮最多转存图片的车辆数(控制单次 /api/sync 时长,maxDuration=300s)。
 * 存量车源会在之后的每日同步中逐批补齐;管理员也可连续手动触发加速。
 */
const MIRROR_CARS_PER_RUN = 30;
/** PostgREST 单次最多返回 1000 行(max-rows):本源已有车源按 id 分页拉全 */
const PAGE_SIZE = 1000;
/** I15:与 i18n 管线并发写同一辆车时偶发的死锁(40P01)/ 锁等待超时(55P03),重试一次 */
const LOCK_RETRY_CODES = new Set(["40P01", "55P03"]);

interface ExistingRow {
  id: string;
  source_listing_id: string | null;
  status: string;
  price: number;
  images: string[] | null;
  source_images: string[] | null;
}

/** supabase/i18n-v2.sql 之后的列集 */
interface V2ExistingRow extends ExistingRow {
  description_original: string | null;
  features_original: string[] | null;
  removal_reason: DbCar["removal_reason"];
}

/** i18n-v2.sql 执行前的列集(没有原文列与 removal_reason) */
interface LegacyExistingRow extends ExistingRow {
  source_id: string | null;
  description: string | null;
  description_zh: string | null;
  features: string[] | null;
}

const EXISTING_COLS =
  "id, source_listing_id, status, price, images, source_images, description_original, features_original, removal_reason";
const LEGACY_EXISTING_COLS =
  "id, source_listing_id, status, price, images, source_images, source_id, description, description_zh, features";

interface ExistingCar extends ExistingRow {
  /** 库里当前的原文(旧库按 legacyOriginal 从 description / description_zh 推出) */
  original: string | null;
  /** 库里当前的标签原文(旧库为 features) */
  features: string[];
  removal_reason: DbCar["removal_reason"];
}

/** 带本源 source_id、却不在本源系统账号名下的车:它占着的车位(source_listing_id)同步不碰 */
interface ForeignSlot {
  id: string;
  seller_id: string;
  source_listing_id: string;
}

function existingBase(r: ExistingRow): ExistingRow {
  return {
    id: r.id,
    source_listing_id: r.source_listing_id,
    status: r.status,
    price: r.price,
    images: r.images,
    source_images: r.source_images,
  };
}

/** 分页(.range)拉一条查询的全部行;出错时带上错误返回 */
async function selectAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: PostgrestError | null }>,
): Promise<{ rows: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    const batch = (data as T[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, error: null };
  }
}

/**
 * 本源在库里、且在本源系统账号名下的全部车源(只有这些会被同步更新 / 下架)。库里还没有原文列
 * (i18n-v2.sql 未执行)时退回旧列集,返回 legacy=true:本轮写入也走旧列(见 originalColumns)。
 * 卖家不是系统账号的行(浏览器用户在守卫上线前自己写了 source_id / source_listing_id,抢占还没导入的
 * 车位)不认领:否则同步会把车行的描述、图片、价格写进别人的车,买家联系到的却是那个账号。
 */
async function loadExistingCars(
  supabase: SupabaseClient,
  source: Pick<DbListingSource, "id" | "system_account_id">,
): Promise<{ cars: ExistingCar[]; legacy: boolean }> {
  const page = (cols: string) => (from: number, to: number) =>
    supabase
      .from("cars")
      .select(cols)
      .eq("source_id", source.id)
      .eq("seller_id", source.system_account_id)
      .order("id", { ascending: true })
      .range(from, to);

  const v2 = await selectAllPages<V2ExistingRow>(page(EXISTING_COLS));
  if (!v2.error) {
    return {
      cars: v2.rows.map((r) => ({
        ...existingBase(r),
        original: r.description_original ?? null,
        features: r.features_original ?? [],
        removal_reason: r.removal_reason ?? null,
      })),
      legacy: false,
    };
  }
  if (!isMissingColumnError(v2.error)) throw new Error(`load existing cars: ${v2.error.message}`);

  const old = await selectAllPages<LegacyExistingRow>(page(LEGACY_EXISTING_COLS));
  if (old.error) throw new Error(`load existing cars: ${old.error.message}`);
  return {
    cars: old.rows.map((r) => ({
      ...existingBase(r),
      original: legacyOriginal(r),
      features: r.features ?? [],
      removal_reason: null,
    })),
    legacy: true,
  };
}

/**
 * 被别的卖家占着的本源车位:source_listing_id → 那辆车。这些源站车源本轮跳过并记错(插入会撞
 * (source_id, source_listing_id) 唯一索引),等管理员处理那辆车后下一轮再导入。
 */
async function loadForeignSlots(
  supabase: SupabaseClient,
  source: Pick<DbListingSource, "id" | "system_account_id">,
): Promise<Map<string, ForeignSlot>> {
  const { rows, error } = await selectAllPages<ForeignSlot>((from, to) =>
    supabase
      .from("cars")
      .select("id, seller_id, source_listing_id")
      .eq("source_id", source.id)
      .neq("seller_id", source.system_account_id)
      .not("source_listing_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (error) throw new Error(`load foreign slots: ${error.message}`);
  return new Map(rows.map((r) => [r.source_listing_id, r]));
}

/** 写 cars:遇到死锁 / 锁等待超时隔 200–500 ms 重试一次 */
async function withLockRetry<R extends { error: PostgrestError | null }>(write: () => PromiseLike<R>): Promise<R> {
  const first = await write();
  if (!first.error || !LOCK_RETRY_CODES.has(first.error.code)) return first;
  await sleep(200 + Math.floor(Math.random() * 300));
  return write();
}

// ─── 写入规则(lib/api/listing.ts 共用)────────────────────────────────

/** 原文是否相同:首尾空白不算(迁移与原文哈希都会 trim) */
export function sameOriginal(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a?.trim() || null) === (b?.trim() || null);
}

/** 标签原文是否相同:顺序无关、大小写敏感;与 i18n.dedupe_tags 一样先 trim、去空、去重 */
export function sameTagSet(a: readonly string[], b: readonly string[]): boolean {
  const norm = (tags: readonly string[]) => [...new Set(tags.map((t) => t.trim()).filter(Boolean))].sort();
  const x = norm(a);
  const y = norm(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/**
 * 原文写入列:description_original / features_original 原样保存;description / description_zh /
 * features 是 i18n 管线维护的兼容投影,写入方从不碰。legacy(库里还没有原文列)时退回旧列:
 * 原文写 description(legacyOriginal 对转载 / API 车源先读它),标签写 features。
 */
export function originalColumns(
  description: string | null,
  features: string[],
  legacy: boolean,
): Record<string, string | string[] | null> {
  return legacy
    ? { description, features }
    : { description_original: description, features_original: features };
}

/** B10:审核 / 管理员下架的车不能被同步或 API 重新上架(cars_before 触发器同样拦截) */
export function isRelistBlocked(reason: string | null | undefined): boolean {
  return reason === "moderation" || reason === "admin";
}

/** ParsedListing 里原样落库的列;标题由 buildCarTitles 生成,描述 / 标签只进原文列 */
type ListingColumns = Omit<ParsedListing, "title" | "title_zh" | "description" | "description_zh" | "features">;

function listingColumns(p: ParsedListing): ListingColumns {
  return {
    year: p.year,
    make: p.make,
    model: p.model,
    trim: p.trim,
    price: p.price,
    original_price: p.original_price,
    mileage: p.mileage,
    location: p.location,
    location_zh: p.location_zh,
    lat: p.lat,
    lng: p.lng,
    image_url: p.image_url,
    images: p.images,
    fuel_type: p.fuel_type,
    transmission: p.transmission,
    exterior_color: p.exterior_color,
    interior_color: p.interior_color,
    drivetrain: p.drivetrain,
    vin: p.vin,
    seller_name: p.seller_name,
    phone: p.phone,
    carfax_url: p.carfax_url,
    carfax_summary: p.carfax_summary,
    source_listing_id: p.source_listing_id,
    source_url: p.source_url,
  };
}

/** 源站原文(任意语言):description 为空才退回 description_zh(适配器都给 null) */
function originalText(p: ParsedListing): string | null {
  if (p.description?.trim()) return p.description;
  if (p.description_zh?.trim()) return p.description_zh;
  return null;
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** 常用华人聚居城市中文名（location_zh 用），未命中则回退英文 */
export const CITY_ZH: Record<string, string> = {
  Flushing: "法拉盛",
  "New York": "纽约",
  Brooklyn: "布鲁克林",
  Manhattan: "曼哈顿",
  Queens: "皇后区",
  Bayside: "贝赛",
  Douglaston: "道格拉斯顿",
  "Staten Island": "史泰登岛",
  "Long Island City": "长岛市",
  Edison: "爱迪生",
  Kearny: "卡尼",
  Rosemead: "罗斯米德",
  "Los Angeles": "洛杉矶",
  "San Gabriel": "圣盖博",
  Irvine: "尔湾",
  "Rowland Heights": "罗兰岗",
  Arcadia: "亚凯迪亚",
  Montclair: "蒙特克莱尔",
  Ontario: "安大略",
  "San Jose": "圣何塞",
  "San Francisco": "旧金山",
  Fremont: "弗里蒙特",
  Seattle: "西雅图",
  Bellevue: "贝尔维尤",
  Boston: "波士顿",
  Chicago: "芝加哥",
  Houston: "休斯顿",
  Dallas: "达拉斯",
  Plano: "普莱诺",
  Philadelphia: "费城",
};

interface StoreLocation {
  location: string;
  location_zh: string;
  lat: number | null;
  lng: number | null;
}

/**
 * 若系统账号名下有车行门店记录且填了地址，车辆定位跟随门店
 * （管理员改门店地址后，下次同步全部车辆位置自动更新）。
 */
async function loadStoreLocation(
  supabase: SupabaseClient,
  ownerId: string
): Promise<StoreLocation | null> {
  const { data } = await supabase
    .from("dealer_stores")
    .select("address, lat, lng")
    .eq("owner_id", ownerId)
    .limit(1)
    .maybeSingle();
  if (!data?.address) return null;
  const m = (data.address as string).match(/,\s*([^,]+),\s*([A-Z]{2})\b/);
  const city = m?.[1]?.trim();
  const location = city ? `${city}, ${m![2]}` : (data.address as string);
  const location_zh = city && CITY_ZH[city] ? `${CITY_ZH[city]}, ${m![2]}` : location;
  return { location, location_zh, lat: data.lat ?? null, lng: data.lng ?? null };
}

export async function syncSource(
  source: DbListingSource,
  opts: SyncOptions = {}
): Promise<SyncResult> {
  const started = Date.now();
  const supabase = opts.client ?? createServiceClient();
  const concurrency = opts.concurrency ?? 5;
  const result: SyncResult = {
    key: source.key,
    status: "success",
    found: 0,
    inserted: 0,
    updated: 0,
    delisted: 0,
    mirrored: 0,
    errors: [],
    duration_ms: 0,
  };

  const finish = async (status: SyncResult["status"]): Promise<SyncResult> => {
    result.status = status;
    result.duration_ms = Date.now() - started;
    console.log(
      `[sync:${source.key}] DONE status=${status} found=${result.found} inserted=${result.inserted} ` +
        `updated=${result.updated} delisted=${result.delisted} mirrored=${result.mirrored} ` +
        `errors=${result.errors.length} in ${result.duration_ms}ms`,
    );
    await supabase
      .from("listing_sources")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_detail: {
          found: result.found,
          inserted: result.inserted,
          updated: result.updated,
          delisted: result.delisted,
          mirrored: result.mirrored,
          errors: result.errors.slice(0, 10),
          duration_ms: result.duration_ms,
        },
      })
      .eq("id", source.id);
    return result;
  };

  const adapter = getAdapter(source.key);
  if (!adapter) {
    result.errors.push(`no adapter registered for key "${source.key}"`);
    return finish("error");
  }

  await supabase
    .from("listing_sources")
    .update({ last_sync_status: "running" })
    .eq("id", source.id);

  try {
    // 0a. 系统账号沟通语言：源站配置声明了 languages 且账号还没填过时补上
    //     （管理员在后台改过的保留，不覆盖）
    if (adapter.languages && adapter.languages.length > 0) {
      await supabase
        .from("profiles")
        .update({ languages: adapter.languages })
        .eq("id", source.system_account_id)
        .eq("languages", "{}");
    }

    // 0. 门店地址优先：有门店记录则车辆定位跟随门店(多门店源保留每辆车自己的门店定位)
    const storeLoc = adapter.multiLocation ? null : await loadStoreLocation(supabase, source.system_account_id);
    const locationOverride = storeLoc
      ? {
          location: storeLoc.location,
          location_zh: storeLoc.location_zh,
          ...(storeLoc.lat != null && storeLoc.lng != null
            ? { lat: storeLoc.lat, lng: storeLoc.lng }
            : {}),
        }
      : {};

    const log = (msg: string) => console.log(`[sync:${source.key}] ${msg}`);

    // 1. Crawl the list pages
    log("crawling list pages…");
    const crawl = await adapter.listAll(fetchHtml);
    result.found = crawl.refs.length;
    log(`found ${result.found} listings (declared ${crawl.totalDeclared ?? "?"}, failed=${crawl.failed})`);
    if (crawl.failed) result.errors.push("list crawl incomplete: a page fetch failed");

    // 2. Safety rail — never mass-delist off a broken/partial crawl
    const delistAllowed =
      !crawl.failed &&
      result.found > 0 &&
      (crawl.totalDeclared == null || result.found >= crawl.totalDeclared * 0.5);
    if (!delistAllowed) {
      result.errors.push(
        `delisting skipped (failed=${crawl.failed}, found=${result.found}, declared=${crawl.totalDeclared ?? "?"})`
      );
    }

    // 3. Load our existing copies for this source (paged past PostgREST's 1000-row cap), plus the slots
    //    other sellers' cars hold under this source id (never adopted, updated or delisted)
    const [{ cars: existingCars, legacy }, foreign] = await Promise.all([
      loadExistingCars(supabase, source),
      loadForeignSlots(supabase, source),
    ]);
    const existing = new Map<string, ExistingCar>();
    for (const row of existingCars) {
      if (row.source_listing_id) existing.set(row.source_listing_id, row);
    }
    if (legacy) log("i18n-v2 columns missing — writing originals to the legacy description/features columns");
    if (foreign.size > 0) log(`${foreign.size} listing slot(s) held by cars of other sellers — those listings are skipped`);

    // 4. Fetch details + upsert —— 有界并发(抓取/写库并行加速)
    const now = new Date().toISOString();
    const total = crawl.refs.length;
    let done = 0;
    // 图片转存预算:每轮最多处理 MIRROR_CARS_PER_RUN 辆(超出的保持源站外链,下轮续)
    let mirrorBudget = MIRROR_CARS_PER_RUN;
    log(`processing ${total} listings with concurrency=${concurrency}…`);

    const processRef = async (ref: SourceListingRef): Promise<void> => {
      const current = existing.get(ref.sourceListingId);
      const held = current ? undefined : foreign.get(ref.sourceListingId);
      if (held) {
        result.errors.push(
          `${ref.sourceListingId}: slot held by car ${held.id} of seller ${held.seller_id} (not this source's system account) — skipped`,
        );
        log(`(${++done}/${total}) ✗ slot held by another seller ${ref.sourceListingId}`);
        return;
      }

      let parsed: ParsedListing;
      try {
        parsed = await adapter.fetchDetail(fetchHtml, ref);
      } catch (err) {
        result.errors.push(`${ref.sourceListingId}: ${err instanceof Error ? err.message : String(err)}`);
        log(`(${++done}/${total}) ✗ fetch failed ${ref.sourceListingId}`);
        return;
      }

      // 原文原样入库 + 确定性标题;原文没变 = 同一哈希,i18n 管线不会重复翻译
      const titles = buildCarTitles(parsed);
      const original = originalText(parsed);

      try {
        if (!current) {
          // 先按源站外链入库(图片立即可见),拿到 id 后再压缩转存并回写
          const { data: inserted, error } = await withLockRetry(() =>
            supabase
              .from("cars")
              .insert({
                ...listingColumns(parsed),
                ...titles,
                ...originalColumns(original, parsed.features, legacy),
                ...locationOverride,
                seller_id: source.system_account_id,
                status: "active",
                last_seen_at: now,
                source_id: source.id,
                source_images: parsed.images,
              })
              .select("id")
              .single(),
          );
          if (error) throw new Error(error.message);
          result.inserted++;
          const newId = (inserted as { id: string } | null)?.id;
          if (newId && parsed.images.length > 0 && mirrorBudget > 0) {
            mirrorBudget--;
            const m = await mirrorCarImages(supabase, newId, parsed.images);
            const { error: imgErr } = await withLockRetry(() =>
              supabase.from("cars").update({ images: m.images, image_url: m.image_url }).eq("id", newId),
            );
            if (imgErr) result.errors.push(`${ref.sourceListingId}: mirror write: ${imgErr.message}`);
            else if (m.mirrored > 0) result.mirrored++;
          }
          log(`(${++done}/${total}) + new ${titles.title_zh || titles.title}`);
        } else {
          // 年款 / 品牌 / 车型 / 配置每轮都按源站写回:它们和原文 / 标签同属审核文本(mod_hash),标题也由它们生成。
          // 只写回原文会让认领方改过的 model / trim 跟着这次可信写入一起变成 trusted(免审);enforce 下标题也会停在旧 trim
          const update: Record<string, unknown> = {
            ...titles,
            year: parsed.year,
            make: parsed.make,
            model: parsed.model,
            trim: parsed.trim,
            mileage: parsed.mileage,
            exterior_color: parsed.exterior_color,
            interior_color: parsed.interior_color,
            source_url: parsed.source_url,
            last_seen_at: now,
            ...locationOverride,
          };
          // 原文 / 标签变了才写;认领方改过的文本也会被这里写回源站原文(重新按可信文本处理)
          if (!sameOriginal(original, current.original) || !sameTagSet(parsed.features, current.features)) {
            Object.assign(update, originalColumns(original, parsed.features, legacy));
          }
          // 图片:已全量转存且源站图未变 → 不动;否则(未转存/换图/预算内)重新压缩转存,
          // 预算用完时保持源站外链,下轮同步续传
          const alreadyMirrored = (current.images ?? []).some(isMirroredUrl);
          const sourceChanged = !sameArray(parsed.images, current.source_images ?? []);
          if (!alreadyMirrored || sourceChanged) {
            if (parsed.images.length > 0 && mirrorBudget > 0) {
              mirrorBudget--;
              // 源站换图:先清掉旧转存文件(新列表可能更短,避免孤儿文件)
              if (alreadyMirrored && sourceChanged) await deleteMirroredImages(supabase, current.id);
              const m = await mirrorCarImages(supabase, current.id, parsed.images);
              update.images = m.images;
              update.image_url = m.image_url;
              update.source_images = parsed.images;
              if (m.mirrored > 0) result.mirrored++;
            } else {
              update.images = parsed.images;
              update.image_url = parsed.image_url;
              update.source_images = parsed.images;
            }
          }
          if (parsed.price !== current.price) {
            update.price = parsed.price;
            update.original_price = parsed.original_price;
            update.price_updated_at = now;
          }
          // Reactivate our removed copy (removal_reason null/other); never touch sold/pending,
          // and never relist a moderation/admin removal (the cars_before trigger keeps it removed too)
          if (current.status === "removed" && !isRelistBlocked(current.removal_reason)) update.status = "active";
          const { error } = await withLockRetry(() => supabase.from("cars").update(update).eq("id", current.id));
          if (error) throw new Error(error.message);
          result.updated++;
          log(`(${++done}/${total}) ↻ upd ${titles.title_zh || titles.title}`);
        }
      } catch (err) {
        result.errors.push(`${ref.sourceListingId}: upsert failed: ${err instanceof Error ? err.message : String(err)}`);
        log(`(${++done}/${total}) ✗ upsert failed ${ref.sourceListingId}`);
      }
    };

    await runPool(crawl.refs, concurrency, processRef);
    log(`upserts done — inserted ${result.inserted}, updated ${result.updated}`);

    // 5. Delist our active copies whose stock id disappeared from the source
    if (delistAllowed) {
      const foundIds = new Set(crawl.refs.map((r) => r.sourceListingId));
      const toDelist = [...existing.values()]
        .filter((row) => row.status === "active" && !foundIds.has(row.source_listing_id ?? ""))
        .map((row) => row.id);
      if (toDelist.length > 0) {
        const { error } = await withLockRetry(() =>
          supabase.from("cars").update({ status: "removed" }).in("id", toDelist),
        );
        if (error) {
          result.errors.push(`delist failed: ${error.message}`);
        } else {
          result.delisted = toDelist.length;
        }
      }
    }

    // 6. Final status
    return finish(!delistAllowed || result.errors.length > 0 ? "partial" : "success");
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return finish("error");
  }
}

export interface SyncAllOptions {
  force?: boolean;
  onlyKey?: string;
  /**
   * 时间预算(ms):超过后不再开始新的数据源(已开始的跑完)。Vercel 函数 300s 上限下,
   * 一次调用跑不完全部源 —— cron 每小时触发,每轮按「最久未同步」优先接着跑。
   */
  budgetMs?: number;
}

export async function syncAll(opts: SyncAllOptions = {}): Promise<SyncResult[]> {
  const supabase = createServiceClient();

  let query = supabase.from("listing_sources").select("*");
  query = opts.onlyKey ? query.eq("key", opts.onlyKey) : query.eq("enabled", true);
  const { data, error } = await query;
  if (error) throw new Error(`load listing_sources: ${error.message}`);

  // 最久未同步(含从未同步 / 上轮超时中断)的源优先
  const sources = ((data ?? []) as DbListingSource[]).sort(
    (a, b) =>
      (a.last_sync_at ? new Date(a.last_sync_at).getTime() : 0) -
      (b.last_sync_at ? new Date(b.last_sync_at).getTime() : 0)
  );
  const results: SyncResult[] = [];
  const startedAt = Date.now();

  for (const source of sources) {
    const recentlySynced =
      source.last_sync_at != null &&
      Date.now() - new Date(source.last_sync_at).getTime() < MIN_SYNC_GAP_MS;
    if (recentlySynced && !opts.force) {
      results.push({
        key: source.key,
        status: "skipped",
        found: 0,
        inserted: 0,
        updated: 0,
        delisted: 0,
        mirrored: 0,
        errors: [],
        duration_ms: 0,
      });
      continue;
    }

    if (opts.budgetMs != null && Date.now() - startedAt > opts.budgetMs) {
      console.log(`[sync] budget ${opts.budgetMs}ms used — deferring ${source.key} to next run`);
      break;
    }

    try {
      results.push(await syncSource(source, { client: supabase }));
    } catch (err) {
      // syncSource handles its own errors; this is a last-resort guard.
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("listing_sources")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_detail: { errors: [message] },
        })
        .eq("id", source.id);
      results.push({
        key: source.key,
        status: "error",
        found: 0,
        inserted: 0,
        updated: 0,
        delisted: 0,
        mirrored: 0,
        errors: [message],
        duration_ms: 0,
      });
    }
  }

  // 收尾:已下架车源(源站消失 sync delist)的转存图片
  // 删除 Storage 文件并回退源站外链,释放存储空间
  try {
    const { cleaned, errors } = await cleanupRemovedMirrors(supabase);
    if (cleaned > 0 || errors.length > 0) {
      console.log(`[sync] mirror cleanup: cleaned=${cleaned} errors=${errors.length}`);
      for (const e of errors.slice(0, 5)) console.log(`[sync] ${e}`);
    }
  } catch (err) {
    console.log(`[sync] mirror cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}
