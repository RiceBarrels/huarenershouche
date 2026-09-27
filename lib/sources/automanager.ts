// Generic adapter factory for AutoManager ("WebManager") dealer websites
// (assets from automanagerprodcdn.azureedge.net, photos on
// automanager.blob.core.windows.net). No public JSON inventory endpoint — the
// only XHR (`Scripts/ComparisonInfo.aspx/GetInventoryListPhotos`) returns
// thumbnails. The server-rendered list page (`/view-inventory?page=N`, 10 cars
// per page) carries nearly every spec as data-* attributes on each card, so
// listAll caches those; fetchDetail fetches the detail page only for the full
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

const MAX_PAGES = 40;

export interface AutoManagerSiteConfig {
  key: string;
  baseUrl: string;
  /** Inventory list path, default "/view-inventory" */
  listPath?: string;
  // 兜底定位/联系信息 —— 系统账号有门店记录时同步引擎会覆盖为门店地址
  location: string;
  location_zh: string;
  lat: number;
  lng: number;
  seller_name: string;
  phone: string;
  /** 车行沟通语言,见 SourceAdapter.languages */
  languages?: string[];
}

/** One list-page card (data-* attributes + a few spans). */
interface AmCard {
  id: string;
  url: string;
  title: string;
  /** Title with original whitespace (double space = dealer free text follows) */
  rawTitle: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  transmission: string;
  mileage: string;
  extColor: string;
  intColor: string;
  drivetrain: string;
  fuel: string;
  photo: string;
  vin: string;
  price: number | null;
  salePending: boolean;
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`data-${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : "";
}

function parseMoney(text: string | undefined | null): number | null {
  if (!text) return null;
  const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseCards(html: string, baseUrl: string): AmCard[] {
  const out: AmCard[] = [];
  const chunks = html.split(/(?=<div class="clearfix inventory-panel)/).slice(1);
  for (const chunk of chunks) {
    const tag = chunk.match(/^<div[^>]*>/)?.[0] ?? "";
    const id = attr(tag, "id");
    if (!/^[0-9a-f]{32}$/i.test(id)) continue;
    const href =
      chunk.match(new RegExp(`href="([^"]*/vehicle-details/[^"]*${id})"`, "i"))?.[1] ??
      `${baseUrl}/vehicle-details/${id}`;
    // Price block: "Internet Price / Showroom Price" → first $ amount in pricevalue1
    const priceHtml = chunk.match(/class="pricevalue1[^>]*>([\s\S]{0,200}?)<\/div>/)?.[1];
    out.push({
      id: id.toLowerCase(),
      url: href.startsWith("http") ? href : `${baseUrl}${href}`,
      title: attr(tag, "displaytitle"),
      rawTitle: decodeEntities(tag.match(/data-displaytitle="([^"]*)"/)?.[1] ?? ""),
      year: attr(tag, "displayyear"),
      make: attr(tag, "displaymake"),
      model: attr(tag, "displaymodel"),
      trim: attr(tag, "displaytrim"),
      engine: attr(tag, "displayengine"),
      transmission: attr(tag, "displaytransmission"),
      mileage: attr(tag, "displaymileage"),
      extColor: attr(tag, "displayextcolor"),
      intColor: attr(tag, "displayintcolor"),
      drivetrain: attr(tag, "displaydrivetrain"),
      fuel: attr(tag, "displayfuel"),
      photo: attr(tag, "displayphoto"),
      vin: chunk.match(/class="vin">\s*([A-HJ-NPR-Z0-9]{17})\s*</i)?.[1]?.toUpperCase() ?? "",
      price: priceHtml ? parseMoney(stripTags(priceHtml)) : null,
      salePending: /class="sale_pending"|salepending/i.test(chunk),
    });
  }
  return out;
}

/** Sum of a facet group's "(N)" counts, e.g. style=SUV (38) + style=Sedan (13)… */
function facetSum(html: string, facet: string): number {
  const re = new RegExp(`view-inventory\\?${facet}=[^"]+"[^>]*>([\\s\\S]{0,200}?)</a>`, "g");
  let sum = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = stripTags(m[1]).match(/\((\d+)\)\s*$/);
    if (n) sum += parseInt(n[1], 10);
  }
  return sum;
}

/** Canonical make spelling via MAKES_ZH keys ("INFINITI" → "Infiniti"). */
function canonicalMake(raw: string): string {
  const make = raw.trim();
  const hit = Object.keys(MAKES_ZH).find((k) => k.toLowerCase() === make.toLowerCase());
  return hit ?? make;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Multi-word all-caps model ("SANTA FE") → "Santa Fe"; single tokens (GLS, JX35) kept. */
function tidyModelCase(text: string): string {
  const words = text.split(/\s+/);
  const allCapsWords = words.length >= 2 && words.every((w) => /^[A-Z]+$/.test(w)) && words.some((w) => w.length >= 4);
  if (!allCapsWords) return text;
  return words.map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

const BODY_SUFFIX_RE =
  /\s+(?:Sedan|SUV|Coupe|Convertible|Hatchback|Wagon|Minivan|Van|Truck|Pickup|Crossover)$/i;

/**
 * Model: the card's model field, unless the dealer left it as "Other" —
 * then derive it from the display title ("2026 Hyundai SANTA FE SEL SUV").
 * Dealers append free text after a double space ("…R-Spec  Track Coupe").
 */
function deriveModel(card: AmCard, make: string): string {
  const model = card.model.trim();
  if (model && !/^other$/i.test(model)) return model;
  let rest = card.rawTitle.split(/\s{2,}/)[0].replace(/\s+/g, " ").trim();
  rest = rest
    .replace(new RegExp(`^${escapeRe(card.year)}\\s+`), "")
    .replace(new RegExp(`^${escapeRe(card.make)}\\s+`, "i"), "")
    .replace(new RegExp(`^${escapeRe(make)}\\s+`, "i"), "")
    .replace(BODY_SUFFIX_RE, "")
    .trim();
  if (card.trim) {
    const i = rest.toLowerCase().indexOf(` ${card.trim.toLowerCase()}`);
    if (i > 0) rest = rest.slice(0, i).trim();
  }
  return tidyModelCase(rest);
}

function mapFuel(fuel: string, engine: string, make: string): string {
  const t = `${fuel} ${engine}`.toLowerCase();
  if (t.includes("hydrogen") || t.includes("fuel cell")) return "氢燃料";
  if (t.includes("plug-in") || t.includes("plug in")) return "插电混动";
  if (t.includes("hybrid")) return "混动";
  if (t.includes("electric") || make === "Tesla") return "纯电";
  if (t.includes("diesel")) return "柴油";
  return "汽油";
}

function mapTransmission(raw: string, fuelType: string): string {
  const t = raw.toLowerCase();
  if (t.includes("cvt") || t.includes("variable")) return "CVT 无级";
  if (t.includes("manual") && !t.includes("auto")) return "MT 手动";
  if (fuelType === "纯电" || fuelType === "氢燃料") return "单速(电动车)";
  return "AT 自动";
}

function mapDrivetrain(raw: string): string | null {
  const s = raw.toLowerCase();
  if (/\bawd\b|all[\s-]wheel/.test(s)) return "AWD";
  if (/\b4wd\b|4x4|four[\s-]wheel/.test(s)) return "4WD";
  if (/\bfwd\b|front[\s-]wheel/.test(s)) return "FWD";
  if (/\brwd\b|rear[\s-]wheel/.test(s)) return "RWD";
  return null;
}

/** Labelled spec rows on the detail page: <span class="specifics-label">X:</span><span class="specifics-value">…</span> */
/** Colors: mapColor() plus the tan/cream family it leaves untranslated. */
function mapAmColor(raw: string | null): string | null {
  if (raw && /\b(?:tan|cream|ivory|sand|parchment|camel)\b/i.test(raw)) return "米色";
  return mapColor(raw);
}

function parseSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const re =
    /class="[^"]*specifics-label[^"]*">([^<]*)<\/span>\s*<span class="specifics-value">([\s\S]*?)<\/span>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = decodeEntities(m[1]).replace(/:\s*$/, "").trim();
    const value = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (label && value && !(label in specs)) specs[label] = value;
  }
  return specs;
}

/** Gallery photos in page order, "_overlay" banner versions swapped for the clean original. */
function parsePhotos(html: string, id: string): string[] {
  const re = new RegExp(
    `https://automanager\\.blob\\.core\\.windows\\.net/wmphotos/(\\d+)/${id}/([0-9a-z]+)_\\d+(?:_overlay)?\\.jpg`,
    "gi"
  );
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const photoId = m[2].toLowerCase();
    if (seen.has(photoId)) continue;
    seen.add(photoId);
    // _800 is the largest size the CDN serves
    out.push(`https://automanager.blob.core.windows.net/wmphotos/${m[1]}/${id}/${photoId}_800.jpg`);
  }
  return out;
}

// Dealer boilerplate lines/clauses in descriptions: call/text/visit/hours/marketing.
const BOILERPLATE_LINE_RE =
  /(?:\bcall\b|\btext\b|\bvisit\b|www\.|\.com\b|in business since|days a week|\bopen (?:\d|from|till|until)|same day delivery|no ssn|pay st[ua]b|you work,? you drive|same location|years in business|in business (?:for|over)|over \d+n? years|per month|\$\d+ down|approv|monthly payments?|low rates|dmv services|special offer|view more photos|cars to choose from|ins(?:urance)? on spot|pics coming|appointment|financ|credit|\bdealer fees?\b|\bplus tax\b|\bdisclaimer\b|\d{3}[.\-\s)]+\d{3}[.\-\s]+\d{4})/i;
const BOILERPLATE_CLAUSE_RE =
  /[,.;!\s]*(?:for (?:the )?best deals?|please call|call or text|text or call|call us|visit (?:us|www)|visit our)[\s\S]*$/i;

// RV / trailer makes some dealers list alongside cars — not syndicated
const NON_CAR_MAKE_RE =
  /^(?:airstream|winnebago|jayco|forest river|thor|keystone|coachmen|grand design|heartland|dutchmen|newmar|tiffin|fleetwood|harley-davidson|yamaha|kawasaki|polaris)$/i;

function parseDescription(html: string): string | null {
  const m = html.match(/<div class="vehicle-description">([\s\S]*?)<\/div>/);
  if (!m) return null;
  const lines = stripTags(m[1])
    .split("\n")
    .map((l) => l.replace(BOILERPLATE_CLAUSE_RE, "").replace(/\s+/g, " ").trim())
    .filter((l) => l && !BOILERPLATE_LINE_RE.test(l));
  const text = lines.join("\n").trim();
  return text.length > 0 ? text : null;
}

export function createAutoManagerAdapter(config: AutoManagerSiteConfig): SourceAdapter {
  const listPath = config.listPath ?? "/view-inventory";
  let cache = new Map<string, AmCard>();

  async function listAll(fetchHtml: FetchHtml): Promise<CrawlResult> {
    const next = new Map<string, AmCard>();
    let totalDeclared: number | null = null;
    let pagesFetched = 0;
    let failed = false;
    let lastPage = MAX_PAGES;

    for (let page = 1; page <= Math.min(lastPage, MAX_PAGES); page++) {
      let html: string;
      try {
        html = await fetchHtml(`${config.baseUrl}${listPath}${page > 1 ? `?page=${page}` : ""}`);
      } catch {
        failed = true;
        break;
      }
      pagesFetched++;

      if (page === 1) {
        // No explicit "N vehicles" label — the body-style / fuel facet counts sum to the total
        const declared = Math.max(facetSum(html, "style"), facetSum(html, "fuel"));
        totalDeclared = declared > 0 ? declared : null;
        const lp = html.match(/Inventory_SetPage\('\w+','(\d+)'\);"\s*title="Last Page"/);
        if (lp) lastPage = parseInt(lp[1], 10);
      }

      const before = next.size;
      for (const card of parseCards(html, config.baseUrl)) {
        if (!next.has(card.id)) next.set(card.id, card);
      }
      if (next.size === before) break; // page added nothing new → done
    }

    // Sale Pending / 未标价 / "coming soon" 占位图的车不进入 refs
    // —— 标价、拍照后下轮自然进入;已售由同步引擎自动下架
    const refs: SourceListingRef[] = [];
    for (const card of next.values()) {
      const placeholder = !card.photo || /comingsoon|wmthemes\/images/i.test(card.photo);
      if (card.salePending || !(card.price && card.price > 0) || placeholder) continue;
      if (NON_CAR_MAKE_RE.test(card.make)) continue;
      refs.push({ sourceListingId: card.id, url: card.url });
    }
    cache = next;
    return { refs, totalDeclared, pagesFetched, failed };
  }

  async function fetchDetail(fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing> {
    const card = cache.get(ref.sourceListingId);
    if (!card) throw new Error(`${config.key}: 缓存缺少 ${ref.sourceListingId}(需先 listAll)`);

    const html = stripComments(await fetchHtml(ref.url));
    const specs = parseSpecs(html);

    const year = parseInt(card.year, 10);
    if (!Number.isFinite(year) || year < 1950) throw new Error(`invalid year "${card.year}"`);
    const make = canonicalMake(card.make);
    const model = deriveModel(card, make);
    if (!make || !model) throw new Error(`missing make/model for ${ref.sourceListingId}`);
    let trim: string | null = card.trim.replace(/\s+/g, " ").trim() || null;
    if (trim && (/^base$/i.test(trim) || trim.toLowerCase() === model.toLowerCase())) trim = null;
    if (trim && /^[a-z]/.test(trim) && trim === trim.toLowerCase()) trim = trim.charAt(0).toUpperCase() + trim.slice(1);

    const price =
      card.price ??
      parseMoney(specs["Internet Price"] ?? specs["Showroom Price"] ?? specs["Price"] ?? null);
    if (!price) throw new Error("no price found");

    const vin = (card.vin || specs["VIN"] || "").toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error(`invalid VIN "${vin}"`);

    const images = parsePhotos(html, ref.sourceListingId);
    if (images.length === 0) throw new Error("no photos found");

    const mileage = parseMoney(card.mileage) ?? parseMoney(specs["Mileage"]) ?? 0;
    const fuel_type = mapFuel(card.fuel || specs["Fuel"] || "", card.engine, make);
    // Trim often repeats the model ("SLK" / "SLK 350") — don't print it twice
    const trimPart = trim ? (trim.toLowerCase().startsWith(model.toLowerCase() + " ") ? trim.slice(model.length) : ` ${trim}`) : "";
    const title = `${year} ${make} ${model}${trimPart}`;
    const title_zh = `${year} ${MAKES_ZH[make] ?? make} ${model}${trimPart}`;

    const features: string[] = [];
    const engine = card.engine || specs["Engine"];
    // Skip bare displacement stubs ("3.5") — keep real engine descriptions
    if (engine && /[a-z]/i.test(engine)) features.push(engine);
    const warranty = specs["Warranty"];
    if (warranty) features.push(warranty);
    const titleStatus = specs["Title"];
    if (titleStatus) features.push(`Title: ${titleStatus}`);

    return {
      title,
      title_zh,
      year,
      make,
      model,
      trim,
      price,
      original_price: null,
      mileage,
      location: config.location,
      location_zh: config.location_zh,
      lat: config.lat,
      lng: config.lng,
      image_url: images[0],
      images: images.slice(1),
      fuel_type,
      transmission: mapTransmission(card.transmission || specs["Transmission"] || "", fuel_type),
      exterior_color: mapAmColor(card.extColor || specs["Exterior Color"] || null),
      interior_color: mapAmColor(card.intColor || specs["Interior Color"] || null),
      drivetrain: mapDrivetrain(card.drivetrain || specs["Drivetrain"] || ""),
      vin,
      description: parseDescription(html),
      description_zh: null,
      features,
      seller_name: config.seller_name,
      phone: config.phone,
      carfax_url: null,
      carfax_summary: null,
      source_listing_id: ref.sourceListingId,
      source_url: ref.url,
    };
  }

  return { key: config.key, languages: config.languages, listAll, fetchDetail };
}
