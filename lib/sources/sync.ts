// Sync engine: crawls a whitelisted source site and syndicates its inventory
// into `cars` under the source's system account. Server-only (service role).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbListingSource } from "@/lib/types";
import { getAdapter } from "./index";
import { fetchHtml, type ParsedListing, type SourceListingRef } from "./types";
import { createServiceClient } from "./service-client";
import { localizeListing } from "@/lib/translate";
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
  /** 并发抓取/翻译/写库的数量(默认 8)。 */
  concurrency?: number;
}

const EXPIRY_DAYS = 30;
/** Sources synced within this window are skipped unless force (cron runs daily). */
const MIN_SYNC_GAP_MS = 0.9 * 24 * 60 * 60 * 1000;
/**
 * 每个源每轮最多转存图片的车辆数(控制单次 /api/sync 时长,maxDuration=300s)。
 * 存量车源会在之后的每日同步中逐批补齐;管理员也可连续手动触发加速。
 */
const MIRROR_CARS_PER_RUN = 30;

function expiresAt(): string {
  return new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

interface ExistingCar {
  id: string;
  source_listing_id: string | null;
  status: string;
  price: number;
  description_zh: string | null;
  images: string[] | null;
  source_images: string[] | null;
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

    // 3. Load our existing copies for this source
    const { data: existingRows, error: existingErr } = await supabase
      .from("cars")
      .select("id, source_listing_id, status, price, description_zh, images, source_images")
      .eq("source_id", source.id);
    if (existingErr) throw new Error(`load existing cars: ${existingErr.message}`);
    const existing = new Map<string, ExistingCar>();
    for (const row of (existingRows ?? []) as ExistingCar[]) {
      if (row.source_listing_id) existing.set(row.source_listing_id, row);
    }

    // 4. Fetch details + translate + upsert —— 有界并发(抓取/翻译/写库并行加速)
    const now = new Date().toISOString();
    const total = crawl.refs.length;
    let done = 0;
    // 图片转存预算:每轮最多处理 MIRROR_CARS_PER_RUN 辆(超出的保持源站外链,下轮续)
    let mirrorBudget = MIRROR_CARS_PER_RUN;
    log(`processing ${total} listings with concurrency=${concurrency}…`);

    const processRef = async (ref: SourceListingRef): Promise<void> => {
      let parsed: ParsedListing;
      try {
        parsed = await adapter.fetchDetail(fetchHtml, ref);
      } catch (err) {
        result.errors.push(`${ref.sourceListingId}: ${err instanceof Error ? err.message : String(err)}`);
        log(`(${++done}/${total}) ✗ fetch failed ${ref.sourceListingId}`);
        return;
      }

      const current = existing.get(ref.sourceListingId);

      // AI 双语翻译:系统抓取的车源多为英文,补全中文 title/描述并把标签做成双语。
      // 新增一定翻译;已有记录仅在「还没中文描述且源站确有描述可译」时回填一次,
      // 避免无描述车源每次同步都重复翻译。失败时原样返回,不影响同步。
      const needsTranslation = !current || (!current.description_zh && !!parsed.description);
      if (needsTranslation) {
        try {
          const t0 = Date.now();
          const loc = await localizeListing({
            title: parsed.title,
            title_zh: parsed.title_zh,
            description: parsed.description,
            description_zh: parsed.description_zh,
            features: parsed.features,
          });
          log(`translated ${ref.sourceListingId} in ${Date.now() - t0}ms`);
          parsed.title = loc.title ?? parsed.title;
          parsed.title_zh = loc.title_zh ?? parsed.title_zh;
          parsed.description = loc.description ?? parsed.description;
          parsed.description_zh = loc.description_zh ?? parsed.description_zh;
          if (loc.features.length) parsed.features = loc.features;
        } catch {
          /* 翻译失败:保留原始解析结果 */
        }
      }

      try {
        if (!current) {
          // 先按源站外链入库(图片立即可见),拿到 id 后再压缩转存并回写
          const { data: inserted, error } = await supabase
            .from("cars")
            .insert({
              ...parsed,
              ...locationOverride,
              seller_id: source.system_account_id,
              status: "active",
              expires_at: expiresAt(),
              last_seen_at: now,
              source_id: source.id,
              source_images: parsed.images,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          result.inserted++;
          if (inserted?.id && parsed.images.length > 0 && mirrorBudget > 0) {
            mirrorBudget--;
            const m = await mirrorCarImages(supabase, inserted.id, parsed.images);
            const { error: imgErr } = await supabase
              .from("cars")
              .update({ images: m.images, image_url: m.image_url })
              .eq("id", inserted.id);
            if (imgErr) result.errors.push(`${ref.sourceListingId}: mirror write: ${imgErr.message}`);
            else if (m.mirrored > 0) result.mirrored++;
          }
          log(`(${++done}/${total}) + new ${parsed.title_zh || parsed.title}`);
        } else {
          const update: Record<string, unknown> = {
            title: parsed.title,
            mileage: parsed.mileage,
            description: parsed.description,
            exterior_color: parsed.exterior_color,
            interior_color: parsed.interior_color,
            source_url: parsed.source_url,
            last_seen_at: now,
            expires_at: expiresAt(),
            ...locationOverride,
          };
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
          // 只有在本轮做了翻译时才写中文/双语字段,否则保留库里已翻译好的内容
          if (needsTranslation) {
            update.title_zh = parsed.title_zh;
            update.description_zh = parsed.description_zh;
            update.features = parsed.features;
          }
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
          log(`(${++done}/${total}) ↻ upd ${parsed.title_zh || parsed.title}`);
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
        mirrored: 0,
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
        mirrored: 0,
        errors: [message],
        duration_ms: 0,
      });
    }
  }

  // 收尾:已下架车源(源站消失 sync delist / 30 天过期 pg_cron)的转存图片
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
