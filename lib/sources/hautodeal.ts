// 华诚车行 / East West Trust(hautodeal.com,罗斯米德)—— 美店邦(meidianbang)建站。
// 库存页 /Content/364684.html 服务端渲染全部车辆卡片(名称/价格/详情链接 /<slug>-PG<id>);
// 无价格的卡片显示 "Interview"(电询)→ 跳过。详情页 JSON-LD(Product)含图库与参数
// (Stock#/VIN/Year/Make/Model/Trim/Mileage/Engine/Trans/Drive/Color…),正文有车况描述。
// 中文版 /cn/ 不展示车辆,内容全是英文。
// 站点有自研 WAF(CsrfFilter):短时间请求过多返回 429「安全验证」算术题页 → 放慢节奏,
// 命中后等待重试。每轮 ≈ 1 + 有价车数(<10)次请求,直连。

import type { CrawlResult, FetchHtml, ParsedListing, SourceAdapter, SourceListingRef } from "./types";
import { sleep } from "./types";
import { decodeEntities, stripTags } from "./dealercenter-wp";
import {
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

const BASE = "https://hautodeal.com";
const LIST_URL = `${BASE}/Content/364684.html`;
const REQUEST_GAP_MS = 2500;
const WAF_WAIT_MS = 45_000;

const FALLBACK = {
  seller_name: "East West Trust 华诚车行",
  phone: "(909) 524-2699",
  location: "Rosemead, CA",
  location_zh: "洛杉矶罗斯米德",
  lat: 34.0608,
  lng: -118.0905,
};

let lastRequestAt = 0;

/** 节流 + WAF 感知的 GET:命中 429/「安全验证」则等待后重试(最多 2 次)。 */
async function politeGet(url: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const { status, text } = await rawGet(url);
    const blocked = status === 429 || (text.length < 5000 && text.includes("安全验证"));
    if (!blocked) {
      if (status !== 200) throw new Error(`HTTP ${status} for ${url}`);
      return text;
    }
    if (attempt < 2) await sleep(WAF_WAIT_MS);
  }
  throw new Error(`hautodeal WAF 限流(429 安全验证)for ${url}`);
}

interface ListItem {
  href: string;
  name: string;
  price: number;
}

function parseList(html: string): ListItem[] {
  const items: ListItem[] = [];
  const seen = new Set<string>();
  const re = /<li class="pro-item[\s\S]*?<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const block = m[0];
    const href = block.match(/href='(\/[^']*-PG\d+)'/)?.[1];
    if (!href || seen.has(href)) continue;
    const name = decodeEntities(block.match(/class="pro-name[^"]*"[^>]*>([^<]*)</)?.[1] ?? "").trim();
    const priceText = block.match(/class="pro-price[^"]*"[^>]*>\s*\$?\s*([\d,]+(?:\.\d+)?)/)?.[1];
    const price = priceText ? Math.round(parseFloat(priceText.replace(/,/g, ""))) : 0;
    if (!(price > 0)) continue; // "Interview" = 电询
    seen.add(href);
    items.push({ href, name, price });
  }
  return items;
}

interface LdProduct {
  name?: string;
  image?: string[];
  additionalProperty?: { name: string; value: string }[];
}

function parseLdProduct(html: string): LdProduct | null {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const graph: unknown[] = Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
      const product = graph.find(
        (g): g is LdProduct => !!g && typeof g === "object" && (g as { "@type"?: string })["@type"] === "Product"
      );
      if (product) return product;
    } catch {
      /* ignore malformed block */
    }
  }
  return null;
}

// 描述里的联系/样板句
const BOILERPLATE_RE = /(please let me know[^.]*\.?|call\s*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}[^.]*\.?|come and check[^.]*\.?)/gi;

/** <div class="particularsMain introduceMap"><p>…</p>…</div>;去掉单独重复车名的段落与联系样板句。 */
function parseDescription(html: string, name: string): string | null {
  const m = html.match(/<div class="particularsMain[^"]*">([\s\S]*?)<\/div>/);
  if (!m) return null;
  const nameKey = name.toLowerCase().replace(/\s+/g, " ").trim();
  const lines = stripTags(m[1].replace(/<\/p>/gi, "\n"))
    .split("\n")
    .map((l) => l.replace(BOILERPLATE_RE, "").replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0 && l.toLowerCase() !== nameKey);
  const text = [...new Set(lines)].join("\n").trim();
  return text.length >= 10 ? text : null;
}

export function createHautodealAdapter(): SourceAdapter {
  const listCache = new Map<string, ListItem>();

  async function listAll(): Promise<CrawlResult> {
    let html: string;
    try {
      html = await politeGet(LIST_URL);
    } catch {
      return { refs: [], totalDeclared: null, pagesFetched: 0, failed: true };
    }
    listCache.clear();
    const refs: SourceListingRef[] = [];
    for (const it of parseList(html)) {
      const id = it.href.match(/-PG(\d+)$/)?.[1];
      if (!id) continue;
      listCache.set(id, it);
      refs.push({ sourceListingId: `PG${id}`, url: `${BASE}${it.href}` });
    }
    // 站点不声明总数;列表页一次渲染全部卡片
    return { refs, totalDeclared: null, pagesFetched: 1, failed: false };
  }

  async function fetchDetail(_fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing> {
    const html = await politeGet(ref.url);
    const product = parseLdProduct(html);
    if (!product) throw new Error("no JSON-LD Product found");
    const props: Record<string, string> = {};
    for (const p of product.additionalProperty ?? []) {
      const k = p.name.replace(/[:：#\s]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      if (k && !(k in props)) props[k] = decodeEntities(String(p.value ?? "")).trim();
    }
    const listItem = listCache.get(ref.sourceListingId.replace(/^PG/, ""));
    const name = decodeEntities(listItem?.name || product.name || "").replace(/\s+/g, " ").trim();

    const year = parseInt(props["year"] || name.match(/^(\d{4})\b/)?.[1] || "0", 10);
    if (!(year > 1950)) throw new Error(`invalid year for ${ref.url}`);
    const make = canonicalMake(props["make"] || name.split(" ")[1] || "");
    const model = titleCase(props["model"] || "").replace(/\bPlug IN\b/i, "Plug-In");
    if (!make || !model) throw new Error(`missing make/model for ${ref.url}`);
    // 站方常把 "PLUS" 误写成 "PLUG"
    const trimRaw = titleCase(props["trim"] || "").replace(/\bPlug\b/, "Plus");
    const trim = trimRaw && !/^base$/i.test(trimRaw) ? trimRaw : null;

    // 价格以详情页为准,列表页兜底
    const detailPrice = html.match(/<span class="price-text">\s*\$?\s*([\d,]+(?:\.\d+)?)\s*<\/span>/)?.[1];
    const price = Math.round(parseFloat((detailPrice || "").replace(/,/g, ""))) || listItem?.price || 0;
    if (!(price > 0)) throw new Error("no price found");

    const mileage = parseInt((props["mileage"] || "").replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(mileage)) throw new Error("no mileage found");

    const images = [
      ...new Set(
        (product.image ?? [])
          .map((u) => u.replace(/^\/\//, "https://").replace(/_s(\.(?:jpe?g|png|webp))$/i, "_b$1"))
          .filter((u) => /^https?:\/\//.test(u))
      ),
    ];
    if (images.length === 0) throw new Error("no photos found");

    const vinRaw = (props["vin"] || "").toUpperCase().replace(/\s+/g, "");
    const engine = props["engine"] || "";
    const fuel_type = mapFuel(`${engine} ${name} ${model}`, make);
    const transmission = mapTransmission(props["trans"] || "");
    const drivetrain = mapDrivetrain(props["drive"]);
    const interior = props["interior"] ? titleCase(props["interior"].replace(/lether/i, "leather")) : null;

    const title = `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`;
    const title_zh = `${year} ${makeZh(make)} ${model}${trim ? ` ${trim}` : ""}`;
    const description = parseDescription(html, name);

    const features: string[] = [];
    if (interior) features.push(`${interior} Interior`);
    if (props["body type"] && !/^\d+D$/i.test(props["body type"])) features.push(titleCase(props["body type"]));

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
      location: FALLBACK.location,
      location_zh: FALLBACK.location_zh,
      lat: FALLBACK.lat,
      lng: FALLBACK.lng,
      image_url: images[0],
      images: images.slice(1),
      fuel_type,
      transmission,
      exterior_color: colorZh(props["color"]),
      interior_color: colorZh(props["interior color"]),
      drivetrain,
      vin: isValidVin(vinRaw) ? vinRaw : null,
      description,
      description_zh: null,
      features,
      seller_name: FALLBACK.seller_name,
      phone: FALLBACK.phone,
      carfax_url: null,
      carfax_summary: null,
      source_listing_id: ref.sourceListingId,
      source_url: ref.url,
    };
  }

  return { key: "hautodeal", languages: ["zh", "en"], listAll, fetchDetail };
}
