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
  description: string | null;
  description_zh: string | null;
  // 小语种内容缓存:{ ko: { title, description } },首次被该语言用户浏览时
  // 由 /api/translate-listing 按需翻译写入(zh/en 仍走 title/title_zh 双列)
  other_i18n?: Record<string, { title?: string | null; description?: string | null }> | null;
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
  cars?: { id: string; title: string | null; title_zh: string | null; image_url: string | null; price: number };
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
  // 评论翻译缓存:{ en: { content }, ko: ... },/api/translate-comments 批量写入
  other_i18n?: Record<string, { content?: string | null }> | null;
  // AI 审核屏蔽(supabase/ai-moderation.sql);列可能尚未创建,故可选
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
  // 非中文界面的 AI 翻译缓存:{ en: { title, content }, ko: ... },按需写入
  other_i18n?: Record<string, { title?: string | null; content?: string | null }> | null;
  status: "active" | "hidden" | "removed";
  created_at: string;
  updated_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

export interface DbPostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  // 评论翻译缓存:{ en: { content }, ko: ... },/api/translate-comments 批量写入
  other_i18n?: Record<string, { content?: string | null }> | null;
  // AI 审核屏蔽(supabase/ai-moderation.sql);列可能尚未创建,故可选
  status?: "active" | "blocked";
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

// AI 审核拦截记录(supabase/ai-moderation.sql):只记违规,admin「AI 审核」tab 复核
export interface DbAiModeration {
  id: string;
  target_type: "car" | "post" | "car_comment" | "post_comment";
  target_id: string;
  user_id: string | null;
  content: string;
  categories: string[];
  reason: string | null;
  model: string | null;
  status: "pending" | "restored" | "confirmed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
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
