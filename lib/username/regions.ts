// 随机用户名的「地区词」:IP 定位(国家 + 州/省代码 + 城市)→ 各语言的地区昵称。
// 先按城市命中都会区,再落到整州/省兜底;表里没有的美加州省直接用代码(如 "KS"),
// 其他国家不出地区词。es/fr 缺省时回退 en 列表。

import { dbLocale, type Locale } from "@/lib/i18n";
import type { IpGeo } from "@/lib/ip-geo";

interface RegionEntry {
  country: "US" | "CA";
  /** ISO 3166-2 州/省代码(Vercel x-vercel-ip-country-region) */
  region: string;
  /** 小写英文城市名;省略 = 整州/省兜底 */
  cities?: string[];
  zh: string[];
  en: string[];
  ko?: string[];
  ja?: string[];
  es?: string[];
  fr?: string[];
}

const REGIONS: RegionEntry[] = [
  // ── 纽约 / 新泽西 ──
  { country: "US", region: "NY", cities: ["flushing", "college point", "whitestone", "fresh meadows", "bayside"],
    zh: ["法拉盛", "纽约", "NY"], en: ["Flushing", "NYC", "NY"], ko: ["플러싱", "뉴욕"], ja: ["フラッシング", "NY"] },
  { country: "US", region: "NY", cities: ["new york", "brooklyn", "queens", "bronx", "the bronx", "staten island", "manhattan", "long island city", "astoria", "elmhurst", "forest hills", "jackson heights", "woodside", "corona", "jamaica", "rego park", "sunnyside"],
    zh: ["纽约", "NY", "大苹果"], en: ["NY", "NYC", "NewYork", "BigApple"], ko: ["뉴욕", "NY"], ja: ["NY", "ニューヨーク"], es: ["NY", "NuevaYork"] },
  { country: "US", region: "NY",
    zh: ["纽约", "NY"], en: ["NY", "Upstate"], ko: ["뉴욕", "NY"], ja: ["NY", "ニューヨーク"], es: ["NY", "NuevaYork"] },
  { country: "US", region: "NJ",
    zh: ["新泽西", "泽西", "NJ"], en: ["NJ", "Jersey"], ko: ["뉴저지", "NJ"], ja: ["NJ", "ジャージー"] },

  // ── 加州 ──
  { country: "US", region: "CA", cities: ["los angeles", "alhambra", "arcadia", "san gabriel", "rosemead", "monterey park", "temple city", "el monte", "rowland heights", "diamond bar", "walnut", "pasadena", "torrance", "hacienda heights", "west covina", "chino hills", "glendale", "burbank", "santa monica", "long beach", "city of industry", "covina"],
    zh: ["洛杉矶", "洛城", "LA"], en: ["LA", "LosAngeles"], ko: ["LA", "엘에이"], ja: ["LA", "ロサンゼルス"], es: ["LA", "LosÁngeles"] },
  { country: "US", region: "CA", cities: ["irvine", "costa mesa", "anaheim", "santa ana", "tustin", "newport beach", "huntington beach", "fullerton", "orange", "lake forest", "mission viejo", "yorba linda"],
    zh: ["尔湾", "橙县", "OC"], en: ["OC", "Irvine"], ko: ["OC", "어바인"], ja: ["OC", "アーバイン"] },
  { country: "US", region: "CA", cities: ["san francisco", "daly city", "south san francisco"],
    zh: ["旧金山", "三番", "湾区", "SF"], en: ["SF", "SanFran"], ko: ["샌프란", "SF"], ja: ["SF", "サンフランシスコ"] },
  { country: "US", region: "CA", cities: ["san jose", "oakland", "fremont", "palo alto", "mountain view", "sunnyvale", "santa clara", "cupertino", "milpitas", "berkeley", "san mateo", "redwood city", "menlo park", "hayward", "union city", "pleasanton", "dublin", "foster city", "burlingame", "san bruno", "newark", "los altos", "saratoga", "san ramon", "walnut creek"],
    zh: ["湾区", "硅谷", "BayArea"], en: ["BayArea", "Bay"], ko: ["베이", "실리콘밸리"], ja: ["ベイエリア", "シリコンバレー"] },
  { country: "US", region: "CA", cities: ["san diego", "la jolla", "chula vista"],
    zh: ["圣地亚哥", "SD"], en: ["SD", "SanDiego"], ko: ["샌디에고"], ja: ["サンディエゴ"] },
  { country: "US", region: "CA", cities: ["sacramento", "davis", "elk grove", "roseville"],
    zh: ["萨城", "萨克拉门托"], en: ["Sac", "Sacramento"] },
  { country: "US", region: "CA",
    zh: ["加州", "CA"], en: ["Cali", "CA"], ko: ["캘리", "CA"], ja: ["カリフォルニア", "CA"], es: ["Cali", "CA"] },

  // ── 西北 ──
  { country: "US", region: "WA", cities: ["seattle", "bellevue", "redmond", "kirkland", "bothell", "renton", "issaquah", "sammamish", "lynnwood", "everett", "tacoma", "kent", "federal way", "shoreline"],
    zh: ["西雅图", "SEA"], en: ["SEA", "Seattle"], ko: ["시애틀"], ja: ["シアトル"] },
  { country: "US", region: "WA", zh: ["华州", "WA"], en: ["WA"] },
  { country: "US", region: "OR", zh: ["波特兰", "PDX"], en: ["PDX", "Portland"], ko: ["포틀랜드"], ja: ["ポートランド"] },

  // ── 东北 / 中大西洋 ──
  { country: "US", region: "MA", cities: ["boston", "cambridge", "quincy", "brookline", "newton", "somerville", "malden", "medford", "waltham", "lexington", "allston", "brighton"],
    zh: ["波士顿", "波村", "BOS"], en: ["BOS", "Boston"], ko: ["보스턴"], ja: ["ボストン"] },
  { country: "US", region: "MA", zh: ["麻州", "MA"], en: ["MA", "Mass"] },
  { country: "US", region: "PA", cities: ["philadelphia", "king of prussia", "upper darby"],
    zh: ["费城", "PHL"], en: ["Philly", "PHL"], ko: ["필라"], ja: ["フィラデルフィア"] },
  { country: "US", region: "PA", cities: ["pittsburgh"],
    zh: ["匹兹堡", "匹村"], en: ["PGH", "Pittsburgh"], ko: ["피츠버그"], ja: ["ピッツバーグ"] },
  { country: "US", region: "PA", zh: ["宾州", "PA"], en: ["PA"] },
  { country: "US", region: "DC", zh: ["华盛顿", "华府", "DC"], en: ["DC", "DMV"], ko: ["워싱턴", "DC"], ja: ["DC", "ワシントン"] },
  { country: "US", region: "MD", cities: ["rockville", "bethesda", "gaithersburg", "silver spring", "germantown", "potomac", "columbia"],
    zh: ["华府", "DC", "马里兰"], en: ["DMV", "DC"], ko: ["워싱턴", "DC"], ja: ["DC", "ワシントン"] },
  { country: "US", region: "MD", zh: ["马里兰", "MD"], en: ["MD"] },
  { country: "US", region: "VA", cities: ["arlington", "alexandria", "fairfax", "mclean", "vienna", "tysons", "herndon", "reston", "falls church", "centreville", "chantilly"],
    zh: ["华府", "DC", "北弗"], en: ["DMV", "NoVA"], ko: ["워싱턴", "DC"], ja: ["DC", "ワシントン"] },
  { country: "US", region: "VA", zh: ["弗州", "VA"], en: ["VA"] },

  // ── 中西部 ──
  { country: "US", region: "IL", cities: ["chicago", "naperville", "evanston", "schaumburg", "skokie", "oak brook", "aurora", "champaign", "urbana"],
    zh: ["芝加哥", "CHI"], en: ["Chi", "ChiTown", "Chicago"], ko: ["시카고"], ja: ["シカゴ"] },
  { country: "US", region: "IL", zh: ["伊州", "IL"], en: ["IL"] },
  { country: "US", region: "MI", zh: ["密歇根", "MI"], en: ["MI", "Mitten"], ko: ["미시간"], ja: ["ミシガン"] },
  { country: "US", region: "MN", zh: ["明州", "MN"], en: ["MN"] },
  { country: "US", region: "OH", zh: ["俄亥俄", "OH"], en: ["OH", "Ohio"] },

  // ── 德州 / 南部 ──
  { country: "US", region: "TX", cities: ["houston", "sugar land", "katy", "pearland", "missouri city", "the woodlands", "bellaire", "stafford", "spring", "cypress"],
    zh: ["休斯顿", "HTX"], en: ["HTX", "Houston"], ko: ["휴스턴"], ja: ["ヒューストン"] },
  { country: "US", region: "TX", cities: ["dallas", "plano", "frisco", "richardson", "irving", "arlington", "fort worth", "carrollton", "allen", "mckinney", "garland", "addison", "lewisville"],
    zh: ["达拉斯", "DFW"], en: ["DFW", "Dallas"], ko: ["달라스"], ja: ["ダラス"] },
  { country: "US", region: "TX", cities: ["austin", "round rock", "cedar park"],
    zh: ["奥斯汀", "ATX"], en: ["ATX", "Austin"], ko: ["오스틴"], ja: ["オースティン"] },
  { country: "US", region: "TX",
    zh: ["德州", "TX"], en: ["TX", "Texas"], ko: ["텍사스"], ja: ["テキサス"], es: ["TX", "Tejas"] },
  { country: "US", region: "GA", zh: ["亚特兰大", "ATL"], en: ["ATL", "Atlanta"], ko: ["애틀랜타", "ATL"], ja: ["アトランタ"] },
  { country: "US", region: "NC", zh: ["北卡", "NC"], en: ["NC"] },
  { country: "US", region: "FL", cities: ["miami", "miami beach", "fort lauderdale", "hollywood", "doral", "coral gables"],
    zh: ["迈阿密", "MIA"], en: ["MIA", "Miami"], ko: ["마이애미"], ja: ["マイアミ"] },
  { country: "US", region: "FL", cities: ["orlando", "kissimmee"],
    zh: ["奥兰多"], en: ["Orlando", "ORL"], ko: ["올랜도"], ja: ["オーランド"] },
  { country: "US", region: "FL", zh: ["佛州", "FL"], en: ["FL", "Florida"], es: ["FL", "Florida"] },

  // ── 西南 / 山区 / 夏威夷 ──
  { country: "US", region: "NV", zh: ["赌城", "维加斯", "LV"], en: ["Vegas", "LV"], ko: ["베가스"], ja: ["ベガス"] },
  { country: "US", region: "AZ", zh: ["凤凰城", "PHX"], en: ["PHX", "Phoenix"], ko: ["피닉스"], ja: ["フェニックス"] },
  { country: "US", region: "CO", zh: ["丹佛", "CO"], en: ["Denver", "CO"], ko: ["덴버"], ja: ["デンバー"] },
  { country: "US", region: "UT", zh: ["盐湖城", "UT"], en: ["SLC", "Utah"] },
  { country: "US", region: "HI", zh: ["夏威夷", "檀香山"], en: ["Hawaii", "HI"], ko: ["하와이"], ja: ["ハワイ"] },

  // ── 加拿大 ──
  { country: "CA", region: "ON", cities: ["toronto", "markham", "richmond hill", "mississauga", "scarborough", "north york", "vaughan", "brampton", "oakville", "etobicoke", "thornhill"],
    zh: ["多伦多", "TO"], en: ["TO", "The6ix", "Toronto"], ko: ["토론토"], ja: ["トロント"] },
  { country: "CA", region: "ON", cities: ["ottawa", "kanata", "nepean"],
    zh: ["渥太华"], en: ["Ottawa", "YOW"], ko: ["오타와"], ja: ["オタワ"] },
  { country: "CA", region: "ON", zh: ["安省", "ON"], en: ["ON"] },
  { country: "CA", region: "BC", cities: ["vancouver", "richmond", "burnaby", "coquitlam", "surrey", "north vancouver", "west vancouver", "new westminster", "port moody", "port coquitlam"],
    zh: ["温哥华", "温村", "Van"], en: ["Van", "YVR", "Vancouver"], ko: ["밴쿠버"], ja: ["バンクーバー"] },
  { country: "CA", region: "BC", zh: ["卑诗", "BC"], en: ["BC"] },
  { country: "CA", region: "QC", cities: ["montreal", "montréal", "laval", "longueuil", "brossard"],
    zh: ["蒙特利尔", "满地可", "MTL"], en: ["MTL", "Montreal"], fr: ["MTL", "Montréal"], ko: ["몬트리올"], ja: ["モントリオール"] },
  { country: "CA", region: "QC", zh: ["魁北克", "QC"], en: ["QC"], fr: ["QC", "Québec"] },
  { country: "CA", region: "AB", cities: ["calgary"], zh: ["卡尔加里", "卡村"], en: ["YYC", "Calgary"], ko: ["캘거리"], ja: ["カルガリー"] },
  { country: "CA", region: "AB", cities: ["edmonton"], zh: ["埃德蒙顿", "爱城"], en: ["YEG", "Edmonton"], ko: ["에드먼턴"], ja: ["エドモントン"] },
  { country: "CA", region: "AB", zh: ["阿省", "AB"], en: ["AB"] },
];

/** IP 定位 → 当前语言下可选的地区词(空数组 = 不出地区词) */
export function regionVariants(geo: IpGeo | null | undefined, locale: Locale): string[] {
  if (!geo?.country || !geo.region) return [];
  const city = geo.city?.trim().toLowerCase();
  const inRegion = REGIONS.filter((r) => r.country === geo.country && r.region === geo.region);
  const hit =
    (city && inRegion.find((r) => r.cities?.includes(city))) ||
    inRegion.find((r) => !r.cities);
  // zh-hant 暂用简体地区词(K2 再转繁体)
  if (hit) return hit[dbLocale(locale)] ?? hit.en;
  return geo.country === "US" || geo.country === "CA" ? [geo.region] : [];
}
