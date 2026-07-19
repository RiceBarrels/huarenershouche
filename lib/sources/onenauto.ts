// 1neAuto (1neauto.com) —— JSON API 数据源。
// 站点有 Cloudflare 挑战,服务端直连会 403,故经 ScrapingAnt 代理获取
// (需 SCRAPINGANT_API_KEY)。列表接口一次返回全部车辆(含图片/VIN/价格/配置),
// 无需再抓详情页 —— listAll 拉全量并缓存,fetchDetail 直接返回缓存。

import type { SourceAdapter, ParsedListing, CrawlResult, SourceListingRef } from "./types";
import { MAKES_ZH } from "@/lib/mock-data";

const LIST_URL = "https://1neauto.com/1neauto/car/view/api/list?pageNo=1&pageSize=1000";
const SITE = "https://1neauto.com";
const SCRAPINGANT = "https://api.scrapingant.com/v2/extended";

interface Rec {
  id: string;
  manufacturer: string | null;
  carTitle: string | null;
  bodyType: string | null;
  builtIn: string | null;
  mileage: number | null;
  engine: string | null;
  fuel: string | null;
  typeOfDrive: string | null;
  transmission: string | null;
  primaryImage: string | null;
  secondaryImages: string | null;
  vin: string | null;
  originalPrice: number | null;
  currentPrice: number | null;
  features: string | null;
  saleStatus: string | null;
  listingStatus: string | null;
}

function mapFuel(f: string | null): string {
  const t = (f || "").toLowerCase();
  if (t.includes("plug")) return "插电混动";
  if (t.includes("hybrid") || t.includes("hev")) return "混动";
  if (t.includes("electric") || t.includes("ev")) return "纯电";
  if (t.includes("diesel")) return "柴油";
  return "汽油";
}

function mapTransmission(t: string | null): string {
  const s = (t || "").toLowerCase();
  if (s.includes("cvt")) return "CVT 无级";
  if (s.includes("manual")) return "MT 手动";
  return "AT 自动";
}

function mapDrive(d: string | null): string | null {
  const s = (d || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (s.includes("all-wheel") || s === "awd") return "AWD";
  if (s.includes("front-wheel") || s === "fwd") return "FWD";
  if (s.includes("rear-wheel") || s === "rwd") return "RWD";
  if (s.includes("four-wheel") || s.includes("4wd") || s.includes("4x4")) return "4WD";
  return null;
}

// 联系/定位兜底值(系统账号无门店记录时使用;有门店则同步引擎以门店地址覆盖)
const FALLBACK = {
  seller_name: "1neAuto",
  phone: null as string | null,
  location: "New York, NY",
  location_zh: "纽约",
  lat: 40.7128,
  lng: -74.006,
};

function mapRecord(r: Rec): ParsedListing {
  const make = (r.manufacturer || "").trim();
  const model = (r.carTitle || "").trim();
  const year = parseInt(r.builtIn || "0", 10) || 0;
  const makeZh = MAKES_ZH[make] || make;
  const titleEn = [year || "", make, model].filter(Boolean).join(" ").trim();
  const titleZh = [year || "", makeZh, model].filter(Boolean).join(" ").trim();

  const images = (r.secondaryImages || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const features = (r.features || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const description =
    [
      [year || null, make, model, r.bodyType].filter(Boolean).join(" "),
      [r.engine, r.typeOfDrive, r.mileage != null ? `${r.mileage.toLocaleString()} miles` : null]
        .filter(Boolean)
        .join(", "),
    ]
      .filter(Boolean)
      .join("\n") || null;

  return {
    title: titleEn,
    title_zh: titleZh,
    year,
    make,
    model,
    trim: null,
    price: r.currentPrice ?? 0,
    original_price: r.originalPrice ?? null,
    mileage: r.mileage ?? 0,
    location: FALLBACK.location,
    location_zh: FALLBACK.location_zh,
    lat: FALLBACK.lat,
    lng: FALLBACK.lng,
    image_url: r.primaryImage || images[0] || null,
    images,
    fuel_type: mapFuel(r.fuel),
    transmission: mapTransmission(r.transmission),
    exterior_color: null,
    interior_color: null,
    drivetrain: mapDrive(r.typeOfDrive),
    vin: r.vin || null,
    description,
    description_zh: null,
    features,
    seller_name: FALLBACK.seller_name,
    phone: FALLBACK.phone,
    carfax_url: null,
    carfax_summary: null,
    source_listing_id: r.id,
    source_url: SITE,
  };
}

// 只保留在售车(saleStatus=For Sale);已售(Sold)不进入 refs,由同步引擎自动下架。
function isActive(r: Rec): boolean {
  return r.saleStatus === "For Sale" && r.listingStatus === "Listing";
}

async function fetchRecords(): Promise<Rec[]> {
  const key = process.env.SCRAPINGANT_API_KEY;
  if (!key) throw new Error("SCRAPINGANT_API_KEY not set — 1neAuto 需经 ScrapingAnt 代理(Cloudflare)");
  const url = `${SCRAPINGANT}?url=${encodeURIComponent(LIST_URL)}&x-api-key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ScrapingAnt HTTP ${res.status}`);
    const outer = (await res.json()) as { text?: string };
    // extended 端点的 .text 即目标页 <pre> 里的纯 JSON
    const inner = JSON.parse(outer.text || "");
    const records = inner?.result?.records;
    if (!Array.isArray(records)) throw new Error("1neAuto API 返回结构异常");
    return records as Rec[];
  } finally {
    clearTimeout(timer);
  }
}

export function createOneNeAutoAdapter(): SourceAdapter {
  let cache = new Map<string, ParsedListing>();
  return {
    key: "1neauto",
    async listAll(): Promise<CrawlResult> {
      const records = await fetchRecords();
      cache = new Map();
      const refs: SourceListingRef[] = [];
      for (const r of records) {
        if (!r.id || !isActive(r)) continue;
        const parsed = mapRecord(r);
        cache.set(parsed.source_listing_id, parsed);
        refs.push({ sourceListingId: parsed.source_listing_id, url: parsed.source_url });
      }
      // totalDeclared 用在售数量,避免下架安全阀因为 records 含已售车而误判
      return { refs, totalDeclared: refs.length, pagesFetched: 1, failed: false };
    },
    async fetchDetail(_fetchHtml, ref): Promise<ParsedListing> {
      const p = cache.get(ref.sourceListingId);
      if (!p) throw new Error(`1neauto: 缓存缺少 ${ref.sourceListingId}`);
      return p;
    },
  };
}
