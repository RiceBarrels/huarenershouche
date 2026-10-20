// lib/i18n/detect.ts — pure (server, client, Bun). Imports only lib/i18n/hashtags.
import { HASHTAG_SOURCE, MENTION_SOURCE, URL_SOURCE, isMentionStart } from "@/lib/i18n/hashtags";
export type SiteLang = "zh" | "en" | "ko" | "ja" | "es" | "fr";
export type DetectedLang = SiteLang | "vi" | "ru" | "de" | "pt" | "other" | "und";
export interface Detection {
  lang: DetectedLang;
  /** true when Latin-script text could not be attributed confidently (worker asks the model) */
  ambiguous: boolean;
  letters: number;
}

const MENTION_RE = new RegExp(MENTION_SOURCE, "gu");

// Tokens that carry no language signal (kept verbatim by the translator, ignored by detection)
const NOISE: RegExp[] = [
  new RegExp(URL_SOURCE, "gi"),                        // URLs (lib/i18n/hashtags.ts rule: Chinese right after a link stays)
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,                        // emails
  MENTION_RE,                                          // @mentions (same rule as protectTokens; "abc@def" is none)
  new RegExp(HASHTAG_SOURCE, "gu"),                    // #hashtags (lib/i18n/hashtags.ts token rule)
  /\b[A-HJ-NPR-Z0-9]{17}\b/g,                         // VINs
  /\b\d+(?:[.,]\d+)*\s*(?:k|K|mi|miles?|km|mpg|kwh|kWh|hp|L|l|cc|\$|USD)?\b/g, // numbers + units
  /\b(?:AWD|FWD|RWD|4WD|4x4|CVT|EV|PHEV|HEV|SUV|MPV|VIN|DMV|OBD|ABS|LED|GPS|USB|AC|A\/C|OK|ok|Ok)\b/g,
];
const BRAND_MODEL = new RegExp(
  "\\b(?:" + [
    "Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chevy","Chrysler","Dodge","Ford","GMC","Genesis","Honda","Hyundai",
    "Infiniti","Jaguar","Jeep","Kia","Land Rover","Lexus","Lincoln","Mazda","Mercedes(?:-Benz)?","Mini","Mitsubishi","Nissan",
    "Porsche","Ram","Rivian","Subaru","Tesla","Toyota","Volkswagen","VW","Volvo","Lucid","Polestar","BYD","GWM","Haval","Holden",
    "Camry","Corolla","RAV4","Highlander","Prius","Sienna","Tacoma","Tundra","Civic","Accord","CR-V","HR-V","Pilot","Odyssey",
    "Model\\s?[3SXY]","Altima","Rogue","Sentra","Outback","Forester","Mustang","Explorer","F-150","Wrangler","Cherokee",
    "XLE","XSE","LE","SE","EX","EX-L","LX","Sport","Limited","Touring","Premium","Long Range","Performance",
  ].join("|") + ")\\b", "gi");

const RE = {
  han: /\p{Script=Han}/gu,
  kana: /[\p{Script=Hiragana}\p{Script=Katakana}]/gu,
  hangul: /\p{Script=Hangul}/gu,
  hangulSyllable: /[가-힣]/gu,
  latinWord: /\p{Script=Latin}{2,}/gu,
  cyrillic: /\p{Script=Cyrillic}/gu,
  other: /[\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Thai}\p{Script=Hebrew}]/gu,
};

export type StopwordLang = "en" | "es" | "fr" | "vi" | "de" | "pt";
const STOP: Record<StopwordLang, string[]> = {
  en: ["the","and","is","are","was","with","for","this","that","have","has","very","car","good","great","one","owner",
       "clean","title","new","miles","condition","runs","no","not","of","to","in","on","my","i","it","you","we","a","an",
       "help","thanks","what","how","just","from","when","noise","brake","braking","tires","price"],
  es: ["el","la","los","las","de","del","que","y","en","un","una","es","con","para","por","muy","coche","carro","auto",
       "dueño","estado","excelente","precio","se","al","lo","mi","su","más","pero","sin","nuevo","usado","buen","bueno"],
  fr: ["le","la","les","des","de","du","et","est","un","une","en","avec","pour","très","voiture","propriétaire","état",
       "excellent","prix","je","il","ce","cette","sur","pas","au","aux","mon","son","mais","sans","neuf","bon","bonne"],
  vi: ["xe","của","và","là","có","không","được","rất","cho","này","một","người","chạy","tốt","đẹp","giá","mới"],
  de: ["der","die","das","und","ist","mit","für","sehr","auto","ein","eine","nicht","auf","neu","gut","wagen"],
  pt: ["o","os","da","do","dos","das","e","é","com","para","muito","carro","um","uma","não","em","novo","bom"],
};
const MARKS: Record<"es" | "fr" | "vi" | "de" | "pt", RegExp> = {
  es: /[ñ¿¡]|ción\b|ado\b/gi,
  fr: /[çœ]|[èêëàâîïôûù]|\b(?:l'|d'|qu'|c'|j'|n')/gi,
  vi: /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi,
  de: /[äöüß]/gi,
  pt: /[ãõ]|ção\b/gi,
};

// Hanzi that exist only in Simplified Chinese (Japanese uses the traditional/shinjitai form)
const SIMPLIFIED_ONLY = /[车这们说时为个来后么还买卖价钱开门问题发对电话里边过东应该经长没让给难转务车辆]/gu;

const count = (s: string, re: RegExp) => (s.match(re) || []).length;

export function stripNoise(text: string): string {
  let s = text.normalize("NFKC").replace(/^\s*回复\s*@[^：:\s]+[：:]\s*/u, "");   // legacy reply prefix
  for (const re of NOISE) {
    s = re === MENTION_RE
      ? s.replace(re, (m: string, at: number, all: string) => (isMentionStart(all, at) ? " " : m))
      : s.replace(re, " ");
  }
  s = s.replace(BRAND_MODEL, " ");
  return s;
}

/** Is `word` (any case) a stopword of one of `langs`? (validate.ts isNameLike: text with stopwords is prose, not a name) */
export function isStopword(word: string, langs: readonly StopwordLang[]): boolean {
  const w = word.toLowerCase();
  return langs.some((l) => STOP[l].includes(w));
}

export function detectLang(text: string | null | undefined): Detection {
  const s = stripNoise(text ?? "");
  const han = count(s, RE.han), kana = count(s, RE.kana);
  const hangul = count(s, RE.hangul), syll = count(s, RE.hangulSyllable);
  const words = (s.match(RE.latinWord) || []).map((w) => w.toLowerCase());
  const cyr = count(s, RE.cyrillic), other = count(s, RE.other);
  // weights: one CJK/Hangul char ≈ one word-ish unit; Latin counted in words
  const cjk = han + kana;
  const letters = cjk + hangul + words.length + cyr + other;
  if (letters < 2 && syll < 2) return { lang: "und", ambiguous: false, letters };
  if (hangul > 0 && syll < 2 && cjk === 0 && words.length === 0) return { lang: "und", ambiguous: false, letters }; // ㅋㅋㅋ
  const total = cjk + hangul + words.length + cyr + other;
  // Japanese needs real kana density; a stray の/ノ in Chinese (or simplified-only hanzi) stays zh
  const simplified = count(s, SIMPLIFIED_ONLY);
  const kanaRatio = kana / Math.max(cjk, 1);
  if (kana >= 2 && kanaRatio >= 0.2 && !(simplified >= 2 && kanaRatio < 0.3) && (kana + han) / total >= 0.4) {
    return { lang: "ja", ambiguous: false, letters };
  }
  if (hangul / total >= 0.4) return { lang: "ko", ambiguous: false, letters };
  if (han / total >= 0.4) return { lang: "zh", ambiguous: false, letters };
  if (cyr / total >= 0.4) return { lang: "ru", ambiguous: false, letters };
  if (other / total >= 0.4) return { lang: "other", ambiguous: false, letters };
  if (words.length === 0) return { lang: "und", ambiguous: false, letters };
  // Latin: stopwords + diacritics
  const raw = s.toLowerCase();
  const score: Record<string, number> = {};
  for (const [lang, list] of Object.entries(STOP)) {
    const set = new Set(list);
    score[lang] = words.filter((w) => set.has(w)).length;
  }
  for (const [lang, re] of Object.entries(MARKS)) score[lang] += count(raw, re) * 1.5;
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  const second = ranked[1][1];
  if (words.length < 3) {
    // too short to tell en/es/fr apart reliably: treat as English unless marks say otherwise
    return { lang: bestScore >= 1.5 && best !== "en" ? (best as DetectedLang) : "en", ambiguous: bestScore < 1.5 && words.length >= 2, letters };
  }
  if (bestScore === 0) return { lang: "en", ambiguous: true, letters };
  const lang = best as DetectedLang;
  return { lang, ambiguous: bestScore - second < 1, letters };
}

/** Per-field detection + primary (longest) field */
export function detectFields(fields: Record<string, string | null | undefined>): {
  fieldLangs: Record<string, DetectedLang>; primary: DetectedLang; ambiguous: string[];
} {
  const fieldLangs: Record<string, DetectedLang> = {};
  const ambiguous: string[] = [];
  let primary: DetectedLang = "und";
  let longest = -1;
  for (const [k, v] of Object.entries(fields)) {
    if (!v) continue;
    const d = detectLang(v);
    fieldLangs[k] = d.lang;
    if (d.ambiguous) ambiguous.push(k);
    if (d.lang !== "und" && v.length > longest) { longest = v.length; primary = d.lang; }
  }
  return { fieldLangs, primary, ambiguous };
}
