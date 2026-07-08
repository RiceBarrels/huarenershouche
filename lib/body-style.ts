import type { DbCar } from "./types";

export type BodyStyle =
  | "suv"
  | "sedan"
  | "truck"
  | "coupe"
  | "minivan"
  | "hatchback"
  | "van"
  | "convertible"
  | "wagon";

export const BODY_STYLE_OPTIONS: {
  value: BodyStyle;
  label: string;
  labelEn: string;
}[] = [
  { value: "suv", label: "SUV", labelEn: "SUV" },
  { value: "sedan", label: "轿车", labelEn: "Sedan" },
  { value: "truck", label: "皮卡", labelEn: "Truck" },
  { value: "coupe", label: "跑车/双门", labelEn: "Coupe" },
  { value: "minivan", label: "MPV", labelEn: "Minivan" },
  { value: "hatchback", label: "两厢车", labelEn: "Hatchback" },
  { value: "wagon", label: "旅行车", labelEn: "Wagon" },
  { value: "convertible", label: "敞篷车", labelEn: "Convertible" },
  { value: "van", label: "厢式车", labelEn: "Van" },
];

export function bodyStyleLabel(style: BodyStyle): string {
  return BODY_STYLE_OPTIONS.find((o) => o.value === style)?.label ?? style;
}

// 常见美国市场车型 → 车身类型。key 为归一化后的 model（小写、去空格/连字符）。
const MODEL_MAP: Record<string, BodyStyle> = {
  // ── SUV / Crossover ──
  rav4: "suv", chr: "suv", venza: "suv", highlander: "suv", "4runner": "suv",
  sequoia: "suv", landcruiser: "suv", corollacross: "suv", grandhighlander: "suv", bz4x: "suv",
  crv: "suv", hrv: "suv", pilot: "suv", passport: "suv", element: "suv", prologue: "suv",
  x1: "suv", x2: "suv", x3: "suv", x4: "suv", x5: "suv", x6: "suv", x7: "suv", ix: "suv",
  gla: "suv", glb: "suv", glc: "suv", gle: "suv", gls: "suv", gclass: "suv", g550: "suv", g63: "suv", eqb: "suv", eqe: "suv", eqs: "suv",
  q3: "suv", q4: "suv", q4etron: "suv", q5: "suv", q7: "suv", q8: "suv", etron: "suv",
  modely: "suv", modelx: "suv",
  tiguan: "suv", atlas: "suv", taos: "suv", atlascrosssport: "suv", id4: "suv", touareg: "suv",
  rx: "suv", nx: "suv", gx: "suv", lx: "suv", ux: "suv", tx: "suv", rz: "suv",
  mdx: "suv", rdx: "suv", zdx: "suv", adx: "suv",
  cx3: "suv", cx30: "suv", cx5: "suv", cx50: "suv", cx7: "suv", cx9: "suv", cx70: "suv", cx90: "suv",
  outback: "suv", forester: "suv", crosstrek: "suv", ascent: "suv", solterra: "suv",
  explorer: "suv", escape: "suv", edge: "suv", expedition: "suv", bronco: "suv",
  broncosport: "suv", ecosport: "suv", flex: "suv", mustangmache: "suv", mache: "suv",
  tucson: "suv", santafe: "suv", palisade: "suv", kona: "suv", venue: "suv", ioniq5: "suv", nexo: "suv", santacruz: "truck",
  sportage: "suv", sorento: "suv", telluride: "suv", seltos: "suv", niro: "suv", soul: "suv", ev6: "suv", ev9: "suv",
  rogue: "suv", murano: "suv", pathfinder: "suv", armada: "suv", kicks: "suv", juke: "suv", ariya: "suv",
  equinox: "suv", traverse: "suv", tahoe: "suv", suburban: "suv", blazer: "suv",
  trailblazer: "suv", trax: "suv", captiva: "suv", blazerev: "suv", equinoxev: "suv",
  wrangler: "suv", grandcherokee: "suv", cherokee: "suv", compass: "suv", renegade: "suv",
  wagoneer: "suv", grandwagoneer: "suv", patriot: "suv", liberty: "suv",
  encore: "suv", enclave: "suv", envision: "suv", envista: "suv", encoregx: "suv",
  acadia: "suv", terrain: "suv", yukon: "suv", yukonxl: "suv",
  escalade: "suv", xt4: "suv", xt5: "suv", xt6: "suv", lyriq: "suv", srx: "suv",
  durango: "suv", journey: "suv", hornet: "suv",
  xc40: "suv", xc60: "suv", xc90: "suv", c40: "suv", ex30: "suv", ex90: "suv",
  macan: "suv", cayenne: "suv",
  velar: "suv", evoque: "suv", discovery: "suv", defender: "suv", rangerover: "suv", rangeroversport: "suv", discoverysport: "suv",
  fpace: "suv", epace: "suv", ipace: "suv",
  stelvio: "suv", levante: "suv", grecale: "suv",
  bentayga: "suv", urus: "suv", purosangue: "suv", cullinan: "suv", dbx: "suv",
  outlander: "suv", eclipsecross: "suv", outlandersport: "suv",
  qx50: "suv", qx55: "suv", qx60: "suv", qx80: "suv", fx35: "suv", jx35: "suv",
  rx350: "suv", rx450h: "suv", nx300: "suv", gx460: "suv", gx550: "suv", lx600: "suv",
  // ── 轿车 Sedan ──
  camry: "sedan", corolla: "sedan", avalon: "sedan", crown: "sedan", mirai: "sedan",
  accord: "sedan", civic: "sedan", insight: "sedan", clarity: "sedan",
  "3series": "sedan", "5series": "sedan", "7series": "sedan", "2series": "coupe",
  i4: "sedan", i5: "sedan", i7: "sedan", m3: "sedan", m5: "sedan",
  "320i": "sedan", "328i": "sedan", "330i": "sedan", "335i": "sedan", "340i": "sedan",
  "525i": "sedan", "528i": "sedan", "530i": "sedan", "535i": "sedan", "540i": "sedan", "550i": "sedan",
  "740i": "sedan", "750i": "sedan", "760i": "sedan",
  cclass: "sedan", eclass: "sedan", sclass: "sedan", aclass: "sedan", cla: "sedan", cls: "sedan",
  c300: "sedan", c350: "sedan", c43: "sedan", c63: "sedan",
  e300: "sedan", e350: "sedan", e450: "sedan", e53: "sedan", e63: "sedan",
  s500: "sedan", s550: "sedan", s580: "sedan", a220: "sedan", cla250: "sedan",
  a3: "sedan", a4: "sedan", a5: "coupe", a6: "sedan", a7: "sedan", a8: "sedan",
  s3: "sedan", s4: "sedan", s6: "sedan", s8: "sedan", rs7: "sedan", rs3: "sedan",
  model3: "sedan", models: "sedan",
  jetta: "sedan", passat: "sedan", arteon: "sedan", cc: "sedan",
  es: "sedan", is: "sedan", ls: "sedan", gs: "sedan",
  es350: "sedan", es300h: "sedan", is300: "sedan", is350: "sedan", is500: "sedan",
  ls500: "sedan", gs350: "sedan",
  tlx: "sedan", ilx: "sedan", tsx: "sedan", tl: "sedan", rlx: "sedan", integra: "sedan",
  mazda3: "sedan", mazda6: "sedan", 3: "sedan", 6: "sedan",
  legacy: "sedan", impreza: "sedan", wrx: "sedan",
  fusion: "sedan", taurus: "sedan", focus: "sedan", fiesta: "sedan",
  malibu: "sedan", impala: "sedan", cruze: "sedan", sonic: "sedan", sparkev: "hatchback",
  sonata: "sedan", elantra: "sedan", accent: "sedan", azera: "sedan", genesis: "sedan", ioniq6: "sedan",
  k5: "sedan", optima: "sedan", forte: "sedan", rio: "sedan", stinger: "sedan", cadenza: "sedan", k900: "sedan", k4: "sedan",
  altima: "sedan", sentra: "sedan", maxima: "sedan", versa: "sedan",
  charger: "sedan", dart: "sedan", avenger: "sedan",
  300: "sedan", 200: "sedan",
  regal: "sedan", lacrosse: "sedan", verano: "sedan",
  ct4: "sedan", ct5: "sedan", ct6: "sedan", ats: "sedan", cts: "sedan", xts: "sedan", celestiq: "sedan",
  s60: "sedan", s90: "sedan",
  giulia: "sedan", ghibli: "sedan", quattroporte: "sedan",
  panamera: "sedan", taycan: "sedan",
  g70: "sedan", g80: "sedan", g90: "sedan",
  q50: "sedan", q60: "coupe", q70: "sedan", g35: "sedan", g37: "sedan", m35: "sedan", m37: "sedan",
  xf: "sedan", xe: "sedan", xj: "sedan",
  lancer: "sedan", mirage: "hatchback", galant: "sedan",
  flyingspur: "sedan", continentalgt: "coupe", phantom: "sedan", ghost: "sedan",
  lucidair: "sedan", air: "sedan", polestar2: "sedan",
  // ── 皮卡 Truck ──
  f150: "truck", f250: "truck", f350: "truck", f450: "truck", ranger: "truck", maverick: "truck", f150lightning: "truck", lightning: "truck",
  silverado: "truck", silverado1500: "truck", silverado2500: "truck", silverado3500: "truck", colorado: "truck", avalanche: "truck",
  sierra: "truck", sierra1500: "truck", sierra2500: "truck", canyon: "truck",
  ram: "truck", ram1500: "truck", ram2500: "truck", ram3500: "truck", 1500: "truck", 2500: "truck", 3500: "truck",
  tacoma: "truck", tundra: "truck",
  frontier: "truck", titan: "truck",
  ridgeline: "truck",
  gladiator: "truck",
  cybertruck: "truck",
  r1t: "truck", hummerev: "truck",
  // ── 跑车 / 双门 Coupe ──
  mustang: "coupe", camaro: "coupe", corvette: "coupe", challenger: "coupe",
  86: "coupe", gr86: "coupe", brz: "coupe", supra: "coupe", grsupra: "coupe",
  "370z": "coupe", "350z": "coupe", z: "coupe", gtr: "coupe",
  m4: "coupe", m2: "coupe", "4series": "coupe", "8series": "coupe", "430i": "coupe", "440i": "coupe", m440i: "coupe", m850i: "coupe",
  rc: "coupe", rc350: "coupe", lc: "coupe", lc500: "coupe",
  tt: "coupe", r8: "coupe", rs5: "coupe",
  911: "coupe", cayman: "coupe", 718: "coupe",
  amggt: "coupe", c63coupe: "coupe", e400coupe: "coupe", cle: "coupe",
  veloster: "coupe", genesiscoupe: "coupe",
  civiccoupe: "coupe", accordcoupe: "coupe",
  huracan: "coupe", aventador: "coupe", 488: "coupe", f8: "coupe", roma: "coupe",
  vantage: "coupe", db11: "coupe", db12: "coupe",
  granturismo: "coupe", mc20: "coupe",
  gtmustang: "coupe", shelby: "coupe", gt500: "coupe", gt350: "coupe",
  // ── MPV / Minivan ──
  sienna: "minivan", odyssey: "minivan", pacifica: "minivan", carnival: "minivan",
  sedona: "minivan", quest: "minivan", grandcaravan: "minivan", towncountry: "minivan",
  // ── 两厢 Hatchback ──
  golf: "hatchback", gti: "hatchback", golfr: "hatchback", golfgti: "hatchback",
  fit: "hatchback", yaris: "hatchback", prius: "hatchback", priusprime: "hatchback",
  bolt: "hatchback", boltev: "hatchback", bolteuv: "hatchback", leaf: "hatchback",
  cooper: "hatchback", mini: "hatchback", countryman: "suv", clubman: "hatchback",
  mazda3hatchback: "hatchback", corollahatchback: "hatchback", civichatchback: "hatchback",
  versanote: "hatchback", spark: "hatchback", "500e": "hatchback", 500: "hatchback",
  velostern: "hatchback", elantragt: "hatchback", i30: "hatchback",
  // ── 旅行车 Wagon ──
  allroad: "wagon", a4allroad: "wagon", a6allroad: "wagon",
  v60: "wagon", v90: "wagon", e450wagon: "wagon",
  outbackwagon: "wagon",
  // ── 敞篷 Convertible ──
  miata: "convertible", mx5: "convertible", mx5miata: "convertible",
  z4: "convertible", slk: "convertible", slc: "convertible", sl: "convertible",
  boxster: "convertible", beetleconvertible: "convertible",
  // ── 厢式 Van ──
  transit: "van", transitconnect: "van", sprinter: "van", promaster: "van",
  promastercity: "van", express: "van", savana: "van", metris: "van", nv200: "van", evan: "van",
};

// model 名里包含这些关键词时的兜底判断（按顺序匹配）
const KEYWORD_RULES: [string, BodyStyle][] = [
  ["convertible", "convertible"],
  ["cabriolet", "convertible"],
  ["cabrio", "convertible"],
  ["spyder", "convertible"],
  ["roadster", "convertible"],
  ["coupe", "coupe"],
  ["hatchback", "hatchback"],
  ["hatch", "hatchback"],
  ["wagon", "wagon"],
  ["touring", "wagon"],
  ["sportback", "hatchback"],
  ["minivan", "minivan"],
  ["van", "van"],
  ["pickup", "truck"],
  ["truck", "truck"],
  ["crewcab", "truck"],
  ["crossover", "suv"],
  ["suv", "suv"],
  ["sedan", "sedan"],
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * 从车型名推断车身类型（数据库无 body_style 字段，全站筛选均为客户端执行，
 * 因此用车型映射 + 关键词兜底做客户端分类）。识别不了返回 null。
 */
export function classifyBodyStyle(
  car: Pick<DbCar, "model" | "make">
): BodyStyle | null {
  if (!car.model) return null;
  const normalized = normalize(car.model);
  if (!normalized) return null;

  if (MODEL_MAP[normalized]) return MODEL_MAP[normalized];

  // 带后缀的车型名（如 "RAV4 Hybrid"、"F-150 XLT"）：尝试逐词前缀匹配
  const firstWord = normalize(car.model.split(/[\s/]+/)[0]);
  if (firstWord && MODEL_MAP[firstWord]) return MODEL_MAP[firstWord];
  const firstTwo = normalize(car.model.split(/[\s/]+/).slice(0, 2).join(""));
  if (firstTwo && MODEL_MAP[firstTwo]) return MODEL_MAP[firstTwo];

  const raw = car.model.toLowerCase();
  for (const [kw, style] of KEYWORD_RULES) {
    if (raw.includes(kw) || normalized.includes(kw)) return style;
  }
  return null;
}
