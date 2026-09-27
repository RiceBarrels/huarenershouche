// 纽约SR车行 / SR Auto Group(nysrauto.com)。
// 官网是 Lovable/TanStack 单页,/inventory 只是 iframe 嵌入 DealerCenter「DWS」托管站
// https://22144399-4.websites.dealercenter.net/inventory/ —— 与 dealercenter-dws.ts 同一套
// 接口,但这个 *.websites.dealercenter.net 托管域没有 Cloudflare,直连即可(不耗代理额度)。
//
// 数据流:
//  - listAll:POST admin-ajax「get_service_url_for_page」(站点会对任意 serviceUrl 重新签名
//    并代为请求)→ 一次拿到全部在售车(价格/里程/VIN/颜色/配置),缓存。
//  - fetchDetail:POST「get_car_by_stock_number」取完整图库;再抓详情页找到带签名的
//    装备 JSONP(/inv-scripts-v2/inv/vehicle?...&f=eq&h=…)取 features(失败不致命)。
// 车行在 DealerCenter 后台没写描述(VehicleDescription 全空),description 由规格拼一行。

import type { CrawlResult, FetchHtml, ParsedListing, SourceAdapter, SourceListingRef } from "./types";
import { decodeEntities } from "./dealercenter-wp";
import {
  DESKTOP_UA,
  canonicalMake,
  colorZh,
  isValidVin,
  makeZh,
  mapDrivetrain,
  mapFuel,
  mapTransmission,
  rawGet,
  titleCase,
} from "./custom-a-shared";

const IMAGE_BASE = "https://imagescf.dealercenter.net/1600/1200";
const PAGE_SIZE = 500;
const FIELDS = [
  "id", "sn", "ye", "ma", "mo", "tr", "dt", "ta", "td", "en", "mi", "dr", "ec", "ic", "bt", "pr",
  "im", "eq", "vd", "vin", "hpg", "cpg", "vc", "co", "hi", "cfx", "acr", "vt", "cy", "di", "ft",
  "lo", "cfk", "tb", "cs", "nos", "sc", "fp", "cohd", "asp", "nop", "vdf", "ffmi", "cfd", "dc",
  "de", "si", "ym",
].join("|");

export interface DwsDirectSiteConfig {
  key: string;
  /** DealerCenter 托管站根,如 "https://22144399-4.websites.dealercenter.net" */
  dwsBaseUrl: string;
  dcid: string;
  location: string;
  location_zh: string;
  lat: number;
  lng: number;
  seller_name: string;
  phone: string;
  languages?: string[];
}

interface DwsImage {
  DocumentId: string | null;
  OrderIndex?: number | null;
}

interface DwsVehicle {
  StockNumber: string;
  Vin: string | null;
  Year: number;
  Make: string | null;
  Model: string | null;
  BodyType: string | null;
  Trim: string | null;
  Engine: string | null;
  Transmission: string | null;
  TransmissionDetail: string | null;
  Drivetrain: string | null;
  ExteriorColor: string | null;
  InteriorColor: string | null;
  Odometer: number | null;
  VehiclePrice: number | null;
  TotalPrice: number | null;
  VehicleImages: DwsImage[] | null;
  VehicleImageCount: number | null;
  CityMPG: number | null;
  HighwayMPG: number | null;
  FuelType: string | null;
  CustomStatus: string | null;
  Status?: number | null;
  VehicleDescription?: string | null;
  CarfaxSecureUrl?: string | null;
}

const UNAVAILABLE_RE = /sold|pending|deposit|hold|reserved/i;

// Trim 末尾车身描述:"EX-L MINIVAN 4D" → "EX-L","CREW CAB EXPRESS PICKUP 4D 5 1/2 FT" → "CREW CAB EXPRESS"
const BODY_TAIL_RE =
  /\s*\b(?:GRAN COUPE SEDAN|SPORT UTILITY|SUV|SEDAN|CONVERTIBLE|CABRIOLET|COUPE|HATCHBACK|WAGON|MINIVAN|(?:CARGO |PASSENGER )?VAN|PICKUP|ROADSTER|LIFTBACK|SPORTBACK)\b(?:\s+\d+D\b.*)?$/i;

function cleanModel(model: string, make: string): string {
  let m = model.replace(/\s+/g, " ").trim();
  // "MERCEDES-AMG GT" → "AMG GT","MERCEDES-MAYBACH S-CLASS" → "Maybach S-Class"
  if (make === "Mercedes-Benz") m = m.replace(/^MERCEDES[- ]/i, "");
  return titleCase(m);
}

async function postAjax(baseUrl: string, form: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
      method: "POST",
      signal: controller.signal,
      body: new URLSearchParams(form).toString(),
      headers: {
        "User-Agent": DESKTOP_UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for admin-ajax`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonp<T>(text: string): T {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  return JSON.parse(start >= 0 && end > start ? text.slice(start + 1, end) : text) as T;
}

export function createDwsDirectAdapter(config: DwsDirectSiteConfig): SourceAdapter {
  const baseUrl = config.dwsBaseUrl.replace(/\/+$/, "");
  const cache = new Map<string, DwsVehicle>();

  const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const detailUrl = (v: DwsVehicle) =>
    `${baseUrl}/inventory/${slug(v.Make ?? "") || "vehicle"}/${slug(v.Model ?? "") || "vehicle"}/${encodeURIComponent(v.StockNumber.toLowerCase())}/`;

  async function listAll(): Promise<CrawlResult> {
    const serviceUrl =
      `/inv-scripts-v2/inv/vehicles?vc=a&f=${encodeURIComponent(FIELDS)}` +
      `&ps=${PAGE_SIZE}&pn=0&sb=ds%7Ca&sp=n&cb=dws_inventory_listing&dcid=${config.dcid}`;
    let data: { TotalRecordCount: number; Vehicles: DwsVehicle[] };
    try {
      data = JSON.parse(
        await postAjax(baseUrl, {
          action: "dws_inventory_service",
          requestType: "get_service_url_for_page",
          serviceUrl,
          newPageNumber: "0",
        })
      );
      if (!Array.isArray(data?.Vehicles)) throw new Error("unexpected list response");
    } catch {
      return { refs: [], totalDeclared: null, pagesFetched: 0, failed: true };
    }

    cache.clear();
    const refs: SourceListingRef[] = [];
    let listed = 0; // 在售且有价有图 —— 作为 totalDeclared(TotalRecordCount 含无价/无图车)
    for (const v of data.Vehicles) {
      if (!v.StockNumber) continue;
      if (v.Status != null && v.Status !== 0) continue;
      if (v.CustomStatus && UNAVAILABLE_RE.test(v.CustomStatus)) continue;
      if (!(Math.round(v.VehiclePrice || 0) > 0)) continue; // 0 = 电询
      if (!v.VehicleImageCount || !v.VehicleImages?.some((i) => i.DocumentId)) continue;
      listed++;
      const vin = (v.Vin || "").toUpperCase();
      const id = isValidVin(vin) ? vin : v.StockNumber;
      if (cache.has(id)) continue;
      cache.set(id, v);
      refs.push({ sourceListingId: id, url: detailUrl(v) });
    }
    return {
      refs,
      totalDeclared: listed,
      pagesFetched: 1,
      failed: data.TotalRecordCount > data.Vehicles.length, // 超出单页上限 → 不做下架
    };
  }

  async function fetchGallery(v: DwsVehicle): Promise<string[]> {
    try {
      const data = JSON.parse(
        await postAjax(baseUrl, {
          action: "dws_inventory_service",
          requestType: "get_car_by_stock_number",
          stockNumber: v.StockNumber,
        })
      ) as { VehicleImages?: DwsImage[] | null };
      const imgs = [...(data.VehicleImages ?? [])]
        .filter((i) => i.DocumentId)
        .sort((a, b) => (a.OrderIndex ?? 0) - (b.OrderIndex ?? 0));
      return [...new Set(imgs.map((i) => `${IMAGE_BASE}/${i.DocumentId}.jpg`))];
    } catch {
      return [];
    }
  }

  /** 详情页里带签名的装备 JSONP → features;任何失败返回 []。 */
  async function fetchFeatures(url: string): Promise<string[]> {
    try {
      const page = await rawGet(url);
      if (page.status !== 200) return [];
      const m = page.text.match(/src="(\/inv-scripts-v2\/inv\/vehicle\?[^"]*?&f=eq&[^"]*)"/);
      if (!m) return [];
      const eq = await rawGet(`${baseUrl}${decodeEntities(m[1])}`, { Referer: url });
      if (eq.status !== 200) return [];
      const data = parseJsonp<{ Equipments?: { EquipmentName?: string }[] | null }>(eq.text);
      const out: string[] = [];
      for (const e of data.Equipments ?? []) {
        const name = titleCase(e.EquipmentName || "");
        if (name && !out.includes(name)) out.push(name);
        if (out.length >= 45) break;
      }
      return out;
    } catch {
      return [];
    }
  }

  async function fetchDetail(_fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing> {
    const v = cache.get(ref.sourceListingId);
    if (!v) throw new Error(`${config.key}: 缓存缺少 ${ref.sourceListingId}(需先 listAll)`);

    const year = Number(v.Year);
    if (!Number.isFinite(year) || year < 1950) throw new Error(`invalid year "${v.Year}"`);
    const make = canonicalMake(v.Make || "");
    const model = cleanModel(v.Model || "", make);
    if (!make || !model) throw new Error(`missing make/model for ${ref.sourceListingId}`);
    const trimRaw = (v.Trim || "").replace(BODY_TAIL_RE, "").trim();
    const trim = trimRaw ? titleCase(trimRaw) : null;

    const price = Math.round(v.VehiclePrice || 0);
    if (!(price > 0)) throw new Error("no price found");

    const [gallery, features] = [await fetchGallery(v), await fetchFeatures(ref.url)];
    let images = gallery;
    if (images.length === 0) {
      const cover = v.VehicleImages?.find((i) => i.DocumentId)?.DocumentId;
      if (cover) images = [`${IMAGE_BASE}/${cover}.jpg`];
    }
    if (images.length === 0) throw new Error("no photos found");

    const fuel_type = mapFuel(`${v.FuelType ?? ""} ${v.Engine ?? ""} ${v.Model ?? ""}`, make);
    const transmission = mapTransmission(`${v.Transmission ?? ""} ${v.TransmissionDetail ?? ""}`);
    const drivetrain = mapDrivetrain(v.Drivetrain) ?? mapDrivetrain(`${v.Trim ?? ""}`);
    const mileage = Math.max(0, Math.round(v.Odometer ?? 0));
    const vinRaw = (v.Vin || "").toUpperCase();

    const title = `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`;
    const title_zh = `${year} ${makeZh(make)} ${model}${trim ? ` ${trim}` : ""}`;

    const specLine = [
      v.Engine ? titleCase(v.Engine) : null,
      v.TransmissionDetail ? titleCase(v.TransmissionDetail) : v.Transmission ? titleCase(v.Transmission) : null,
      drivetrain,
      `${mileage.toLocaleString("en-US")} miles`,
      v.CityMPG && v.HighwayMPG ? `MPG ${v.CityMPG} city / ${v.HighwayMPG} hwy` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const ownDesc = (v.VehicleDescription || "").trim();
    const description = [title + (v.BodyType ? ` ${titleCase(v.BodyType)}` : ""), specLine, ownDesc]
      .filter(Boolean)
      .join("\n");

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
      transmission,
      exterior_color: colorZh(v.ExteriorColor),
      interior_color: colorZh(v.InteriorColor),
      drivetrain,
      vin: isValidVin(vinRaw) ? vinRaw : null,
      description,
      description_zh: null,
      features,
      seller_name: config.seller_name,
      phone: config.phone,
      carfax_url: v.CarfaxSecureUrl || null,
      carfax_summary: null,
      source_listing_id: ref.sourceListingId,
      source_url: ref.url,
    };
  }

  return { key: config.key, languages: config.languages, listAll, fetchDetail };
}

export function createNysrAutoAdapter(): SourceAdapter {
  return createDwsDirectAdapter({
    key: "nysrauto",
    dwsBaseUrl: "https://22144399-4.websites.dealercenter.net",
    dcid: "22144399",
    location: "Bayside, NY",
    location_zh: "纽约贝赛",
    lat: 40.7624,
    lng: -73.7838,
    seller_name: "SR Auto Group 纽约SR车行",
    phone: "(516) 962-9399",
    languages: ["zh", "en"],
  });
}
