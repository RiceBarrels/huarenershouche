// Public API 对外 JSON 形状:英文 key、枚举 slug + label、绝不泄露库内中文枚举值。
// 匿名请求(redact=true)脱敏联系方式(phone / wechat / contact_apps)与 VIN;带 key 的请求给全量。
// 路由只负责查数据,字段整形统一走这里,保证列表/详情/门店在售车形状一致。
// 描述 / 配置标签按 lang 取 i18n_bundle(译文未就绪时给原文,不拿原文冒充译文),原文另给 *_original。

import type { DbCar, DbDealerStore } from "@/lib/types";
import { carTitle, carLocation } from "@/lib/i18n";
import { serverT } from "@/lib/i18n/translate";
import { localizeCarfaxSummary } from "@/lib/i18n/carfax";
import { legacyOriginal } from "@/lib/i18n/content/resolve";
import type { BundleRow } from "@/lib/i18n/content/types";
import type { ContactApps } from "@/lib/contact-apps";
import { carCurrency, carMileageUnit, type Currency, type MileageUnit } from "@/lib/currency";
import { normalizeCarCondition } from "@/lib/car-condition";
import { isMissingColumnError, missingColumnName } from "@/lib/supabase-compat";
import { enumField, enumToSlug, labelFor } from "./enums";
import type { ApiLang } from "./types";

/** 查 cars 时统一带的卖家 join(所有喂给 serialize 的车都要 join 这一份) */
export const CAR_PROFILE_JOIN =
  "profiles!seller_id(id, username, account_type, avatar_url, is_system, claimed_by, languages)";

/** 列表端点只取摘要需要的列,避免把 description/features/图片数组全拉下来(都是迁移前就有的列) */
const CAR_SUMMARY_FIELDS = [
  "id",
  "seller_id",
  "title",
  "title_zh",
  "year",
  "make",
  "model",
  "trim",
  "price",
  "original_price",
  "price_updated_at",
  "mileage",
  "location",
  "location_zh",
  "lat",
  "lng",
  "image_url",
  "fuel_type",
  "transmission",
  "drivetrain",
  "exterior_color",
  "interior_color",
  "status",
  "source_id",
  "seller_name",
  "created_at",
  "updated_at",
  "expires_at",
] as const satisfies readonly (keyof DbCar)[];

/** 摘要列 + 内容时钟 content_updated_at(i18n-v2.sql) */
export const CAR_SUMMARY_COLUMNS = [...CAR_SUMMARY_FIELDS, "content_updated_at" satisfies keyof DbCar].join(", ");

/** 币种 / 里程单位(supabase/car-currency.sql;两列同进同退) */
const CAR_UNIT_COLUMNS = "currency, mileage_unit";

/**
 * 列表查询的降级开关:legacy = 库里还没有 i18n-v2 的 content_updated_at;units = 库里已有币种 / 里程单位列。
 * 两份迁移互不依赖,缺列重试时按 degradeCarQueryFlags 逐个关掉。
 */
export interface CarQueryFlags {
  legacy: boolean;
  units: boolean;
}
export const CAR_QUERY_FLAGS: CarQueryFlags = { legacy: false, units: true };

/** 缺列错误 → 下一组开关(缺的是币种 / 单位列先关 units,否则退回 legacy);不是缺列错误或已无可降 → null */
export function degradeCarQueryFlags(err: unknown, flags: CarQueryFlags): CarQueryFlags | null {
  if (!isMissingColumnError(err)) return null;
  const col = missingColumnName(err);
  if (flags.units && (col === "currency" || col === "mileage_unit")) return { ...flags, units: false };
  if (!flags.legacy) return { ...flags, legacy: true };
  if (flags.units) return { ...flags, units: false };
  return null;
}

/** 列表摘要的 select:按开关带不带 content_updated_at 与币种 / 里程单位 */
export function carSummarySelect(flags: CarQueryFlags): string {
  const cols = flags.legacy ? CAR_SUMMARY_FIELDS.join(", ") : CAR_SUMMARY_COLUMNS;
  return `${cols}${flags.units ? `, ${CAR_UNIT_COLUMNS}` : ""}, ${CAR_PROFILE_JOIN}`;
}

export const CAR_SUMMARY_SELECT = carSummarySelect(CAR_QUERY_FLAGS);
/** 列表摘要 select 的全部降级组合,从新到旧(配合 queryWithColumnFallback) */
export const CAR_SUMMARY_SELECTS = [
  CAR_SUMMARY_SELECT,
  carSummarySelect({ legacy: false, units: false }),
  carSummarySelect({ legacy: true, units: true }),
  carSummarySelect({ legacy: true, units: false }),
] as const;
/** 详情是 *:有哪些列就带哪些(币种 / 单位列未建时缺失,序列化按 USD / mi) */
export const CAR_DETAIL_SELECT = `*, ${CAR_PROFILE_JOIN}`;

/** join 出来的卖家摘要(比 DbCar.profiles 多 id/username) */
export interface ApiCarProfile {
  id: string;
  username: string | null;
  account_type: "private" | "dealer";
  avatar_url?: string | null;
  is_system?: boolean | null;
  claimed_by?: string | null;
  languages?: string[] | null;
}

/** 喂给 serialize 的行:DbCar(列表端点只有部分列)+ 卖家 join */
export type ApiCarRow = Partial<DbCar> &
  Pick<DbCar, "id" | "seller_id" | "year" | "make" | "model" | "price" | "mileage" | "created_at"> & {
    profiles?: ApiCarProfile | null;
  };

export interface EnumValue {
  value: string | null;
  label: string | null;
}

/**
 * 车况清单(卖家填写,cars.condition):没填的项为 null;枚举给 { value: slug, label },不外露库内中文。
 * known_issues:null = 没填;[] = 卖家明确表示无已知问题
 */
export interface CarConditionOut {
  service_records: boolean | null;
  one_owner: boolean | null;
  smoker: boolean | null;
  /** 0..5 */
  keys_count: number | null;
  /** new / good / fair / needs_replacement */
  tires_condition: EnumValue;
  known_issues: { value: string; label: string }[] | null;
}

export interface CarSeller {
  id: string;
  username: string | null;
  account_type: "private" | "dealer";
  is_system: boolean;
  languages: string[];
}

export interface CarSummary {
  id: string;
  url: string;
  title: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  /** 整数,币种见 currency;0 = 电议 */
  price: number;
  /** 同 currency */
  original_price: number | null;
  price_updated_at: string | null;
  /** price / original_price 的币种:USD(默认)/ CAD */
  currency: Currency;
  /** 整数,单位见 mileage_unit */
  mileage: number;
  /** mileage 的单位:mi(默认)/ km */
  mileage_unit: MileageUnit;
  location: { name: string; lat: number | null; lng: number | null };
  image_url: string | null;
  fuel_type: EnumValue;
  transmission: EnumValue;
  drivetrain: EnumValue;
  /** 颜色 value 为库内原文(可能是中文),label 按 lang 翻译 */
  exterior_color: EnumValue;
  interior_color: EnumValue;
  status: string | null;
  /** true = 系统检索转载(source_id 非空);API 上传/手动发帖为 false */
  is_syndicated: boolean;
  seller: CarSeller;
  created_at: string;
  /**
   * 可见内容最后一次变化(content_updated_at:文本 / 标题字段 / 价格与原价 / 里程 / 图片 / 状态 / 颜色与
   * 动力参数 / 位置与坐标 / Carfax / VIN / 源站链接 / 电话,字段清单见 openapi.ts;浏览数与翻译不算)
   */
  updated_at: string | null;
  expires_at: string | null;
}

export interface CarStore {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  wechat: string | null;
}

export interface CarDetail extends CarSummary {
  /** 按 lang 显示的描述:该语言译文已就绪为译文(description_translated),否则为原文;无描述为 "" */
  description: string;
  /** 卖家原文(任意语言,逐字);无描述为 null */
  description_original: string | null;
  /** 原文语言(ISO 639-1 两字母代码);检测完成前、或检测结果是 und(判断不出)/ other(不认识的语言)时为 null */
  description_lang: string | null;
  /** description 是否为机器翻译 */
  description_translated: boolean;
  /** 配置标签按 lang 显示(同一配置的不同语言写法合并为一个) */
  features: string[];
  /** 卖家原样提交的配置标签 */
  features_original: string[];
  images: string[];
  /** 产权状态 clean / rebuilt / salvage / lemon_buyback;卖家没填时 value / label 都是 null */
  title_status: EnumValue;
  /** 车况清单(卖家填写);car-condition.sql 未执行或没填时各项为 null */
  condition: CarConditionOut;
  /** 匿名:前 8 + **** + 后 4;带 key:完整 */
  vin: string | null;
  carfax_url: string | null;
  /** Carfax 摘要,按 lang 显示 */
  carfax_summary: string | null;
  views_count: number;
  favorites_count: number;
  seller: CarSeller & {
    /** 匿名请求为 null */
    phone: string | null;
    /** 卖家主动填写的即时通讯账号(只含已填的键);匿名请求为 null */
    contact_apps: ContactApps | null;
    /** 车行卖家的第一家已认证门店;个人卖家/无门店为 null */
    store: CarStore | null;
  };
  source_url: string | null;
}

export interface DealerSummary {
  /** 门店 id(dealer_stores.id) */
  id: string;
  owner_id: string;
  name: string;
  address: string;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  /** 匿名请求为 null */
  phone: string | null;
  /** 匿名请求为 null */
  wechat: string | null;
  /** 门店主人(owner_id)主动填写的即时通讯账号;匿名请求为 null */
  contact_apps: ContactApps | null;
  store_photos: string[];
  /** 门店主人的沟通语言(profiles.languages) */
  languages: string[];
  /** 在售车数;列表端点可能不填 */
  active_count?: number;
  created_at: string;
}

export interface SerializeOpts {
  lang: ApiLang;
  /** true = 匿名请求:脱敏 phone/wechat/contact_apps/VIN */
  redact: boolean;
}

export function siteUrl(lang: ApiLang, path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.clcauto.com").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}/${lang}${p}`;
}

/** VIN 脱敏:保留前 8 位(WMI + 车型段)与后 4 位,中间打码 */
export function maskVin(vin: string | null | undefined): string | null {
  if (!vin) return null;
  const v = vin.trim();
  if (v.length <= 12) return "****";
  return `${v.slice(0, 8)}****${v.slice(-4)}`;
}

function sellerOf(car: ApiCarRow): CarSeller {
  const p = car.profiles ?? null;
  return {
    id: p?.id ?? car.seller_id,
    username: p?.username ?? car.seller_name ?? null,
    account_type: p?.account_type ?? "private",
    is_system: !!p?.is_system,
    languages: p?.languages ?? [],
  };
}

function colorField(raw: string | null | undefined, lang: ApiLang): EnumValue {
  return { value: raw ?? null, label: labelFor(raw, lang) };
}

export function serializeCarSummary(car: ApiCarRow, opts: SerializeOpts): CarSummary {
  const { lang } = opts;
  return {
    id: car.id,
    url: siteUrl(lang, `/car/${car.id}`),
    title: carTitle(car, lang),
    year: car.year,
    make: car.make,
    model: car.model,
    trim: car.trim ?? null,
    price: car.price,
    original_price: car.original_price ?? null,
    price_updated_at: car.price_updated_at ?? null,
    // 车源自己的币种 / 单位(car-currency.sql 未执行时没有这两列 → USD / mi)
    currency: carCurrency(car),
    mileage: car.mileage,
    mileage_unit: carMileageUnit(car),
    location: { name: carLocation(car, lang), lat: car.lat ?? null, lng: car.lng ?? null },
    image_url: car.image_url ?? null,
    fuel_type: enumField("fuel_type", car.fuel_type, lang),
    transmission: enumField("transmission", car.transmission, lang),
    drivetrain: enumField("drivetrain", car.drivetrain, lang),
    exterior_color: colorField(car.exterior_color, lang),
    interior_color: colorField(car.interior_color, lang),
    status: enumToSlug("status", car.status),
    is_syndicated: car.source_id != null,
    seller: sellerOf(car),
    created_at: car.created_at,
    updated_at: car.content_updated_at ?? car.updated_at ?? null,
    expires_at: car.expires_at ?? null,
  };
}

function storeOf(store: DbDealerStore | null | undefined, redact: boolean): CarStore | null {
  if (!store) return null;
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    phone: redact ? null : store.phone,
    wechat: redact ? null : store.wechat,
  };
}

/**
 * 配置标签按 lang:bundle.x.features(已按术语合并、取好该语言标签);没有时退回原文标签。
 * 大小写不敏感去重。
 */
function featureLabels(bundle: BundleRow | undefined, original: readonly string[]): string[] {
  const resolved = bundle?.x?.features;
  const labels = resolved && resolved.length > 0 ? resolved.map((f) => f.label) : original;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** 库内车况清单 → 对外形状(行里没有这一列 / 非法值一律按没填) */
export function serializeCondition(raw: unknown, lang: ApiLang): CarConditionOut {
  const c = normalizeCarCondition(raw);
  return {
    service_records: c.service_records ?? null,
    one_owner: c.one_owner ?? null,
    smoker: c.smoker ?? null,
    keys_count: c.keys_count ?? null,
    tires_condition: enumField("tires_condition", c.tires_condition, lang),
    known_issues:
      c.known_issues?.map((v) => ({ value: enumToSlug("known_issue", v) ?? v, label: labelFor(v, lang) ?? v })) ?? null,
  };
}

/** 检测结果里的 ISO 639-1 代码;und / other 不是语言代码,不对外 */
const ISO_639_1 = /^[a-z]{2}$/;

/** bundle = 该车在 lang 下的 i18n_bundle 行(路由用 getBundle 取;RPC 不可用时为 undefined → 全给原文) */
export function serializeCarDetail(
  car: ApiCarRow,
  opts: SerializeOpts & { store?: DbDealerStore | null; bundle?: BundleRow; contactApps?: ContactApps },
): CarDetail {
  const summary = serializeCarSummary(car, opts);
  const isDealer = summary.seller.account_type === "dealer";
  const { bundle } = opts;
  const original = legacyOriginal(car);
  const translated = (bundle?.s === "ok" && bundle.f?.description) || null;
  const featuresOriginal = car.features_original ?? car.features ?? [];
  return {
    ...summary,
    description: translated ?? original ?? "",
    description_original: original,
    description_lang: [bundle?.sl, bundle?.pl].find((l): l is string => !!l && ISO_639_1.test(l)) ?? null,
    description_translated: translated != null,
    features: featureLabels(bundle, featuresOriginal),
    features_original: featuresOriginal,
    images: car.images ?? [],
    // CAR_DETAIL_SELECT 是 *:title-status.sql 未执行时没有这一列 → null
    title_status: enumField("title_status", car.title_status, opts.lang),
    // 同上:car-condition.sql 未执行时没有这一列 → 各项 null
    condition: serializeCondition(car.condition, opts.lang),
    vin: opts.redact ? maskVin(car.vin) : (car.vin ?? null),
    carfax_url: car.carfax_url ?? null,
    carfax_summary: localizeCarfaxSummary(car.carfax_summary, serverT(opts.lang)),
    views_count: car.views_count ?? 0,
    favorites_count: car.favorites_count ?? 0,
    seller: {
      ...summary.seller,
      phone: opts.redact ? null : (car.phone ?? null),
      contact_apps: opts.redact ? null : (opts.contactApps ?? {}),
      store: isDealer ? storeOf(opts.store, opts.redact) : null,
    },
    source_url: car.source_url ?? null,
  };
}

export function serializeDealer(
  store: DbDealerStore,
  opts: SerializeOpts & { languages?: string[] | null; active_count?: number; contactApps?: ContactApps },
): DealerSummary {
  const out: DealerSummary = {
    id: store.id,
    owner_id: store.owner_id,
    name: store.name,
    address: store.address,
    zipcode: store.zipcode,
    lat: store.lat,
    lng: store.lng,
    phone: opts.redact ? null : store.phone,
    wechat: opts.redact ? null : store.wechat,
    contact_apps: opts.redact ? null : (opts.contactApps ?? {}),
    store_photos: store.store_photos ?? [],
    languages: opts.languages ?? [],
    created_at: store.created_at,
  };
  if (opts.active_count != null) out.active_count = opts.active_count;
  return out;
}
