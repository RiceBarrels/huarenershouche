// 查询列集合 —— 纯模块(server / client / Bun 通用),替代散落各处的 select("*")。
//
// - PUBLIC_*:SSR / 详情可公开的列;不含 phone、源站内部字段(source_images、source_listing_id、
//   last_seen_at、api_key_id、external_id)、已冻结的旧版翻译缓存列与 removal_reason。
// - LEGACY_*:去掉 supabase/i18n-v2.sql 新增的列。代码可能先于 SQL 上线:查询遇到缺列错误
//   (lib/supabase-compat.ts isMissingColumnError)时用旧列集合重试一次。
// - 详情另有 supabase/title-status.sql 的 title_status、supabase/car-currency.sql 的 currency / mileage_unit、
//   supabase/car-condition.sql 的 condition:几份迁移互不依赖,详情查询按 PUBLIC_CAR_COLUMN_SETS 从新到旧依次重试
//   (queryWithColumnFallback,认得出缺哪一列时直接跳过所有含该列的集合)。
// - 卡片/列表列在迁移前就存在的列之外只多 currency / mileage_unit(价格、里程要按车源自己的币种 / 单位显示),
//   列表查询按 *_COLUMN_SETS 两组重试;car-currency.sql 执行后第一组就成功。
// 每个列名都用 satisfies 对照 lib/types.ts 的行类型检查,拼错或删列会在编译期报错。

import type { DbCar, DbComment, DbCommunityPost, DbPostComment } from "@/lib/types";

// 车源卡片/列表:无正文(description*)、无 features_original
const CAR_CARD = [
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
  "images",
  "fuel_type",
  "transmission",
  "exterior_color",
  "interior_color",
  "drivetrain",
  "vin",
  "features",
  "carfax_url",
  "carfax_summary",
  "seller_name",
  "status",
  "owner_hidden",
  "views_count",
  "favorites_count",
  "created_at",
  "updated_at",
  "expires_at",
  "source_id",
  "source_url",
] as const satisfies readonly (keyof DbCar)[];

// car-currency.sql 新增的币种 / 里程单位(不敏感,卡片和详情都要;两列同进同退)
const CAR_UNITS = ["currency", "mileage_unit"] as const satisfies readonly (keyof DbCar)[];

// 详情页在卡片列之外的列:兼容投影 description / description_zh(旧数据 legacyOriginal 回退用)
const CAR_DETAIL_LEGACY = [
  ...CAR_CARD,
  "description",
  "description_zh",
] as const satisfies readonly (keyof DbCar)[];

// i18n-v2.sql 新增的 4 列
const CAR_DETAIL_V2 = [
  ...CAR_DETAIL_LEGACY,
  "description_original",
  "features_original",
  "original_uncertain",
  "content_updated_at",
] as const satisfies readonly (keyof DbCar)[];

// title-status.sql 新增的产权状态(不敏感,进公开载荷)
const CAR_TITLE_STATUS = ["title_status"] as const satisfies readonly (keyof DbCar)[];
const CAR_DETAIL = [...CAR_DETAIL_V2, ...CAR_TITLE_STATUS] as const satisfies readonly (keyof DbCar)[];

// car-condition.sql 新增的车况清单(不敏感,只有详情要)
const CAR_CONDITION = ["condition"] as const satisfies readonly (keyof DbCar)[];

// 详情在 v2 / legacy 基础列之外的可选列组,各自对应一份互不依赖的迁移(顺序 = 重试时先去掉谁的反序)
const CAR_DETAIL_OPTIONAL: readonly (readonly string[])[] = [CAR_TITLE_STATUS, CAR_UNITS, CAR_CONDITION];

const CAR_LIST = [...CAR_CARD, "phone"] as const satisfies readonly (keyof DbCar)[];

const join = (...groups: readonly (readonly string[])[]) => groups.flat().join(", ");

/**
 * base + 可选列组的全部组合,从全到无:位掩码从全 1 递减,第一组是最高位
 * (三组时依次为 产权+单位+车况、产权+单位、产权+车况、产权、单位+车况、单位、车况、无)
 */
function optionalColumnSets(base: readonly string[], groups: readonly (readonly string[])[]): string[] {
  const n = groups.length;
  const sets: string[] = [];
  for (let mask = (1 << n) - 1; mask >= 0; mask--) {
    sets.push(join(base, ...groups.filter((_, i) => mask & (1 << (n - 1 - i)))));
  }
  return sets;
}

/** 车源详情(SSR / CarDetail 重新拉取):原文 + 兼容投影 + 内容时钟 + 产权状态 + 币种 / 里程单位 + 车况清单,不含 phone 与源站内部字段 */
export const PUBLIC_CAR_COLUMNS = join(CAR_DETAIL, CAR_UNITS, CAR_CONDITION);
/** PUBLIC_CAR_COLUMNS 去掉 title_status、币种 / 单位与车况清单(title-status.sql、car-currency.sql、car-condition.sql 都未执行时的重试列) */
export const V2_PUBLIC_CAR_COLUMNS = CAR_DETAIL_V2.join(", ");
/** PUBLIC_CAR_COLUMNS 去掉 i18n-v2 新增列与全部可选列组(四份迁移都未执行时的重试列) */
export const LEGACY_PUBLIC_CAR_COLUMNS = CAR_DETAIL_LEGACY.join(", ");
/**
 * 详情查询的列集合,从新到旧(i18n-v2 > 产权 > 币种 / 单位 > 车况 的全部组合);配合 lib/supabase-compat.ts 的
 * queryWithColumnFallback 使用,缺哪份迁移就跳到不含那几列的集合,最多试「缺的迁移数 + 1」次。
 */
export const PUBLIC_CAR_COLUMN_SETS: readonly string[] = [
  ...optionalColumnSets(CAR_DETAIL_V2, CAR_DETAIL_OPTIONAL),
  ...optionalColumnSets(CAR_DETAIL_LEGACY, CAR_DETAIL_OPTIONAL),
];
/** 卖家信息 join(account_type 判断车行、languages 用于按界面语言排序) */
export const CAR_PROFILE_EMBED =
  "profiles!seller_id(account_type, avatar_url, is_system, claimed_by, languages)";
/** 卡片/列表(客户端):无正文,保留 phone(CarCard 拨号按钮)、features、carfax_summary、source_id,带币种 / 里程单位 */
export const CAR_LIST_COLUMNS = join(CAR_LIST, CAR_UNITS);
/** CAR_LIST_COLUMNS 去掉币种 / 里程单位(car-currency.sql 未执行时的重试列,缺失按 USD / mi 显示) */
export const LEGACY_CAR_LIST_COLUMNS = CAR_LIST.join(", ");
/** 列表查询的列集合,从新到旧;配合 queryWithColumnFallback 使用 */
export const CAR_LIST_COLUMN_SETS = [CAR_LIST_COLUMNS, LEGACY_CAR_LIST_COLUMNS] as const;
/** SSR 输出的卡片(如卖家主页):列表列去掉 phone,电话不进服务端 HTML / RSC 负载 */
export const CAR_SSR_CARD_COLUMNS = join(CAR_CARD, CAR_UNITS);
/** CAR_SSR_CARD_COLUMNS 的列集合(第二组去掉币种 / 里程单位) */
export const CAR_SSR_CARD_COLUMN_SETS = [CAR_SSR_CARD_COLUMNS, CAR_CARD.join(", ")] as const;

const POST_LEGACY = [
  "id",
  "user_id",
  "type",
  "title",
  "content",
  "images",
  "car_id",
  "make",
  "model",
  "year",
  "tags",
  "likes_count",
  "comments_count",
  "status",
  "created_at",
  "updated_at",
] as const satisfies readonly (keyof DbCommunityPost)[];

const POST = [...POST_LEGACY, "content_updated_at"] as const satisfies readonly (keyof DbCommunityPost)[];

/** 社区帖子(不含已冻结的旧版翻译缓存列) */
export const POST_COLUMNS = POST.join(", ");
export const LEGACY_POST_COLUMNS = POST_LEGACY.join(", ");
/** 帖子作者 join(评论表同样以 user_id 关联 profiles,可复用) */
export const POST_AUTHOR_EMBED = "profiles!user_id(username, avatar_url)";

const POST_COMMENT_LEGACY = [
  "id",
  "post_id",
  "user_id",
  "parent_id",
  "content",
  "likes_count",
  "created_at",
] as const satisfies readonly (keyof DbPostComment)[];

const POST_COMMENT = [
  ...POST_COMMENT_LEGACY,
  "status",
  "reply_to_user_id",
  "reply_to_name",
] as const satisfies readonly (keyof DbPostComment)[];

/** 帖子评论:审核状态 + 回复对象(取代旧版「回复 @name：」正文前缀) */
export const POST_COMMENT_COLUMNS = POST_COMMENT.join(", ");
export const LEGACY_POST_COMMENT_COLUMNS = POST_COMMENT_LEGACY.join(", ");

const CAR_COMMENT_LEGACY = [
  "id",
  "car_id",
  "user_id",
  "content",
  "created_at",
] as const satisfies readonly (keyof DbComment)[];

const CAR_COMMENT = [...CAR_COMMENT_LEGACY, "status"] as const satisfies readonly (keyof DbComment)[];

/** 车源评论(comments 表) */
export const CAR_COMMENT_COLUMNS = CAR_COMMENT.join(", ");
export const LEGACY_CAR_COMMENT_COLUMNS = CAR_COMMENT_LEGACY.join(", ");
