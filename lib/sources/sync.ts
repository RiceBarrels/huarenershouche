// Sync engine: crawls a whitelisted source site and syndicates its inventory
// into `cars` under the source's system account. Server-only (service role).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbListingSource } from "@/lib/types";
import { getAdapter } from "./index";
import { fetchHtml, sleep, type ParsedListing } from "./types";
import { createServiceClient } from "./service-client";

export interface SyncResult {
  key: string;
  status: "success" | "partial" | "error" | "skipped";
  found: number;
  inserted: number;
  updated: number;
  delisted: number;
  errors: string[];
  duration_ms: number;
}

export interface SyncOptions {
  /** Reuse an existing service client (otherwise one is created). */
  client?: SupabaseClient;
  /** Delay between detail fetches, ms (default 300). */
  detailDelayMs?: number;
}

const EXPIRY_DAYS = 30;
/** Sources synced within this window are skipped unless force (cron runs daily). */
const MIN_SYNC_GAP_MS = 3.9 * 24 * 60 * 60 * 1000;

function expiresAt(): string {
  return new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

interface ExistingCar {
  id: string;
  source_listing_id: string | null;
  status: string;
  price: number;
}

/** 常用华人聚居城市中文名（location_zh 用），未命中则回退英文 */
const CITY_ZH: Record<string, string> = {
  Flushing: "法拉盛",
  "New York": "纽约",
  Brooklyn: "布鲁克林",
  Manhattan: "曼哈顿",
  Queens: "皇后区",
  Bayside: "贝赛",
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
  const detailDelayMs = opts.detailDelayMs ?? 300;
  const result: SyncResult = {
    key: source.key,
    status: "success",
    found: 0,
    inserted: 0,
    updated: 0,
    delisted: 0,
    errors: [],
    duration_ms: 0,
  };

  const finish = async (status: SyncResult["status"]): Promise<SyncResult> => {
    result.status = status;
    result.duration_ms = Date.now() - started;
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
    // 0. 门店地址优先：有门店记录则车辆定位跟随门店
    const storeLoc = await loadStoreLocation(supabase, source.system_account_id);
    const locationOverride = storeLoc
      ? {
          location: storeLoc.location,
          location_zh: storeLoc.location_zh,
          ...(storeLoc.lat != null && storeLoc.lng != null
            ? { lat: storeLoc.lat, lng: storeLoc.lng }
            : {}),
        }
      : {};

    // 1. Crawl the list pages
    const crawl = await adapter.listAll(fetchHtml);
    result.found = crawl.refs.length;
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

    // 3. Load our existing copies for this source
    const { data: existingRows, error: existingErr } = await supabase
      .from("cars")
      .select("id, source_listing_id, status, price")
      .eq("source_id", source.id);
    if (existingErr) throw new Error(`load existing cars: ${existingErr.message}`);
    const existing = new Map<string, ExistingCar>();
    for (const row of (existingRows ?? []) as ExistingCar[]) {
      if (row.source_listing_id) existing.set(row.source_listing_id, row);
    }

    // 4. Fetch details sequentially and upsert
    const now = new Date().toISOString();
    for (const ref of crawl.refs) {
      let parsed: ParsedListing;
      try {
        parsed = await adapter.fetchDetail(fetchHtml, ref);
      } catch (err) {
        result.errors.push(`${ref.sourceListingId}: ${err instanceof Error ? err.message : String(err)}`);
        await sleep(detailDelayMs);
        continue;
      }

      const current = existing.get(ref.sourceListingId);
      try {
        if (!current) {
          const { error } = await supabase.from("cars").insert({
            ...parsed,
            ...locationOverride,
            seller_id: source.system_account_id,
            status: "active",
            expires_at: expiresAt(),
            last_seen_at: now,
            source_id: source.id,
          });
          if (error) throw new Error(error.message);
          result.inserted++;
        } else {
          const update: Record<string, unknown> = {
            title: parsed.title,
            title_zh: parsed.title_zh,
            mileage: parsed.mileage,
            image_url: parsed.image_url,
            images: parsed.images,
            features: parsed.features,
            description: parsed.description,
            exterior_color: parsed.exterior_color,
            interior_color: parsed.interior_color,
            source_url: parsed.source_url,
            last_seen_at: now,
            expires_at: expiresAt(),
            ...locationOverride,
          };
          if (parsed.price !== current.price) {
            update.price = parsed.price;
            update.original_price = parsed.original_price;
            update.price_updated_at = now;
          }
          // Reactivate our removed copy; never touch sold/pending
          if (current.status === "removed") update.status = "active";
          const { error } = await supabase.from("cars").update(update).eq("id", current.id);
          if (error) throw new Error(error.message);
          result.updated++;
        }
      } catch (err) {
        result.errors.push(`${ref.sourceListingId}: upsert failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      await sleep(detailDelayMs);
    }

    // 5. Delist our active copies whose stock id disappeared from the source
    if (delistAllowed) {
      const foundIds = new Set(crawl.refs.map((r) => r.sourceListingId));
      const toDelist = [...existing.values()]
        .filter((row) => row.status === "active" && !foundIds.has(row.source_listing_id ?? ""))
        .map((row) => row.id);
      if (toDelist.length > 0) {
        const { error } = await supabase
          .from("cars")
          .update({ status: "removed" })
          .in("id", toDelist);
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
}

export async function syncAll(opts: SyncAllOptions = {}): Promise<SyncResult[]> {
  const supabase = createServiceClient();

  let query = supabase.from("listing_sources").select("*");
  query = opts.onlyKey ? query.eq("key", opts.onlyKey) : query.eq("enabled", true);
  const { data, error } = await query;
  if (error) throw new Error(`load listing_sources: ${error.message}`);

  const sources = (data ?? []) as DbListingSource[];
  const results: SyncResult[] = [];

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
        errors: [],
        duration_ms: 0,
      });
      continue;
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
        errors: [message],
        duration_ms: 0,
      });
    }
  }

  return results;
}
