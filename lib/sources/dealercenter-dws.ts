// DealerCenter「DWS」WordPress 模板(www.<dealer>.com,/inventory/ 异步列表 + Cloudflare)。
// 与 dealercenter-wp.ts(iDeal 那套服务端渲染模板)不同:列表由 JSONP 接口
// /inv-scripts-v2/inv/vehicles?...&h=<签名> 异步加载,签名覆盖全部参数,不能直接改。
// 但站点自带的 admin-ajax「get_service_url_for_page」会对任意 serviceUrl 重新签名并
// 代为请求 —— 借此一次 POST 拿到全部在售车(ps=500,含价格/里程/VIN/颜色/描述),
// 缓存在 listAll;fetchDetail 只需再 POST 一次 get_car_by_stock_number 取完整图库。
// 全站直连 403(Cloudflare),经 ScrapingAnt 纯代理(browser=false,1 credit/次)。
// ScrapingAnt 常返回 423(被识别,不计费),需重试。
// 每轮同步请求数 ≈ 1(列表)+ N(每车图库)。

import type { CrawlResult, FetchHtml, ParsedListing, SourceAdapter, SourceListingRef } from "./types";
import { sleep } from "./types";
import { MAKES_ZH } from "@/lib/mock-data";
import { mapColor, stripTags } from "./dealercenter-wp";

const SCRAPINGANT = "https://api.scrapingant.com/v2/general";
const IMAGE_BASE = "https://imagescf.dealercenter.net/1600/1200";
const MAX_ATTEMPTS = 10;
const PAGE_SIZE = 500;

// 列表字段代码(站点原 serviceUrl 的并集;de=VehicleDescription、si=Status、asp=AskingPrice)
const FIELDS = [
  "id", "sn", "ye", "ma", "mo", "tr", "dt", "ta", "td", "en", "mi", "dr", "ec", "ic", "bt", "pr",
  "im", "eq", "vd", "vin", "hpg", "cpg", "vc", "co", "hi", "cfx", "acr", "vt", "cy", "di", "ft",
  "lo", "cfk", "tb", "cs", "nos", "sc", "fp", "cohd", "asp", "nop", "vdf", "ffmi", "cfd", "dc",
  "de", "si", "ym",
].join("|");

export interface DealerCenterDwsSiteConfig {
  key: string;
  /** e.g. "https://www.fjmotorgroup.com" */
  baseUrl: string;
  /** DealerCenter 车行 ID(列表页 serviceUrl 里的 dcid=) */
  dcid: string;
  /** 详情页路径前缀,默认 "inventory"(列表页设置 vehicleBaseUrl) */
  vehicleBaseUrl?: string;
  // 兜底定位/联系信息 —— 系统账号有门店记录时同步引擎会覆盖为门店地址
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
  VehicleInfoId: string;
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
  CarfaxSecureUrl: string | null;
  CarfaxIconUrl: string | null;
  FuelType: string | null;
  CustomStatus: string | null;
  Status?: number | null;
  VehicleDescription?: string | null;
}

interface DwsListResponse {
  TotalRecordCount: number;
  Vehicles: DwsVehicle[];
}

/** POST 表单到站点 admin-ajax(经 ScrapingAnt;Ant- 前缀头会被转发给目标站)。 */
async function proxyAjax(baseUrl: string, form: Record<string, string>): Promise<string> {
  const key = process.env.SCRAPINGANT_API_KEY;
  if (!key) throw new Error("SCRAPINGANT_API_KEY not set — 该数据源需经 ScrapingAnt 代理(Cloudflare)");
  const target = `${baseUrl}/wp-admin/admin-ajax.php`;
  const proxied = `${SCRAPINGANT}?url=${encodeURIComponent(target)}&browser=false&x-api-key=${key}`;
  const body = new URLSearchParams(form).toString();
  let lastErr = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(proxied, {
        method: "POST",
        body,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Ant-Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Ant-X-Requested-With": "XMLHttpRequest",
        },
      });
      const text = await res.text();
      if (res.ok) {
        const upstream = res.headers.get("ant-page-status-code");
        if (upstream && upstream !== "200") throw new Error(`upstream HTTP ${upstream}`);
        return text;
      }
      lastErr = `ScrapingAnt HTTP ${res.status}: ${text.slice(0, 160)}`;
      // 423 = 被目标站识别(不计费)、409 = 并发数超限、5xx/429 = 临时故障 → 重试;其余直接失败
      if (![409, 423, 429].includes(res.status) && res.status < 500) break;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${lastErr} for ${target}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical make spelling via MAKES_ZH keys ("LAND ROVER" → "Land Rover"). */
function canonicalMake(raw: string): string {
  const make = raw.replace(/\s+/g, " ").trim();
  const hit = Object.keys(MAKES_ZH).find((k) => k.toLowerCase() === make.toLowerCase());
  if (hit) return hit;
  if (make.length <= 3) return make.toUpperCase();
  return make.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

// 保持全大写的 token
const ACRONYMS = new Set([
  "AWD", "FWD", "RWD", "4WD", "4X4", "XLE", "XSE", "XLT", "TRD", "AMG", "SRT", "GTI", "STI", "PHEV",
  "TDI", "TSI", "SEL", "SXT", "SUV", "EV", "LE", "SE", "XL", "LT", "LS", "LX", "EX", "DX", "SV",
  "SL", "SR", "GT", "RS", "SS", "ST", "RT", "SX", "GL", "GLS", "GLE", "GLC", "GLA", "GLB", "CLA",
  "ES", "IS", "GS", "LS", "NX", "RX", "UX", "GX", "LX", "RC", "LC", "TLX", "MDX", "RDX", "ILX",
  "CX", "HR-V", "CR-V", "BR-Z", "WRX", "AT4", "SLT", "RST", "LTZ", "ZR2", "HD", "SRW", "DRW", "II",
  "III", "IV", "SV", "SH-AWD", "EX-L", "4MATIC", "XDRIVE", "SDRIVE",
]);

function titleCaseToken(token: string): string {
  const upper = token.toUpperCase();
  if (ACRONYMS.has(upper)) return upper === "XDRIVE" ? "xDrive" : upper === "SDRIVE" ? "sDrive" : upper;
  if (/^\d+(?:ST|ND|RD|TH)$/.test(upper)) return token.toLowerCase(); // 75TH → 75th
  if (/\d/.test(token)) return upper;
  return token
    .split(/([-/])/)
    .map((p) =>
      p === "-" || p === "/"
        ? p
        : ACRONYMS.has(p.toUpperCase()) || p.length <= 2
          ? p.toUpperCase()
          : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    )
    .join("");
}

function titleCase(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  // 源数据是全大写;已是混合大小写则原样保留
  if (t !== t.toUpperCase()) return t;
  return t.split(" ").map(titleCaseToken).join(" ");
}

// Trim 末尾的车身描述("SE SPORT UTILITY 4D" → "SE")
const BODY_SUFFIX_RE = new RegExp(
  "\\s*\\b(?:SPORT UTILITY|SUV|SEDAN|CONVERTIBLE|COUPE|HATCHBACK|WAGON|MINIVAN|" +
    "(?:CARGO |PASSENGER )?VAN|" +
    "(?:CREW CAB |EXTENDED CAB |DOUBLE CAB |QUAD CAB |KING CAB |SUPER ?CAB |SUPERCREW |REGULAR CAB |CAB )?PICKUP|" +
    "ROADSTER|LIFTBACK|FASTBACK|SPORTBACK)(?:\\s+\\d+D)?\\s*$",
  "i"
);

function mapFuel(fuel: string | null, engine: string | null, make: string): string {
  const t = `${fuel ?? ""} ${engine ?? ""}`.toLowerCase();
  if (t.includes("hydrogen") || t.includes("fuel cell")) return "氢燃料";
  if (t.includes("plug-in") || t.includes("plug in") || t.includes("phev")) return "插电混动";
  if (t.includes("hybrid") || /\bhev\b/.test(t)) return "混动";
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

function mapDrivetrain(raw: string | null): string | null {
  const s = (raw || "").toUpperCase().trim();
  if (!s) return null;
  if (s.includes("AWD") || s.includes("ALL")) return "AWD";
  if (s.includes("4WD") || s.includes("4X4") || s.includes("FOUR")) return "4WD";
  if (s.includes("FWD") || s.includes("FRONT")) return "FWD";
  if (s.includes("RWD") || s.includes("REAR")) return "RWD";
  return null; // "2WD" 无法区分前/后驱
}

const UNAVAILABLE_RE = /sold|pending|deposit|hold|reserved/i;

function imageUrl(documentId: string): string {
  return `${IMAGE_BASE}/${documentId}.jpg`;
}

export function createDealerCenterDwsAdapter(config: DealerCenterDwsSiteConfig): SourceAdapter {
  const cache = new Map<string, DwsVehicle>();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const vehicleBase = config.vehicleBaseUrl ?? "inventory";

  function detailUrl(v: DwsVehicle): string {
    const make = slugify(v.Make ?? "") || "vehicle";
    const model = slugify(v.Model ?? "") || "vehicle";
    return `${baseUrl}/${vehicleBase}/${make}/${model}/${encodeURIComponent(v.StockNumber.toLowerCase())}/`;
  }

  async function listAll(): Promise<CrawlResult> {
    const serviceUrl =
      `/inv-scripts-v2/inv/vehicles?vc=a&f=${encodeURIComponent(FIELDS)}` +
      `&ps=${PAGE_SIZE}&pn=0&sb=pr%7Cd&sp=n&cb=dws_inventory_listing&dcid=${config.dcid}`;
    let data: DwsListResponse;
    try {
      const text = await proxyAjax(baseUrl, {
        action: "dws_inventory_service",
        requestType: "get_service_url_for_page",
        serviceUrl,
        newPageNumber: "0",
      });
      data = JSON.parse(text) as DwsListResponse;
      if (!Array.isArray(data?.Vehicles)) throw new Error("unexpected list response");
    } catch {
      return { refs: [], totalDeclared: null, pagesFetched: 0, failed: true };
    }

    cache.clear();
    const refs: SourceListingRef[] = [];
    for (const v of data.Vehicles) {
      if (!v.StockNumber) continue;
      if (v.Status != null && v.Status !== 0) continue;
      if (v.CustomStatus && UNAVAILABLE_RE.test(v.CustomStatus)) continue;
      const price = Math.round(v.VehiclePrice || v.TotalPrice || 0);
      if (!(price > 0)) continue;
      const cover = v.VehicleImages?.find((i) => i.DocumentId)?.DocumentId;
      if (!cover || !v.VehicleImageCount) continue;
      const vin = (v.Vin || "").toUpperCase();
      const id = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : v.StockNumber;
      if (cache.has(id)) continue;
      cache.set(id, v);
      refs.push({ sourceListingId: id, url: detailUrl(v) });
    }
    return {
      refs,
      // 接口一次返回全量(TotalRecordCount 含无价/无图的车,过滤是有意为之),
      // 不存在分页漏抓 —— 不报 totalDeclared,截断由 failed 兜底
      totalDeclared: null,
      pagesFetched: 1,
      failed: data.TotalRecordCount > data.Vehicles.length, // 超出单页上限 → 不做下架
    };
  }

  async function fetchGallery(v: DwsVehicle): Promise<string[]> {
    const text = await proxyAjax(baseUrl, {
      action: "dws_inventory_service",
      requestType: "get_car_by_stock_number",
      stockNumber: v.StockNumber,
    });
    const data = JSON.parse(text) as { VehicleImages?: DwsImage[] | null };
    const imgs = [...(data.VehicleImages ?? [])]
      .filter((i) => i.DocumentId)
      .sort((a, b) => (a.OrderIndex ?? 0) - (b.OrderIndex ?? 0));
    return [...new Set(imgs.map((i) => imageUrl(i.DocumentId as string)))];
  }

  async function fetchDetail(_fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing> {
    const v = cache.get(ref.sourceListingId);
    if (!v) throw new Error(`${config.key}: 缓存缺少 ${ref.sourceListingId}(需先 listAll)`);

    const year = Number(v.Year);
    if (!Number.isFinite(year) || year < 1950) throw new Error(`invalid year "${v.Year}"`);
    const make = canonicalMake(v.Make || "");
    const model = titleCase(v.Model || "");
    if (!make || !model) throw new Error(`missing make/model for ${ref.sourceListingId}`);
    const trimRaw = (v.Trim || "").replace(BODY_SUFFIX_RE, "").trim();
    const trim = trimRaw ? titleCase(trimRaw) : null;

    const price = Math.round(v.VehiclePrice || v.TotalPrice || 0);
    if (!(price > 0)) throw new Error("no price found");

    const vinRaw = (v.Vin || "").toUpperCase();
    const vin = /^[A-HJ-NPR-Z0-9]{17}$/.test(vinRaw) ? vinRaw : null;

    let images = await fetchGallery(v);
    if (images.length === 0) {
      const cover = v.VehicleImages?.find((i) => i.DocumentId)?.DocumentId;
      if (cover) images = [imageUrl(cover)];
    }
    if (images.length === 0) throw new Error("no photos found");

    const fuel_type = mapFuel(v.FuelType, v.Engine, make);
    const transmission = mapTransmission(`${v.Transmission ?? ""} ${v.TransmissionDetail ?? ""}`, fuel_type);

    let description: string | null = null;
    if (v.VehicleDescription && v.VehicleDescription.trim()) {
      const text = stripTags(v.VehicleDescription).split(/\n\s*Disclaimer:?/i)[0].trim();
      description = text || null;
    }

    const carfaxOneOwner = /1own/i.test(v.CarfaxIconUrl ?? "");
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
      mileage: Math.max(0, Math.round(v.Odometer ?? 0)),
      location: config.location,
      location_zh: config.location_zh,
      lat: config.lat,
      lng: config.lng,
      image_url: images[0],
      images: images.slice(1),
      fuel_type,
      transmission,
      exterior_color: mapColor(v.ExteriorColor),
      interior_color: mapColor(v.InteriorColor),
      drivetrain: mapDrivetrain(v.Drivetrain),
      vin,
      description,
      description_zh: null,
      features: [],
      seller_name: config.seller_name,
      phone: config.phone,
      carfax_url: v.CarfaxSecureUrl || null,
      carfax_summary: carfaxOneOwner ? "1 任车主" : null,
      source_listing_id: ref.sourceListingId,
      source_url: ref.url,
    };
  }

  return { key: config.key, languages: config.languages, listAll, fetchDetail };
}
