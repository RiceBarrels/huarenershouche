// Shared types + fetch helper for listing-source adapters (server-only).

export interface SourceListingRef {
  /** Stock id at the source — stored as cars.source_listing_id */
  sourceListingId: string;
  /** Canonical detail page URL */
  url: string;
}

export interface CrawlResult {
  refs: SourceListingRef[];
  /** Total count declared by the site (e.g. "Results: 65"), if parseable */
  totalDeclared: number | null;
  pagesFetched: number;
  /** True if any list page fetch threw — delisting is disabled in that case */
  failed: boolean;
}

/**
 * Maps onto `cars` insert columns (minus seller_id/status/timestamps), except the text the i18n
 * pipeline owns: `description` → cars.description_original and `features` → cars.features_original
 * (verbatim originals); title/title_zh are rebuilt by buildCarTitles (lib/i18n/car-title.ts).
 */
export interface ParsedListing {
  title: string;
  title_zh: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: number;
  original_price: number | null;
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
  /** Dealer's own text, any language — stored verbatim as cars.description_original. */
  description: string | null;
  /**
   * Ignored: never written to cars.description_zh (a pipeline projection). Adapters set null; sync
   * only falls back to it as the original when `description` is empty.
   */
  description_zh: string | null;
  /** Dealer's own tags as scraped — stored verbatim as cars.features_original. */
  features: string[];
  seller_name: string;
  phone: string | null;
  carfax_url: string | null;
  carfax_summary: string | null;
  source_listing_id: string;
  source_url: string;
}

export type FetchHtml = (url: string) => Promise<string>;

export interface SourceAdapter {
  /** Matches listing_sources.key */
  key: string;
  /**
   * 该车行会说的语言(lib/i18n/languages.ts 代码)。同步引擎在系统账号
   * profiles.languages 为空时写入;管理员在后台改过的不覆盖。
   */
  languages?: string[];
  /** 多门店车行:每辆车的 location/lat/lng 由适配器按所在门店给出,同步引擎不以系统账号门店地址覆盖 */
  multiLocation?: boolean;
  listAll(fetchHtml: FetchHtml): Promise<CrawlResult>;
  fetchDetail(fetchHtml: FetchHtml, ref: SourceListingRef): Promise<ParsedListing>;
}

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Desktop-Chrome UA, follows redirects, 20s timeout, throws on !ok. */
export const fetchHtml: FetchHtml = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SCRAPINGANT = "https://api.scrapingant.com/v2/general";

/**
 * 经 ScrapingAnt 代理抓取(Cloudflare 挑战站点直连 403 时用)。需 SCRAPINGANT_API_KEY。
 * 按请求计费(浏览器渲染更贵),adapter 应尽量少发请求:能从列表页拿全字段就别逐辆抓详情。
 * browser=false 走纯代理(便宜,多数 CF「Just a moment」仍需 browser=true)。
 */
export function createProxyFetch(opts: { browser?: boolean; timeoutMs?: number } = {}): FetchHtml {
  const browser = opts.browser ?? true;
  const timeoutMs = opts.timeoutMs ?? 90_000;
  return async (url: string): Promise<string> => {
    const key = process.env.SCRAPINGANT_API_KEY;
    if (!key) throw new Error("SCRAPINGANT_API_KEY not set — 该数据源需经 ScrapingAnt 代理(Cloudflare)");
    const proxied = `${SCRAPINGANT}?url=${encodeURIComponent(url)}&browser=${browser}&x-api-key=${key}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(proxied, { signal: controller.signal });
      if (!res.ok) throw new Error(`ScrapingAnt HTTP ${res.status} for ${url}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  };
}
