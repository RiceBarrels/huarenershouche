// lib/i18n-pipeline/validate.ts (pure; server + Bun). The rules encode critic gap 9 (ordinals, units, drive codes,
// ja kana density): change them only together with the cases in scripts/i18n-selftest.ts.
import { detectLang, isStopword, stripNoise, type SiteLang } from "@/lib/i18n/detect";
import { MENTION_SOURCE, URL_CHAR_CLASS, URL_SOURCE, isMentionStart, normTag } from "@/lib/i18n/hashtags";
import { PLACEHOLDER_RE, protectTokens, restoreTokens, trimTokenTail, type Protected } from "./protect";

export type Reject =
  | "schema" | "placeholder" | "wrong_language" | "echo" | "length" | "numbers" | "new_identifier" | "line_breaks";

const han = (s: string) => (s.match(/\p{Script=Han}/gu) || []).length;
const kana = (s: string) => (s.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
const hangul = (s: string) => (s.match(/[가-힣]/gu) || []).length;
const letters = (s: string) => (s.match(/[\p{L}]/gu) || []).length;
const norm = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
/**
 * Latin letters of name-like tokens: words with a capital letter or a digit (Porsche, GT3, CarPlay, xDrive40i, A-Spec).
 * CJK text has no capitals, so in a zh / ja / ko output these are names kept as written (prompt rule 5), while English
 * left untranslated is mostly lower-case words.
 */
const nameLetters = (s: string) =>
  (s.match(/[\p{Script=Latin}\d]+/gu) || [])
    .filter((t) => /[\p{Lu}\d]/u.test(t))
    .reduce((n, t) => n + (t.match(/\p{Script=Latin}/gu) || []).length, 0);

/** Is `out` plausibly written in `target`? Placeholders are ignored. */
export function inTargetLanguage(out: string, target: SiteLang): boolean {
  const s = out.replace(PLACEHOLDER_RE, " ");
  const all = letters(s);
  // zh / ja / ko: the script ratio is taken over the letters besides kept names
  const L = Math.max(all - nameLetters(s), 1);
  const h = han(s), k = kana(s), g = hangul(s);
  switch (target) {
    case "zh": return h / L >= 0.3 && k <= Math.max(1, h * 0.05) && g <= Math.max(1, h * 0.05);
    case "ja": {
      // kana + kanji must dominate like zh/ko: English left untranslated around one Japanese sentence is not Japanese
      if (g > 0 || (k + h) / L < 0.3) return false;
      // a Chinese echo with one stray kana must not pass: longer outputs need real kana density
      if (all > 20) return k / Math.max(k + h, 1) >= 0.1;
      return k >= 1 || (all <= 8 && h > 0);
    }
    case "ko": return g / L >= 0.3;
    case "en": case "es": case "fr": {
      if ((h + k + g) / Math.max(all, 1) > 0.05) return false;
      const d = detectLang(s);
      if (d.ambiguous || d.lang === "und" || all < 25) return true;   // short: script check only
      return d.lang === target;                                       // es must not be French, etc.
    }
  }
}

function ratioBounds(srcLang: string, target: SiteLang): [number, number] {
  const cjk = (l: string) => l === "zh" || l === "ja";
  if (!cjk(srcLang) && srcLang !== "ko" && cjk(target)) return [0.12, 1.3];
  if (!cjk(srcLang) && srcLang !== "ko" && target === "ko") return [0.2, 1.6];
  if (cjk(srcLang) && !cjk(target) && target !== "ko") return [0.7, 8];
  if (cjk(srcLang) && target === "ko") return [0.6, 3.5];
  if (srcLang === "ko" && cjk(target)) return [0.3, 1.6];
  if (srcLang === "ko") return [0.6, 4.5];
  return [0.45, 2.2];
}

// Identifiers that must not APPEAR in a translation unless the source has them (injected links / contacts / IDs).
// Links and @handles use the shared rules of lib/i18n/hashtags.ts (ASCII-only links, handles ≤ 28 chars), so Chinese
// written right after them is never part of the identifier.
const URL_RE = new RegExp(URL_SOURCE, "gi");
const DOMAIN_RE = new RegExp(
  String.raw`\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|cn|me|xyz|top|cc|info|biz|app|link|site|shop|us|ca|tv|ly|gg|example)\b(?:\/` +
    `${URL_CHAR_CLASS}*)?`,
  "gi",
);
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const HANDLE_RE = new RegExp(MENTION_SOURCE, "gu");
const ALNUM_RE = /[A-Za-z0-9_]+/g;
// letters+digits tokens that are vocabulary, not IDs: ordinals (1st 2nd 1er 2e), units (60k 120000km 35mpg 300hp),
// engine/drive codes (V6 W12 2.0L 4WD 4x4), decades (90s), times (10am)
const NOT_ID = /^(?:\d+(?:st|nd|rd|th|er|re|e|eme|o|a)|\d+(?:k|km|mi|mph|kmh|hp|kw|kwh|mpg|cc|l|lb|lbs|ft|in|yr|yrs|am|pm|s)|[vw]\d{1,2}|\d+wd|\d+x\d+)$/i;

function identifiers(text: string): Set<string> {
  const out = new Set<string>();
  // compared without trailing sentence punctuation: "…⟦0⟧。" translated as "…⟦0⟧." is the same link / handle
  const add = (m: string) => out.add(trimTokenTail(m).toLowerCase());
  // links first, as in protectTokens: a domain, email or @handle inside a link is part of that link
  const rest = text.replace(URL_RE, (m) => {
    add(m);
    return " ";
  });
  for (const re of [DOMAIN_RE, EMAIL_RE]) for (const m of rest.match(re) || []) add(m);
  for (const m of rest.matchAll(HANDLE_RE)) if (isMentionStart(rest, m.index ?? 0)) add(m[0]);
  for (const t of text.match(ALNUM_RE) || []) {
    if (t.length >= 5 && /[A-Za-z]/.test(t) && /\d/.test(t) && !NOT_ID.test(t)) out.add(t.toLowerCase());
  }
  return out;
}

const digitRuns = (s: string) => (s.replace(/(?<=\d)[,\s](?=\d{3}\b)/g, "").match(/\d{3,}/g) || []).sort();

export function validateField(
  src: Protected, outMasked: string, srcLang: string, target: SiteLang,
): { ok: true; text: string } | { ok: false; reason: Reject } {
  if (typeof outMasked !== "string" || !outMasked.trim()) return { ok: false, reason: "schema" };
  // placeholders: every source placeholder exactly once, nothing invented
  const seen = [...outMasked.matchAll(PLACEHOLDER_RE)].map((m) => Number(m[1]));
  const want = src.tokens.map((_, i) => i);
  if (seen.length !== want.length || want.some((i) => seen.filter((x) => x === i).length !== 1)) {
    return { ok: false, reason: "placeholder" };
  }
  const out = restoreTokens(outMasked, src.tokens);
  const source = restoreTokens(src.masked, src.tokens);
  if (norm(out) === norm(source)) return { ok: false, reason: "echo" };
  if (!inTargetLanguage(outMasked, target)) return { ok: false, reason: "wrong_language" };
  if (source.length >= 40) {
    const [lo, hi] = ratioBounds(srcLang, target);
    const r = out.length / source.length;
    if (r < lo || r > hi) return { ok: false, reason: "length" };
  }
  // numbers with >= 3 digits (prices, mileage, years, phone parts) survive verbatim (thousand separators ignored)
  const have = new Set(digitRuns(outMasked));
  if (digitRuns(src.masked).some((d) => !have.has(d))) return { ok: false, reason: "numbers" };
  // no URL / domain / email / @handle / alphanumeric ID (>= 5 chars) that the source does not contain; restored tokens
  // are set apart so text glued to a placeholder ("⟦0⟧的建议" → "@John的建议") is not read as part of the handle
  const spaced = (masked: string) => restoreTokens(masked.replace(PLACEHOLDER_RE, " $& "), src.tokens);
  const srcIds = identifiers(spaced(src.masked));
  // a '@' the source left unprotected ("@老王说得对…": no telling where the name ends) is translated with its text, so
  // the output may name that person in its own way ("@Lao Wang"): one new @handle allowed per such '@'
  let looseMentions = (src.masked.match(/[@＠]/g) || []).length;
  for (const id of identifiers(spaced(outMasked))) {
    if (srcIds.has(id)) continue;
    if ((id[0] === "@" || id[0] === "＠") && looseMentions-- > 0) continue;
    return { ok: false, reason: "new_identifier" };
  }
  // line structure roughly preserved (posts / comments)
  const nl = (s: string) => (s.match(/\n/g) || []).length;
  if (Math.abs(nl(out) - nl(source)) > Math.max(2, nl(source) * 0.25)) return { ok: false, reason: "line_breaks" };
  return { ok: true, text: out };
}

const NAME_STOPWORDS = ["en", "es", "fr"] as const;

/**
 * Name-only text (post title "Porsche 911 GT3 RS", "Jeep Gladiator Mojave"): its correct translation is the text as
 * written (prompt rule 5), so the worker may leave an echoed field untranslated instead of failing the locale.
 * After placeholders and stripNoise (links, handles, #tags, VINs, numbers + units, acronyms, makes/models): at most
 * 80 chars, no CJK / Hangul / other-script letters, no en/es/fr stopword and at most 4 Latin words besides model codes
 * (tokens with digits like GT3 / 4MATIC; all-capital tokens like SRT / AMG, or only 2-letter ones like ES / IS when
 * the whole text is written in capitals).
 */
export function isNameLike(text: string): boolean {
  const s = stripNoise(text.replace(PLACEHOLDER_RE, " ")).replace(/\s+/g, " ").trim();
  if (s.length > 80 || /[^\P{L}\p{Script=Latin}]/u.test(s)) return false;
  const shouting = !/\p{Ll}/u.test(text);
  let words = 0;
  for (const token of s.split(" ")) {
    const latin = token.match(/\p{Script=Latin}{2,}/gu) || [];
    const chars = latin.join("");
    const code = /\d/.test(token) || (chars === chars.toUpperCase() && (!shouting || chars.length <= 2));
    if (!chars || code) continue;
    if (latin.some((w) => isStopword(w, NAME_STOPWORDS))) return false;
    words++;
  }
  return words <= 4;
}

/**
 * One chunk of a long field came back unchanged (the worker checks each chunk before joining, so an echoed chunk
 * cannot hide inside an otherwise translated field). Counts only chunks with ≥ 40 characters besides placeholders and
 * whitespace that are not name-like: a closing paragraph of #tags / links (all ⟦n⟧) or names may stay as written.
 */
export function chunkEcho(out: string, src: string): boolean {
  const s = norm(src);
  return norm(out) === s && s.replace(PLACEHOLDER_RE, "").replace(/\s/g, "").length >= 40 && !isNameLike(src);
}

/**
 * Validate an UNMASKED text (legacy cache import): every protected source token (URL, email, @handle, #hashtag,
 * VIN, phone) must appear verbatim in `out`, then the normal field rules apply.
 */
export function validateUnmasked(
  source: string, out: string, srcLang: string, target: SiteLang,
): { ok: true; text: string } | { ok: false; reason: Reject } {
  if (typeof out !== "string" || !out.trim()) return { ok: false, reason: "schema" };
  const p = protectTokens(source);
  let masked = out.replace(/[⟦⟧]/g, (c) => (c === "⟦" ? "[" : "]"));
  for (let i = 0; i < p.tokens.length; i++) {
    const at = masked.indexOf(p.tokens[i]);
    if (at < 0) return { ok: false, reason: "placeholder" };
    masked = masked.slice(0, at) + `⟦${i}⟧` + masked.slice(at + p.tokens[i].length);
  }
  return validateField(p, masked, srcLang, target);
}

export type GlossaryReject = "schema" | "mismatch" | "meaningless" | "slug" | "label" | "script";
const LOCALES: SiteLang[] = ["zh", "en", "ko", "ja", "es", "fr"];

/**
 * One item of the glossary reply {"items":[{tag, slug, labels}]} for input tag `raw` (same index).
 * slug null => "meaningless" (caller completes the alias as 'rejected').
 */
export function validateGlossaryItem(
  raw: string, item: unknown,
): { ok: true; slug: string; labels: Record<SiteLang, string> } | { ok: false; reason: GlossaryReject } {
  if (!item || typeof item !== "object") return { ok: false, reason: "schema" };
  const it = item as { tag?: unknown; slug?: unknown; labels?: unknown };
  if (typeof it.tag !== "string" || normTag(it.tag) !== normTag(raw)) return { ok: false, reason: "mismatch" };
  if (it.slug === null) return { ok: false, reason: "meaningless" };
  if (typeof it.slug !== "string" || it.slug.length > 48 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.slug)) {
    return { ok: false, reason: "slug" };
  }
  if (!it.labels || typeof it.labels !== "object") return { ok: false, reason: "schema" };
  const labels = it.labels as Record<string, unknown>;
  const rawDigits = new Set(raw.match(/\d+/g) || []);
  const out = {} as Record<SiteLang, string>;
  for (const l of LOCALES) {
    const v = typeof labels[l] === "string" ? (labels[l] as string).trim() : "";
    if (!v || v.length > 40 || /[#＃@＠]|https?:|www\./i.test(v) || new RegExp(DOMAIN_RE.source, "i").test(v)) {
      return { ok: false, reason: "label" };
    }
    if ((v.match(/\d+/g) || []).some((d) => !rawDigits.has(d))) return { ok: false, reason: "label" };
    out[l] = v;
  }
  // script per locale; short ASCII tags (EV, CarPlay, CR-V) may keep the English label everywhere
  const asciiShort = /^[\x20-\x7e]{1,16}$/.test(raw.replace(/^[#＃]/, ""));
  for (const l of LOCALES) {
    const v = out[l];
    if (asciiShort && v === out.en) continue;
    const h = han(v), k = kana(v), g = hangul(v);
    const okScript =
      l === "zh" ? h > 0 && g === 0 :
      l === "ko" ? g > 0 :
      l === "ja" ? (k + h) > 0 && g === 0 :
      h + k + g === 0;
    if (!okScript) return { ok: false, reason: "script" };
  }
  return { ok: true, slug: it.slug, labels: out };
}
