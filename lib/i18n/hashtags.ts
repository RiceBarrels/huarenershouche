// lib/i18n/hashtags.ts (pure; server, client, Bun).
// MUST stay identical to SQL i18n.hashtag_tokens() / i18n.norm_tag() in supabase/i18n-v2.sql.

/** One URL character: ASCII RFC 3986 unreserved + reserved + '%' (CJK text written right after a link is not part of it). */
export const URL_CHAR_CLASS = "[A-Za-z0-9\\-._~:/?#\\[\\]@!$&'()*+,;=%]";
/**
 * One link: http(s):// or www. + URL characters (use with flags "gi"). The single URL rule of hashtag extraction
 * (SQL i18n.hashtag_tokens strips the same matches first), language detection, token protection and validation.
 */
export const URL_SOURCE = "(?:https?:\\/\\/|www\\.)" + URL_CHAR_CLASS + "+";
// Characters that end an @mention: whitespace, '@', '#' and ,。!?:; (either width).
const MENTION_STOP = "\\s@＠#＃,，。!！?？:：;；";
// Chinese / Japanese / Korean letters: written without spaces, so they give no boundary between a name and the text after it.
const CJK_LETTER = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}";
/**
 * One @mention (use with flag "u"): '@'/'＠' + 1..28 chars (max username length) up to whitespace, '@', '#' or ,。!?:;.
 * A name with CJK letters counts only when whitespace or another @/# token follows it ("@老王 说得对"); otherwise the
 * mention ends before its first CJK letter ("@John的建议" → "@John") and "@老王说得对…" is no mention at all: where
 * the name ends is unknowable, so that text is detected and translated like the text around it.
 * Check the left side with isMentionStart (no look-behind here: older Safari / WebViews reject it).
 */
export const MENTION_SOURCE = `[@＠](?:[^${MENTION_STOP}]{1,28}(?=[\\s@＠#＃])|[^${MENTION_STOP}${CJK_LETTER}]{1,28})`;

/** A '@' right after an ASCII letter, digit or '_' ("abc@def", "5k@obo") does not start a mention. */
export function isMentionStart(text: string, index: number): boolean {
  return index === 0 || !/[A-Za-z0-9_]/.test(text[index - 1]);
}

/** One hashtag token: '#'/'＃' + 1..40 chars that are not whitespace, '#'/'＃' or ASCII/full-width punctuation. */
export const HASHTAG_SOURCE = "[#＃]([^\\s#＃,.;:!?()\\[\\]{}<>\"'，。；：！？、（）【】《》「」『』“”‘’…]{1,40})";
export const HASHTAG_RE = new RegExp(HASHTAG_SOURCE, "gu");
/** For String.split: captures the whole token (with its #) so odd indexes are hashtags. */
export const HASHTAG_SPLIT_RE = new RegExp(`(${HASHTAG_SOURCE.replace("(", "(?:")})`, "gu");

const URL_RE = new RegExp(URL_SOURCE, "gi");

/** Tokens without the leading '#', in order of appearance (duplicates kept). Links are blanked first: '#' inside a URL is never a tag. */
export function extractHashtags(text: string | null | undefined): string[] {
  const out: string[] = [];
  for (const m of (text ?? "").replace(URL_RE, " ").matchAll(HASHTAG_RE)) out.push(m[1]);
  return out;
}

/** Alias key: trim, strip leading #/＃, NFKC, drop whitespace/_/./·/・/-, lowercase, max 80 chars; '' -> null. */
export function normTag(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().replace(/^[#＃]+/u, "").normalize("NFKC").replace(/[\s_.·・\-]+/gu, "").toLowerCase().slice(0, 80);
  return s === "" ? null : s;
}
