// Public API 的 OpenAPI 3.1 文档,以 TS 对象为唯一事实来源(不维护 yaml),
// 由 GET /api/v1/openapi.json 输出。枚举值从 lib/api/enums.ts 取,不手抄;
// 响应形状对齐 lib/api/serialize.ts / lib/api/listing.ts。描述面向开发者,统一英文。

import { enumCatalog } from "./enums";
import {
  API_SCOPES,
  BATCH_MAX_ITEMS,
  DEFAULT_PAGE_SIZE,
  LISTING_MAX_IMAGES,
  MAX_KEYS_PER_OWNER,
  MAX_PAGE_SIZE,
  QUOTA_LIMITS,
  ANON_RATE_LIMIT_PER_MIN,
  DEFAULT_KEY_RATE_LIMIT_PER_MIN,
  type ApiErrorCode,
} from "./types";

type Json = Record<string, unknown>;

const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });
const nullable = (type: string, extra: Json = {}): Json => ({ type: [type, "null"], ...extra });

const ERROR_CODES = [
  "bad_request",
  "validation_failed",
  "unauthorized",
  "key_revoked",
  "key_expired",
  "ip_not_allowed",
  "insufficient_scope",
  "forbidden",
  "account_banned",
  "not_found",
  "conflict",
  "listing_blocked",
  "rate_limited",
  "quota_exceeded",
  "internal_error",
] satisfies readonly ApiErrorCode[];

const LANGS = ["zh", "en", "ko", "ja", "es", "fr"];

/**
 * 内容时钟 cars.content_updated_at 覆盖的对外字段(supabase/i18n-v2.sql i18n.cars_before 第 (2) 步的列),
 * updated_at / updated_since 的说明共用;SQL 增减列时同步改这里与 docs/public-api-v0.md §4.1
 */
const CONTENT_CLOCK_FIELDS =
  "description, features, year, make, model, trim, price, original_price, mileage, photos, status and visibility, colors, " +
  "fuel type, transmission, drivetrain, location and coordinates, carfax_url, carfax_summary, VIN, source_url, seller phone";

/** 重复 PUT 时这些字段都没变就不重新审核(lib/api/listing.ts listingTextChanges) */
const MODERATED_FIELDS = "description, features, year, make, model, trim";

function errorResponse(description: string): Json {
  return { description, content: { "application/json": { schema: ref("Error") } } };
}

function jsonResponse(description: string, schema: Json, headers?: Json): Json {
  return {
    description,
    ...(headers ? { headers } : {}),
    content: { "application/json": { schema } },
  };
}

const QUOTA_HEADERS: Json = {
  "X-Quota-Tier": { schema: { type: "string", enum: ["personal", "dealer"] }, description: "Quota tier of the key owner." },
  "X-Quota-Inserts-Remaining": { schema: { type: "integer" }, description: "New listings still allowed today (UTC)." },
  "X-Quota-Updates-Remaining": { schema: { type: "integer" }, description: "Updates still allowed today (UTC)." },
};

const COMMON_ERRORS: Json = {
  "400": errorResponse("Malformed request (`bad_request`) or schema violation (`validation_failed`, see `details`)."),
  "401": errorResponse("Missing/invalid key (`unauthorized`), or key revoked / expired (`key_revoked`, `key_expired`)."),
  "403": errorResponse("Key lacks the scope (`insufficient_scope`), IP not allowed (`ip_not_allowed`) or account banned."),
  "429": errorResponse("Per-minute rate limit (`rate_limited`, see `Retry-After`) or daily write quota (`quota_exceeded`, body includes `quota`)."),
};

function queryParam(name: string, schema: Json, description: string): Json {
  return { name, in: "query", required: false, schema, description };
}

function pathParam(name: string, description: string, schema: Json = { type: "string" }): Json {
  return { name, in: "path", required: true, schema, description };
}

const LANG_PARAM = queryParam(
  "lang",
  { type: "string", enum: LANGS, default: "zh" },
  "Language for `title`, `location.name` and every `label`. Falls back to `Accept-Language`.",
);

const LIMIT_PARAM = queryParam("limit", { type: "integer", minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE }, "");
const CURSOR_PARAM = queryParam("cursor", { type: "string" }, "Opaque cursor from `next_cursor` of the previous page.");

/** 列表响应外壳:{ data: T[], next_cursor, lang } */
function pageOf(item: Json): Json {
  return {
    type: "object",
    required: ["data", "next_cursor", "lang"],
    properties: {
      data: { type: "array", items: item },
      next_cursor: { ...nullable("string"), description: "Pass as `cursor` to fetch the next page. `null` on the last page." },
      lang: { type: "string", enum: LANGS },
    },
  };
}

function dataOf(item: Json): Json {
  return {
    type: "object",
    required: ["data", "lang"],
    properties: { data: item, lang: { type: "string", enum: LANGS } },
  };
}

export function buildOpenApi(): Record<string, unknown> {
  const enums = enumCatalog("en");
  const slugs = (kind: keyof typeof enums) => enums[kind].map((e) => e.value);
  const enumDesc = (kind: keyof typeof enums) => enums[kind].map((e) => `\`${e.value}\` = ${e.label}`).join(", ");

  /** 对外枚举字段:{ value: slug, label: 按 lang 翻译 } */
  const enumValue = (kind: keyof typeof enums, description: string): Json => ({
    type: "object",
    required: ["value", "label"],
    description,
    properties: {
      value: { ...nullable("string"), enum: [...slugs(kind), null], description: enumDesc(kind) },
      label: nullable("string"),
    },
  });

  const schemas: Json = {
    Error: {
      type: "object",
      required: ["error"],
      properties: {
        error: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string", enum: ERROR_CODES },
            message: { type: "string" },
            details: {
              type: "array",
              description: "Present on `validation_failed`.",
              items: {
                type: "object",
                required: ["field", "issue"],
                properties: { field: { type: "string" }, issue: { type: "string" } },
              },
            },
            quota: { ...ref("Quota"), description: "Present on `quota_exceeded`." },
            existing_id: {
              type: "string",
              format: "uuid",
              description: "Present on `conflict` when a listing with the same VIN already exists under this account. Retry with `?adopt=true` to attach the external_id to it.",
            },
          },
        },
      },
    },
    Quota: {
      type: "object",
      description: "Daily write quota of the key owner (all keys of one account share it). Day boundary is UTC.",
      required: ["tier", "inserts_used", "inserts_limit", "updates_used", "updates_limit", "writes_limit", "active_used", "active_limit", "resets_at"],
      properties: {
        tier: { type: "string", enum: ["anonymous", "personal", "dealer"] },
        inserts_used: { type: "integer" },
        inserts_limit: { type: "integer" },
        updates_used: { type: "integer" },
        updates_limit: { type: "integer" },
        writes_limit: { ...nullable("integer"), description: "Dealer tier: combined insert+update cap. `null` on personal tier." },
        active_used: { type: "integer" },
        active_limit: { ...nullable("integer"), description: "Max active listings (dealer tier); `null` = same as manual posting." },
        resets_at: { type: "string", format: "date-time" },
      },
    },
    EnumValue: {
      type: "object",
      required: ["value", "label"],
      properties: { value: nullable("string"), label: nullable("string") },
    },
    Seller: {
      type: "object",
      required: ["id", "username", "account_type", "is_system", "languages"],
      properties: {
        id: { type: "string", format: "uuid", description: "Profile id; use as `seller_id` filter on `/cars`." },
        username: nullable("string"),
        account_type: { type: "string", enum: ["private", "dealer"] },
        is_system: { type: "boolean", description: "`true` = system account that republishes a dealer's public inventory." },
        languages: { type: "array", items: { type: "string" }, description: "ISO-639-1 codes the seller can communicate in." },
      },
    },
    ContactApps: {
      type: "object",
      description:
        "Messenger accounts the seller chose to publish (opt-in; never derived from other fields). Only filled keys are present; `{}` when none. " +
        "`whatsapp` is E.164 (`+16265550123`, open as `https://wa.me/<digits>`); `wechat` / `kakao` / `line` are IDs matching `^[A-Za-z0-9._-]{1,32}$` " +
        "(LINE: `https://line.me/ti/p/~<id>`). SMS uses the seller `phone`.",
      additionalProperties: false,
      properties: {
        wechat: { type: "string", pattern: "^[A-Za-z0-9._-]{1,32}$" },
        kakao: { type: "string", pattern: "^[A-Za-z0-9._-]{1,32}$" },
        line: { type: "string", pattern: "^[A-Za-z0-9._-]{1,32}$" },
        whatsapp: { type: "string", pattern: "^\\+[1-9]\\d{6,14}$" },
      },
    },
    Store: {
      type: "object",
      required: ["id", "name", "address", "lat", "lng", "phone", "wechat"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        address: { type: "string" },
        lat: nullable("number"),
        lng: nullable("number"),
        phone: { ...nullable("string"), description: "`null` for anonymous requests." },
        wechat: { ...nullable("string"), description: "`null` for anonymous requests." },
      },
    },
    CarSummary: {
      type: "object",
      required: [
        "id", "url", "title", "year", "make", "model", "trim", "price", "original_price", "mileage", "location", "image_url",
        "fuel_type", "transmission", "drivetrain", "exterior_color", "interior_color", "status", "is_syndicated", "seller",
        "created_at", "updated_at", "expires_at",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        url: { type: "string", format: "uri", description: "Public listing page in the requested `lang`." },
        title: { type: "string", description: "Localized by `lang`." },
        year: { type: "integer" },
        make: { type: "string" },
        model: { type: "string" },
        trim: nullable("string"),
        price: { type: "integer", description: "USD. `0` = call for price." },
        original_price: nullable("integer"),
        price_updated_at: nullable("string", { format: "date-time" }),
        mileage: { type: "integer", description: "Miles." },
        location: {
          type: "object",
          required: ["name", "lat", "lng"],
          properties: {
            name: { type: "string", description: "City, State — localized by `lang`." },
            lat: nullable("number"),
            lng: nullable("number"),
          },
        },
        image_url: { ...nullable("string"), format: "uri", description: "Cover image." },
        fuel_type: enumValue("fuel_type", "Fuel type."),
        transmission: enumValue("transmission", "Transmission."),
        drivetrain: enumValue("drivetrain", "Drivetrain."),
        exterior_color: { ...ref("EnumValue"), description: "`value` is the stored text (may be Chinese), `label` is localized." },
        interior_color: { ...ref("EnumValue"), description: "`value` is the stored text (may be Chinese), `label` is localized." },
        status: { ...nullable("string"), enum: [...slugs("status"), null] },
        is_syndicated: { type: "boolean", description: "`true` = republished from a dealer website by a system account; API-uploaded and manual listings are `false`." },
        seller: ref("Seller"),
        created_at: { type: "string", format: "date-time" },
        updated_at: nullable("string", {
          format: "date-time",
          description: `Last change to the listing's visible content: ${CONTENT_CLOCK_FIELDS}. View counts, favorites, translation updates and seller profile edits don't move it.`,
        }),
        expires_at: nullable("string", { format: "date-time" }),
      },
    },
    CarDetail: {
      allOf: [
        ref("CarSummary"),
        {
          type: "object",
          required: [
            "description", "description_original", "description_lang", "description_translated", "features",
            "features_original", "images", "title_status", "vin", "views_count", "favorites_count", "seller",
          ],
          properties: {
            description: {
              type: "string",
              description:
                "Description in the requested `lang`: the machine translation once it is ready (`description_translated: true`), otherwise the seller's original text. Empty string when the listing has no description.",
            },
            description_original: {
              ...nullable("string"),
              description: "The seller's own description, verbatim, in whatever language it was written. `null` when there is none.",
            },
            description_lang: {
              ...nullable("string"),
              description:
                "ISO 639-1 code of the language `description_original` is written in (e.g. `en`, `zh`, `es`). `null` until language detection has run, and when the language can't be determined (e.g. only model names and numbers) or isn't one we recognize.",
            },
            description_translated: { type: "boolean", description: "`true` when `description` is a machine translation into `lang`." },
            features: {
              type: "array",
              items: { type: "string" },
              description: "Feature tags in the requested `lang`; the same feature written in several languages is listed once. Unrecognized tags are returned as written.",
            },
            features_original: { type: "array", items: { type: "string" }, description: "Feature tags exactly as the seller sent them." },
            images: { type: "array", items: { type: "string", format: "uri" } },
            title_status: enumValue(
              "title_status",
              "Title brand as declared by the seller (dealer listings: only when the source text says it explicitly). `value` is `null` when not provided — that does not mean clean.",
            ),
            vin: { ...nullable("string"), description: "Anonymous requests get a masked VIN (`1HGCV1F3****2345`); keyed requests get the full VIN." },
            carfax_url: nullable("string", { format: "uri" }),
            carfax_summary: nullable("string", { description: "Short Carfax summary (owners, accidents, service records) in the requested `lang`." }),
            views_count: { type: "integer" },
            favorites_count: { type: "integer" },
            source_url: { ...nullable("string"), format: "uri", description: "Original page when `is_syndicated`." },
            seller: {
              allOf: [
                ref("Seller"),
                {
                  type: "object",
                  required: ["phone", "contact_apps", "store"],
                  properties: {
                    phone: { ...nullable("string"), description: "`null` for anonymous requests." },
                    contact_apps: { oneOf: [ref("ContactApps"), { type: "null" }], description: "`null` for anonymous requests." },
                    store: { oneOf: [ref("Store"), { type: "null" }], description: "First verified store of a dealer seller; `null` for individuals." },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    Dealer: {
      type: "object",
      required: ["id", "owner_id", "name", "address", "zipcode", "lat", "lng", "phone", "wechat", "contact_apps", "store_photos", "languages", "created_at"],
      properties: {
        id: { type: "string", format: "uuid", description: "Store id." },
        owner_id: { type: "string", format: "uuid", description: "Profile that owns the store; use as `seller_id` on `/cars`." },
        name: { type: "string" },
        address: { type: "string" },
        zipcode: nullable("string"),
        lat: nullable("number"),
        lng: nullable("number"),
        phone: { ...nullable("string"), description: "`null` for anonymous requests." },
        wechat: { ...nullable("string"), description: "`null` for anonymous requests." },
        contact_apps: { oneOf: [ref("ContactApps"), { type: "null" }], description: "Messenger accounts of the store owner. `null` for anonymous requests." },
        store_photos: { type: "array", items: { type: "string", format: "uri" } },
        languages: { type: "array", items: { type: "string" } },
        active_count: { type: "integer", description: "Active listings of the owner." },
        created_at: { type: "string", format: "date-time" },
      },
    },
    ListingInput: {
      type: "object",
      description: "Body of `PUT /inventory/{external_id}` (external_id comes from the path) and of each `batch` item (external_id required in the object).",
      required: ["vin", "year", "make", "model", "price", "mileage", "fuel_type", "transmission"],
      properties: {
        external_id: { type: "string", minLength: 1, maxLength: 64, description: "Your stock number. Batch items only; on PUT it is the path segment." },
        vin: { type: "string", minLength: 17, maxLength: 17, description: "17-char VIN. Duplicate VIN under the same account returns 409 `conflict`." },
        year: { type: "integer", minimum: 1980 },
        make: { type: "string", maxLength: 40, description: "English make; common aliases are canonicalised (e.g. `Mercedes` → `Mercedes-Benz`)." },
        model: { type: "string", maxLength: 60 },
        trim: nullable("string", { maxLength: 60 }),
        price: { type: "integer", minimum: 0, description: "USD, whole dollars. `0` = call for price." },
        original_price: nullable("integer", { minimum: 0 }),
        mileage: { type: "integer", minimum: 0, description: "Miles." },
        fuel_type: { type: "string", enum: slugs("fuel_type"), description: enumDesc("fuel_type") },
        transmission: { type: "string", enum: slugs("transmission"), description: enumDesc("transmission") },
        drivetrain: { ...nullable("string"), enum: [...slugs("drivetrain"), null], description: enumDesc("drivetrain") },
        title_status: {
          ...nullable("string"),
          enum: [...slugs("title_status"), null],
          description: `Title brand: ${enumDesc("title_status")}. Omit to keep the stored value (new listings start empty); send \`null\` to clear it.`,
        },
        exterior_color: nullable("string", { maxLength: 30, description: "Free text in English, e.g. `white`." }),
        interior_color: nullable("string", { maxLength: 30 }),
        description: nullable("string", {
          maxLength: 5000,
          description:
            "Your own text, in any language. Stored verbatim as the original and machine-translated into the other site languages in the background.",
        }),
        description_lang: {
          ...nullable("string"),
          enum: [...LANGS, null],
          deprecated: true,
          description: "Deprecated and ignored: the language of `description` is detected automatically. Still accepted so existing integrations keep working.",
        },
        features: {
          type: "array",
          maxItems: 40,
          items: { type: "string", maxLength: 40 },
          default: [],
          description: "Feature tags in any language, stored as sent. Readers see recognized features in their own language.",
        },
        images: {
          type: "array",
          maxItems: LISTING_MAX_IMAGES,
          items: { type: "string", format: "uri" },
          default: [],
          description: `https URLs, max ${LISTING_MAX_IMAGES}, each <= 10 MB. Mirrored and compressed asynchronously.`,
        },
        carfax_url: nullable("string", { format: "uri" }),
        store_id: { ...nullable("string"), format: "uuid", description: "Verified store to attach to. Defaults to the first verified store." },
        location: nullable("string", { maxLength: 80, description: "City or ZIP. Required for personal accounts; dealers default to the store address." }),
      },
    },
    InventoryItem: {
      type: "object",
      required: ["id", "external_id", "url", "status", "title", "year", "make", "model", "price", "mileage", "images", "location", "created_at", "updated_at", "processing_state"],
      properties: {
        id: { type: "string", format: "uuid" },
        external_id: nullable("string"),
        url: { type: "string", format: "uri" },
        status: { ...nullable("string"), enum: [...slugs("status"), null] },
        title: { type: "string" },
        year: { type: "integer" },
        make: { type: "string" },
        model: { type: "string" },
        trim: nullable("string"),
        price: { type: "integer" },
        mileage: { type: "integer" },
        vin: nullable("string"),
        images: { type: "array", items: { type: "string", format: "uri" } },
        image_url: nullable("string", { format: "uri" }),
        fuel_type: ref("EnumValue"),
        transmission: ref("EnumValue"),
        drivetrain: ref("EnumValue"),
        location: { type: "string" },
        created_at: { type: "string", format: "date-time" },
        updated_at: {
          type: "string",
          format: "date-time",
          description: "Last change to the listing's visible content (same clock as `CarSummary.updated_at`).",
        },
        expires_at: nullable("string", { format: "date-time" }),
        processing_state: {
          type: "array",
          items: { type: "string", enum: ["images_pending", "translation_pending"] },
          description:
            "Background steps not finished yet. `images_pending`: some photos are still being copied to our storage. `translation_pending`: the Chinese or English translation of the description is not ready yet (only reported for active listings). Empty = ready.",
        },
      },
    },
    UpsertResult: {
      type: "object",
      required: ["id", "external_id", "url", "status", "created", "processing", "quota"],
      properties: {
        id: { type: "string", format: "uuid" },
        external_id: { type: "string" },
        url: { type: "string", format: "uri" },
        status: { type: "string", enum: slugs("status") },
        created: { type: "boolean", description: "`true` when this call inserted a new listing (HTTP 201)." },
        processing: {
          type: "array",
          items: { type: "string" },
          description: `Steps still running in the background: \`vin\` (new listing or changed VIN), \`moderation\` (new listing, or a change to any of ${MODERATED_FIELDS}), \`translation\` (a new or changed, non-empty description), \`images\` (photos still to be copied).`,
        },
        quota: ref("Quota"),
      },
    },
    RemoveResult: {
      type: "object",
      required: ["id", "external_id", "status", "quota"],
      properties: {
        id: { type: "string", format: "uuid" },
        external_id: { type: "string" },
        status: { type: "string", enum: ["sold", "removed"] },
        quota: ref("Quota"),
      },
    },
    BatchResult: {
      type: "object",
      required: ["results", "summary", "quota"],
      properties: {
        results: {
          type: "array",
          description: "Same order as `items`.",
          items: {
            type: "object",
            required: ["external_id", "ok", "status_code"],
            properties: {
              external_id: nullable("string"),
              ok: { type: "boolean" },
              status_code: { type: "integer", description: "HTTP status this item would have received on its own (201 created, 200 updated, 4xx error)." },
              id: { type: "string", format: "uuid" },
              url: { type: "string", format: "uri" },
              created: { type: "boolean" },
              processing: { type: "array", items: { type: "string" } },
              error: {
                type: "object",
                required: ["code", "message"],
                properties: {
                  code: { type: "string", enum: ERROR_CODES },
                  message: { type: "string" },
                  details: { type: "array", items: { type: "object", properties: { field: { type: "string" }, issue: { type: "string" } } } },
                  existing_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        summary: {
          type: "object",
          required: ["created", "updated", "failed"],
          properties: { created: { type: "integer" }, updated: { type: "integer" }, failed: { type: "integer" } },
        },
        quota: ref("Quota"),
      },
    },
    ReconcileRef: {
      type: "object",
      required: ["id", "external_id"],
      properties: { id: { type: "string", format: "uuid" }, external_id: { type: "string" } },
    },
    ReconcileResult: {
      oneOf: [
        {
          type: "object",
          title: "Dry run",
          required: ["dry_run", "would_remove", "quota"],
          properties: {
            dry_run: { type: "boolean", const: true },
            would_remove: { type: "array", items: ref("ReconcileRef") },
            quota: ref("Quota"),
          },
        },
        {
          type: "object",
          title: "Applied",
          required: ["dry_run", "removed", "failed", "quota"],
          properties: {
            dry_run: { type: "boolean", const: false },
            removed: { type: "array", items: ref("ReconcileRef"), description: "Listings marked `removed` by this call." },
            failed: {
              type: "array",
              items: { allOf: [ref("ReconcileRef"), { type: "object", properties: { error: { type: "string", description: "e.g. `quota_exceeded`" } } }] },
              description: "Listings that should have been removed but were not (quota ran out mid-way). Re-run later.",
            },
            quota: ref("Quota"),
          },
        },
      ],
    },
    Key: {
      type: "object",
      required: ["id", "name", "prefix", "scopes", "rate_limit_per_min"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        prefix: { type: "string", description: "First 12 characters of the key, e.g. `clc_live_9Xk`." },
        scopes: { type: "array", items: { type: "string", enum: [...API_SCOPES] } },
        rate_limit_per_min: { type: "integer" },
      },
    },
    Me: {
      type: "object",
      required: ["key", "owner", "tier", "stores", "quota"],
      properties: {
        key: ref("Key"),
        owner: {
          type: "object",
          required: ["id", "username", "account_type", "languages"],
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            account_type: { type: "string", enum: ["private", "dealer"] },
            languages: { type: "array", items: { type: "string" } },
          },
        },
        tier: { type: "string", enum: ["personal", "dealer"] },
        stores: {
          type: "array",
          description: "Verified stores of the owner (oldest first). Empty for personal tier.",
          items: {
            type: "object",
            required: ["id", "name", "address", "lat", "lng"],
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              address: { type: "string" },
              lat: nullable("number"),
              lng: nullable("number"),
            },
          },
        },
        quota: ref("Quota"),
      },
    },
    MakeAgg: {
      type: "object",
      required: ["make", "count", "models"],
      properties: {
        make: { type: "string" },
        count: { type: "integer", description: "Active listings of this make." },
        models: {
          type: "array",
          items: { type: "object", required: ["model", "count"], properties: { model: { type: "string" }, count: { type: "integer" } } },
        },
      },
    },
  };

  const readSecurity = [{}, { ApiKey: [] }];
  const keySecurity = [{ ApiKey: [] }];

  const paths: Json = {
    "/cars": {
      get: {
        tags: ["Cars"],
        summary: "List active listings",
        description: `Cursor-paginated (\`sort=newest\` uses a stable keyset cursor; other sorts use an offset cursor). Anonymous requests are limited to ${ANON_RATE_LIMIT_PER_MIN}/min per IP and get masked contact fields; send a key with \`read:cars\` for the key's own limit (default ${DEFAULT_KEY_RATE_LIMIT_PER_MIN}/min). A cursor is only valid for the sort it was issued with.`,
        security: readSecurity,
        parameters: [
          queryParam("make", { type: "string" }, "Exact make (English), e.g. `Toyota`."),
          queryParam("model", { type: "string" }, "Exact model, e.g. `Camry`."),
          queryParam("year_min", { type: "integer" }, ""),
          queryParam("year_max", { type: "integer" }, ""),
          queryParam("price_min", { type: "integer" }, "USD"),
          queryParam("price_max", { type: "integer" }, "USD"),
          queryParam("mileage_max", { type: "integer" }, "Miles"),
          queryParam("fuel_type", { type: "string", enum: slugs("fuel_type") }, ""),
          queryParam("transmission", { type: "string", enum: slugs("transmission") }, ""),
          queryParam("drivetrain", { type: "string", enum: slugs("drivetrain") }, ""),
          queryParam("location", { type: "string" }, "Substring match on city/state, e.g. `Los Angeles` or `CA`."),
          queryParam("seller_id", { type: "string", format: "uuid" }, "Only this seller's listings (a `Seller.id` or `Dealer.owner_id`)."),
          queryParam(
            "updated_since",
            { type: "string", format: "date-time" },
            `Only listings whose visible content changed at or after this instant (${CONTENT_CLOCK_FIELDS}); view counts and translation updates don't count. Use for incremental sync, comparing against \`updated_at\`.`,
          ),
          queryParam("sort", { type: "string", enum: ["newest", "price_asc", "price_desc", "mileage_asc", "year_desc"], default: "newest" }, ""),
          LIMIT_PARAM,
          CURSOR_PARAM,
          LANG_PARAM,
        ],
        responses: { "200": jsonResponse("OK", pageOf(ref("CarSummary"))), ...COMMON_ERRORS },
      },
    },
    "/cars/{id}": {
      get: {
        tags: ["Cars"],
        summary: "Get one listing",
        description:
          "`description` and `features` are in the requested `lang` once their translation is ready; `description_original` / `features_original` always carry the seller's own text.",
        security: readSecurity,
        parameters: [pathParam("id", "Listing UUID", { type: "string", format: "uuid" }), LANG_PARAM],
        responses: {
          "200": jsonResponse("OK", dataOf(ref("CarDetail"))),
          "404": errorResponse("Not found or not public."),
          ...COMMON_ERRORS,
        },
      },
    },
    "/dealers": {
      get: {
        tags: ["Dealers"],
        summary: "List verified dealer stores",
        security: readSecurity,
        parameters: [
          queryParam("location", { type: "string" }, "Substring match on the store address."),
          LIMIT_PARAM,
          CURSOR_PARAM,
          LANG_PARAM,
        ],
        responses: { "200": jsonResponse("OK", pageOf(ref("Dealer"))), ...COMMON_ERRORS },
      },
    },
    "/dealers/{id}": {
      get: {
        tags: ["Dealers"],
        summary: "Get a store with its active listings",
        security: readSecurity,
        parameters: [pathParam("id", "Store UUID", { type: "string", format: "uuid" }), LANG_PARAM],
        responses: {
          "200": jsonResponse(
            "OK",
            dataOf({
              allOf: [ref("Dealer"), { type: "object", required: ["cars"], properties: { cars: { type: "array", items: ref("CarSummary") } } }],
            }),
          ),
          "404": errorResponse("Not found or not verified."),
          ...COMMON_ERRORS,
        },
      },
    },
    "/meta/makes": {
      get: {
        tags: ["Meta"],
        summary: "Makes and models with active counts, plus the enum catalog",
        description: "Same aggregation the browse filters use. Cached for 5 minutes. `enums` lists every accepted slug with its label in `lang`.",
        security: readSecurity,
        parameters: [LANG_PARAM],
        responses: {
          "200": jsonResponse("OK", {
            type: "object",
            required: ["data", "enums", "lang"],
            properties: {
              data: { type: "array", items: ref("MakeAgg") },
              enums: {
                type: "object",
                properties: Object.fromEntries(
                  (Object.keys(enums) as (keyof typeof enums)[]).map((kind) => [
                    kind,
                    {
                      type: "array",
                      items: { type: "object", required: ["value", "label"], properties: { value: { type: "string" }, label: { type: "string" } } },
                    },
                  ]),
                ),
              },
              lang: { type: "string", enum: LANGS },
            },
          }),
          ...COMMON_ERRORS,
        },
      },
    },
    "/me": {
      get: {
        tags: ["Inventory"],
        summary: "Current key, owner, stores and quota",
        description: "Any scope. Use it to verify a key and to read the quota before a sync run.",
        security: keySecurity,
        responses: { "200": jsonResponse("OK", ref("Me")), ...COMMON_ERRORS },
      },
    },
    "/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "List my API-managed listings",
        description:
          "Every listing of the key owner, including `pending` / `sold` / `removed` and manually posted ones (no `external_id`, adoptable via `?adopt=true`). Most recently changed first. Requires `write:inventory`.",
        security: keySecurity,
        parameters: [
          queryParam("status", { type: "string", enum: slugs("status") }, ""),
          queryParam("external_id", { type: "string" }, "Exact match."),
          LIMIT_PARAM,
          CURSOR_PARAM,
          LANG_PARAM,
        ],
        responses: { "200": jsonResponse("OK", pageOf(ref("InventoryItem"))), ...COMMON_ERRORS },
      },
    },
    "/inventory/{external_id}": {
      parameters: [pathParam("external_id", "Your stock number (1–64 chars). Unique per account; URL-encode it.")],
      get: {
        tags: ["Inventory"],
        summary: "Get one of my listings by external_id",
        security: keySecurity,
        parameters: [LANG_PARAM],
        responses: {
          "200": jsonResponse("OK", dataOf(ref("InventoryItem"))),
          "404": errorResponse("No listing with this external_id under this account."),
          ...COMMON_ERRORS,
        },
      },
      put: {
        tags: ["Inventory"],
        summary: "Create or update a listing (idempotent upsert)",
        description:
          `The core write endpoint. First PUT for an external_id inserts (counts as an *insert*, HTTP 201); later PUTs update (count as an *update*, HTTP 200), and re-activate a \`sold\`/\`removed\` listing — except one removed by moderation or an administrator (409 \`listing_blocked\`). Returns as soon as the row is written; VIN check, image mirroring, AI moderation and translation run in the background (see \`processing\`). Every new listing is moderated; a later PUT is moderated again only when any of ${MODERATED_FIELDS} changed, and translated again only when the description changed. Requires \`write:inventory\`.`,
        security: keySecurity,
        parameters: [
          queryParam(
            "adopt",
            { type: "boolean", default: false },
            "When a manually posted listing with the same VIN exists under this account (409 `conflict` with `existing_id`), pass `true` to attach this external_id to it instead of creating a duplicate.",
          ),
        ],
        requestBody: { required: true, content: { "application/json": { schema: ref("ListingInput") } } },
        responses: {
          "200": jsonResponse("Updated", ref("UpsertResult"), QUOTA_HEADERS),
          "201": jsonResponse("Created", ref("UpsertResult"), QUOTA_HEADERS),
          "409": errorResponse(
            "`conflict`: same VIN already exists under this account (see `existing_id`). `listing_blocked`: the listing was removed by moderation or an administrator and can't be relisted.",
          ),
          ...COMMON_ERRORS,
        },
      },
      delete: {
        tags: ["Inventory"],
        summary: "Mark a listing sold or removed",
        description: "Counts as an *update*. `removed` also drops our mirrored copies of the images. Requires `write:inventory`.",
        security: keySecurity,
        parameters: [queryParam("reason", { type: "string", enum: ["sold", "removed"], default: "sold" }, "")],
        responses: {
          "200": jsonResponse("OK", ref("RemoveResult"), QUOTA_HEADERS),
          "404": errorResponse("No listing with this external_id under this account."),
          ...COMMON_ERRORS,
        },
      },
    },
    "/inventory/{external_id}/images": {
      post: {
        tags: ["Inventory"],
        summary: "Replace the image list of a listing",
        description: "Same rules as `ListingInput.images`. Mirroring happens in the background. Counts as an *update*. Requires `write:images`.",
        security: keySecurity,
        parameters: [pathParam("external_id", "Your stock number.")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["images"],
                properties: { images: { type: "array", maxItems: LISTING_MAX_IMAGES, items: { type: "string", format: "uri" } } },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse(
            "OK",
            {
              type: "object",
              required: ["id", "external_id", "images", "processing", "quota"],
              properties: {
                id: { type: "string", format: "uuid" },
                external_id: { type: "string" },
                images: { type: "array", items: { type: "string", format: "uri" } },
                processing: { type: "array", items: { type: "string" }, description: "`[\"images\"]` while mirroring runs." },
                quota: ref("Quota"),
              },
            },
            QUOTA_HEADERS,
          ),
          "404": errorResponse("No listing with this external_id under this account."),
          ...COMMON_ERRORS,
        },
      },
    },
    "/inventory/batch": {
      post: {
        tags: ["Inventory"],
        summary: `Upsert up to ${BATCH_MAX_ITEMS} listings in one call`,
        description:
          "Each item is validated and written independently; quota is charged per item. Items after the quota is exhausted come back with `quota_exceeded` while earlier ones stay written. The call itself returns 200 unless every item failed (then 400). Requires `write:inventory`.",
        security: keySecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    minItems: 1,
                    maxItems: BATCH_MAX_ITEMS,
                    items: { allOf: [ref("ListingInput"), { type: "object", required: ["external_id"] }] },
                  },
                },
              },
            },
          },
        },
        responses: { "200": jsonResponse("Per-item results", ref("BatchResult"), QUOTA_HEADERS), ...COMMON_ERRORS },
      },
    },
    "/inventory/reconcile": {
      post: {
        tags: ["Inventory"],
        summary: "Full reconcile: remove everything not in the list",
        description:
          "Send the complete set of external_ids currently in stock. Active listings with an external_id missing from the list are marked `removed` (each counts as an *update*; on quota exhaustion the rest are reported in `failed`). An empty list is rejected to prevent wiping the inventory by accident. Use `dry_run` to preview. Requires `write:inventory`.",
        security: keySecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["active_external_ids"],
                properties: {
                  active_external_ids: { type: "array", minItems: 1, items: { type: "string" } },
                  dry_run: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: { "200": jsonResponse("OK", ref("ReconcileResult"), QUOTA_HEADERS), ...COMMON_ERRORS },
      },
    },
    "/openapi.json": {
      get: {
        tags: ["Meta"],
        summary: "This document",
        security: [{}],
        responses: { "200": { description: "OpenAPI 3.1 JSON" } },
      },
    },
  };

  const p = QUOTA_LIMITS.personal;
  const d = QUOTA_LIMITS.dealer;

  return {
    openapi: "3.1.0",
    info: {
      title: "CLCAuto Public API",
      version: "0.1.0",
      description: [
        "Public API of 常來車網 (clcauto.com), a non-profit, multilingual used-car marketplace in North America.",
        "",
        "**Auth.** `Authorization: Bearer clc_live_...`. Create keys at https://www.clcauto.com/zh/developers/keys. Read endpoints also work without a key at stricter limits; write endpoints always need a key with the matching scope.",
        "",
        `**Quota.** Write quota is per account (all keys share it), reset daily at 00:00 UTC. Personal tier: ${p.inserts} new listings + ${p.updates} updates per day. Dealer tier (account with a verified store): ${d.inserts} writes per day, ${d.active} active listings. Every write response carries \`X-Quota-Inserts-Remaining\` / \`X-Quota-Updates-Remaining\`.`,
        "",
        `**Keys.** Up to ${MAX_KEYS_PER_OWNER} active keys per account. Scopes: ${API_SCOPES.map((s) => `\`${s}\``).join(", ")}. Key management itself is done in the web portal (session auth), not through this API.`,
        "",
        "**Languages.** Send listing text in any language; it is stored verbatim and machine-translated into the other site languages (zh, en, ko, ja, es, fr) in the background. Reads return text in `lang` once translated, plus the original (`description_original`, `features_original`).",
        "",
        "**Errors.** Always `{ \"error\": { \"code\", \"message\", \"details?\" } }`. CORS is open (`*`).",
      ].join("\n"),
      contact: { name: "CLCAuto", url: "https://www.clcauto.com/zh/contact" },
    },
    servers: [{ url: "https://www.clcauto.com/api/v1" }],
    tags: [
      { name: "Cars", description: "Public read access to active listings." },
      { name: "Dealers", description: "Verified dealer stores." },
      { name: "Meta", description: "Aggregates and this spec." },
      { name: "Inventory", description: "Manage your own listings with an API key." },
    ],
    components: {
      securitySchemes: {
        ApiKey: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "clc_live_...",
          description: "API key created in the developer portal, sent as a bearer token.",
        },
      },
      schemas,
    },
    paths,
  };
}
