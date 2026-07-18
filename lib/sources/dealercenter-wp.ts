// Generic adapter factory for the DealerCenter-backed WordPress inventory
// template (used by the iDeal Auto Sales sites and other dealers on the same
// theme). Markup is machine-generated and very regular — parsed with regex.

import type {
  CrawlResult,
  FetchHtml,
  ParsedListing,
  SourceAdapter,
  SourceListingRef,
} from "./types";

const MAX_PAGES = 30;

export interface DealerCenterSiteConfig {
  key: string;
  baseUrl: string;
  /** Inventory list path, default "/certified-pre-owned/" */
  listPath?: string;
  // 兜底定位/联系信息 —— 系统账号有门店记录时同步引擎会覆盖为门店地址
  location: string;
  location_zh: string;
  lat: number;
  lng: number;
  seller_name: string;
  phone: string;
}

// Slug form (UPPER, hyphenated) → display form. Longest keys matched first.
const KNOWN_MAKES: Record<string, string> = {
  "MERCEDES-BENZ": "Mercedes-Benz",
  "LAND-ROVER": "Land Rover",
  "ALFA-ROMEO": "Alfa Romeo",
  "ASTON-MARTIN": "Aston Martin",
  "ROLLS-ROYCE": "Rolls-Royce",
  TOYOTA: "Toyota",
  HONDA: "Honda",
  FORD: "Ford",
  CHEVROLET: "Chevrolet",
  MAZDA: "Mazda",
  SUBARU: "Subaru",
  NISSAN: "Nissan",
  HYUNDAI: "Hyundai",
  KIA: "Kia",
  VOLKSWAGEN: "Volkswagen",
  BMW: "BMW",
  AUDI: "Audi",
  LEXUS: "Lexus",
  ACURA: "Acura",
  INFINITI: "Infiniti",
  CADILLAC: "Cadillac",
  LINCOLN: "Lincoln",
  BUICK: "Buick",
  JEEP: "Jeep",
  DODGE: "Dodge",
  RAM: "Ram",
  CHRYSLER: "Chrysler",
  TESLA: "Tesla",
  VOLVO: "Volvo",
  PORSCHE: "Porsche",
  JAGUAR: "Jaguar",
  MITSUBISHI: "Mitsubishi",
  GMC: "GMC",
  MINI: "MINI",
  FIAT: "Fiat",
  BENTLEY: "Bentley",
  MASERATI: "Maserati",
  FERRARI: "Ferrari",
  LAMBORGHINI: "Lamborghini",
  GENESIS: "Genesis",
  RIVIAN: "Rivian",
  LUCID: "Lucid",
  POLESTAR: "Polestar",
  SCION: "Scion",
  PONTIAC: "Pontiac",
  SATURN: "Saturn",
  MERCURY: "Mercury",
  HUMMER: "Hummer",
  SMART: "Smart",
  SUZUKI: "Suzuki",
  ISUZU: "Isuzu",
};
const MAKE_KEYS = Object.keys(KNOWN_MAKES).sort((a, b) => b.length - a.length);

const MAKE_ZH: Record<string, string> = {
  Toyota: "丰田",
  Honda: "本田",
  Ford: "福特",
  Chevrolet: "雪佛兰",
  Mazda: "马自达",
  Subaru: "斯巴鲁",
  Nissan: "日产",
  Hyundai: "现代",
  Kia: "起亚",
  Volkswagen: "大众",
  BMW: "宝马",
  "Mercedes-Benz": "奔驰",
  Audi: "奥迪",
  Lexus: "雷克萨斯",
  Acura: "讴歌",
  Infiniti: "英菲尼迪",
  Cadillac: "凯迪拉克",
  Lincoln: "林肯",
  Buick: "别克",
  Jeep: "吉普",
  Dodge: "道奇",
  Ram: "公羊",
  Chrysler: "克莱斯勒",
  Tesla: "特斯拉",
  Volvo: "沃尔沃",
  Porsche: "保时捷",
  "Land Rover": "路虎",
  Jaguar: "捷豹",
  Mitsubishi: "三菱",
  Fiat: "菲亚特",
  "Alfa Romeo": "阿尔法·罗密欧",
  "Aston Martin": "阿斯顿·马丁",
  "Rolls-Royce": "劳斯莱斯",
  Bentley: "宾利",
  Maserati: "玛莎拉蒂",
  Ferrari: "法拉利",
  Lamborghini: "兰博基尼",
  Genesis: "捷尼赛思",
  Polestar: "极星",
  Suzuki: "铃木",
};

const COLOR_ZH: [string, string][] = [
  ["burgundy", "酒红色"],
  ["maroon", "酒红色"],
  ["white", "白色"],
  ["black", "黑色"],
  ["gray", "灰色"],
  ["grey", "灰色"],
  ["silver", "银色"],
  ["blue", "蓝色"],
  ["red", "红色"],
  ["beige", "米色"],
  ["brown", "棕色"],
  ["green", "绿色"],
  ["gold", "金色"],
  ["orange", "橙色"],
  ["yellow", "黄色"],
  ["purple", "紫色"],
];

// Trailing body-style suffix (on the space-joined UPPER remainder after year+make)
const BODY_SUFFIX_RE = new RegExp(
  "\\s+(?:SPORT UTILITY|SUV|SEDAN|CONVERTIBLE|COUPE|HATCHBACK|WAGON|MINIVAN|" +
    "(?:CARGO |PASSENGER )?VAN|" +
    "(?:CREW CAB |EXTENDED CAB |DOUBLE CAB |QUAD CAB |KING CAB |SUPER CAB |CAB )?PICKUP|" +
    "ROADSTER|LIFTBACK|FASTBACK|SPORTBACK)(?:\\s+\\d+D)?$",
  "i"
);

// Tokens kept fully uppercase when title-casing
const ACRONYMS = new Set([
  "AWD", "FWD", "RWD", "XLE", "XSE", "XLT", "TRD", "AMG", "SRT", "GTI", "STI",
  "PHEV", "TDI", "TSI", "SEL", "SXT", "GLE", "GLC", "GLB", "GLA", "GLS", "TRX",
]);

function titleCaseToken(token: string): string {
  return token
    .split("-")
    .map((p) =>
      p
        .split("/")
        .map((q) => {
          if (/\d/.test(q) || q.length <= 3 || ACRONYMS.has(q.toUpperCase())) {
            return q.toUpperCase();
          }
          return q.charAt(0).toUpperCase() + q.slice(1).toLowerCase();
        })
        .join("/")
    )
    .join("-");
}

function titleCase(text: string): string {
  return text.trim().split(/\s+/).map(titleCaseToken).join(" ");
}

/**
 * The description's first line repeats the h1 with the site's own proper
 * casing ("2023 Acura MDX SH-AWD w/Technology Pkg Sport Utility 4D ..."),
 * so prefer its tokens; fall back to heuristic title-casing per token.
 */
function caseTitleTokens(h1Tokens: string[], description: string | null): string[] {
  let descTokens: string[] = [];
  if (description) {
    const firstLine = description.split("\n")[0]?.trim() ?? "";
    const candidate = firstLine.split(/\s+/);
    const matches = h1Tokens.every(
      (t, i) => candidate[i]?.toUpperCase() === t.toUpperCase()
    );
    if (matches) descTokens = candidate;
  }
  return h1Tokens.map((t, i) => {
    const cased = descTokens[i];
    if (cased && cased !== t && cased.toUpperCase() === t.toUpperCase()) return cased;
    return titleCaseToken(t);
  });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function parseIntStrict(text: string | undefined | null): number | null {
  if (!text) return null;
  const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapColor(raw: string | null): string | null {
  if (!raw) return null;
  const v = decodeEntities(raw).trim();
  if (!v || v === "-") return null;
  const lower = v.toLowerCase();
  for (const [en, zh] of COLOR_ZH) {
    if (lower.includes(en)) return zh;
  }
  return v;
}

/** Extract `<p class="name">LABEL</p><h4 class="two-ellipsis">VALUE</h4>` pairs. */
function parseSpecGrid(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const re = /<p class="name">([^<]*)<\/p>\s*<h4 class="two-ellipsis"[^>]*>([^<]*)<\/h4>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = decodeEntities(m[1]).trim();
    const value = decodeEntities(m[2]).trim();
    if (label && !(label in specs)) specs[label] = value;
  }
  return specs;
}

function mapFuelType(make: string, engineText: string): string {
  if (make === "Tesla") return "纯电";
  const t = engineText.toLowerCase();
  if (t.includes("plug-in") || t.includes("plug in")) return "插电混动";
  if (t.includes("hybrid")) return "混动";
  if (t.includes("electric")) return "纯电";
  if (t.includes("diesel")) return "柴油";
  return "汽油";
}

function mapTransmission(raw: string, fuelType: string): string {
  const t = raw.toLowerCase();
  if (t.includes("cvt")) return "CVT 无级";
  if (t.includes("manual") && !t.includes("auto")) return "MT 手动";
  if (/(?:1|single)[\s-]?speed/.test(t) || fuelType === "纯电") return "单速(电动车)";
  return "AT 自动";
}

/** Parse year + make from the slug; count how many h1 tokens the make spans. */
function parseYearMake(
  slug: string,
  h1Tokens: string[]
): { year: number; make: string; makeSlug: string; makeTokenCount: number } {
  const upperSlug = slug.toUpperCase();
  const yearMatch = upperSlug.match(/^(\d{4})-/);
  if (!yearMatch) throw new Error(`cannot parse year from slug "${slug}"`);
  const year = parseInt(yearMatch[1], 10);

  const afterYear = upperSlug.slice(yearMatch[0].length);
  let make: string | null = null;
  let makeSlug = "";
  for (const key of MAKE_KEYS) {
    if (afterYear === key || afterYear.startsWith(key + "-")) {
      make = KNOWN_MAKES[key];
      makeSlug = key;
      break;
    }
  }
  if (!make) {
    // Unknown make: take the first slug token, title-cased
    makeSlug = afterYear.split("-")[0];
    make = titleCaseToken(makeSlug);
  }

  // Multi-token makes may appear in the h1 as "MERCEDES-BENZ" (1 token)
  // or "LAND ROVER" (2 tokens)
  let makeTokenCount = 1;
  const parts = makeSlug.split("-");
  if (
    parts.length > 1 &&
    h1Tokens[1]?.toUpperCase() !== makeSlug &&
    parts.every((p, i) => h1Tokens[1 + i]?.toUpperCase() === p)
  ) {
    makeTokenCount = parts.length;
  }

  return { year, make, makeSlug, makeTokenCount };
}

const DETAIL_HREF_RE =
  /href="(\/[^"]*?\/details\/([^"/]+)\/([^"/]+)\/(\d+))\/?"/g;

async function listAll(config: DealerCenterSiteConfig, fetchHtml: FetchHtml): Promise<CrawlResult> {
  const listPath = config.listPath ?? "/certified-pre-owned/";
  const refs = new Map<string, SourceListingRef>();
  let totalDeclared: number | null = null;
  let pagesFetched = 0;
  let failed = false;

  for (let pg = 1; pg <= MAX_PAGES; pg++) {
    let html: string;
    try {
      html = await fetchHtml(`${config.baseUrl}${listPath}?pg=${pg}`);
    } catch {
      failed = true;
      break;
    }
    pagesFetched++;

    const totalMatch = html.match(/Results:\s*<b>(\d+)<\/b>/);
    if (totalMatch) totalDeclared = parseInt(totalMatch[1], 10);

    const before = refs.size;
    let m: RegExpExecArray | null;
    DETAIL_HREF_RE.lastIndex = 0;
    while ((m = DETAIL_HREF_RE.exec(html)) !== null) {
      const stockId = m[4];
      if (!refs.has(stockId)) {
        refs.set(stockId, { sourceListingId: stockId, url: `${config.baseUrl}${m[1]}/` });
      }
    }
    if (refs.size === before) break; // page added nothing new → done
  }

  return { refs: [...refs.values()], totalDeclared, pagesFetched, failed };
}

async function fetchDetail(
  config: DealerCenterSiteConfig,
  fetchHtml: FetchHtml,
  ref: SourceListingRef
): Promise<ParsedListing> {
  const raw = await fetchHtml(ref.url);
  const html = stripComments(raw);

  // URL parts: /certified-pre-owned/details/<SLUG>/<VIN17>/<STOCKID>/
  const urlMatch = ref.url.match(/\/details\/([^/]+)\/([^/]+)\/(\d+)\/?$/);
  if (!urlMatch) throw new Error(`unexpected detail URL: ${ref.url}`);
  const [, slug, slugVin] = urlMatch;

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (!h1Match) throw new Error("no <h1> title found");
  const h1 = decodeEntities(h1Match[1]).replace(/\s+/g, " ").trim();
  const h1Tokens = h1.split(" ");

  // Description first — its first line repeats the title with proper casing.
  let description: string | null = null;
  const descMatch = html.match(
    /id="description"[^>]*>\s*<div class="header">Description<\/div>([\s\S]*?)<\/div>/
  );
  if (descMatch) {
    // 裁掉尾部的 Disclaimer/贷款条款样板文字，只留车辆本身的描述
    const text = stripTags(descMatch[1]).split(/\nDisclaimer:?\s*\n/i)[0].trim();
    description = text.length > 0 ? text : null;
  }

  const { year, make, makeSlug, makeTokenCount } = parseYearMake(slug, h1Tokens);
  const casedTokens = caseTitleTokens(h1Tokens, description);
  const restCased = casedTokens.slice(1 + makeTokenCount).join(" ");
  let model = restCased.replace(BODY_SUFFIX_RE, "").trim();
  if (!model) {
    // h1 had nothing beyond the body style — fall back to the slug remainder
    const upperSlug = slug.toUpperCase();
    const afterMake = upperSlug
      .replace(/^\d{4}-/, "")
      .replace(new RegExp(`^${makeSlug}-?`), "")
      .replace(/-/g, " ");
    model = titleCase(afterMake.replace(BODY_SUFFIX_RE, "").trim() || afterMake);
  }
  if (!model) throw new Error(`cannot derive model from "${h1}"`);

  const title = `${year} ${make}${restCased ? ` ${restCased}` : ""}`;
  const title_zh = `${year} ${MAKE_ZH[make] ?? make} ${model}`;

  const vinMatch = html.match(/VIN:?\s*([A-HJ-NPR-Z0-9]{17})/i);
  const vin = (vinMatch ? vinMatch[1] : slugVin).toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error(`invalid VIN "${vin}"`);

  const specs = parseSpecGrid(html);
  const specValue = (label: string): string | null => {
    const v = specs[label]?.trim();
    return v && v !== "-" ? v : null;
  };

  // Mileage: "Mileage: 52,742 miles" span, fallback to spec grid
  const mileage =
    parseIntStrict(html.match(/Mileage:\s*([\d,]+)\s*miles/i)?.[1]) ??
    parseIntStrict(specValue("Mileage")) ??
    0;

  // Own price block sits right after the h1 (before the gallery); the page also
  // contains Was/Sale blocks for every other car further down — window keeps us safe.
  const h1Index = html.indexOf(h1Match[0]);
  const windowEnd = html.indexOf("big-car-gallery", h1Index);
  const priceText = stripTags(
    html.slice(h1Index, windowEnd > h1Index ? windowEnd : h1Index + 8000)
  );
  const salePrice = parseIntStrict(priceText.match(/Sale\s*\$?\s*([\d,]+)/)?.[1]);
  const wasPrice = parseIntStrict(priceText.match(/Was\s*\$?\s*([\d,]+)/)?.[1]);
  const price = salePrice ?? wasPrice ?? parseIntStrict(priceText.match(/\$\s*([\d,]+)/)?.[1]);
  if (!price) throw new Error("no price found");
  const original_price = wasPrice && wasPrice > price ? wasPrice : null;

  const engineText = `${specValue("Engine") ?? ""} ${h1}`;
  const fuel_type = mapFuelType(make, engineText);
  const transmission = mapTransmission(specValue("Transmission") ?? "", fuel_type);
  const exterior_color = mapColor(specValue("Exterior Color"));
  const interior_color = mapColor(specValue("Interior Color"));

  // Equipment: <div class="item">Feature</div> within the vehicle-equipment block
  const features: string[] = [];
  const equipStart = html.indexOf("vehicle-equipment");
  if (equipStart >= 0) {
    const equipEndCandidates = [
      html.indexOf('id="description"', equipStart),
      html.indexOf('class="discriptions', equipStart + 50),
    ].filter((i) => i > equipStart);
    const equipEnd = equipEndCandidates.length ? Math.min(...equipEndCandidates) : equipStart + 30_000;
    const equipHtml = html.slice(equipStart, equipEnd);
    const itemRe = /<div class="item">([^<]+)<\/div>/g;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(equipHtml)) !== null) {
      const item = decodeEntities(im[1]).trim();
      if (item && !features.includes(item)) features.push(item);
      if (features.length >= 45) break;
    }
  }

  // Drive Type spec is often "-" on this site — fall back to equipment/description
  const DRIVETRAINS = ["AWD", "4WD", "FWD", "RWD", "4X4"];
  let drivetrain = specValue("Drive Type")?.toUpperCase() ?? null;
  if (!drivetrain) {
    drivetrain =
      features.map((f) => f.toUpperCase()).find((f) => DRIVETRAINS.includes(f)) ?? null;
  }
  if (!drivetrain && description) {
    const dm = description.split("\n")[0]?.match(/\b(AWD|4WD|FWD|RWD|4X4)\b/i);
    if (dm) drivetrain = dm[1].toUpperCase();
  }

  // Photos: gallery anchors href="https://imagesdl.dealercenter.net/800/600/….jpg"
  // (hrefs only — lazy data-src thumbnails are <img> attributes, not hrefs)
  const imageSet = new Set<string>();
  const imgRe = /href="(https:\/\/imagesdl\.dealercenter\.net\/[^"]+?\.(?:jpe?g|png))"/gi;
  let gm: RegExpExecArray | null;
  while ((gm = imgRe.exec(html)) !== null) {
    imageSet.add(gm[1].replace("/800/600/", "/1600/1200/"));
  }
  const allImages = [...imageSet];
  if (allImages.length === 0) throw new Error("no photos found");

  return {
    title,
    title_zh,
    year,
    make,
    model,
    trim: null,
    price,
    original_price,
    mileage,
    location: config.location,
    location_zh: config.location_zh,
    lat: config.lat,
    lng: config.lng,
    image_url: allImages[0],
    images: allImages.slice(1),
    fuel_type,
    transmission,
    exterior_color,
    interior_color,
    drivetrain,
    vin,
    description,
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

export function createDealerCenterAdapter(config: DealerCenterSiteConfig): SourceAdapter {
  return {
    key: config.key,
    listAll: (fetchHtml) => listAll(config, fetchHtml),
    fetchDetail: (fetchHtml, ref) => fetchDetail(config, fetchHtml, ref),
  };
}
