// Generic adapter factory for the DealerSync dealer-website template
// (westcoastauto.com and many other independent dealers). Inventory is served
// by a JSON endpoint (`/Inventory/Search`, 10 per page, includes VIN/price/
// mileage/specs/highlights); the detail page (HTML) is still fetched for the
// photo gallery and the dealer's description.

import type {
  CrawlResult,
  FetchHtml,
  ParsedListing,
  SourceAdapter,
  SourceListingRef,
} from "./types";
import { MAKES_ZH } from "@/lib/mock-data";
import { decodeEntities, mapColor, stripComments, stripTags } from "./dealercenter-wp";

const PAGE_SIZE = 10;
const MAX_PAGES = 100;
const MAX_FEATURES = 45;
const IMAGE_HOST = "https://images.dealersync.com";

export interface DealerSyncSiteConfig {
  key: string;
  baseUrl: string;
  /** Inventory list path, default "/pre-owned-cars" (detail = `${listPath}/detail/<slug>/<id>`) */
  listPath?: string;
  // 兜底定位/联系信息 —— 系统账号有门店记录时同步引擎会覆盖为门店地址
  location: string;
  location_zh: string;
  lat: number;
  lng: number;
  seller_name: string;
  phone: string;
}

/** Subset of the /Inventory/Search vehicle record we read. */
interface DsVehicle {
  VehicleId: number;
  Year: string | number;
  Make: string;
  Model: string;
  Trim: string | null;
  VehicleTitle: string | null;
  Vin: string | null;
  Mileage: number | null;
  InternetPrice: number | null;
  SalePrice?: number | null;
  Fuel: string | null;
  Transmission: string | null;
  Drivetrain: string | null;
  Engine: string | null;
  FactoryColorText: string | null;
  FactoryInteriorText: string | null;
  IsSold: boolean;
  IsNew: boolean;
  CarfaxOk?: boolean;
  CarfaxConsumerLink?: string | null;
  FirstImageUrl?: string | null;
}

interface DsHighlight {
  VehicleId: number;
  Category: string;
  Description: string;
  IsOptional: boolean;
}

interface DsSearchResponse {
  Success?: boolean;
  startIndex?: number;
  totalResults?: number;
  vehicles?: DsVehicle[];
  vehicleHighlights?: DsHighlight[];
}

interface CacheEntry {
  rec: DsVehicle;
  highlights: DsHighlight[];
}

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** The search endpoint only returns JSON for XHR-style requests. */
async function fetchJson(url: string): Promise<DsSearchResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as DsSearchResponse;
  } finally {
    clearTimeout(timer);
  }
}

function slugify(text: string): string {
  return text.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Canonical make spelling via MAKES_ZH keys ("INFINITI" → "Infiniti", "FIAT" → "Fiat"). */
function canonicalMake(raw: string): string {
  const make = raw.trim();
  const hit = Object.keys(MAKES_ZH).find((k) => k.toLowerCase() === make.toLowerCase());
  return hit ?? make;
}

function mapFuel(fuel: string | null, make: string): string {
  const t = (fuel || "").toLowerCase();
  if (t.includes("hydrogen")) return "氢燃料";
  if (t.includes("plug-in") || t.includes("plug in")) return "插电混动";
  if (t.includes("hybrid")) return "混动";
  if (t.includes("electric") || make === "Tesla") return "纯电";
  if (t.includes("diesel")) return "柴油";
  return "汽油";
}

function mapTransmission(raw: string | null, fuelType: string): string {
  const t = (raw || "").toLowerCase();
  if (t.includes("cvt")) return "CVT 无级";
  if (t.includes("manual") && !t.includes("auto")) return "MT 手动";
  if (fuelType === "纯电" || fuelType === "氢燃料") return "单速(电动车)";
  return "AT 自动";
}

function mapDrivetrain(raw: string | null): string | null {
  const s = (raw || "").toLowerCase();
  if (s.includes("all") && s.includes("wheel")) return "AWD";
  if (s.includes("front")) return "FWD";
  if (s.includes("rear")) return "RWD";
  if (s.includes("four") || s.includes("4wd") || s.includes("4x4")) return "4WD";
  return null;
}

// DealerSync paint names are marketing names ("Gun Metallic", "Cyber Gray");
// pre-map the common non-literal ones before the generic keyword matcher.
const PAINT_HINTS: [RegExp, string][] = [
  [/gunmetal|gun metallic|graphite|charcoal|slate|titanium|steel|granite|grigio|grey|gray/i, "灰色"],
  [/ebony|nero|onyx|obsidian|midnight|black/i, "黑色"],
  [/rosso|rouge|crimson|scarlet|ruby|\bred\b/i, "红色"],
  [/bianco|alpine|ceramic|\bwhite\b/i, "白色"],
  [/\bblu\b|azzurro|navy|sapphire|\bblue\b/i, "蓝色"],
  [/champagne/i, "金色"],
  [/cognac|espresso|mocha|saddle|chestnut|\bbrown\b/i, "棕色"],
  [/ivory|cream|\bsand\b|\btan\b|parchment|macchiato|\bbeige\b/i, "米色"],
];

function mapPaint(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  for (const [re, zh] of PAINT_HINTS) {
    if (re.test(raw)) return zh;
  }
  return mapColor(raw);
}

// Marketing slides / auto-generated report images the site mixes into the
// gallery (Money-back guarantee, "Zero Games", Carfax/KBB/Monroney renders…).
const NON_PHOTO_RE =
  /ds_generated|monroney|wca_|_wca|money.?back|guarantee|maintenance|zero.?games|carfax|kbb|reviews|ratings|awards|summary|approved|value.?service|posi|poist|postion|\.png$|\.gif$/i;

/** Gallery photos in page order, deduped, marketing slides removed. */
function parsePhotos(html: string, vehicleId: string): string[] {
  const re = new RegExp(`images\\.dealersync\\.com/3/Photos/${vehicleId}/([^"'?\\s,)]+)`, "g");
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const file = m[1];
    if (NON_PHOTO_RE.test(file)) continue;
    // Same camera frame re-uploaded into another slot ("…_IMG_9180.jpg") → one photo
    const dedupeKey = file.match(/(_IMG_\d+\.\w+)$/i)?.[1]?.toUpperCase() ?? file;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(`${IMAGE_HOST}/3/Photos/${vehicleId}/${file}`);
  }
  return out;
}

function parseDescription(html: string): string | null {
  // <div id="ds-vdp-description"> …dealer blurb with <br/>… </div>
  const m = html.match(/id="ds-vdp-description"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const text = stripTags(m[1]).trim();
  return text.length > 0 ? text : null;
}

function titleCaseUpper(text: string): string {
  if (text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Awd|Fwd|Rwd|Led|Usb|Abs|Gps|Hd|Sos|Ac|Av|Amg|Trd|Xle|Xse|Sel|Sxt|Suv|Ev)\b/g, (s) =>
      s.toUpperCase()
    );
}

/** Features = dealer "top features" (non-optional highlights) + factory options. */
function buildFeatures(highlights: DsHighlight[]): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const item = decodeEntities(raw).replace(/\s+/g, " ").trim();
    if (!item || out.includes(item)) return;
    out.push(item);
  };
  for (const h of highlights) if (!h.IsOptional) push(h.Description);
  for (const h of highlights) if (h.IsOptional) push(titleCaseUpper(h.Description));
  return out.slice(0, MAX_FEATURES);
}

/** 从车行亮点里提炼 Carfax 摘要(与 lib/carfax.ts formatCarfaxSummary 同格式)。 */
function buildCarfaxSummary(rec: DsVehicle, highlights: DsHighlight[]): string | null {
  if (!rec.CarfaxOk) return null;
  const text = highlights.map((h) => h.Description).join(" | ");
  const parts: string[] = [];
  if (/\b(one|1)[\s-]owner\b/i.test(text)) parts.push("1 任车主");
  if (/no accidents?/i.test(text)) parts.push("无事故");
  return parts.length ? parts.join(" · ") : null;
}

function detailUrl(config: DealerSyncSiteConfig, rec: DsVehicle): string {
  const listPath = config.listPath ?? "/pre-owned-cars";
  const slug = slugify(`${rec.Year} ${rec.Make} ${rec.Model}`) || "vehicle";
  return `${config.baseUrl}${listPath}/detail/${slug}/${rec.VehicleId}`;
}

export function createDealerSyncAdapter(config: DealerSyncSiteConfig): SourceAdapter {
  let cache = new Map<string, CacheEntry>();

  async function listAll(): Promise<CrawlResult> {
    const next = new Map<string, CacheEntry>();
    const refs: SourceListingRef[] = [];
    let totalDeclared: number | null = null;
    let pagesFetched = 0;
    let failed = false;

    for (let page = 0; page < MAX_PAGES; page++) {
      const start = page * PAGE_SIZE;
      let data: DsSearchResponse;
      try {
        data = await fetchJson(`${config.baseUrl}/Inventory/Search?startIndex=${start}&Results=${PAGE_SIZE}`);
      } catch {
        failed = true;
        break;
      }
      pagesFetched++;
      if (typeof data.totalResults === "number") totalDeclared = data.totalResults;

      const vehicles = data.vehicles ?? [];
      if (vehicles.length === 0) break;
      for (const rec of vehicles) {
        const id = String(rec.VehicleId);
        if (!next.has(id)) next.set(id, { rec, highlights: [] });
      }
      for (const h of data.vehicleHighlights ?? []) {
        next.get(String(h.VehicleId))?.highlights.push(h);
      }
      if (totalDeclared != null && start + vehicles.length >= totalDeclared) break;
    }

    // 已售 / 未标价("Call for price")/ 还没拍照("coming soon" 占位图)的车不进入 refs
    // —— 未标价、无图的车下轮补齐后自然进入;已售由同步引擎自动下架
    for (const [id, entry] of next) {
      const price = entry.rec.InternetPrice ?? entry.rec.SalePrice ?? 0;
      const placeholder = /\/comingsoon\//i.test(entry.rec.FirstImageUrl || "");
      if (entry.rec.IsSold || !(price > 0) || placeholder) continue;
      refs.push({ sourceListingId: id, url: detailUrl(config, entry.rec) });
    }
    cache = next;
    return { refs, totalDeclared, pagesFetched, failed };
  }

  async function fetchDetail(fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing> {
    const entry = cache.get(ref.sourceListingId);
    if (!entry) throw new Error(`${config.key}: 缓存缺少 ${ref.sourceListingId}(需先 listAll)`);
    const { rec, highlights } = entry;

    const html = stripComments(await fetchHtml(ref.url));

    const year = parseInt(String(rec.Year), 10);
    if (!Number.isFinite(year) || year < 1950) throw new Error(`invalid year "${rec.Year}"`);
    const make = canonicalMake(rec.Make || "");
    const model = (rec.Model || "").replace(/\s+/g, " ").trim();
    if (!make || !model) throw new Error(`missing make/model for ${ref.sourceListingId}`);
    const trim = (rec.Trim || "").replace(/\s+/g, " ").trim() || null;

    const price = Math.round(rec.InternetPrice ?? rec.SalePrice ?? 0);
    if (!(price > 0)) throw new Error("no price found");

    const vin = (rec.Vin || "").toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error(`invalid VIN "${vin}"`);

    const images = parsePhotos(html, ref.sourceListingId);
    if (images.length === 0) throw new Error("no photos found");

    const fuel_type = mapFuel(rec.Fuel, make);
    const title = `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`;
    const title_zh = `${year} ${MAKES_ZH[make] ?? make} ${model}${trim ? ` ${trim}` : ""}`;

    return {
      title,
      title_zh,
      year,
      make,
      model,
      trim,
      price,
      original_price: null,
      mileage: Math.max(0, Math.round(rec.Mileage ?? 0)),
      location: config.location,
      location_zh: config.location_zh,
      lat: config.lat,
      lng: config.lng,
      image_url: images[0],
      images: images.slice(1),
      fuel_type,
      transmission: mapTransmission(rec.Transmission, fuel_type),
      exterior_color: mapPaint(rec.FactoryColorText),
      interior_color: mapPaint(rec.FactoryInteriorText),
      drivetrain: mapDrivetrain(rec.Drivetrain),
      vin,
      description: parseDescription(html),
      description_zh: null,
      features: buildFeatures(highlights),
      seller_name: config.seller_name,
      phone: config.phone,
      carfax_url: rec.CarfaxOk && rec.CarfaxConsumerLink ? rec.CarfaxConsumerLink : null,
      carfax_summary: buildCarfaxSummary(rec, highlights),
      source_listing_id: ref.sourceListingId,
      source_url: ref.url,
    };
  }

  return { key: config.key, listAll, fetchDetail };
}
