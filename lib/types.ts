import type { TitleStatus } from "@/lib/title-status";
import type { Currency, MileageUnit } from "@/lib/currency";
import type { CarCondition } from "@/lib/car-condition";

export interface DbCar {
  id: string;
  seller_id: string;
  title: string;
  title_zh: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: number;
  original_price: number | null;
  price_updated_at: string | null;
  mileage: number;
  location: string;
  location_zh: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  images: string[];
  fuel_type: string;
  transmission: string;
  exterior_color: string | null;
  interior_color: string | null;
  drivetrain: string | null;
  vin: string | null;
  // 兼容投影(supabase/i18n-v2.sql):由翻译管线写入 zh / en 译文,未翻译前等于原文;应用代码只写 *_original。
  // 旧版按需翻译缓存列 other_i18n 已冻结,代码不再读写(Phase D 删列)
  description: string | null;
  description_zh: string | null;
  // 卖家 / 源站写的原文(任意语言,逐字保存);以下 5 列在 SQL 执行前不存在,故可选
  description_original?: string | null;
  // 原样标签(去重不截断);features 列是按术语表投影的 zh / en 标签
  features_original?: string[];
  // 内容时钟(触发器维护,只在可见内容变化时前移):sitemap lastmod、API updated_since
  content_updated_at?: string | null;
  // 下架原因(触发器维护):moderation / admin 下架的车源卖家不能自行重新上架(listing_blocked)
  removal_reason?: "moderation" | "admin" | "other" | null;
  // 旧版保存的原文可能经过机器处理(迁移标记),卖家确认保存后清除
  original_uncertain?: boolean;
  // 产权状态(lib/title-status.ts,存中文,t() 渲染);null = 未填。supabase/title-status.sql 执行前没有这一列
  title_status?: TitleStatus | null;
  // 价格币种 / 里程单位(lib/currency.ts;supabase/car-currency.sql 执行前没有这两列,缺失按 USD / mi)
  currency?: Currency | null;
  mileage_unit?: MileageUnit | null;
  // 结构化车况清单(lib/car-condition.ts,枚举存中文);{} = 没填。supabase/car-condition.sql 执行前没有这一列
  condition?: CarCondition | null;
  seller_name: string;
  phone: string | null;
  carfax_url: string | null;
  carfax_summary: string | null;
  features: string[];
  status: "active" | "sold" | "pending" | "removed";
  views_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  // Syndicated listing source tracking (null for user-posted cars)
  source_id: string | null;
  source_listing_id: string | null;
  source_url: string | null;
  // 源站原始图片外链(images 转存到我方 Storage 后仍保留,用于检测换图/下架回退)
  source_images: string[] | null;
  last_seen_at: string | null;
  // Owner-disabled syndicated listing (excluded from public queries; untouched by the sync engine)
  owner_hidden: boolean;
  // Public API 上传(supabase/api-keys.sql):车行自己的库存编号,同 seller 内唯一,PUT upsert 依据
  external_id?: string | null;
  // 写入这条记录的 API key(null = 手动发帖 / 爬虫转载)
  api_key_id?: string | null;
  // Joined from profiles
  profiles?: {
    account_type: "private" | "dealer";
    avatar_url?: string | null;
    is_system?: boolean;
    claimed_by?: string | null;
    // 卖家沟通语言(浏览/推荐按当前界面语言优先排序时需要 join 出来)
    languages?: string[] | null;
  };
}

// 公开读取的车源(SSR / RSC 载荷 = lib/i18n/content/columns.ts 的 PUBLIC_CAR_COLUMNS):不带源站内部字段
// (原图外链、源站车源编号、最后抓取时间)、API key 与车行库存编号;phone 不进公开载荷,登录后按需单独取
export type PublicCar = Omit<
  DbCar,
  "phone" | "source_images" | "source_listing_id" | "last_seen_at" | "api_key_id" | "external_id"
> & {
  phone?: string | null;
};

export interface DbProfile {
  id: string;
  username: string;
  phone: string | null;
  avatar_url: string | null;
  location: string | null;
  preferred_language: string;
  // 卖家会说的语言代码(lib/i18n/languages.ts),空 = 未声明;见 supabase/seller-languages.sql
  languages: string[];
  account_type: "private" | "dealer";
  role: "user" | "admin";
  banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  is_system: boolean;
  // Set (to a real user's profile id) when an admin links this system account to an owner.
  claimed_by: string | null;
  // 用户确认过用户名的时间;为空 = 新用户还没取名(UsernameGate 弹框),见 supabase/username-onboarding.sql
  username_set_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbListingSource {
  id: string;
  key: string;
  name: string;
  base_url: string;
  enabled: boolean;
  system_account_id: string;
  last_sync_at: string | null;
  last_sync_status: "success" | "partial" | "error" | "running" | null;
  last_sync_detail: {
    found?: number;
    inserted?: number;
    updated?: number;
    delisted?: number;
    mirrored?: number;
    errors?: string[];
    duration_ms?: number;
  } | null;
  created_at: string;
}

export interface DbDealerStore {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  wechat: string | null;
  store_photos: string[];
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  verification_submitted_at: string | null;
  verification_reviewed_at: string | null;
  verification_note: string | null;
  /** 贷款 / 付款方式标签(lib/dealer-financing.ts;supabase/dealer-financing.sql 未执行时没有该字段) */
  financing?: string[];
  created_at: string;
}

// 用户屏蔽(拉黑),见 supabase/blocks.sql
export interface DbBlock {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  // Joined
  blocked_profile?: { username: string; avatar_url: string | null };
}

// 系统账号自助认领申请(supabase/claim-requests.sql)。通过即写 profiles.claimed_by。
export interface DbClaimRequest {
  id: string;
  system_id: string;
  requester_id: string;
  message: string | null;
  contact: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DbAdminAction {
  id: string;
  admin_id: string;
  action: string;
  target_type: "user" | "car" | "store" | "report";
  target_id: string;
  detail: string | null;
  created_at: string;
}

export interface DbConversation {
  id: string;
  car_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
  // Joined
  // currency:car-currency.sql 执行前 join 不到,缺失按 USD
  cars?: { id: string; title: string | null; title_zh: string | null; image_url: string | null; price: number; currency?: string | null };
  buyer_profile?: { username: string; avatar_url: string | null };
  seller_profile?: { username: string; avatar_url: string | null };
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface DbComment {
  id: string;
  car_id: string;
  user_id: string;
  content: string;
  // AI 审核屏蔽(supabase/i18n-v2.sql);列可能尚未创建,故可选
  status?: "active" | "blocked";
  created_at: string;
  // Joined
  profiles?: { username: string; avatar_url: string | null };
}

export interface DbDealerReview {
  id: string;
  dealer_id: string;
  user_id: string;
  rating: number;
  content: string;
  // AI 审核屏蔽(supabase/i18n-v2.sql);列可能尚未创建,故可选
  status?: "active" | "blocked";
  created_at: string;
  // Joined
  profiles?: { username: string; avatar_url: string | null };
}

export interface DbCommunityPost {
  id: string;
  user_id: string;
  type: "review" | "showoff" | "discussion";
  title: string;
  content: string;
  images: string[];
  car_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  status: "active" | "hidden" | "removed";
  created_at: string;
  updated_at: string;
  // 内容时钟(触发器维护,只在标题/正文/标签等可见内容变化时前移;点赞、评论数不动它);列可能尚未创建
  content_updated_at?: string | null;
  profiles?: { username: string; avatar_url: string | null };
}

export interface DbPostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  // AI 审核屏蔽(supabase/i18n-v2.sql);列可能尚未创建,故可选
  status?: "active" | "blocked";
  // 回复对象(结构化,不再把「回复 @name:」写进 content);显示用 t("回复 @{name}")
  reply_to_user_id?: string | null;
  reply_to_name?: string | null;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
  // Joined: reply_to:profiles!reply_to_user_id(username)
  reply_to?: { username: string } | null;
}

// AI 审核记录(supabase/i18n-v2.sql):只由翻译管线创建,admin「AI 审核」tab 复核。
// shadow = 影子模式下的违规判定(未屏蔽);translation = 被拦下的机器译文(恢复即重新排队翻译)
export interface DbAiModeration {
  id: string;
  target_type:
    | "car"
    | "post"
    | "car_comment"
    | "post_comment"
    | "qa_question"
    | "qa_answer"
    | "dealer_review"
    | "translation";
  target_id: string;
  user_id: string | null;
  content: string;
  categories: string[];
  reason: string | null;
  model: string | null;
  status: "pending" | "restored" | "confirmed" | "shadow";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // translation 记录:原内容的实体类型、被拦下的语言与对应原文版本(src_hash);其他类型没有这些键(停放时只有 parked)。
  // parked = 回滚前暂存的新类型待审记录:status 临时改为 shadow,内容仍是屏蔽的(见 supabase/i18n-v2-rollback.sql)
  context?: { entity: string; locales: string[]; src_hash?: string; parked?: boolean } | null;
}

export interface DbQaQuestion {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: "buying" | "selling" | "loan" | "insurance" | "dmv" | "maintenance" | "general";
  tags: string[];
  answers_count: number;
  views_count: number;
  is_resolved: boolean;
  accepted_answer_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

export interface DbQaAnswer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  is_accepted: boolean;
  // AI 审核屏蔽(supabase/i18n-v2.sql);列可能尚未创建,故可选
  status?: "active" | "blocked";
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

export interface DbPlatformReview {
  id: string;
  user_id: string;
  rating: number;
  content: string;
  transaction_type: "buy" | "sell" | null;
  car_make: string | null;
  car_model: string | null;
  is_featured: boolean;
  status: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

// ---------- Public API(docs/public-api-v0.md,supabase/api-keys.sql)----------

export interface DbApiKey {
  id: string;
  owner_id: string;
  name: string;
  // 明文前 12 位(clc_live_xxx),仅展示用;明文只在创建时返回一次
  prefix: string;
  scopes: string[];
  ip_allowlist: string[] | null;
  rate_limit_per_min: number;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
}

export interface DbApiUsageDaily {
  api_key_id: string;
  day: string;
  requests: number;
  errors: number;
  inserts: number;
  updates: number;
}

// ---------- 访问统计(supabase/analytics.sql)----------
// 埋点事件表 analytics_events 的行结构与后台 RPC 返回形状见 lib/analytics/types.ts。

// 用户最近一次的 IP 粗定位(仅管理员可读):/api/vt 收到登录用户的埋点时由触发器
// 从 Vercel 边缘 x-vercel-ip-* 头写入;历史用户由 scripts/backfill-user-geo.ts 按
// auth.sessions 里的 IP 补全(source = backfill)。
export interface DbUserIpGeo {
  user_id: string;
  /** ISO 国家代码,如 "US" */
  country: string | null;
  /** ISO 3166-2 州/省代码(不含国家前缀),如 "NY" */
  region: string | null;
  /** 英文城市名,如 "Flushing" */
  city: string | null;
  source: "edge" | "backfill";
  updated_at: string;
}
