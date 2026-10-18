// 第一方访问统计的共享类型:埋点上报载荷(/api/vt)与管理后台 RPC 返回形状。
// SQL 侧见 supabase/analytics.sql —— 改字段两边必须同步。

export type AnalyticsEventType = "pageview" | "car_view";
export type AnalyticsPlatform = "web" | "ios" | "android";
export type AnalyticsDevice = "desktop" | "mobile" | "tablet";

/** 客户端 → POST /api/vt 的载荷(text/plain JSON,便于 sendBeacon 免预检) */
export interface TrackPayload {
  type: AnalyticsEventType;
  /** 持久匿名访客 id(localStorage) */
  visitor_id: string;
  /** 会话 id:30 分钟无活动或换了外部来源即换新 */
  session_id: string;
  /** 去掉语言前缀、不含 query 的逻辑路径:/car/<uuid>、/browse */
  path: string;
  /** 路由模式:/car/[id];无动态段时与 path 相同 */
  route: string;
  /** 去掉 utm_*、点击 id、敏感参数后的查询串(不含 "?"),可空 */
  query: string | null;
  /** 网页端 location.hostname;原生壳为 null */
  hostname: string | null;
  /** 当前界面语言 */
  locale: string | null;
  /** 仅 car_view 事件携带 */
  car_id: string | null;
  /** 会话来源:外部 referrer(origin + pathname),站内跳转/直接访问为 null */
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  platform: AnalyticsPlatform;
  /** 触屏设备(iPadOS 桌面版 UA 识别为平板用) */
  touch: boolean;
  /** 已登录时附 Supabase access token,服务端校验后写 user_id */
  token: string | null;
}

/**
 * 管理后台筛选条件(全部可选,精确匹配)。
 * 维度值用 "" 表示「未知 / 直接访问」(即库里为 NULL)。
 */
export interface AnalyticsFilters {
  path?: string;
  route?: string;
  hostname?: string;
  referrer_host?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  country?: string;
  region?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  platform?: string;
  locale?: string;
  car_id?: string;
  user_id?: string;
  visitor_id?: string;
  /** 按单条事件是否登录过滤 */
  visitor_type?: "user" | "anonymous";
  /** 排除管理员:剔除曾以管理员身份登录过的访客(含其登录前的匿名浏览) */
  exclude_admins?: boolean;
}

export type AnalyticsBucket = "hour" | "day";

export interface AnalyticsKpis {
  /** 去重访客数(visitor_id) */
  visitors: number;
  /** 页面浏览量(type = pageview) */
  pageviews: number;
  /** 车辆浏览次数(type = car_view,含手机浮层) */
  car_views: number;
  /** 浏览过车辆的去重访客数 */
  car_viewers: number;
  sessions: number;
  /** 去重登录用户数 */
  users: number;
  /**
   * 跳出会话数:会话在该周期内的互动不超过 1 次(pageview、浮层里的 car_view 各算一次,
   * 车辆详情页自身的 car_view 与该页 pageview 成对出现,不另计)。按页面 / 路由 / 车辆 / 用户 / 登录状态 /
   * 语言 / 地区这类会话内会变的维度筛选时,命中的会话按它在该周期内的全部事件计
   */
  bounced: number;
  /** bounced / sessions,无会话时为 null */
  bounce_rate: number | null;
}

export interface AnalyticsSeriesPoint {
  /** 桶起点,p_tz 下的本地时间 "YYYY-MM-DDTHH:MM:SS"(无时区后缀) */
  t: string;
  visitors: number;
  pageviews: number;
  car_views: number;
}

/** admin_analytics_overview */
export interface AnalyticsOverview {
  kpis: AnalyticsKpis;
  /** 上一个等长周期 [from - (to - from), from) */
  prev: AnalyticsKpis;
  series: AnalyticsSeriesPoint[];
  /** 最近 5 分钟的去重访客(套用同样的筛选条件) */
  online: number;
  bucket: AnalyticsBucket;
  /** 实际生效的时区(非法时区回退 UTC) */
  tz: string;
  /**
   * 开始采集的时间(全站最早一条事件;没有任何事件为 null)。上一周期早于它时环比不完整,
   * 界面不显示对比(见 components/analytics/format.ts prevPeriodComplete)
   */
  data_since: string | null;
}

export type AnalyticsDimension =
  | "path"
  | "route"
  | "hostname"
  | "referrer_host"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "country"
  | "region"
  | "city"
  | "device"
  | "browser"
  | "os"
  | "platform"
  | "locale"
  | "car";

/**
 * 车辆摘要(join cars;车被删时为 null)。线上库的 analytics_car_info 还是旧版(多返回 other_i18n、没有 trim),
 * supabase/analytics.sql 的新版返回 trim、不再返回 other_i18n,重新执行该文件前两种形状都会出现:
 * 界面只读两版共有的字段(标题一律走 carTitle(title / title_zh)),不读 other_i18n(冻结的旧翻译缓存)
 */
export interface AnalyticsCarInfo {
  id: string;
  title: string | null;
  title_zh: string | null;
  /** 只有新版函数返回 */
  trim?: string | null;
  image_url: string | null;
  price: number | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: string | null;
}

export interface AnalyticsBreakdownRow {
  /**
   * 维度值,null = 未知 / 直接访问。
   * region 行 key 为州省代码(配合 country);city 行 key 为城市名(配合 country + region);
   * car 行 key 为 car_id。
   */
  key: string | null;
  /** 去重访客 */
  visitors: number;
  /** path/route:浏览量;car:车辆浏览次数;其他维度:该维度下的 pageview 数 */
  pageviews: number;
  /** 该维度下的全部事件数(pageview + car_view) */
  events: number;
  /** region / city 行附带 */
  country?: string | null;
  region?: string | null;
  city?: string | null;
  /** car 行附带 */
  car?: AnalyticsCarInfo | null;
  /** car 行:浏览时已登录的去重用户数 */
  logged_in_viewers?: number;
}

/** admin_analytics_breakdown */
export interface AnalyticsBreakdown {
  rows: AnalyticsBreakdownRow[];
  /** 该维度在筛选范围内的不同取值总数(含 null) */
  total_keys: number;
}

/** admin_analytics_visitors 的一行(按 last_seen 倒序) */
export interface AnalyticsVisitorRow {
  visitor_id: string;
  /**
   * 范围内(同筛选)登录态事件中最近一次的用户;范围内都没登录(logged_in = false)时为该设备
   * 最近一次登录过的用户(不限时间范围);从未登录为 null
   */
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  /** 范围内是否有任何一条事件处于登录态 */
  logged_in: boolean;
  first_seen: string;
  last_seen: string;
  pageviews: number;
  car_views: number;
  sessions: number;
  /** 以下取范围内最近一条事件 */
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  locale: string | null;
  /** 以下取范围内最早一条事件 */
  referrer_host: string | null;
  utm_source: string | null;
  landing_path: string | null;
}

export interface AnalyticsVisitors {
  total: number;
  rows: AnalyticsVisitorRow[];
}

/** 单条事件(时间线 / 实时流) */
export interface AnalyticsEventRow {
  id: number;
  created_at: string;
  type: AnalyticsEventType;
  path: string;
  route: string | null;
  query: string | null;
  locale: string | null;
  car_id: string | null;
  car: AnalyticsCarInfo | null;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  session_id: string;
  visitor_id: string;
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
}

/**
 * admin_analytics_timeline,按时间倒序:按访客 = 该设备的全部事件(共用设备上可能有别的账号);
 * 按用户 = 本人登录时的事件 + 他登录过的设备上未登录时的浏览(不含同一设备上别的账号登录时的事件)
 */
export interface AnalyticsTimeline {
  /** 涉及的访客 id(按用户查时为该用户用过的全部设备) */
  visitor_ids: string[];
  rows: AnalyticsEventRow[];
}

export interface AnalyticsCarViewerRow {
  visitor_id: string;
  /** 看这辆车时登录着的用户(最近一次);看车时都没登录则为该设备最近一次登录过的用户;从未登录为 null */
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  /** 浏览这辆车时是否处于登录态 */
  logged_in: boolean;
  views: number;
  first_viewed: string;
  last_viewed: string;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  referrer_host: string | null;
  utm_source: string | null;
}

/** admin_analytics_car_viewers */
export interface AnalyticsCarViewers {
  views: number;
  viewers: number;
  logged_in_viewers: number;
  rows: AnalyticsCarViewerRow[];
}

/** admin_analytics_live */
export interface AnalyticsLive {
  online: number;
  rows: AnalyticsEventRow[];
}

// ---------- 卖家版(车行与个人卖家都可用;只看自己名下车辆的浏览,supabase/analytics.sql 的 seller_analytics_*) ----------
// 卖家只能看到「自己名下车辆」的 car_view 事件:库内校验调用者是该账号本人或认领人(profiles.claimed_by),
// 管理员可看任意卖家。卖家自己(含认领人)与管理员的浏览一律剔除。
// 浏览者身份默认匿名:viewer_key 为按卖家加盐的访客哈希(不同卖家之间无法互相关联同一个人);
// 是否向卖家展示已登录浏览者的用户名由 SQL 函数 analytics_seller_identity_enabled() 控制(默认关闭)。

/** 卖家可用的维度(不含站内路径/域名等全站信息) */
export type SellerAnalyticsDimension =
  | "car"
  | "referrer_host"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "country"
  | "region"
  | "city"
  | "device"
  | "browser"
  | "os"
  | "platform"
  | "locale";

/** 卖家可用的筛选键(AnalyticsFilters 的子集;排除管理员/本人在库内恒为开启) */
export type SellerAnalyticsFilters = Pick<
  AnalyticsFilters,
  | "car_id"
  | "referrer_host"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "country"
  | "region"
  | "city"
  | "device"
  | "browser"
  | "os"
  | "platform"
  | "locale"
  | "visitor_type"
>;

export interface SellerKpis {
  /** 名下车辆被浏览次数 */
  views: number;
  /** 去重浏览人数(visitor) */
  viewers: number;
  /** 浏览时已登录的去重用户数 */
  logged_in_viewers: number;
  /** 至少被看过一次的车辆数 */
  cars_viewed: number;
}

export interface SellerSeriesPoint {
  /** 同 AnalyticsSeriesPoint.t */
  t: string;
  views: number;
  viewers: number;
}

/** seller_analytics_overview */
export interface SellerOverview {
  kpis: SellerKpis;
  prev: SellerKpis;
  series: SellerSeriesPoint[];
  bucket: AnalyticsBucket;
  tz: string;
  /** 名下车辆总数(任意状态)与在售数 */
  cars_total: number;
  cars_active: number;
  /** 当前是否向卖家展示已登录浏览者身份(analytics_seller_identity_enabled()) */
  identity_enabled: boolean;
  /** 全站开始采集的时间(同 AnalyticsOverview.data_since) */
  data_since: string | null;
}

/** 卖家视角的一位浏览者(seller_analytics_viewers / seller_analytics_car_viewers 的行) */
export interface SellerViewerRow {
  /** 按卖家加盐的匿名访客标识(16 位十六进制) */
  viewer_key: string;
  /** 浏览这些车时是否处于登录态 */
  logged_in: boolean;
  /** 仅 identity_enabled 且浏览时已登录才有值,否则为 null */
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  views: number;
  /** 看过的该卖家车辆数 */
  cars_viewed: number;
  first_viewed: string;
  last_viewed: string;
  /** 以下取最近一次浏览 */
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  locale: string | null;
  /** 以下取最早一次浏览的会话来源 */
  referrer_host: string | null;
  utm_source: string | null;
  /** 最近看的一辆(该卖家的) */
  last_car: AnalyticsCarInfo | null;
}

/** seller_analytics_viewers */
export interface SellerViewers {
  total: number;
  rows: SellerViewerRow[];
}

/** seller_analytics_car_viewers */
export interface SellerCarViewers {
  views: number;
  viewers: number;
  logged_in_viewers: number;
  rows: SellerViewerRow[];
}

/** 某浏览者在该卖家车辆上的一次浏览 */
export interface SellerViewerEvent {
  created_at: string;
  car_id: string | null;
  car: AnalyticsCarInfo | null;
  logged_in: boolean;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  referrer_host: string | null;
  utm_source: string | null;
}

/** seller_analytics_viewer_timeline */
export interface SellerViewerTimeline {
  rows: SellerViewerEvent[];
}
