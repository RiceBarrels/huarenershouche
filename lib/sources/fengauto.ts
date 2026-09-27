// 亚洲车行 / Feng Auto Sales(fengauto.com,芝加哥)—— GoDaddy Website Builder。
// 首页「Inventory」菜单组件列出全部车(年款车名/价格/亮点/里程 + 指向品牌分页的锚点
// /acura#<widgetId>)。品牌分页上每辆车是一个图库组件(id = 该锚点),标题
// "2014 Acura MDX - $8,200",紧随其后的文字块含 VIN/Mileage/颜色/驱动/Title/Notes。
// 图库图片不在 HTML 里,而在该页引用的 gpub script.js 的组件 props
// ("id":"<widgetId>","galleryImages":[…])中。
// 一次抓全:listAll 拉首页 + 每个品牌分页(HTML + script)≈ 1 + 2×分页数(~17)次直连请求,
// 解析结果缓存,fetchDetail 直接返回缓存(同 onenauto)。

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
} from "./custom-a-shared";

const BASE = "https://fengauto.com";

const FALLBACK = {
  seller_name: "Feng Auto Sales 亚洲车行",
  phone: "(773) 523-3388",
  location: "Chicago, IL",
  location_zh: "芝加哥",
  lat: 41.8344,
  lng: -87.6722,
};

interface MenuItem {
  page: string; // "/acura"
  anchor: string; // widget uuid
  title: string;
  price: number;
  highlights: string[];
  mileage: number | null;
  cover: string | null;
}

/** GoDaddy 对连续请求会回 429 —— 退避重试(5s / 15s / 30s)。 */
async function get(url: string): Promise<string> {
  const backoff = [5_000, 15_000, 30_000];
  for (let attempt = 0; ; attempt++) {
    const { status, text } = await rawGet(url);
    if (status === 200) return text;
    if (status !== 429 || attempt >= backoff.length) throw new Error(`HTTP ${status} for ${url}`);
    await sleep(backoff[attempt]);
  }
}

function wsimgUrl(src: string): string {
  // 去掉裁剪/缩放参数("/:/cr=…/rs=…"),取原图
  const base = src.replace(/^\/\//, "https://").split("/:/")[0];
  return base;
}

function parseHome(html: string): MenuItem[] {
  const items: MenuItem[] = [];
  const blocks = html.split(/data-aid="MENU_ITEM_/).slice(1);
  for (const b of blocks) {
    const href = b.match(/href="(\/[a-z0-9-]+)#([0-9a-f-]{36})"/i);
    const title = b.match(/_TITLE"[^>]*>([^<]+)</)?.[1];
    const priceText = b.match(/_PRICE"[^>]*>\s*\$?\s*([\d,]+)/)?.[1];
    if (!href || !title) continue;
    const price = priceText ? parseInt(priceText.replace(/,/g, ""), 10) : 0;
    const descHtml = b.match(/_DESC"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
    const desc = stripTags(descHtml.replace(/<\/p>/gi, "\n")).replace(/\u00a0/g, " ");
    const mileage = desc.match(/([\d,]+)\s*miles/i)?.[1];
    const highlights = desc
      .replace(/[\d,]+\s*miles/i, "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const img = b.match(/<img src="([^"]+)"/)?.[1];
    items.push({
      page: href[1],
      anchor: href[2],
      title: decodeEntities(title).replace(/\s+/g, " ").trim(),
      price,
      highlights,
      mileage: mileage ? parseInt(mileage.replace(/,/g, ""), 10) : null,
      cover: img ? wsimgUrl(decodeEntities(img)) : null,
    });
  }
  return items;
}

const SPEC_LABELS = [
  "VIN", "Make", "Model", "Trim", "Mileage", "Exterior Color", "Interior Color", "Seats",
  "Body Style", "Cylinder", "Drive Train", "Transmission", "Title", "Notes",
];
const SPEC_RE = new RegExp(`\\b(${SPEC_LABELS.map((l) => l.replace(/ /g, "\\s+")).join("|")})\\s*:`, "g");

function parseSpecs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hits: { label: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  SPEC_RE.lastIndex = 0;
  while ((m = SPEC_RE.exec(text)) !== null) {
    hits.push({ label: m[1].replace(/\s+/g, " "), start: m.index, end: m.index + m[0].length });
  }
  hits.forEach((h, i) => {
    const value = text
      .slice(h.end, i + 1 < hits.length ? hits[i + 1].start : undefined)
      .replace(/\s+/g, " ")
      .trim();
    if (!(h.label in out)) out[h.label] = value;
  });
  return out;
}

/** gpub script 里各图库组件的图片:widgetId → 原图 URL[] */
function parseGalleries(js: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const re = /\\?"id\\?":\\?"([0-9a-f-]{36})\\?",\\?"galleryImages\\?":\[([\s\S]*?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js)) !== null) {
    const urls = [...m[2].matchAll(/\\?"image\\?":\\?"(\/\/img1\.wsimg\.com\/[^"\\]+)/g)].map((x) => wsimgUrl(x[1]));
    if (urls.length && !map.has(m[1])) map.set(m[1], [...new Set(urls)]);
  }
  return map;
}

interface PageData {
  segments: Map<string, string>; // anchor → 纯文本(标题+规格)
  galleries: Map<string, string[]>;
}

async function fetchPage(path: string, anchors: string[]): Promise<PageData> {
  const html = await get(`${BASE}${path}`);
  // 每辆车的文字段:从其图库组件 id 到下一辆车的组件 id(或页脚)
  const positions = anchors
    .map((a) => ({ a, i: html.indexOf(`id="${a}"`) }))
    .filter((p) => p.i >= 0)
    .sort((x, y) => x.i - y.i);
  const footer = html.search(/Powered by|data-aid="FOOTER_/);
  const segments = new Map<string, string>();
  positions.forEach((p, idx) => {
    const rawEnd = idx + 1 < positions.length ? positions[idx + 1].i : footer > p.i ? footer : p.i + 60_000;
    // 结束位置落在下一个标签内部(id="…" / data-aid=…),退回到该标签的 "<"
    const end = Math.max(p.i, html.lastIndexOf("<", rawEnd));
    const seg = html.slice(p.i, end).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
    segments.set(p.a, stripTags(seg.replace(/<\/(p|h\d|div|li)>/gi, "\n")).replace(/\u00a0/g, " "));
  });

  const galleries = new Map<string, string[]>();
  const scripts = [...html.matchAll(/<script[^>]+src="(\/\/img1\.wsimg\.com\/blobby\/go\/[^"]+\/script\.js)"/g)].map((m) => m[1]);
  for (const src of scripts) {
    try {
      const js = await get(`https:${decodeEntities(src)}`);
      for (const [k, v] of parseGalleries(js)) if (!galleries.has(k)) galleries.set(k, v);
    } catch {
      /* 图库脚本失败 → 退回首页封面图 */
    }
  }
  return { segments, galleries };
}

function buildListing(item: MenuItem, page: PageData): ParsedListing | null {
  const seg = page.segments.get(item.anchor) ?? "";
  const specs = parseSpecs(seg);
  const headerPrice = seg.match(/-\s*\$\s*([\d,]+)/)?.[1];
  const price = item.price || (headerPrice ? parseInt(headerPrice.replace(/,/g, ""), 10) : 0);
  if (!(price > 0)) return null;

  const titleMatch = item.title.match(/^(\d{4})\s+(.+)$/);
  if (!titleMatch) return null;
  const year = parseInt(titleMatch[1], 10);
  // 以标题(首页/分页标题,车行最常维护)为准;规格块偶有复制粘贴错误(如 xB 写成 Toyota Matrix)
  const afterYear = titleMatch[2];
  const specMake = canonicalMake(specs["Make"] || "");
  const makeWords = specMake && afterYear.toLowerCase().startsWith(specMake.toLowerCase() + " ")
    ? specMake.split(" ").length
    : 1;
  const make = canonicalMake(afterYear.split(" ").slice(0, makeWords).join(" "));
  const makeZhName = makeZh(make);
  // 标题里品牌之后的部分 = 车型 + 配置
  const rest = afterYear.split(" ").slice(makeWords).join(" ").trim();
  const specModel = (specs["Model"] || "").trim();
  const model =
    specModel && rest.toLowerCase().startsWith(specModel.toLowerCase()) ? specModel : rest.split(" ")[0] || "";
  if (!make || !model) return null;
  let trim = rest.slice(model.length).trim();
  if (!trim && specModel.toLowerCase() === model.toLowerCase()) trim = specs["Trim"] || "";
  trim = trim.replace(/^[-,\s]+/, "").trim();

  const mileageSpec = parseInt((specs["Mileage"] || "").replace(/[^\d]/g, ""), 10);
  const mileage = Number.isFinite(mileageSpec) ? mileageSpec : item.mileage;
  if (mileage == null) return null;

  const images = page.galleries.get(item.anchor) ?? (item.cover ? [item.cover] : []);
  if (images.length === 0) return null;

  const vinRaw = (specs["VIN"] || "").toUpperCase().replace(/\s+/g, "");
  const vin = isValidVin(vinRaw) ? vinRaw : null;
  const notes = (specs["Notes"] || "").replace(/^[,\s]+/, "").trim();
  const highlights: string[] = [];
  for (const h of [...item.highlights, ...notes.split(",")]) {
    const t = h.trim();
    if (t && !highlights.some((x) => x.toLowerCase() === t.toLowerCase())) highlights.push(t);
  }
  const blob = `${item.title} ${notes} ${item.highlights.join(" ")}`;
  const titleStatus = specs["Title"] || "";

  const descLines = [
    item.title,
    [
      specs["Body Style"],
      specs["Cylinder"],
      specs["Drive Train"],
      specs["Seats"] ? `${specs["Seats"]} seats` : null,
      `${mileage.toLocaleString("en-US")} miles`,
    ]
      .filter(Boolean)
      .join(", "),
    titleStatus ? `Title: ${titleStatus}` : null,
    highlights.length ? highlights.join(", ") : null,
  ].filter(Boolean);

  const title = item.title;
  const title_zh = `${year} ${makeZhName} ${rest}`.trim();

  return {
    title,
    title_zh,
    year,
    make,
    model,
    trim: trim || null,
    price,
    original_price: null,
    mileage,
    location: FALLBACK.location,
    location_zh: FALLBACK.location_zh,
    lat: FALLBACK.lat,
    lng: FALLBACK.lng,
    image_url: images[0],
    images: images.slice(1),
    fuel_type: mapFuel(blob, make),
    transmission: mapTransmission(`${specs["Transmission"] ?? ""} ${blob}`),
    exterior_color: colorZh(specs["Exterior Color"] || null),
    interior_color: colorZh(specs["Interior Color"] || null),
    drivetrain: mapDrivetrain(specs["Drive Train"]) ?? mapDrivetrain(item.title),
    vin,
    description: descLines.join("\n"),
    description_zh: null,
    features: highlights,
    seller_name: FALLBACK.seller_name,
    phone: FALLBACK.phone,
    carfax_url: null,
    carfax_summary: null,
    source_listing_id: vin ?? item.anchor,
    source_url: `${BASE}${item.page}#${item.anchor}`,
  };
}

export function createFengAutoAdapter(): SourceAdapter {
  let cache = new Map<string, ParsedListing>();

  async function listAll(): Promise<CrawlResult> {
    let items: MenuItem[];
    try {
      items = parseHome(await get(`${BASE}/`));
    } catch {
      return { refs: [], totalDeclared: null, pagesFetched: 0, failed: true };
    }
    const priced = items.filter((i) => i.price > 0);
    const byPage = new Map<string, MenuItem[]>();
    for (const it of priced) byPage.set(it.page, [...(byPage.get(it.page) ?? []), it]);

    cache = new Map();
    const refs: SourceListingRef[] = [];
    let pagesFetched = 1;
    let failed = false;
    for (const [path, pageItems] of byPage) {
      let page: PageData;
      try {
        page = await fetchPage(path, pageItems.map((i) => i.anchor));
        pagesFetched++;
      } catch {
        failed = true; // 某品牌页失败 → 本轮不做下架
        continue;
      }
      for (const it of pageItems) {
        const parsed = buildListing(it, page);
        if (!parsed || cache.has(parsed.source_listing_id)) continue;
        cache.set(parsed.source_listing_id, parsed);
        refs.push({ sourceListingId: parsed.source_listing_id, url: parsed.source_url });
      }
      await sleep(1000);
    }
    return { refs, totalDeclared: priced.length, pagesFetched, failed };
  }

  async function fetchDetail(_fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing> {
    const p = cache.get(ref.sourceListingId);
    if (!p) throw new Error(`fengauto: 缓存缺少 ${ref.sourceListingId}(需先 listAll)`);
    return p;
  }

  return { key: "fengauto", languages: ["zh", "en"], listAll, fetchDetail };
}
