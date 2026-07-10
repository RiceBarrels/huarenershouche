// 程序化 SEO 落地页定义。所有 /cars/<slug> 页面都由这里的定义驱动：
// generateStaticParams、generateMetadata、页面文案、车源过滤、内链。
// 纯数据模块（无 "use client"），server component 可直接 import。

import { MAKES, MAKES_ZH, HOT_MAKES } from "@/lib/mock-data";
import { BODY_STYLE_OPTIONS } from "@/lib/body-style";

export const SITE_URL = "https://www.clcauto.com";
export const SITE_NAME = "常来车网";

// ── 州数据（与 browse 页 location 代码一致）──
export interface SeoState {
  abbr: string; // browse 页 location 参数
  en: string;
  zh: string;
  slug: string;
}

export const SEO_STATES: SeoState[] = [
  { abbr: "CA", en: "California", zh: "加州", slug: "california" },
  { abbr: "NY", en: "New York", zh: "纽约州", slug: "new-york" },
  { abbr: "TX", en: "Texas", zh: "德州", slug: "texas" },
  { abbr: "FL", en: "Florida", zh: "佛州", slug: "florida" },
  { abbr: "IL", en: "Illinois", zh: "伊利诺伊州", slug: "illinois" },
  { abbr: "WA", en: "Washington", zh: "华盛顿州", slug: "washington" },
  { abbr: "MA", en: "Massachusetts", zh: "麻省", slug: "massachusetts" },
  { abbr: "NJ", en: "New Jersey", zh: "新泽西州", slug: "new-jersey" },
  { abbr: "PA", en: "Pennsylvania", zh: "宾州", slug: "pennsylvania" },
  { abbr: "GA", en: "Georgia", zh: "乔治亚州", slug: "georgia" },
  { abbr: "OH", en: "Ohio", zh: "俄亥俄州", slug: "ohio" },
  { abbr: "MI", en: "Michigan", zh: "密歇根州", slug: "michigan" },
  { abbr: "NC", en: "North Carolina", zh: "北卡罗来纳州", slug: "north-carolina" },
  { abbr: "VA", en: "Virginia", zh: "弗吉尼亚州", slug: "virginia" },
  { abbr: "AZ", en: "Arizona", zh: "亚利桑那州", slug: "arizona" },
  { abbr: "MD", en: "Maryland", zh: "马里兰州", slug: "maryland" },
  { abbr: "CO", en: "Colorado", zh: "科罗拉多州", slug: "colorado" },
  { abbr: "MN", en: "Minnesota", zh: "明尼苏达州", slug: "minnesota" },
  { abbr: "OR", en: "Oregon", zh: "俄勒冈州", slug: "oregon" },
  { abbr: "NV", en: "Nevada", zh: "内华达州", slug: "nevada" },
  { abbr: "CT", en: "Connecticut", zh: "康州", slug: "connecticut" },
  { abbr: "HI", en: "Hawaii", zh: "夏威夷", slug: "hawaii" },
  { abbr: "AL", en: "Alabama", zh: "阿拉巴马州", slug: "alabama" },
  { abbr: "AK", en: "Alaska", zh: "阿拉斯加州", slug: "alaska" },
  { abbr: "AR", en: "Arkansas", zh: "阿肯色州", slug: "arkansas" },
  { abbr: "DE", en: "Delaware", zh: "特拉华州", slug: "delaware" },
  { abbr: "DC", en: "Washington D.C.", zh: "华盛顿特区", slug: "washington-dc" },
  { abbr: "ID", en: "Idaho", zh: "爱达荷州", slug: "idaho" },
  { abbr: "IN", en: "Indiana", zh: "印第安纳州", slug: "indiana" },
  { abbr: "IA", en: "Iowa", zh: "爱荷华州", slug: "iowa" },
  { abbr: "KS", en: "Kansas", zh: "堪萨斯州", slug: "kansas" },
  { abbr: "KY", en: "Kentucky", zh: "肯塔基州", slug: "kentucky" },
  { abbr: "LA", en: "Louisiana", zh: "路易斯安那州", slug: "louisiana" },
  { abbr: "ME", en: "Maine", zh: "缅因州", slug: "maine" },
  { abbr: "MS", en: "Mississippi", zh: "密西西比州", slug: "mississippi" },
  { abbr: "MO", en: "Missouri", zh: "密苏里州", slug: "missouri" },
  { abbr: "MT", en: "Montana", zh: "蒙大拿州", slug: "montana" },
  { abbr: "NE", en: "Nebraska", zh: "内布拉斯加州", slug: "nebraska" },
  { abbr: "NH", en: "New Hampshire", zh: "新罕布什尔州", slug: "new-hampshire" },
  { abbr: "NM", en: "New Mexico", zh: "新墨西哥州", slug: "new-mexico" },
  { abbr: "ND", en: "North Dakota", zh: "北达科他州", slug: "north-dakota" },
  { abbr: "OK", en: "Oklahoma", zh: "俄克拉荷马州", slug: "oklahoma" },
  { abbr: "RI", en: "Rhode Island", zh: "罗德岛州", slug: "rhode-island" },
  { abbr: "SC", en: "South Carolina", zh: "南卡罗来纳州", slug: "south-carolina" },
  { abbr: "SD", en: "South Dakota", zh: "南达科他州", slug: "south-dakota" },
  { abbr: "TN", en: "Tennessee", zh: "田纳西州", slug: "tennessee" },
  { abbr: "UT", en: "Utah", zh: "犹他州", slug: "utah" },
  { abbr: "VT", en: "Vermont", zh: "佛蒙特州", slug: "vermont" },
  { abbr: "WV", en: "West Virginia", zh: "西弗吉尼亚州", slug: "west-virginia" },
  { abbr: "WI", en: "Wisconsin", zh: "威斯康星州", slug: "wisconsin" },
  { abbr: "WY", en: "Wyoming", zh: "怀俄明州", slug: "wyoming" },
];

// 华人聚集城市（location 代码与 browse 页 US_STATES subRegions 一致）
export interface SeoCity {
  code: string; // browse 页 location 参数
  en: string;
  zh: string;
  slug: string;
  stateAbbr: string;
  // 车源 location 字段里可能出现的关键词（中英），用于客户端匹配
  keywords: string[];
}

export const SEO_CITIES: SeoCity[] = [
  { code: "CA-LA", en: "Los Angeles", zh: "洛杉矶", slug: "los-angeles", stateAbbr: "CA", keywords: ["los angeles", "洛杉矶"] },
  { code: "CA-SF", en: "San Francisco", zh: "旧金山", slug: "san-francisco", stateAbbr: "CA", keywords: ["san francisco", "旧金山", "三藩"] },
  { code: "CA-SD", en: "San Diego", zh: "圣地亚哥", slug: "san-diego", stateAbbr: "CA", keywords: ["san diego", "圣地亚哥", "圣迭戈"] },
  { code: "CA-SJ", en: "San Jose", zh: "圣何塞", slug: "san-jose", stateAbbr: "CA", keywords: ["san jose", "圣何塞", "圣荷西"] },
  { code: "CA-SAC", en: "Sacramento", zh: "萨克拉门托", slug: "sacramento", stateAbbr: "CA", keywords: ["sacramento", "萨克拉门托"] },
  { code: "CA-OC", en: "Orange County", zh: "橙县", slug: "orange-county", stateAbbr: "CA", keywords: ["irvine", "orange county", "橙县", "尔湾", "爾灣"] },
  { code: "CA-IE", en: "Inland Empire", zh: "内陆帝国", slug: "inland-empire", stateAbbr: "CA", keywords: ["riverside", "san bernardino", "内陆帝国"] },
  { code: "NY-NYC", en: "New York City", zh: "纽约市", slug: "new-york-city", stateAbbr: "NY", keywords: ["new york", "nyc", "纽约"] },
  { code: "NY-MAN", en: "Manhattan", zh: "曼哈顿", slug: "manhattan", stateAbbr: "NY", keywords: ["manhattan", "曼哈顿"] },
  { code: "NY-BK", en: "Brooklyn", zh: "布鲁克林", slug: "brooklyn", stateAbbr: "NY", keywords: ["brooklyn", "布鲁克林"] },
  { code: "NY-QN", en: "Queens", zh: "皇后区法拉盛", slug: "queens-flushing", stateAbbr: "NY", keywords: ["queens", "flushing", "皇后区", "法拉盛"] },
  { code: "NY-LI", en: "Long Island", zh: "长岛", slug: "long-island", stateAbbr: "NY", keywords: ["long island", "长岛"] },
  { code: "TX-HOU", en: "Houston", zh: "休斯顿", slug: "houston", stateAbbr: "TX", keywords: ["houston", "休斯顿", "休斯敦"] },
  { code: "TX-DAL", en: "Dallas", zh: "达拉斯", slug: "dallas", stateAbbr: "TX", keywords: ["dallas", "plano", "达拉斯", "普莱诺"] },
  { code: "TX-AUS", en: "Austin", zh: "奥斯汀", slug: "austin", stateAbbr: "TX", keywords: ["austin", "奥斯汀"] },
  { code: "TX-SA", en: "San Antonio", zh: "圣安东尼奥", slug: "san-antonio", stateAbbr: "TX", keywords: ["san antonio", "圣安东尼奥"] },
  { code: "FL-MIA", en: "Miami", zh: "迈阿密", slug: "miami", stateAbbr: "FL", keywords: ["miami", "迈阿密"] },
  { code: "FL-ORL", en: "Orlando", zh: "奥兰多", slug: "orlando", stateAbbr: "FL", keywords: ["orlando", "奥兰多"] },
  { code: "FL-TPA", en: "Tampa", zh: "坦帕", slug: "tampa", stateAbbr: "FL", keywords: ["tampa", "坦帕"] },
  { code: "IL-CHI", en: "Chicago", zh: "芝加哥", slug: "chicago", stateAbbr: "IL", keywords: ["chicago", "芝加哥"] },
  { code: "WA-SEA", en: "Seattle", zh: "西雅图", slug: "seattle", stateAbbr: "WA", keywords: ["seattle", "bellevue", "西雅图", "贝尔维尤"] },
  { code: "MA-BOS", en: "Boston", zh: "波士顿", slug: "boston", stateAbbr: "MA", keywords: ["boston", "波士顿"] },
  { code: "PA-PHL", en: "Philadelphia", zh: "费城", slug: "philadelphia", stateAbbr: "PA", keywords: ["philadelphia", "费城"] },
  { code: "PA-PIT", en: "Pittsburgh", zh: "匹兹堡", slug: "pittsburgh", stateAbbr: "PA", keywords: ["pittsburgh", "匹兹堡"] },
  { code: "GA-ATL", en: "Atlanta", zh: "亚特兰大", slug: "atlanta", stateAbbr: "GA", keywords: ["atlanta", "亚特兰大"] },
];

// 华人多、车源多的州（用于品牌×州组合页）
export const HOT_STATE_ABBRS = ["CA", "NY", "TX", "FL", "IL", "WA", "MA", "NJ", "PA", "GA", "VA", "AZ"];

// 价格档
export const SEO_PRICE_PAGES = [5000, 8000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

// 年份页
export const SEO_YEARS = Array.from({ length: 15 }, (_, i) => 2012 + i); // 2012..2026

// 燃油类型页
export const SEO_FUELS = [
  { slug: "electric", value: "纯电", zh: "电动车", en: "EV" },
  { slug: "hybrid", value: "混动", zh: "混动车", en: "Hybrid" },
  { slug: "plug-in-hybrid", value: "插电混动", zh: "插电混动车", en: "PHEV" },
  { slug: "gas", value: "汽油", zh: "汽油车", en: "Gas" },
];

// ── 页面定义 ──

/** SeoCarList（客户端）用来过滤车源的条件 */
export interface SeoListFilter {
  make?: string;
  /** 匹配 car.location 结尾 ", XX" 的州缩写 */
  stateAbbr?: string;
  /** 匹配 car.location / location_zh 包含任一关键词（小写） */
  cityKeywords?: string[];
  bodyStyle?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
}

export type SeoPageKind =
  | "make"
  | "state"
  | "city"
  | "make-state"
  | "body"
  | "price"
  | "year"
  | "fuel";

export interface SeoPageDef {
  /** /cars/ 下的路径，可含一层子路径，如 "toyota" 或 "toyota/california" */
  slug: string;
  kind: SeoPageKind;
  title: string;
  description: string;
  h1: string;
  /** SEO 正文段落 */
  intro: string[];
  /** 面包屑显示名 */
  label: string;
  /** 跳转 /browse 的查询参数 */
  browseParams: Record<string, string>;
  listFilter: SeoListFilter;
}

export function makeSlug(make: string): string {
  return make.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const SELLABLE_MAKES = MAKES.filter((m) => m !== "Other");

function makePage(make: string): SeoPageDef {
  const zh = MAKES_ZH[make] || make;
  return {
    slug: makeSlug(make),
    kind: "make",
    label: `${zh} ${make}`,
    title: `二手${zh} ${make} - 北美华人${zh}二手车买卖 | ${SITE_NAME}`,
    description: `${SITE_NAME}${zh}二手车专区：查看北美华人车行与个人卖家发布的二手 ${make} 车源，支持按州、城市、价格、里程筛选，提供 VIN 查询与 Carfax 报告，中文沟通更放心。`,
    h1: `二手${zh} ${make}`,
    intro: [
      `在${SITE_NAME}选购二手${zh}（${make}），车源来自北美各地的华人车行和个人卖家。每辆车都可以查看里程、车况描述和实拍照片，支持 VIN 查询 NHTSA 召回记录，部分车源附带 Carfax 报告，买车前信息一目了然。`,
      `无论你在加州、纽约还是德州，都可以按距离筛选附近的${zh}车源，直接和卖家中文沟通，约看车、谈价格更顺畅。卖${zh}也一样：免费发布，无中间商抽成。`,
    ],
    browseParams: { make },
    listFilter: { make },
  };
}

function statePage(s: SeoState): SeoPageDef {
  return {
    slug: s.slug,
    kind: "state",
    label: s.zh,
    title: `${s.zh}二手车 - ${s.en} 华人二手车买卖平台 | ${SITE_NAME}`,
    description: `${s.zh}（${s.en}）华人二手车市场：本地华人车行与个人卖家直售，丰田、本田、宝马、特斯拉等热门品牌车源，中文服务，免费发布，支持按城市和距离筛选。`,
    h1: `${s.zh}二手车`,
    intro: [
      `${SITE_NAME}${s.zh}专区汇集 ${s.en} 本地的华人二手车源。相比 Craigslist 和 Facebook Marketplace，这里全中文沟通，卖家多为华人车行和同城华人，看车、验车、过户交流无障碍。`,
      `支持按城市、Zipcode 和距离范围筛选，也可以按品牌、价格、里程、车龄精确查找。看中的车可以直接查 VIN 召回记录，放心下手。`,
    ],
    browseParams: { location: s.abbr },
    listFilter: { stateAbbr: s.abbr },
  };
}

function cityPage(c: SeoCity): SeoPageDef {
  return {
    slug: c.slug,
    kind: "city",
    label: c.zh,
    title: `${c.zh}二手车 - ${c.en} 华人买车卖车 | ${SITE_NAME}`,
    description: `${c.zh}（${c.en}）华人二手车交易：同城华人车行与个人直售车源，看车方便、中文沟通，支持按价格、品牌、里程筛选，免费发布卖车信息。`,
    h1: `${c.zh}二手车`,
    intro: [
      `在${c.zh}买二手车，${SITE_NAME}帮你找到同城的华人车源。卖家就在附近，约看车方便，全程中文沟通，不用担心语言问题。`,
      `${c.zh}的华人车行和个人卖家在这里免费发布车辆，价格透明，可查 VIN 召回记录和 Carfax 报告。你也可以一键发布自己的车，卖给同城华人。`,
    ],
    browseParams: { location: c.code },
    listFilter: { stateAbbr: c.stateAbbr, cityKeywords: c.keywords },
  };
}

function makeStatePage(make: string, s: SeoState): SeoPageDef {
  const zh = MAKES_ZH[make] || make;
  return {
    slug: `${makeSlug(make)}/${s.slug}`,
    kind: "make-state",
    label: `${s.zh}${zh}`,
    title: `${s.zh}二手${zh} ${make} - ${s.en} 华人${zh}车源 | ${SITE_NAME}`,
    description: `${s.zh}（${s.en}）二手${zh}车源：本地华人车行与个人直售 ${make}，支持按城市、价格、里程、年份筛选，VIN 召回查询，中文服务。`,
    h1: `${s.zh}二手${zh} ${make}`,
    intro: [
      `想在${s.zh}买二手${zh}？${SITE_NAME}汇集 ${s.en} 本地华人卖家发布的 ${make} 车源，按距离筛选附近的车，中文联系卖家，看车谈价更轻松。`,
    ],
    browseParams: { make, location: s.abbr },
    listFilter: { make, stateAbbr: s.abbr },
  };
}

function bodyPage(b: { value: string; label: string; labelEn: string }): SeoPageDef {
  return {
    slug: b.value,
    kind: "body",
    label: b.label,
    title: `二手${b.label} - 北美华人二手${b.labelEn}买卖 | ${SITE_NAME}`,
    description: `北美华人二手${b.label}专区：丰田、本田、宝马等各品牌二手 ${b.labelEn} 车源，按州和城市筛选，价格透明，中文服务，免费发布。`,
    h1: `二手${b.label}`,
    intro: [
      `${SITE_NAME}二手${b.label}专区，覆盖全美华人社区的 ${b.labelEn} 车源。按价格、里程、品牌、所在地筛选，快速找到适合你的${b.label}。`,
    ],
    browseParams: { bodyStyle: b.value },
    listFilter: { bodyStyle: b.value },
  };
}

function pricePage(max: number): SeoPageDef {
  const wan = max >= 10000 ? `${max / 10000}万` : `${max}`;
  return {
    slug: `under-${max}`,
    kind: "price",
    label: `$${max.toLocaleString()} 以下`,
    title: `${max.toLocaleString()}美元以下二手车 - $${wan}以内便宜二手车 | ${SITE_NAME}`,
    description: `预算 $${max.toLocaleString()} 以内买什么二手车？${SITE_NAME}为北美华人精选 ${max.toLocaleString()} 美元以下的二手车源，个人直售价格更实惠，支持按州、品牌、里程筛选。`,
    h1: `$${max.toLocaleString()} 以下二手车`,
    intro: [
      `预算有限也能买到靠谱的车。${SITE_NAME}上 $${max.toLocaleString()} 以下的二手车多为个人直售，没有车行加价，适合留学生和新移民代步。买前记得查 VIN 召回记录、看 Carfax 报告，重要车况问题提前知道。`,
    ],
    browseParams: { maxPrice: String(max) },
    listFilter: { maxPrice: max },
  };
}

function yearPage(year: number): SeoPageDef {
  return {
    slug: String(year),
    kind: "year",
    label: `${year}年`,
    title: `${year}年二手车 - ${year}款二手车源 | ${SITE_NAME}`,
    description: `${year} 年款二手车源：北美华人车行与个人直售，按品牌、价格、里程、所在州筛选 ${year} 款车型，中文服务，免费发布。`,
    h1: `${year} 年款二手车`,
    intro: [
      `浏览 ${SITE_NAME} 上的 ${year} 年款二手车。同年份的车重点比里程、车况和保养记录，善用筛选和 VIN 查询，选到车况更好的那一辆。`,
    ],
    browseParams: { minYear: String(year), maxYear: String(year) },
    listFilter: { minYear: year, maxYear: year },
  };
}

function fuelPage(f: { slug: string; value: string; zh: string; en: string }): SeoPageDef {
  return {
    slug: f.slug,
    kind: "fuel",
    label: `二手${f.zh}`,
    title: `二手${f.zh} - 北美华人二手${f.en}买卖 | ${SITE_NAME}`,
    description: `北美华人二手${f.zh}专区（${f.en}）：特斯拉、丰田、本田等品牌${f.zh}车源，按州、价格、里程筛选，中文服务，免费发布。`,
    h1: `二手${f.zh}`,
    intro: [
      `${SITE_NAME}二手${f.zh}专区，汇集全美华人卖家发布的${f.zh}车源。${f.value === "纯电" ? "买二手电动车重点看电池健康度和剩余质保，页面上可以直接向卖家中文咨询。" : "按价格、里程、年份筛选，快速锁定合适车源。"}`,
    ],
    browseParams: { fuelType: f.value },
    listFilter: { fuelType: f.value },
  };
}

// ── 汇总 ──

function buildAll(): SeoPageDef[] {
  const pages: SeoPageDef[] = [];
  for (const m of SELLABLE_MAKES) pages.push(makePage(m));
  for (const s of SEO_STATES) pages.push(statePage(s));
  for (const c of SEO_CITIES) pages.push(cityPage(c));
  const hotStates = SEO_STATES.filter((s) => HOT_STATE_ABBRS.includes(s.abbr));
  for (const m of SELLABLE_MAKES) {
    for (const s of hotStates) pages.push(makeStatePage(m, s));
  }
  for (const b of BODY_STYLE_OPTIONS) pages.push(bodyPage(b));
  for (const p of SEO_PRICE_PAGES) pages.push(pricePage(p));
  for (const y of SEO_YEARS) pages.push(yearPage(y));
  for (const f of SEO_FUELS) pages.push(fuelPage(f));
  return pages;
}

export const SEO_PAGES: SeoPageDef[] = buildAll();

const pageMap = new Map(SEO_PAGES.map((p) => [p.slug, p]));

export function getSeoPage(slugParts: string[]): SeoPageDef | undefined {
  return pageMap.get(slugParts.join("/"));
}

export function seoPageHref(def: SeoPageDef): string {
  return `/cars/${def.slug}`;
}

export function browseHref(def: SeoPageDef): string {
  const q = new URLSearchParams(def.browseParams).toString();
  return q ? `/browse?${q}` : "/browse";
}

/** 相关页面内链（用于落地页底部的内链网格） */
export function getRelatedPages(def: SeoPageDef): { title: string; pages: SeoPageDef[] }[] {
  const groups: { title: string; pages: SeoPageDef[] }[] = [];
  const hotMakePages = HOT_MAKES.map((m) => pageMap.get(makeSlug(m))).filter(Boolean) as SeoPageDef[];
  const hotStates = SEO_STATES.filter((s) => HOT_STATE_ABBRS.includes(s.abbr));

  if (def.kind === "make") {
    groups.push({
      title: `各州${def.label.split(" ")[0]}车源`,
      pages: hotStates
        .map((s) => pageMap.get(`${def.slug}/${s.slug}`))
        .filter(Boolean) as SeoPageDef[],
    });
    groups.push({ title: "其他热门品牌", pages: hotMakePages.filter((p) => p.slug !== def.slug) });
  } else if (def.kind === "state" || def.kind === "city") {
    const stateSlug =
      def.kind === "state"
        ? def.slug
        : SEO_STATES.find((s) => s.abbr === def.listFilter.stateAbbr)?.slug;
    if (stateSlug) {
      groups.push({
        title: "热门品牌",
        pages: HOT_MAKES.map((m) => pageMap.get(`${makeSlug(m)}/${stateSlug}`) ?? pageMap.get(makeSlug(m))).filter(
          Boolean
        ) as SeoPageDef[],
      });
    }
    if (def.kind === "state") {
      const cities = SEO_CITIES.filter((c) => c.stateAbbr === def.listFilter.stateAbbr);
      if (cities.length > 0) {
        groups.push({
          title: "热门城市",
          pages: cities.map((c) => pageMap.get(c.slug)).filter(Boolean) as SeoPageDef[],
        });
      }
    }
    groups.push({
      title: "其他地区",
      pages: SEO_STATES.filter((s) => HOT_STATE_ABBRS.includes(s.abbr))
        .map((s) => pageMap.get(s.slug))
        .filter((p) => p && p.slug !== def.slug) as SeoPageDef[],
    });
  } else if (def.kind === "make-state") {
    const [mSlug, sSlug] = def.slug.split("/");
    groups.push({
      title: "该品牌其他州",
      pages: hotStates
        .map((s) => pageMap.get(`${mSlug}/${s.slug}`))
        .filter((p) => p && p.slug !== def.slug) as SeoPageDef[],
    });
    groups.push({
      title: "该州其他品牌",
      pages: HOT_MAKES.map((m) => pageMap.get(`${makeSlug(m)}/${sSlug}`)).filter(
        (p) => p && p.slug !== def.slug
      ) as SeoPageDef[],
    });
  } else {
    groups.push({ title: "热门品牌", pages: hotMakePages });
    groups.push({
      title: "热门地区",
      pages: hotStates.map((s) => pageMap.get(s.slug)).filter(Boolean) as SeoPageDef[],
    });
    if (def.kind === "price") {
      groups.push({
        title: "其他预算",
        pages: SEO_PRICE_PAGES.map((p) => pageMap.get(`under-${p}`)).filter(
          (p) => p && p.slug !== def.slug
        ) as SeoPageDef[],
      });
    }
    if (def.kind === "year") {
      groups.push({
        title: "其他年份",
        pages: SEO_YEARS.map((y) => pageMap.get(String(y))).filter(
          (p) => p && p.slug !== def.slug
        ) as SeoPageDef[],
      });
    }
  }
  return groups.filter((g) => g.pages.length > 0);
}
