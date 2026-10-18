// Public API 的「AI 格式」说明:一段纯文本,用户整段复制粘贴给 ChatGPT / Claude 等
// 助手后,助手即可正确调用接口(单位、枚举、配额、先 dry run 再对账等规则都写在里面)。
// 同一份文本也由 /api/v1/llms.txt 直接输出,供 AI 抓取(站点根 /llms.txt 由 lib/llms.ts 生成,里面链到这里)。
// 数字与枚举全部从 lib/api/types.ts / enums.ts 取,避免文档与实现漂移。

import { enumSlugs } from "./enums";
import {
  ANON_RATE_LIMIT_PER_MIN,
  BATCH_MAX_ITEMS,
  DEFAULT_PAGE_SIZE,
  LISTING_MAX_IMAGES,
  MAX_PAGE_SIZE,
  QUOTA_LIMITS,
} from "./types";

export const AI_PROMPT_SITE = "https://www.clcauto.com";

export function buildAiPrompt(site: string = AI_PROMPT_SITE): string {
  const base = `${site}/api/v1`;
  const fuel = enumSlugs("fuel_type").join(" | ");
  const trans = enumSlugs("transmission").join(" | ");
  const drive = enumSlugs("drivetrain").join(" | ");
  const p = QUOTA_LIMITS.personal;
  const d = QUOTA_LIMITS.dealer;

  return `# CLCAuto (常來車網) Public API — instructions for AI assistants

You are helping a user work with the CLCAuto Public API. CLCAuto is a non-profit, multilingual used-car marketplace in North America. Follow these rules exactly.

## Connection
- Base URL: ${base}
- All requests and responses are JSON (UTF-8). CORS is open.
- Auth header: Authorization: Bearer <API_KEY>  (keys start with clc_live_). The user creates keys at ${site}/zh/developers/keys. Never print, log or echo the key back. If the user has not given you a key, use the literal placeholder <API_KEY> and ask them to fill it in.
- Read endpoints work without a key (${ANON_RATE_LIMIT_PER_MIN} requests/min per IP, contact info redacted). Write endpoints require a key with scope write:inventory (image endpoint: write:images).
- Optional query ?lang=zh|en|ko|ja|es|fr controls the "label" text of enum fields.

## Units and conventions
- price: integer US dollars (0 = "call for price"). mileage: integer MILES, not km. year: model year.
- Enum fields are SENT as English slugs and RETURNED as { "value": slug, "label": translated text }:
  fuel_type: ${fuel}
  transmission: ${trans}
  drivetrain: ${drive}
- Lists are cursor-paginated: pass cursor = previous next_cursor; limit ≤ ${MAX_PAGE_SIZE} (default ${DEFAULT_PAGE_SIZE}).
- Error body: { "error": { "code": string, "message": string, "details"?: [{ "field": string, "issue": string }] } }
  400 bad_request / validation_failed · 401 unauthorized / key_revoked / key_expired · 403 insufficient_scope / ip_not_allowed / forbidden / account_banned · 404 not_found · 409 conflict / listing_blocked · 429 rate_limited / quota_exceeded · 500 internal_error
- On 429 rate_limited: wait Retry-After seconds, then retry once. On 429 quota_exceeded: STOP; body.quota.resets_at (UTC midnight) says when to continue. Never retry in a tight loop.
- On 409 listing_blocked: the listing was removed by moderation or an administrator and cannot be relisted. Do not retry; tell the user.

## Quotas (per account per UTC day, shared by all of the account's keys)
- personal tier: ${p.inserts} new listings, ${p.updates} changes per day.
- dealer tier (account has a verified store): ${d.inserts} writes per day total, max ${d.active} active listings.
- Every write response includes a "quota" object and headers X-Quota-Inserts-Remaining / X-Quota-Updates-Remaining. GET /me shows the current tier and quota.

## Endpoints
GET    /cars                          filters: make, model, year_min, year_max, price_min, price_max, mileage_max, fuel_type, transmission, drivetrain, location, seller_id (key required), updated_since (ISO 8601; listings whose visible content changed since then — compare with updated_at), sort (newest|price_asc|price_desc|mileage_asc|year_desc), limit, cursor, lang
GET    /cars/{id}                     description / features in lang once translated (description_translated tells you); description_original and features_original are the seller's own text, description_lang its ISO 639-1 language (null when not detected or undeterminable)
GET    /dealers                       filters: location, limit, cursor
GET    /dealers/{id}                  store + up to 50 active cars
GET    /meta/makes                    make → models → counts, plus the full enum catalog
GET    /me                            key, owner, tier, verified stores, quota
GET    /inventory                     the account's own listings (all statuses); filters: status, external_id, limit, cursor
GET    /inventory/{external_id}
PUT    /inventory/{external_id}       idempotent create-or-update → 201 created / 200 updated. After a 409 conflict with existing_id (same VIN already posted manually) you may re-send with ?adopt=true to attach external_id to that listing.
DELETE /inventory/{external_id}       ?reason=sold (default) | removed
POST   /inventory/batch               { "items": [ListingInput, ...] } ≤ ${BATCH_MAX_ITEMS} items; per-item results; earlier successes are kept when a later item fails
POST   /inventory/reconcile           { "active_external_ids": [...], "dry_run": true|false } — every listing NOT in the list is marked removed. ALWAYS call with dry_run:true first and show the user what would be removed. An empty list additionally requires "confirm_empty": true.
POST   /inventory/{external_id}/images  { "images": ["https://...", ...] } ≤ ${LISTING_MAX_IMAGES}, https only, first image = cover

## ListingInput (body of PUT, and each item of /inventory/batch)
Required: vin (17 chars, no I/O/Q), year, make, model, price, mileage, fuel_type, transmission.
Optional: trim, original_price, drivetrain, exterior_color, interior_color, description, features (string[] ≤ 40), images (https URLs ≤ ${LISTING_MAX_IMAGES}), carfax_url, store_id (dealers with several stores), location.
- external_id is the dealer's own stock number and goes in the URL path (in batch items it is a body field).
- location: dealer-tier accounts may omit it (the verified store address is used). Personal accounts MUST send it as "City, ST" or a 5-digit US zip.
- description and features: send the user's own wording in any language — do NOT translate them yourself. They are stored verbatim and machine-translated into the other site languages. description_lang is deprecated and ignored (the language is detected automatically); omit it.
- The server decodes the VIN, mirrors the images, runs content moderation and translates asynchronously. The response "processing" array lists what is still running (vin, moderation, translation, images) — do not poll for it; GET /inventory later shows processing_state (images_pending, translation_pending).
- Re-sending a listing whose description, features, year, make, model and trim are unchanged triggers no new moderation, and translation only re-runs when the description changes, so periodic full syncs are cheap.
- Listings never expire; they stay live until you DELETE them, mark them sold, or reconcile them away.

Example
PUT ${base}/inventory/STK12345
{
  "vin": "1HGCV1F3XLA012345", "year": 2020, "make": "Honda", "model": "Accord", "trim": "Sport",
  "price": 18900, "mileage": 41200, "fuel_type": "gasoline", "transmission": "cvt", "drivetrain": "fwd",
  "exterior_color": "white", "description": "One owner, clean title, dealer maintained.",
  "images": ["https://cdn.example.com/stk12345/1.jpg", "https://cdn.example.com/stk12345/2.jpg"]
}
→ 201 { "id": "…", "external_id": "STK12345", "url": "${site}/zh/car/…", "status": "active", "created": true, "processing": ["vin", "moderation", "translation", "images"], "quota": { … } }

## Rules for you, the assistant
1. Convert units before sending: kilometres → miles (÷ 1.609, round to integer). Prices in CAD/RMB/other currencies: ask the user for the USD figure; never guess a price.
2. Validate locally before calling: VIN is 17 characters, all required fields present, enum slugs from the lists above. Ask the user for anything missing instead of inventing values.
3. Importing a CSV or spreadsheet: map the columns to ListingInput, show the user 1–2 mapped rows and ask for confirmation, then send /inventory/batch in chunks of ≤ ${BATCH_MAX_ITEMS}.
4. Full inventory sync: batch-upsert everything, then /inventory/reconcile with dry_run:true, show the would_remove list, and only run dry_run:false after the user explicitly confirms.
5. After every write, summarize for the user: created / updated / failed counts, remaining quota, and any validation_failed details verbatim (field + issue).
6. Only use the endpoints listed here. Machine-readable spec: ${base}/openapi.json — this document: ${base}/llms.txt
`;
}
