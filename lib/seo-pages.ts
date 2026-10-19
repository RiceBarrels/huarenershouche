// 程序化 SEO 落地页定义。所有 /cars/<slug> 页面都由这里的定义驱动：
// generateStaticParams、generateMetadata、页面文案、车源过滤、内链。
// 纯数据模块（无 "use client"），server component 可直接 import。

import { MAKES, MAKES_ZH, HOT_MAKES } from "@/lib/mock-data";
import { BODY_STYLE_OPTIONS } from "@/lib/body-style";

export const SITE_URL = "https://www.clcauto.com";
export const SITE_NAME = "常來車網";

// 与 lib/i18n LOCALES 保持一致(这里不 import,避免纯数据模块拉进 i18n)
const SEO_LOCALES = ["zh", "zh-hant", "en", "ko", "ja", "es", "fr"] as const;
// hreflang 代码:zh → zh-CN、zh-hant → zh-Hant(同 lib/i18n/content-langs htmlLang)
const SEO_HREFLANG: Record<string, string> = { zh: "zh-CN", "zh-hant": "zh-Hant" };

/**
 * 页面级 canonical + hreflang。canonical 必须带语言前缀指向「本语言」自身:
 * 指向无前缀路径会被 vercel.json 308 到 /zh,Google 就把所有外语页当成
 * 中文页的重复而只收录中文。
 * zhOnly:正文只有中文的页面(/cars/* 落地页、条款),外语树 canonical 回 /zh、不声明 hreflang。
 */
export function localeAlternates(
  locale: string,
  path: string,
  opts: { zhOnly?: boolean } = {}
): { canonical: string; languages?: Record<string, string> } {
  const href = (l: string) => `${SITE_URL}/${l}${path === "/" ? "" : path}`;
  if (opts.zhOnly) {
    // 正文只有中文:简体 / 繁體(服务端整页转换)各自 canonical 并互链;其他语言树回 /zh
    if (locale !== "zh" && locale !== "zh-hant") return { canonical: href("zh") };
    return {
      canonical: href(locale),
      languages: { "zh-CN": href("zh"), "zh-Hant": href("zh-hant"), "x-default": href("zh") },
    };
  }
  const languages: Record<string, string> = {};
  for (const l of SEO_LOCALES) languages[SEO_HREFLANG[l] ?? l] = href(l);
  languages["x-default"] = href("zh");
  return { canonical: href(locale), languages };
}

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
  { code: "NY-QN", en: "Queens", zh: "皇后区", slug: "queens-flushing", stateAbbr: "NY", keywords: ["queens", "flushing", "皇后区", "法拉盛"] },
  // 法拉盛单独成页(东岸最大华人社区,自定义强化文案见 FLUSHING_PAGE)
  { code: "NY-QN", en: "Flushing", zh: "法拉盛", slug: "flushing", stateAbbr: "NY", keywords: ["flushing", "法拉盛", "queens", "皇后区"] },
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

// ── 热门车型（品牌 → 常见二手车型，zh 为华人常用叫法）──
export interface SeoModel {
  make: string;
  name: string; // 数据库 model 字段的常见写法
  zh?: string;
}

export const SEO_MODELS: SeoModel[] = [
  // Toyota
  { make: "Toyota", name: "Camry", zh: "凯美瑞" },
  { make: "Toyota", name: "Corolla", zh: "卡罗拉" },
  { make: "Toyota", name: "RAV4" },
  { make: "Toyota", name: "Highlander", zh: "汉兰达" },
  { make: "Toyota", name: "Sienna", zh: "塞纳" },
  { make: "Toyota", name: "Tacoma" },
  { make: "Toyota", name: "Tundra" },
  { make: "Toyota", name: "Prius", zh: "普锐斯" },
  { make: "Toyota", name: "4Runner" },
  { make: "Toyota", name: "Land Cruiser", zh: "兰德酷路泽" },
  { make: "Toyota", name: "Avalon", zh: "亚洲龙" },
  { make: "Toyota", name: "Corolla Cross" },
  { make: "Toyota", name: "Venza", zh: "威飒" },
  // Honda
  { make: "Honda", name: "Civic", zh: "思域" },
  { make: "Honda", name: "Accord", zh: "雅阁" },
  { make: "Honda", name: "CR-V" },
  { make: "Honda", name: "HR-V" },
  { make: "Honda", name: "Pilot" },
  { make: "Honda", name: "Odyssey", zh: "奥德赛" },
  { make: "Honda", name: "Fit", zh: "飞度" },
  { make: "Honda", name: "Ridgeline" },
  { make: "Honda", name: "Passport" },
  // Nissan
  { make: "Nissan", name: "Altima", zh: "天籁" },
  { make: "Nissan", name: "Sentra", zh: "轩逸" },
  { make: "Nissan", name: "Rogue", zh: "奇骏" },
  { make: "Nissan", name: "Murano", zh: "楼兰" },
  { make: "Nissan", name: "Pathfinder", zh: "探路者" },
  { make: "Nissan", name: "Maxima" },
  { make: "Nissan", name: "Kicks" },
  { make: "Nissan", name: "Frontier" },
  { make: "Nissan", name: "Leaf", zh: "聆风" },
  { make: "Nissan", name: "Versa" },
  // Hyundai
  { make: "Hyundai", name: "Elantra", zh: "伊兰特" },
  { make: "Hyundai", name: "Sonata", zh: "索纳塔" },
  { make: "Hyundai", name: "Tucson", zh: "途胜" },
  { make: "Hyundai", name: "Santa Fe", zh: "胜达" },
  { make: "Hyundai", name: "Kona" },
  { make: "Hyundai", name: "Palisade" },
  { make: "Hyundai", name: "Ioniq 5" },
  { make: "Hyundai", name: "Accent" },
  // Kia
  { make: "Kia", name: "Forte" },
  { make: "Kia", name: "K5" },
  { make: "Kia", name: "Optima" },
  { make: "Kia", name: "Sportage", zh: "狮跑" },
  { make: "Kia", name: "Sorento", zh: "索兰托" },
  { make: "Kia", name: "Telluride" },
  { make: "Kia", name: "Soul" },
  { make: "Kia", name: "Seltos" },
  { make: "Kia", name: "Carnival", zh: "嘉华" },
  { make: "Kia", name: "Niro" },
  // Mazda
  { make: "Mazda", name: "Mazda3", zh: "昂克赛拉" },
  { make: "Mazda", name: "Mazda6", zh: "阿特兹" },
  { make: "Mazda", name: "CX-5" },
  { make: "Mazda", name: "CX-30" },
  { make: "Mazda", name: "CX-9" },
  { make: "Mazda", name: "CX-50" },
  { make: "Mazda", name: "MX-5 Miata" },
  // Subaru
  { make: "Subaru", name: "Outback", zh: "傲虎" },
  { make: "Subaru", name: "Forester", zh: "森林人" },
  { make: "Subaru", name: "Crosstrek" },
  { make: "Subaru", name: "Impreza", zh: "翼豹" },
  { make: "Subaru", name: "Legacy", zh: "力狮" },
  { make: "Subaru", name: "Ascent" },
  { make: "Subaru", name: "WRX" },
  { make: "Subaru", name: "BRZ" },
  // Volkswagen
  { make: "Volkswagen", name: "Jetta", zh: "捷达" },
  { make: "Volkswagen", name: "Passat", zh: "帕萨特" },
  { make: "Volkswagen", name: "Tiguan", zh: "途观" },
  { make: "Volkswagen", name: "Atlas", zh: "途昂" },
  { make: "Volkswagen", name: "Golf", zh: "高尔夫" },
  { make: "Volkswagen", name: "Taos" },
  { make: "Volkswagen", name: "GTI" },
  { make: "Volkswagen", name: "ID.4" },
  // BMW
  { make: "BMW", name: "3 Series", zh: "3系" },
  { make: "BMW", name: "5 Series", zh: "5系" },
  { make: "BMW", name: "7 Series", zh: "7系" },
  { make: "BMW", name: "4 Series", zh: "4系" },
  { make: "BMW", name: "2 Series", zh: "2系" },
  { make: "BMW", name: "X1" },
  { make: "BMW", name: "X3" },
  { make: "BMW", name: "X5" },
  { make: "BMW", name: "X7" },
  { make: "BMW", name: "M3" },
  { make: "BMW", name: "M4" },
  { make: "BMW", name: "i4" },
  { make: "BMW", name: "iX" },
  // Mercedes-Benz
  { make: "Mercedes-Benz", name: "C-Class", zh: "C级" },
  { make: "Mercedes-Benz", name: "E-Class", zh: "E级" },
  { make: "Mercedes-Benz", name: "S-Class", zh: "S级" },
  { make: "Mercedes-Benz", name: "A-Class", zh: "A级" },
  { make: "Mercedes-Benz", name: "CLA" },
  { make: "Mercedes-Benz", name: "GLA" },
  { make: "Mercedes-Benz", name: "GLB" },
  { make: "Mercedes-Benz", name: "GLC" },
  { make: "Mercedes-Benz", name: "GLE" },
  { make: "Mercedes-Benz", name: "GLS" },
  { make: "Mercedes-Benz", name: "G-Class", zh: "大G" },
  // Audi
  { make: "Audi", name: "A3" },
  { make: "Audi", name: "A4" },
  { make: "Audi", name: "A5" },
  { make: "Audi", name: "A6" },
  { make: "Audi", name: "A7" },
  { make: "Audi", name: "Q3" },
  { make: "Audi", name: "Q5" },
  { make: "Audi", name: "Q7" },
  { make: "Audi", name: "Q8" },
  { make: "Audi", name: "e-tron" },
  // Lexus
  { make: "Lexus", name: "ES" },
  { make: "Lexus", name: "RX" },
  { make: "Lexus", name: "NX" },
  { make: "Lexus", name: "IS" },
  { make: "Lexus", name: "GX" },
  { make: "Lexus", name: "LX" },
  { make: "Lexus", name: "UX" },
  { make: "Lexus", name: "LS" },
  // Tesla
  { make: "Tesla", name: "Model 3" },
  { make: "Tesla", name: "Model Y" },
  { make: "Tesla", name: "Model S" },
  { make: "Tesla", name: "Model X" },
  { make: "Tesla", name: "Cybertruck", zh: "赛博皮卡" },
  // Acura
  { make: "Acura", name: "MDX" },
  { make: "Acura", name: "RDX" },
  { make: "Acura", name: "TLX" },
  { make: "Acura", name: "Integra" },
  // Infiniti
  { make: "Infiniti", name: "Q50" },
  { make: "Infiniti", name: "QX60" },
  { make: "Infiniti", name: "QX50" },
  { make: "Infiniti", name: "QX80" },
  // Ford
  { make: "Ford", name: "F-150" },
  { make: "Ford", name: "Mustang", zh: "野马" },
  { make: "Ford", name: "Explorer", zh: "探险者" },
  { make: "Ford", name: "Escape" },
  { make: "Ford", name: "Edge", zh: "锐界" },
  { make: "Ford", name: "Bronco" },
  { make: "Ford", name: "Ranger" },
  { make: "Ford", name: "Focus", zh: "福克斯" },
  { make: "Ford", name: "Fusion" },
  { make: "Ford", name: "Expedition" },
  { make: "Ford", name: "Maverick" },
  // Chevrolet
  { make: "Chevrolet", name: "Silverado" },
  { make: "Chevrolet", name: "Equinox", zh: "探界者" },
  { make: "Chevrolet", name: "Malibu", zh: "迈锐宝" },
  { make: "Chevrolet", name: "Tahoe", zh: "太浩" },
  { make: "Chevrolet", name: "Traverse" },
  { make: "Chevrolet", name: "Camaro", zh: "科迈罗" },
  { make: "Chevrolet", name: "Suburban" },
  { make: "Chevrolet", name: "Bolt" },
  { make: "Chevrolet", name: "Corvette", zh: "科尔维特" },
  { make: "Chevrolet", name: "Colorado" },
  // Jeep
  { make: "Jeep", name: "Wrangler", zh: "牧马人" },
  { make: "Jeep", name: "Grand Cherokee", zh: "大切诺基" },
  { make: "Jeep", name: "Cherokee", zh: "自由光" },
  { make: "Jeep", name: "Compass", zh: "指南者" },
  { make: "Jeep", name: "Gladiator" },
  { make: "Jeep", name: "Renegade" },
  // Ram
  { make: "Ram", name: "1500" },
  { make: "Ram", name: "2500" },
  // GMC
  { make: "GMC", name: "Sierra" },
  { make: "GMC", name: "Yukon" },
  { make: "GMC", name: "Acadia" },
  { make: "GMC", name: "Terrain" },
  // Dodge
  { make: "Dodge", name: "Charger" },
  { make: "Dodge", name: "Challenger" },
  { make: "Dodge", name: "Durango" },
  // Chrysler
  { make: "Chrysler", name: "Pacifica" },
  { make: "Chrysler", name: "300" },
  // Buick
  { make: "Buick", name: "Encore", zh: "昂科拉" },
  { make: "Buick", name: "Enclave", zh: "昂科旗" },
  { make: "Buick", name: "Envision", zh: "昂科威" },
  // Cadillac
  { make: "Cadillac", name: "Escalade", zh: "凯雷德" },
  { make: "Cadillac", name: "XT5" },
  { make: "Cadillac", name: "XT4" },
  { make: "Cadillac", name: "CT5" },
  // Volvo
  { make: "Volvo", name: "XC90" },
  { make: "Volvo", name: "XC60" },
  { make: "Volvo", name: "XC40" },
  { make: "Volvo", name: "S60" },
  { make: "Volvo", name: "S90" },
  // Porsche
  { make: "Porsche", name: "911" },
  { make: "Porsche", name: "Cayenne", zh: "卡宴" },
  { make: "Porsche", name: "Macan" },
  { make: "Porsche", name: "Panamera", zh: "帕拉梅拉" },
  { make: "Porsche", name: "Taycan" },
  { make: "Porsche", name: "718" },
  // Land Rover
  { make: "Land Rover", name: "Range Rover", zh: "揽胜" },
  { make: "Land Rover", name: "Range Rover Sport", zh: "揽胜运动版" },
  { make: "Land Rover", name: "Discovery", zh: "发现" },
  { make: "Land Rover", name: "Defender", zh: "卫士" },
  { make: "Land Rover", name: "Range Rover Evoque", zh: "揽胜极光" },
  // Genesis
  { make: "Genesis", name: "G70" },
  { make: "Genesis", name: "G80" },
  { make: "Genesis", name: "GV70" },
  { make: "Genesis", name: "GV80" },
  // Others
  { make: "Mini", name: "Cooper" },
  { make: "Mitsubishi", name: "Outlander", zh: "欧蓝德" },
  { make: "Lincoln", name: "Navigator", zh: "领航员" },
  { make: "Lincoln", name: "Aviator", zh: "飞行家" },
  { make: "Lincoln", name: "Corsair", zh: "冒险家" },
  { make: "Lincoln", name: "Nautilus", zh: "航海家" },
  { make: "Rivian", name: "R1T" },
  { make: "Rivian", name: "R1S" },
  { make: "Polestar", name: "Polestar 2" },
  { make: "Lucid", name: "Air" },
];

// 车型页在这些州做组合页（华人最多的 6 个州）
export const MODEL_STATE_ABBRS = ["CA", "NY", "TX", "FL", "WA", "NJ"];

// ── 页面定义 ──

/** SeoCarList（客户端）用来过滤车源的条件 */
export interface SeoListFilter {
  make?: string;
  /** 精确匹配 car.model（忽略大小写） */
  model?: string;
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
  maxMileage?: number;
}

export type SeoPageKind =
  | "make"
  | "state"
  | "city"
  | "make-state"
  | "body"
  | "price"
  | "year"
  | "fuel"
  | "model"
  | "model-state"
  | "make-price"
  | "make-year"
  | "body-state"
  | "price-state"
  | "fuel-state"
  | "theme";

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

function modelZhName(m: SeoModel): string {
  return m.zh ? `${MAKES_ZH[m.make] || m.make}${m.zh}` : `${MAKES_ZH[m.make] || m.make} ${m.name}`;
}

function modelPage(m: SeoModel): SeoPageDef {
  const zhFull = modelZhName(m);
  return {
    slug: `${makeSlug(m.make)}/${makeSlug(m.name)}`,
    kind: "model",
    label: m.zh || m.name,
    title: `二手${zhFull} - ${m.make} ${m.name} 华人车源 | ${SITE_NAME}`,
    description: `${SITE_NAME}二手${zhFull}专区：北美华人车行与个人直售 ${m.make} ${m.name}，按年份、里程、价格、所在州筛选，支持 VIN 召回查询和 Carfax 报告，中文沟通。`,
    h1: `二手${zhFull} ${m.name}`,
    intro: [
      `选购二手${zhFull}（${m.make} ${m.name}），${SITE_NAME}汇集全美华人卖家的真实车源。同款车重点比年份、里程和车况，页面可直接查 VIN 召回记录，与卖家中文沟通更放心。`,
    ],
    browseParams: { make: m.make, model: m.name },
    listFilter: { make: m.make, model: m.name },
  };
}

function modelStatePage(m: SeoModel, s: SeoState): SeoPageDef {
  const zhFull = modelZhName(m);
  return {
    slug: `${makeSlug(m.make)}/${makeSlug(m.name)}/${s.slug}`,
    kind: "model-state",
    label: `${s.zh}${m.zh || m.name}`,
    title: `${s.zh}二手${zhFull} - ${s.en} ${m.make} ${m.name} 车源 | ${SITE_NAME}`,
    description: `${s.zh}（${s.en}）二手${zhFull}车源：本地华人直售 ${m.make} ${m.name}，按里程、年份、价格筛选，中文服务，看车方便。`,
    h1: `${s.zh}二手${zhFull}`,
    intro: [
      `在${s.zh}找二手${zhFull}？这里汇集 ${s.en} 本地华人发布的 ${m.make} ${m.name}，按距离筛选附近车源，约看车更方便。`,
    ],
    browseParams: { make: m.make, model: m.name, location: s.abbr },
    listFilter: { make: m.make, model: m.name, stateAbbr: s.abbr },
  };
}

function makePricePage(make: string, max: number): SeoPageDef {
  const zh = MAKES_ZH[make] || make;
  return {
    slug: `${makeSlug(make)}/under-${max}`,
    kind: "make-price",
    label: `$${max.toLocaleString()}以下${zh}`,
    title: `${max.toLocaleString()}美元以下二手${zh} - 便宜${zh}二手车 | ${SITE_NAME}`,
    description: `预算 $${max.toLocaleString()} 以内的二手${zh}（${make}）车源：北美华人直售，价格实惠，按里程、年份、所在州筛选，中文服务。`,
    h1: `$${max.toLocaleString()} 以下二手${zh}`,
    intro: [
      `预算 $${max.toLocaleString()} 以内也能买到合适的${zh}。多为个人直售，没有车行加价，买前查 VIN 召回记录、比里程和车况，放心下手。`,
    ],
    browseParams: { make, maxPrice: String(max) },
    listFilter: { make, maxPrice: max },
  };
}

function makeYearPage(make: string, year: number): SeoPageDef {
  const zh = MAKES_ZH[make] || make;
  return {
    slug: `${makeSlug(make)}/${year}`,
    kind: "make-year",
    label: `${year}年${zh}`,
    title: `${year}年二手${zh} - ${year}款 ${make} 车源 | ${SITE_NAME}`,
    description: `${year} 年款二手${zh}（${make}）：北美华人车行与个人直售，按车型、里程、价格、所在州筛选，中文服务。`,
    h1: `${year} 年款二手${zh}`,
    intro: [
      `浏览 ${year} 年款的二手${zh}车源。同年份的车重点比里程和保养记录，善用筛选快速锁定车况更好的那一辆。`,
    ],
    browseParams: { make, minYear: String(year), maxYear: String(year) },
    listFilter: { make, minYear: year, maxYear: year },
  };
}

function bodyStatePage(b: { value: string; label: string; labelEn: string }, s: SeoState): SeoPageDef {
  return {
    slug: `${b.value}/${s.slug}`,
    kind: "body-state",
    label: `${s.zh}${b.label}`,
    title: `${s.zh}二手${b.label} - ${s.en} 华人${b.labelEn}车源 | ${SITE_NAME}`,
    description: `${s.zh}（${s.en}）二手${b.label}车源：本地华人车行与个人直售，按品牌、价格、里程筛选 ${b.labelEn}，中文服务。`,
    h1: `${s.zh}二手${b.label}`,
    intro: [
      `在${s.zh}买二手${b.label}，${SITE_NAME}帮你找到本地华人卖家的 ${b.labelEn} 车源，按距离、价格、品牌筛选，中文看车沟通无障碍。`,
    ],
    browseParams: { bodyStyle: b.value, location: s.abbr },
    listFilter: { bodyStyle: b.value, stateAbbr: s.abbr },
  };
}

function priceStatePage(max: number, s: SeoState): SeoPageDef {
  return {
    slug: `under-${max}/${s.slug}`,
    kind: "price-state",
    label: `${s.zh}$${max.toLocaleString()}以下`,
    title: `${s.zh} ${max.toLocaleString()}美元以下二手车 - ${s.en} 便宜二手车 | ${SITE_NAME}`,
    description: `${s.zh}（${s.en}）$${max.toLocaleString()} 以下二手车源：本地华人个人直售为主，价格实惠，适合留学生和新移民代步，中文服务。`,
    h1: `${s.zh} $${max.toLocaleString()} 以下二手车`,
    intro: [
      `在${s.zh}用 $${max.toLocaleString()} 以内的预算买车，个人直售没有车行加价。买前查 VIN 召回记录、看里程和车况描述，选台靠谱的代步车。`,
    ],
    browseParams: { maxPrice: String(max), location: s.abbr },
    listFilter: { maxPrice: max, stateAbbr: s.abbr },
  };
}

function fuelStatePage(f: { slug: string; value: string; zh: string; en: string }, s: SeoState): SeoPageDef {
  return {
    slug: `${f.slug}/${s.slug}`,
    kind: "fuel-state",
    label: `${s.zh}${f.zh}`,
    title: `${s.zh}二手${f.zh} - ${s.en} ${f.en} 车源 | ${SITE_NAME}`,
    description: `${s.zh}（${s.en}）二手${f.zh}车源（${f.en}）：本地华人直售，按品牌、价格、里程筛选，中文服务。`,
    h1: `${s.zh}二手${f.zh}`,
    intro: [
      `在${s.zh}找二手${f.zh}，${SITE_NAME}汇集 ${s.en} 本地华人卖家的${f.zh}车源，中文沟通，看车方便。`,
    ],
    browseParams: { fuelType: f.value, location: s.abbr },
    listFilter: { fuelType: f.value, stateAbbr: s.abbr },
  };
}

// 法拉盛强化落地页:不走通用城市模板,手写文案覆盖「法拉盛二手车 / 法拉盛买车 /
// 纽约法拉盛华人车行」等搜索词;slug 与 SEO_CITIES 里的 flushing 一致,
// buildAll 里先注册本页,通用 cityPage 因 slug 重复被跳过
const FLUSHING_PAGE: SeoPageDef = {
  slug: "flushing",
  kind: "city",
  label: "法拉盛",
  title: `法拉盛二手车 - 纽约法拉盛华人买车卖车·华人车行直售 | ${SITE_NAME}`,
  description: `法拉盛(Flushing)华人二手车市场:缅街周边华人车行与个人卖家直售,丰田、本田、宝马、特斯拉等热门品牌车源,全中文看车谈价,支持按价格、里程、距离筛选,提供 VIN 召回查询与 Carfax 报告,免费发布卖车信息。`,
  h1: "法拉盛二手车",
  intro: [
    `法拉盛(Flushing)是纽约乃至东岸最大的华人社区,在这里买二手车不用跑远:${SITE_NAME}汇集法拉盛缅街(Main St)及皇后区周边的华人车行与个人卖家车源,约看车方便,砍价、验车、过户全程中文沟通,没有语言障碍。`,
    `刚来纽约的留学生和新移民,可以按预算筛选一万美元以内的代步车,个人直售没有车行加价;需要家用车的,也有汉兰达、塞纳、奥德赛等七座车源可选。每辆车都支持 VIN 召回记录查询,部分车源附带 Carfax 报告,车况透明再下手。`,
    `在法拉盛卖车同样简单:免费发布、无中间商抽成,直接卖给同城华人买家。法拉盛的华人车行也可以入驻开通店铺,集中展示在售车辆,让更多纽约华人找到你。`,
  ],
  browseParams: { location: "NY-QN" },
  listFilter: { stateAbbr: "NY", cityKeywords: ["flushing", "法拉盛", "queens", "皇后区"] },
};

const THEME_PAGES: SeoPageDef[] = [
  {
    slug: "low-mileage",
    kind: "theme",
    label: "低里程二手车",
    title: `低里程二手车 - 5万英里以内准新车 | ${SITE_NAME}`,
    description: `北美华人低里程二手车专区：5 万英里以内的准新车源，车况更好、剩余寿命更长，按品牌、价格、所在州筛选，中文服务。`,
    h1: "低里程二手车（5 万英里以内）",
    intro: [
      `里程是二手车最直观的硬指标。${SITE_NAME}低里程专区只收录 5 万英里以内的车源，配合 VIN 召回查询和 Carfax 报告，买台接近新车的二手车。`,
    ],
    browseParams: { maxMileage: "50000" },
    listFilter: { maxMileage: 50000 },
  },
  {
    slug: "student-cars",
    kind: "theme",
    label: "留学生代步车",
    title: `留学生买车 - 1.2万美元以内代步车推荐 | ${SITE_NAME}`,
    description: `留学生在美国买车专区：$12,000 以内的靠谱代步车源，个人直售价格实惠，全中文沟通，附购车流程与过户指南。`,
    h1: "留学生代步车（$12,000 以内）",
    intro: [
      `刚来美国的留学生买车，预算通常在一万美元上下。${SITE_NAME}为你筛出 $12,000 以内的代步车源，全中文沟通看车、砍价、过户，不用担心语言问题。买前记得查 VIN 召回记录，配合购车指南了解保险和过户流程。`,
    ],
    browseParams: { maxPrice: "12000" },
    listFilter: { maxPrice: 12000 },
  },
  {
    slug: "family-suv",
    kind: "theme",
    label: "家用7座SUV",
    title: `二手7座SUV - 家用大空间SUV推荐 | ${SITE_NAME}`,
    description: `北美华人家用 SUV 专区：汉兰达、Pilot、Telluride 等适合家庭的大空间 SUV 车源，按价格、里程、所在州筛选，中文服务。`,
    h1: "家用 SUV 二手车",
    intro: [
      `一家人出行，空间和可靠性最重要。${SITE_NAME}家用 SUV 专区汇集汉兰达、本田 Pilot、起亚 Telluride 等口碑车型的二手车源，中文沟通看车更放心。`,
    ],
    browseParams: { bodyStyle: "suv" },
    listFilter: { bodyStyle: "suv" },
  },
];

// ── 汇总 ──

function buildAll(): SeoPageDef[] {
  const map = new Map<string, SeoPageDef>();
  const add = (p: SeoPageDef) => {
    if (!map.has(p.slug)) map.set(p.slug, p);
  };

  for (const m of SELLABLE_MAKES) add(makePage(m));
  for (const s of SEO_STATES) add(statePage(s));
  add(FLUSHING_PAGE); // 先于通用城市页注册,同 slug 的模板页会被跳过
  for (const c of SEO_CITIES) add(cityPage(c));
  const hotStates = SEO_STATES.filter((s) => HOT_STATE_ABBRS.includes(s.abbr));
  for (const m of SELLABLE_MAKES) {
    for (const s of hotStates) add(makeStatePage(m, s));
  }
  for (const b of BODY_STYLE_OPTIONS) add(bodyPage(b));
  for (const p of SEO_PRICE_PAGES) add(pricePage(p));
  for (const y of SEO_YEARS) add(yearPage(y));
  for (const f of SEO_FUELS) add(fuelPage(f));

  // 车型页 + 车型×州
  const modelStates = SEO_STATES.filter((s) => MODEL_STATE_ABBRS.includes(s.abbr));
  for (const m of SEO_MODELS) {
    add(modelPage(m));
    for (const s of modelStates) add(modelStatePage(m, s));
  }
  // 品牌×预算 / 品牌×年份（热门品牌）
  for (const make of HOT_MAKES) {
    for (const p of SEO_PRICE_PAGES) add(makePricePage(make, p));
    for (const y of SEO_YEARS.filter((y) => y >= 2015)) add(makeYearPage(make, y));
  }
  // 车身类型×州 / 预算×州 / 燃油×州
  for (const b of BODY_STYLE_OPTIONS) {
    for (const s of hotStates) add(bodyStatePage(b, s));
  }
  for (const p of SEO_PRICE_PAGES) {
    for (const s of hotStates) add(priceStatePage(p, s));
  }
  for (const f of SEO_FUELS) {
    for (const s of hotStates) add(fuelStatePage(f, s));
  }
  // 主题页
  for (const t of THEME_PAGES) add(t);

  return [...map.values()];
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
  } else if (def.kind === "model" || def.kind === "model-state") {
    const [mSlug, modelSlugPart] = def.slug.split("/");
    const modelStates = SEO_STATES.filter((s) => MODEL_STATE_ABBRS.includes(s.abbr));
    // 该车型在各州
    groups.push({
      title: "该车型各州车源",
      pages: modelStates
        .map((s) => pageMap.get(`${mSlug}/${modelSlugPart}/${s.slug}`))
        .filter((p) => p && p.slug !== def.slug) as SeoPageDef[],
    });
    // 同品牌其他车型
    const make = SEO_MODELS.find((m) => makeSlug(m.make) === mSlug)?.make;
    if (make) {
      groups.push({
        title: `${MAKES_ZH[make] || make}其他车型`,
        pages: SEO_MODELS.filter((m) => m.make === make)
          .map((m) => pageMap.get(`${makeSlug(m.make)}/${makeSlug(m.name)}`))
          .filter((p) => p && p.slug !== `${mSlug}/${modelSlugPart}`) as SeoPageDef[],
      });
      const makeDef = pageMap.get(mSlug);
      if (makeDef) groups.push({ title: "品牌专区", pages: [makeDef] });
    }
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
