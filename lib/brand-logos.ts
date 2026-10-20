/**
 * 品牌 logo 表 —— 全站唯一来源(展示统一走 components/brand-logo.tsx 的 <BrandLogo>)。
 *
 * 图标是本地单色 SVG(public/brand-logos/<slug>.svg),组件用 CSS mask 填 currentColor,浅色 / 深色跟随文字色,
 * 不外链、不需要深色模式特殊处理。来源与授权逐个记在 docs/brand-logos-sources.tsv:
 * simple-icons 16.35.0(CC0)38 个 + Wikimedia Commons(PD-textlogo / PD-shape)16 个;
 * 商标仍归各厂商,只用于标识品牌,不改形状(裁剪只去掉附带字标 / 外框)。
 * 没有授权清楚的矢量图的品牌(Genesis、Alfa Romeo、Lotus、Scion、Holden 等)走字母占位。
 *
 * 每个 SVG 的 viewBox 已裁到墨迹边界;尺寸按「视觉面积」归一(bbox 面积 = 方框 40%,稀疏线框最多放大 1.25,
 * 上限高 70% / 宽 90%,细长字标宽 100%),下表是图标占方框的宽、高百分比。重新生成见 docs/brand-logos-sources.tsv 表头。
 */

/** 规范品牌名(MAKES / 转载源 canonicalMake 的写法)→ [文件 slug, 宽 %, 高 %] */
const LOGOS: Record<string, readonly [slug: string, w: number, h: number]> = {
  Acura: ["acura", 68.2, 69.1],
  "Aston Martin": ["aston-martin", 100, 23],
  Audi: ["audi", 90, 31.2],
  Bentley: ["bentley", 90, 29.4],
  BMW: ["bmw", 69.3, 69.3],
  Bugatti: ["bugatti", 72.9, 54.9],
  Buick: ["buick", 60.3, 66.3],
  BYD: ["byd", 100, 19.5],
  Cadillac: ["cadillac", 90, 35.4],
  Chevrolet: ["chevrolet", 90, 29.4],
  Chrysler: ["chrysler", 100, 16],
  Dodge: ["dodge", 100, 14.3],
  Ferrari: ["ferrari", 50.4, 70],
  Fiat: ["fiat", 63.2, 63.2],
  Ford: ["ford", 90, 33.9],
  GMC: ["gmc", 100, 22.7],
  GWM: ["gwm", 100, 18.3],
  Honda: ["honda", 73, 59.4],
  Hummer: ["hummer", 100, 10.7],
  Hyundai: ["hyundai", 88.9, 45.6],
  Infiniti: ["infiniti", 90, 41.4],
  Isuzu: ["isuzu", 100, 17.2],
  Jaguar: ["jaguar", 100, 12.4],
  Jeep: ["jeep", 90, 36.3],
  Kia: ["kia", 100, 23.7],
  Lamborghini: ["lamborghini", 60, 70],
  "Land Rover": ["land-rover", 90, 47.3],
  Lexus: ["lexus", 76.7, 57.4],
  Lincoln: ["lincoln", 34.4, 70],
  Lucid: ["lucid", 48.5, 70],
  Maserati: ["maserati", 49.5, 70],
  Maybach: ["maybach", 81.8, 61.1],
  Mazda: ["mazda", 72, 57.6],
  McLaren: ["mclaren", 100, 15],
  "Mercedes-Benz": ["mercedes-benz", 70.3, 70],
  Mercury: ["mercury", 70, 70],
  MG: ["mg", 64.4, 62.1],
  Mini: ["mini", 90, 39.6],
  Mitsubishi: ["mitsubishi", 73.1, 63.3],
  Nissan: ["nissan", 77.3, 64.7],
  Polestar: ["polestar", 69.1, 70],
  Pontiac: ["pontiac", 37.2, 70],
  Porsche: ["porsche", 54.6, 70],
  Ram: ["ram", 66.7, 70],
  Rivian: ["rivian", 90, 18],
  "Rolls-Royce": ["rolls-royce", 53.2, 70],
  Saturn: ["saturn", 90, 51.9],
  Smart: ["smart", 65.6, 61],
  Subaru: ["subaru", 90, 52.8],
  Suzuki: ["suzuki", 62.9, 63.6],
  Tesla: ["tesla", 70.1, 70],
  Toyota: ["toyota", 78, 53],
  Volkswagen: ["volkswagen", 66.2, 66.2],
  Volvo: ["volvo", 70, 70],
};

export interface BrandLogoInfo {
  url: string;
  /** 图标占方框的宽、高百分比 */
  w: number;
  h: number;
}

/** 只留字母数字小写,让 "MINI" / "mercedes benz" / "Land-Rover" 都能命中 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const INDEX = new Map(Object.entries(LOGOS).map(([k, v]) => [norm(k), v]));

/** 有 logo 的品牌返回本地 SVG 和尺寸,否则 null(包括 "Other" 和未知品牌 → 组件显示字母占位) */
export function getBrandLogo(make: string | null | undefined): BrandLogoInfo | null {
  if (!make) return null;
  const hit = INDEX.get(norm(make));
  return hit ? { url: `/brand-logos/${hit[0]}.svg`, w: hit[1], h: hit[2] } : null;
}

/** 字母占位:多词取前两个词首字母("Land Rover" → LR,"Mercedes-Benz" → MB),单词取首字母;max=1 时只取一个 */
export function brandMonogram(make: string | null | undefined, max: 1 | 2 = 2): string {
  const words = (make ?? "").trim().split(/[\s\-_/]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => [...w][0]) : [[...words[0]][0]];
  return letters.slice(0, max).join("").toUpperCase();
}
