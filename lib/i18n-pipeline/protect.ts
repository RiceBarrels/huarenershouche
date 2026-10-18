// lib/i18n-pipeline/protect.ts (pure; server + Bun).
// Tokens that must survive translation byte-for-byte are replaced by ⟦n⟧ placeholders before the model call.
// Links are taken first (same precedence as extractHashtags / SQL i18n.hashtag_tokens and detectLang): a '#' or '@'
// inside a link stays part of it, and a #tag or @mention written right before a link ends where the link starts.
import { HASHTAG_SOURCE, MENTION_SOURCE, URL_SOURCE, isMentionStart } from "@/lib/i18n/hashtags";

const URL_RE = new RegExp(URL_SOURCE, "gi");                           // URLs (lib/i18n/hashtags.ts rule, ASCII only)
const PROTECT: RegExp = new RegExp(
  [
    String.raw`[\w.+-]+@[\w-]+\.[\w.-]+`,                              // emails
    MENTION_SOURCE,                                                    // @mentions (lib/i18n/hashtags.ts rule, ≤ 28 chars)
    HASHTAG_SOURCE.replace("(", "(?:"),                                // #hashtags (lib/i18n/hashtags.ts rule)
    String.raw`\b[A-HJ-NPR-Z0-9]{17}\b`,                               // VINs
    String.raw`\+?\d[\d\s().-]{8,}\d`,                                 // phone numbers
  ].join("|"),
  "gu",
);

export const PLACEHOLDER_RE = /⟦(\d+)⟧/g;

export interface Protected { masked: string; tokens: string[] }

const count = (s: string, c: string) => s.split(c).length - 1;

/**
 * A link or @mention never ends with sentence punctuation: drops trailing . , ; : ! ? ' and an unbalanced ) or ]
 * ("(see https://x.com/a)." → "https://x.com/a"), keeping at least one character after the http(s):// / www. / @ prefix.
 */
export function trimTokenTail(token: string): string {
  const min = (/^(?:https?:\/\/|www\.|[@＠])/i.exec(token)?.[0].length ?? 0) + 1;
  let end = token.length;
  while (end > min) {
    const c = token[end - 1];
    const head = token.slice(0, end);
    const trailing =
      ".,;:!?'".includes(c) ||
      (c === ")" && count(head, ")") > count(head, "(")) ||
      (c === "]" && count(head, "]") > count(head, "["));
    if (!trailing) break;
    end--;
  }
  return token.slice(0, end);
}

/** Replace protected tokens left-to-right with ⟦0⟧, ⟦1⟧, … (a literal ⟦/⟧ in user text is neutralised first). */
export function protectTokens(text: string): Protected {
  const tokens: string[] = [];
  const keep = (token: string): string => {
    tokens.push(token);
    return `⟦${tokens.length - 1}⟧`;
  };
  // trailing punctuation of an @mention stays text ("thanks @John." → "thanks ⟦0⟧."); a '@' glued to a word ("abc@def")
  // is no mention, what follows it is masked on its own
  const maskSegment = (s: string): string =>
    s.replace(PROTECT, (m: string, at: number) => {
      if (m[0] !== "@" && m[0] !== "＠") return keep(m);
      if (!isMentionStart(s, at)) return m[0] + maskSegment(m.slice(1));
      const mention = trimTokenTail(m);
      return keep(mention) + m.slice(mention.length);
    });
  const src = text.replace(/[⟦⟧]/g, (c) => (c === "⟦" ? "[" : "]"));
  let masked = "";
  let last = 0;
  for (const m of src.matchAll(URL_RE)) {
    const at = m.index ?? 0;
    const url = trimTokenTail(m[0]);
    masked += maskSegment(src.slice(last, at)) + keep(url);
    last = at + url.length;           // the trimmed punctuation goes back to the text
  }
  return { masked: masked + maskSegment(src.slice(last)), tokens };
}

export function restoreTokens(masked: string, tokens: string[]): string {
  return masked.replace(PLACEHOLDER_RE, (_, i) => tokens[Number(i)] ?? "");
}
