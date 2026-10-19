/**
 * 品牌 logo 表 —— 全站唯一来源(展示统一走 components/brand-logo.tsx 的 <BrandLogo>)。
 *
 * 图片热链 GitHub car-logos-dataset 的 thumb 版(filippofilip95/car-logos-dataset)。
 * 授权:该仓库 MIT 只覆盖数据集/代码,logo 本身是各厂商商标,不授予图片权利 —— 所以不拷进 public/,
 * 只在这里集中引用,将来要换自托管 / 换源只改这一处。依赖第三方站点可用性:挂了组件会自动退回字母占位。
 */

const LOGO_BASE = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/thumb/";

/** 规范品牌名(MAKES / 转载源 canonicalMake 的写法)→ 数据集 slug。2026-10 逐个 curl -I 确认 200。 */
const LOGO_SLUGS: Record<string, string> = {
  Acura: "acura",
  "Alfa Romeo": "alfa-romeo",
  "Aston Martin": "aston-martin",
  Audi: "audi",
  Bentley: "bentley",
  BMW: "bmw",
  Bugatti: "bugatti",
  Buick: "buick",
  Cadillac: "cadillac",
  Chevrolet: "chevrolet",
  Chrysler: "chrysler",
  Dodge: "dodge",
  Ferrari: "ferrari",
  Fiat: "fiat",
  Ford: "ford",
  Genesis: "genesis",
  GMC: "gmc",
  Honda: "honda",
  Hummer: "hummer",
  Hyundai: "hyundai",
  Infiniti: "infiniti",
  Jaguar: "jaguar",
  Jeep: "jeep",
  Kia: "kia",
  Lamborghini: "lamborghini",
  "Land Rover": "land-rover",
  Lexus: "lexus",
  Lincoln: "lincoln",
  Lotus: "lotus",
  Lucid: "lucid",
  Maserati: "maserati",
  Maybach: "maybach",
  Mazda: "mazda",
  McLaren: "mclaren",
  "Mercedes-Benz": "mercedes-benz",
  Mini: "mini",
  Mitsubishi: "mitsubishi",
  Nissan: "nissan",
  Polestar: "polestar",
  Porsche: "porsche",
  Ram: "ram",
  Rivian: "rivian",
  "Rolls-Royce": "rolls-royce",
  Smart: "smart",
  Subaru: "subaru",
  Suzuki: "suzuki",
  Tesla: "tesla",
  Toyota: "toyota",
  Volkswagen: "volkswagen",
  Volvo: "volvo",
  // 不在 MAKES 里、但转载源会产出的停产品牌(lib/sources/custom-a-shared.ts / dealercenter-wp.ts)
  Isuzu: "isuzu",
  Mercury: "mercury",
  Pontiac: "pontiac",
  Saturn: "saturn",
  Scion: "scion",
};

/**
 * 深色模式(深色底块 = 主题 secondary)下的处理,2026-10-19 对 55 张图逐像素算对比度得出(底色按 #27272a、
 * 门槛 2:1;自带不透明白底的图也算失败),只列失败的品牌,其余直接放在深色底块上:
 * - invert:纯黑单色(彩色像素占比 0)→ 深色模式反白
 * - plate:彩色 / 自带白底 → 深色模式垫一块白色内衬
 * 浅色模式下 ferrari / lotus 偏淡(黄色为主),但主体图形仍可辨认,按用户决定不处理。
 */
const DARK_INVERT = new Set(["audi", "hummer", "jaguar", "lincoln", "lucid", "maserati", "nissan", "polestar", "rivian", "toyota"]);
const DARK_PLATE = new Set([
  "acura", "alfa-romeo", "cadillac", "ford", "genesis", "lamborghini", "land-rover", "maybach", "mclaren",
  "mercedes-benz", "porsche", "ram", "saturn", "subaru", "volkswagen",
  // 对比度门槛之上、但按真实图拼出的深色模式预览里仍偏暗(银灰 / 深色细字)
  "aston-martin", "buick", "chrysler", "dodge", "mercury", "pontiac", "scion",
]);

export type DarkModeTreatment = "none" | "invert" | "plate";

/** 只留字母数字小写,让 "MINI" / "mercedes benz" / "Land-Rover" 都能命中 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const SLUG_INDEX = new Map(Object.entries(LOGO_SLUGS).map(([k, v]) => [norm(k), v]));

/** 有 logo 的品牌返回图片 URL,否则 null(包括 "Other" 和未知品牌 → 组件显示字母占位) */
export function getBrandLogoUrl(make: string | null | undefined): string | null {
  if (!make) return null;
  const slug = SLUG_INDEX.get(norm(make));
  return slug ? `${LOGO_BASE}${slug}.png` : null;
}

/** 字母占位:多词取前两个词首字母("Land Rover" → LR,"Mercedes-Benz" → MB),单词取首字母;max=1 时只取一个 */
export function brandMonogram(make: string | null | undefined, max: 1 | 2 = 2): string {
  const words = (make ?? "").trim().split(/[\s\-_/]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => [...w][0]) : [[...words[0]][0]];
  return letters.slice(0, max).join("").toUpperCase();
}

/** 深色模式下这个品牌 logo 的处理方式(见 DARK_INVERT / DARK_PLATE) */
export function brandLogoDarkTreatment(make: string | null | undefined): DarkModeTreatment {
  if (!make) return "none";
  const slug = SLUG_INDEX.get(norm(make));
  if (!slug) return "none";
  return DARK_INVERT.has(slug) ? "invert" : DARK_PLATE.has(slug) ? "plate" : "none";
}
