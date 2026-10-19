// /llms.txt 与 /llms-full.txt(https://llmstxt.org)给 AI 助手/爬虫的站点说明。
// 语言前缀、分类落地页、筛选取值全部从 LOCALES / SEO_PAGES / car-filters 等注册表生成,
// 新增语言或落地页时自动跟随,不会像旧的 public/llms.txt 那样过时。
// 对外定位语遵循宣传规则:不做族群限定,只说「北美 · 多语言」。

import { LOCALES } from "@/lib/i18n";
import { SITE_URL, SEO_PAGES, SEO_STATES, SEO_CITIES, SEO_FUELS, SEO_PRICE_PAGES, getSeoPage, type SeoPageDef, type SeoPageKind } from "@/lib/seo-pages";
import { BODY_STYLE_OPTIONS } from "@/lib/body-style";
import { SORT_OPTIONS } from "@/lib/car-filters";

const zh = (path: string) => `${SITE_URL}/zh${path}`;
const link = (label: string, url: string, note?: string) => `- [${label}](${url})${note ? `: ${note}` : ""}`;

const KEY_PAGES: [string, string, string][] = [
  ["首页 Home", "", "推荐车源、最新上架、入口导航"],
  ["买车 Browse", "/browse", "全美在售二手车,按品牌、车型、价格、年份、里程、地区、车身、卖家类型筛选"],
  ["地图找车 Map", "/browse/map", "在地图上按位置浏览车源与车行门店"],
  ["分类导航 Categories", "/cars", "按品牌、车型、州、城市、车身、预算、年份、燃油浏览(中文落地页)"],
  ["免费卖车 Sell", "/post", "个人与车行免费发布车源(需登录)"],
  ["车辆对比 Compare", "/compare", "多辆车价格、里程、年份、配置并排对比"],
  ["VIN 查询 VIN Lookup", "/vin", "免费查询召回记录与 NHTSA 安全评级"],
  ["购车指南 Guides", "/guide", "北美买车流程、验车、DMV 过户、保险、贷款"],
  ["车友社区 Community", "/community", "车主口碑与用车话题交流"],
  ["问答 Q&A", "/qa", "买车卖车问题问答"],
  ["汽车服务 Services", "/services", "保险、贷款、过户代办等服务"],
  ["商家入驻 For Dealers", "/business", "车行免费入驻、批量发布、认证标识、门店地图曝光"],
  ["车行认证申请 Dealer Verification", "/dealer-apply", "车行提交门店资料申请认证"],
  ["关于我们 About", "/about", "非营利定位、团队介绍"],
  ["联系我们 Contact", "/contact", ""],
  ["使用条款 Terms", "/terms", "中文"],
];

const GUIDES: [string, string][] = [
  ["买车流程 Buying a used car", "/guide/buying"],
  ["DMV 过户 DMV title transfer", "/guide/dmv"],
  ["汽车保险 Car insurance", "/guide/insurance"],
  ["购车贷款 Auto loans", "/guide/loan"],
];

const TOOLS: [string, string, string][] = [
  ["月供计算器 Loan calculator", "/tools/loan", "输入车价算每月还款"],
  ["预算估车价 Budget", "/tools/budget", "按可承受月供反推车价"],
  ["油费计算器 Fuel cost", "/tools/fuel", "估算每月油钱"],
  ["砍价锦囊 Haggling tips", "/tools/haggle", "谈价话术"],
  ["单位换算 Unit converter", "/tools/units", "英里/公里、MPG/L/100km、加仑/升、马力/千瓦"],
  ["停车定位 Parking spot", "/tools/parking", "记住停车位置并导航回去"],
  ["车牌打分 Plate score", "/tools/plate", "娱乐向"],
  ["今日车运 Daily car luck", "/tools/luck", "娱乐向"],
];

// 落地页 URL 模式(按 SeoPageKind),示例与数量从 SEO_PAGES 实际生成
const KIND_PATTERNS: [SeoPageKind, string, string][] = [
  ["make", "/cars/{make}", "品牌 By make"],
  ["model", "/cars/{make}/{model}", "车型 By model"],
  ["state", "/cars/{state}", "州 By state"],
  ["city", "/cars/{city}", "城市 By city"],
  ["make-state", "/cars/{make}/{state}", "品牌 + 州"],
  ["model-state", "/cars/{make}/{model}/{state}", "车型 + 州"],
  ["body", "/cars/{bodyStyle}", "车身类型 By body style"],
  ["body-state", "/cars/{bodyStyle}/{state}", "车身 + 州"],
  ["price", "/cars/under-{price}", "预算 By max price"],
  ["price-state", "/cars/under-{price}/{state}", "预算 + 州"],
  ["make-price", "/cars/{make}/under-{price}", "品牌 + 预算"],
  ["year", "/cars/{year}", "年份 By model year"],
  ["make-year", "/cars/{make}/{year}", "品牌 + 年份"],
  ["fuel", "/cars/{fuel}", "燃油类型 By fuel"],
  ["fuel-state", "/cars/{fuel}/{state}", "燃油 + 州"],
  ["theme", "/cars/{theme}", "主题 Themes"],
];

const POPULAR_SLUGS = [
  "california", "new-york", "texas", "los-angeles", "san-francisco", "flushing",
  "toyota", "honda", "tesla", "toyota/camry", "honda/cr-v", "tesla/model-3",
  "suv", "electric", "under-10000", "student-cars", "family-suv", "low-mileage",
];

function pagesOfKind(kind: SeoPageKind) {
  return SEO_PAGES.filter((p) => p.kind === kind);
}

function header(): string[] {
  const langs = LOCALES.map((l) => `/${l}`).join(" ");
  return [
    "# 常來車網 CLCAuto",
    "",
    "> 常來車網(CLCAuto)是面向北美的非营利、多语言二手车交易平台:个人卖家与车行免费发布车源,买家可按品牌、车型、价格、年份、里程、地区筛选全美在售二手车,并提供 VIN 召回查询、NHTSA 安全评级、车行认证与站内私信。",
    "> CLCAuto is a non-profit, multilingual used-car marketplace for North America. Private sellers and dealers list for free; buyers search US inventory by make, model, price, year, mileage and location, with VIN recall lookup, NHTSA safety ratings, verified dealers and in-app messaging.",
    "",
    `- 语言 / Languages: 每个页面都有 ${LOCALES.length} 个语言版本,路径前缀 ${langs}(中文 /zh 为主站,/zh-hant 为繁體中文界面,用户内容暂与 /zh 相同)。下文链接以 /zh 为例,替换前缀即得其他语言版本;/cars/* 分类落地页与使用条款只有中文版。Every page exists under each locale prefix (/zh-hant is the Traditional Chinese UI; user content currently matches /zh); /cars/* landing pages and the terms are Chinese-only.`,
    "- 车源详情 / Listing detail: `/zh/car/{id}`;卖家或车行主页 / Seller or dealer page: `/zh/user/{id}`。",
    "- 卖家会标注沟通语言(如中文、English、한국어),列表默认把讲当前界面语言的卖家排在前面。Sellers declare the languages they speak; listings rank sellers who speak the current UI language first.",
    "- 价格默认美元(USD)、里程默认英里(miles);加拿大 / 澳洲 / 新西兰车源按卖家所填用加元(CAD)/ 澳元(AUD)/ 纽元(NZD)及公里(km)显示,详情页附按固定近似汇率的折算。筛选参数 minPrice / maxPrice 按美元、maxMileage 按英里,其他币种 / 公里车源折算后比较。Prices default to USD and mileage to miles; Canadian, Australian and New Zealand listings show CAD / AUD / NZD and km as entered by the seller (detail pages add an approximate conversion). Price filters are in USD and mileage filters in miles; other currencies and km listings are converted before comparing.",
    "- 平台不经手交易款项,买家通过站内私信或卖家留的联系方式直接沟通。The platform does not handle payments; buyers contact sellers directly.",
  ];
}

function keyPages(): string[] {
  return [
    "## 主要页面 / Key Pages",
    "",
    ...KEY_PAGES.map(([label, path, note]) => link(label, zh(path), note || undefined)),
    "",
    "## 购车指南 / Guides",
    "",
    ...GUIDES.map(([label, path]) => link(label, zh(path))),
    "",
    "## 实用工具 / Tools",
    "",
    ...TOOLS.map(([label, path, note]) => link(label, zh(path), note)),
  ];
}

function searchUrls(): string[] {
  return [
    "## 搜索链接 / Search URLs",
    "",
    "买车页的筛选条件都写在查询参数里,可直接拼出搜索结果链接。The browse page is fully driven by query parameters:",
    "",
    `- 示例 / Example: ${zh("/browse?make=Toyota&model=Camry&location=CA&maxPrice=20000&minYear=2018&sort=price-asc")}`,
    "- `q`: 关键词 keyword(支持中文、拼音、英文)",
    "- `make` / `model`: 英文品牌与车型,如 Toyota / Camry",
    "- `minPrice` / `maxPrice` (USD), `minYear` / `maxYear`, `maxMileage` (miles)",
    "- `location`: 城市名或州缩写(如 Irvine、CA),或邮编:美国 5 位 ZIP / 加拿大 A1A 1A1 / 澳新 4 位(先按国家筛,再按距离,配合 `maxDistance`,英里,默认 50)",
    "- `country`: AU | NZ —— 4 位邮编(澳新格式相同)时指明国家,省略按 AU",
    `- \`bodyStyle\`: ${BODY_STYLE_OPTIONS.map((b) => b.value).join(" | ")}`,
    "- `sellerType`: private | dealer",
    "- `dealRating`: great | good(价格评估);`listedWithin`: 天数 days",
    "- `noAccident` / `oneOwner` / `hasCarfax` / `cleanTitle`(仅清白产权 clean title only;澳新车源的「无欠款(PPSR 已查)」也算) / `priceDropped` / `hasVideo`: true",
    "- `financing`: true(卖家车行支持 ITIN 贷款或无信用记录可贷 dealer offers ITIN / no-credit-history financing;本站不提供贷款 the site does not lend)",
    `- \`sort\`: ${SORT_OPTIONS.map((s) => s.value).join(" | ")}`,
  ];
}

function categoryPatterns(): string[] {
  const rows = KIND_PATTERNS.map(([kind, pattern, label]) => {
    const pages = pagesOfKind(kind);
    if (!pages.length) return null;
    return `- ${label}: \`/zh${pattern}\`,共 ${pages.length} 页,例 ${zh(`/cars/${pages[0].slug}`)}`;
  }).filter(Boolean) as string[];

  const popular = POPULAR_SLUGS.map((slug) => getSeoPage(slug.split("/")))
    .filter((p): p is SeoPageDef => p !== undefined)
    .map((p) => link(p.label, zh(`/cars/${p.slug}`)));

  return [
    "## 分类落地页 / Category Landing Pages",
    "",
    `按条件预筛好的中文落地页,共 ${SEO_PAGES.length} 个,URL 模式如下(全部链接见 ${SITE_URL}/llms-full.txt):`,
    "",
    ...rows,
    "",
    `- {state}: ${SEO_STATES.map((s) => s.slug).join(", ")}`,
    `- {city}: ${SEO_CITIES.map((c) => c.slug).join(", ")}`,
    `- {make}: ${[...new Set(pagesOfKind("make").map((p) => p.slug))].join(", ")}`,
    `- {bodyStyle}: ${BODY_STYLE_OPTIONS.map((b) => b.value).join(", ")}`,
    `- {fuel}: ${SEO_FUELS.map((f) => f.slug).join(", ")}`,
    `- {price}: ${SEO_PRICE_PAGES.join(", ")}`,
    `- {theme}: ${pagesOfKind("theme").map((p) => p.slug).join(", ")}`,
    "",
    "热门分类 / Popular:",
    "",
    ...popular,
  ];
}

function developers(): string[] {
  return [
    "## 开发者 / Public API",
    "",
    "只读车源、车行数据接口 + 车行库存自动上传(REST,JSON,API key 鉴权;只读接口可匿名调用,有限流)。Read-only listings/dealers API plus dealer inventory upload.",
    "",
    link("给 AI 助手的完整调用说明 / API instructions for AI assistants", `${SITE_URL}/api/v1/llms.txt`),
    link("OpenAPI 3.1", `${SITE_URL}/api/v1/openapi.json`),
    link("开发者门户与 API key 管理 / Developer portal", zh("/developers")),
  ];
}

function optional(): string[] {
  return [
    "## Optional",
    "",
    link("全部分类落地页索引 / Full landing-page index", `${SITE_URL}/llms-full.txt`),
    link("Sitemap(按语言分片 / per-locale shards)", `${SITE_URL}/sitemap.xml`),
    "- 联系 / Contact: contact@clcauto.com",
  ];
}

export function buildLlmsTxt(): string {
  return [
    ...header(), "",
    ...keyPages(), "",
    ...searchUrls(), "",
    ...categoryPatterns(), "",
    ...developers(), "",
    ...optional(), "",
  ].join("\n");
}

// llms-full.txt:llms.txt 全文 + 全部落地页链接(按类型分组)
export function buildLlmsFullTxt(): string {
  const groups = KIND_PATTERNS.map(([kind, pattern, label]) => {
    const pages = pagesOfKind(kind);
    if (!pages.length) return [];
    return [
      `### ${label} — \`/zh${pattern}\` (${pages.length})`,
      "",
      ...pages.map((p) => link(p.label, zh(`/cars/${p.slug}`))),
      "",
    ];
  }).flat();

  return [
    buildLlmsTxt().trimEnd(),
    "",
    "## 全部分类落地页 / All Category Landing Pages",
    "",
    ...groups,
  ].join("\n");
}
