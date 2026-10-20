// sites-custom-a 族(一站一适配器)共用的小工具:品牌名归一、大小写整理、
// 燃油/变速箱/驱动映射、带 UA 的直连 fetch。

import { MAKES_ZH } from "@/lib/mock-data";
import { mapColor } from "./dealercenter-wp";

export const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAKE_ALIASES: Record<string, string> = {
  chev: "Chevrolet",
  chevy: "Chevrolet",
  vw: "Volkswagen",
  mercedes: "Mercedes-Benz",
  benz: "Mercedes-Benz",
  mercedesbenz: "Mercedes-Benz",
  landrover: "Land Rover",
  rollsroyce: "Rolls-Royce",
  alfaromeo: "Alfa Romeo",
  astonmartin: "Aston Martin",
  scion: "Scion",
  pontiac: "Pontiac",
  saturn: "Saturn",
  mercury: "Mercury",
  isuzu: "Isuzu",
  // 澳新:哈弗是长城旗下品牌,统一归到 GWM
  haval: "GWM",
  greatwall: "GWM",
  greatwallmotors: "GWM",
  mgmotor: "MG",
};

const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const MAKE_INDEX = new Map(Object.keys(MAKES_ZH).map((k) => [alnum(k), k]));

/** "MERCEDES BENZ" / "chev" / "MCLAREN" → MAKES_ZH 规范写法;未知品牌首字母大写。 */
export function canonicalMake(raw: string): string {
  const key = alnum(raw);
  if (!key) return "";
  const hit = MAKE_INDEX.get(key) ?? MAKE_ALIASES[key];
  if (hit) return hit;
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= 3) return t.toUpperCase();
  return t.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

export function makeZh(make: string): string {
  return MAKES_ZH[make] ?? make;
}

// 保持全大写的 token(其余 ≤3 字母的也保持大写)
const KEEP_UPPER = new Set([
  "AWD", "FWD", "RWD", "4WD", "4X4", "XLE", "XSE", "XLT", "TRD", "AMG", "SRT", "GTI", "STI",
  "PHEV", "TDI", "TSI", "SEL", "SXT", "SUV", "GLS", "GLE", "GLC", "GLA", "GLB", "CLA", "CLS",
  "TLX", "MDX", "RDX", "ILX", "TSX", "RSX", "WRX", "SLT", "LTZ", "EUV", "LWB", "SWB", "GTS",
  "ABS", "LED", "DVD", "GPS", "USB", "HID", "SSG", "PDK", "DCT", "MCT", "SRS", "TPMS", "HUD",
  "SPD", "CYL", "STD", "DOHC", "SOHC", "VTEC", "RDS", "CD",
]);
const WORD_OVERRIDES: Record<string, string> = {
  MCLAREN: "McLaren",
  SIRIUSXM: "SiriusXM",
  "BI-XENON": "Bi-Xenon",
  IPOD: "iPod",
  "I-VTEC": "i-VTEC",
};
const KEEP_LOWER_WORDS = new Set(["with", "and", "w/"]);

function caseToken(token: string): string {
  const upper = token.toUpperCase();
  if (WORD_OVERRIDES[upper]) return WORD_OVERRIDES[upper];
  // "XDRIVE40I" → "xDrive40i"
  const drive = upper.match(/^([XS])DRIVE(\d*)(I?)$/);
  if (drive) return `${drive[1].toLowerCase()}Drive${drive[2]}${drive[3].toLowerCase()}`;
  // BMW 型号 "530I" / "M440I" / "M60I" → 小写 i
  if (/^M?\d{2,3}I$/.test(upper)) return upper.slice(0, -1) + "i";
  if (KEEP_UPPER.has(upper) || /\d/.test(token)) return upper;
  if (KEEP_LOWER_WORDS.has(token.toLowerCase())) return token.toLowerCase();
  return token
    .split(/([-/])/)
    .map((p) =>
      p === "-" || p === "/"
        ? p
        : KEEP_UPPER.has(p.toUpperCase()) || p.length <= 2
          ? p.toUpperCase()
          : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    )
    .join("");
}

/** 全大写/全小写文本 → 标题大小写;已是混合大小写则原样保留。 */
export function titleCase(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.split(" ").map(caseToken).join(" ");
}

export function mapFuel(text: string, make: string): string {
  const t = text.toLowerCase();
  if (t.includes("hydrogen") || t.includes("fuel cell")) return "氢燃料";
  if (/plug[\s-]?in|\bphev\b|prius prime/.test(t)) return "插电混动";
  if (t.includes("hybrid") || /\bhev\b/.test(t)) return "混动";
  if (t.includes("electric") || /\bev\b/.test(t) || make === "Tesla") return "纯电";
  if (t.includes("diesel")) return "柴油";
  return "汽油";
}

export function mapTransmission(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes("cvt") || t.includes("variable")) return "CVT 无级";
  if (/manual|\bmt\b|stick/.test(t) && !t.includes("auto")) return "MT 手动";
  return "AT 自动";
}

export function mapDrivetrain(raw: string | null | undefined): string | null {
  const s = (raw || "").toUpperCase().trim();
  if (!s) return null;
  if (s.includes("AWD") || s.includes("ALL WHEEL") || s.includes("ALL-WHEEL") || s.includes("4MATIC") || s.includes("XDRIVE")) return "AWD";
  if (s.includes("4WD") || s.includes("4X4") || s.includes("FOUR WHEEL") || s.includes("FOUR-WHEEL")) return "4WD";
  if (s.includes("FWD") || s.includes("FRONT")) return "FWD";
  if (s.includes("RWD") || s.includes("REAR")) return "RWD";
  return null; // "2WD" 无法区分前/后驱
}

export function isValidVin(vin: string | null | undefined): vin is string {
  return !!vin && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

/** 直连 GET(桌面 UA、20s 超时);返回 status + body,由调用方判断 WAF/限流页。 */
export async function rawGet(
  url: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      },
    });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** mapColor(dealercenter-wp)+ 补几个常见别名(tan/camel → 米色、charcoal → 灰色)。 */
export function colorZh(raw: string | null | undefined): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/\b(tan|camel|cream|ivory|parchment)\b/i.test(v)) return "米色";
  if (/\bcharcoal\b/i.test(v)) return "灰色";
  return mapColor(v);
}
