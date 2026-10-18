"use client";

import { Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import Image from "next/image";

import { ArrowUpDown, Bookmark, Check, Search, SlidersHorizontal, X, Clock, Trash2, Loader2, Car, Map as MapIcon, TrendingUp } from "lucide-react";
import { match as pinyinMatch } from "pinyin-pro";
import { getCarSuggestionPool, logCarSearchTerm } from "@/lib/car-search-suggestions";
import Link from "@/components/localized-navigation";
import { useI18n } from "@/components/i18n-provider";
import { brandShortLabel, brandLogoSrc, localizePath } from "@/lib/i18n";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";
import {
  browseQueryKey,
  fetchBrowseFacets,
  fetchBrowsePage,
  fetchCarsByIds,
  type BrowseCar,
  type BrowseQueryInput,
  type FacetOption,
} from "@/lib/browse-cars";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { Reveal } from "@/components/reveal";
import { SearchFilters, IOS_FILL, featureOptionLabel } from "@/components/search-filters";
import { MobileFilterDrawer } from "@/components/mobile-filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAKES_ZH } from "@/lib/mock-data";
import { detectUserZip, geocodeZipToCoords } from "@/lib/geocode";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { getSearchHistory, addSearchHistory, clearSearchHistory } from "@/lib/search-history";
import { fromStoredDeal } from "@/lib/price-insight";
import { bodyStyleLabel, type BodyStyle } from "@/lib/body-style";
import { saveSearch, isSearchSaved, SAVED_SEARCHES_EVENT } from "@/lib/saved-searches";
import {
  buildDistances,
  filtersFromParams,
  filtersToQuery,
  INITIAL_FILTERS,
  SORT_OPTIONS,
  type Filters,
  type SortKey,
} from "@/lib/car-filters";
import { BackToTop } from "@/components/back-to-top";
import { PullToRefresh } from "@/components/pull-to-refresh";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { DbCar } from "@/lib/types";

// 列表服务端分页(lib/browse-cars):只拿总数 + 一页,滑到底再拉下一页。
// 会话缓存记下当前条件已加载的几页,返回本页时同条件直接还原不重拉
const BROWSE_CACHE_KEY = "clc_browse_pages_v1";

interface BrowseCache {
  key: string;
  coords: { lat: number; lng: number } | null;
  total: number;
  items: BrowseCar[];
}

// 绘制前还原缓存(社区同款):useEffect 在首帧后才跑会闪一下加载页
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const { t, locale, pathLocale } = useI18n();
  const searchParams = useSearchParams();
  // 当前条件下已加载的车源(按页追加)与总数
  const [items, setItems] = useState<BrowseCar[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // 换条件后新结果到达前:旧列表保留但变淡
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // 会话缓存还原完成后才开始按条件拉取(还原会同时带回当时的坐标,避免先按无坐标多拉一次)
  const [cacheChecked, setCacheChecked] = useState(false);
  const [filters, setFiltersRaw] = useState<Filters>(() => filtersFromParams(searchParams));
  const [sort, setSortRaw] = useState<SortKey>(() => (searchParams.get("sort") as SortKey) || "newest");
  const resultsSentinelRef = useRef<HTMLDivElement>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [recentCars, setRecentCars] = useState<DbCar[]>([]);
  // 筛选面板选项统计(服务端算):make = 统计车型时对应的品牌
  const [facets, setFacets] = useState<{ make: string | null; models: FacetOption[]; features: FacetOption[] }>({
    make: null,
    models: [],
    features: [],
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [userZip, setUserZip] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // 移动端搜索:默认折叠成按钮,有关键词时展开
  const [mobileSearchOpen, setMobileSearchOpen] = useState(() => !!(searchParams.get("q") || searchParams.get("keyword")));

  // Sync filters & sort to URL (replaceState avoids full Next.js re-render)
  // 带上语言前缀:裸 /browse 刷新后会被 vercel.json 重定向到 /zh
  const syncToUrl = useCallback((f: Filters, s: SortKey) => {
    const qs = filtersToQuery(f, s);
    const url = localizePath(qs ? `/browse?${qs}` : "/browse", pathLocale);
    window.history.replaceState(window.history.state, "", url);
  }, [pathLocale]);

  const setFilters = useCallback((next: Filters | ((prev: Filters) => Filters)) => {
    setFiltersRaw((prev) => {
      let val = typeof next === "function" ? next(prev) : next;
      // 品牌变化时清空已选车型（车型依附于单一品牌）
      if (val.make !== prev.make && val.model) val = { ...val, model: "" };
      setSortRaw((s) => { syncToUrl(val, s); return s; });
      return val;
    });
  }, [syncToUrl]);

  const setSort = useCallback((next: SortKey) => {
    setSortRaw(next);
    setFiltersRaw((f) => { syncToUrl(f, next); return f; });
  }, [syncToUrl]);

  // Load search history on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage,仅首帧一次
    setSearchHistory(getSearchHistory());
  }, []);

  // 猜你想搜:买车独立词频池(supabase car_search_terms,与社区分离),打开搜索时拉一次
  const [suggestPool, setSuggestPool] = useState<string[]>([]);
  useEffect(() => {
    if (!mobileSearchOpen) return;
    let cancelled = false;
    getCarSuggestionPool().then((pool) => {
      if (!cancelled) setSuggestPool(pool);
    });
    return () => {
      cancelled = true;
    };
  }, [mobileSearchOpen]);

  // 展示时按当前输入过滤重排(子串 + 拼音);未输入时排除已在历史里的词
  const suggestedKeywords = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    if (kw) {
      const hits = suggestPool.filter((t) => {
        const tl = t.toLowerCase();
        if (tl === kw) return false;
        return tl.includes(kw) || Boolean(pinyinMatch(t, kw));
      });
      return hits.slice(0, 6);
    }
    const historySet = new Set(searchHistory);
    return suggestPool.filter((t) => !historySet.has(t)).slice(0, 6);
  }, [suggestPool, filters.keyword, searchHistory]);

  // 保存历史(社区同款规则:只在 input 失焦时保存)+ 上报全站词频
  const commitSearchTerm = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    addSearchHistory(t);
    setSearchHistory(getSearchHistory());
    logCarSearchTerm(t);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync filters when URL params change (e.g. from homepage search link)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同步外部 URL 状态
    setFiltersRaw(filtersFromParams(searchParams));
    const s = (searchParams.get("sort") as SortKey) || "newest";
    setSortRaw(s);
  }, [searchParams]);

  // 关键词停顿 300ms 再查,其他条件即时生效
  const [debouncedKeyword, setDebouncedKeyword] = useState(filters.keyword);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(filters.keyword), 300);
    return () => clearTimeout(timer);
  }, [filters.keyword]);

  const query = useMemo<BrowseQueryInput>(
    () => ({ filters: { ...filters, keyword: debouncedKeyword }, sort, locale, coords: userCoords }),
    [filters, debouncedKeyword, sort, locale, userCoords]
  );
  const queryKey = useMemo(() => browseQueryKey(query), [query]);
  // shownKeyRef:当前 items 对应的条件;activeRef:最近一次请求的条件(过期响应直接丢弃)
  const shownKeyRef = useRef<string | null>(null);
  const activeRef = useRef<{ key: string; query: BrowseQueryInput } | null>(null);
  const loadingMoreRef = useRef(false);

  const loadFirstPage = useCallback(async (q: BrowseQueryInput, key: string) => {
    activeRef.current = { key, query: q };
    setRefreshing(true);
    const page = await fetchBrowsePage(q, 0);
    if (activeRef.current?.key !== key) return;
    setRefreshing(false);
    setLoading(false);
    // 拉取失败:保留当前列表
    if (!page) return;
    shownKeyRef.current = key;
    setItems(page.items);
    setTotal(page.total);
    writeSessionCache<BrowseCache>(BROWSE_CACHE_KEY, { key, coords: q.coords, total: page.total, items: page.items });
  }, []);

  useEffect(() => {
    if (!cacheChecked || queryKey === shownKeyRef.current || queryKey === activeRef.current?.key) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 条件变化 → 向服务端拉第一页
    loadFirstPage(query, queryKey);
  }, [cacheChecked, query, queryKey, loadFirstPage]);

  // 触底拉下一页(offset = 已加载条数;去重防止两页之间有新车上架导致错位重复)
  async function loadMore() {
    const active = activeRef.current;
    if (!active || active.key !== shownKeyRef.current || loadingMoreRef.current || items.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const page = await fetchBrowsePage(active.query, items.length);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (!page || activeRef.current?.key !== active.key) return;
    const seen = new Set(items.map((c) => c.id));
    const merged = [...items, ...page.items.filter((c) => !seen.has(c.id))];
    setItems(merged);
    setTotal(page.total);
    writeSessionCache<BrowseCache>(BROWSE_CACHE_KEY, {
      key: active.key,
      coords: active.query.coords,
      total: page.total,
      items: merged,
    });
  }
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  useIsoLayoutEffect(() => {
    // 旧版全量缓存(整表车源)已废弃,清掉占用的 localStorage
    try { localStorage.removeItem("clc_browse_cars_v1"); } catch {}
    // 同一组条件本会话加载过:连同当时的坐标一起还原,不重拉
    const cached = readSessionCache<BrowseCache>(BROWSE_CACHE_KEY)?.data;
    if (cached && cached.key === browseQueryKey({ filters, sort, locale, coords: cached.coords })) {
      shownKeyRef.current = cached.key;
      setItems(cached.items);
      setTotal(cached.total);
      setUserCoords(cached.coords);
      setLoading(false);
    }
    setCacheChecked(true);

    const recentIds = getRecentlyViewed();
    if (recentIds.length > 0) {
      fetchCarsByIds(recentIds).then((recent) => setRecentCars(recent.slice(0, 6)));
    }

    // Auto-detect user zipcode for distance calculation only (don't auto-filter)
    if (!userZip) {
      detectUserZip().then((zip) => {
        if (zip) setUserZip(zip);
      });
    }

    // 定位权限刚被授予时重试——mount 时那次可能因无权限失败
    function onLocationGranted() {
      detectUserZip().then((zip) => {
        if (zip) setUserZip(zip);
      });
    }
    window.addEventListener("clc-location-granted", onLocationGranted);
    return () => window.removeEventListener("clc-location-granted", onLocationGranted);
  }, []);

  // 距离计算基准:优先用「位置」筛选里输入的 Zipcode,没有则用自动定位到的 zip
  const effectiveZip = /^\d{5}$/.test(filters.location) ? filters.location : userZip;
  // 只在 zip 从有效变无效时清坐标:挂载时 zip 还没定位到,不能把缓存还原的坐标清掉
  const prevZipRef = useRef(effectiveZip);

  useEffect(() => {
    const prevZip = prevZipRef.current;
    prevZipRef.current = effectiveZip;
    if (/^\d{5}$/.test(effectiveZip)) {
      geocodeZipToCoords(effectiveZip).then((coords) => {
        setUserCoords(coords);
      });
    } else if (/^\d{5}$/.test(prevZip)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- zip 失效时清空坐标
      setUserCoords(null);
    }
  }, [effectiveZip]);

  // 「最近浏览」卡片的距离(列表卡片的距离由服务端算好)
  const recentDistances = useMemo(() => buildDistances(recentCars, userCoords), [recentCars, userCoords]);

  // 筛选面板选项:恰好选中 1 个品牌时统计该品牌下各车型;配置取全站最常见的 12 个
  // (按词条归并语言孪生词,label 为当前界面语言文案,筛选值仍是 name)
  const singleMake = useMemo(() => {
    const makes = filters.make.split(",").map((m) => m.trim()).filter(Boolean);
    return makes.length === 1 ? makes[0] : null;
  }, [filters.make]);
  useEffect(() => {
    let cancelled = false;
    fetchBrowseFacets(singleMake, locale).then((f) => {
      if (!cancelled && f) setFacets({ make: singleMake, ...f });
    });
    return () => {
      cancelled = true;
    };
  }, [singleMake, locale]);
  const modelOptions = singleMake && facets.make === singleMake ? facets.models : [];
  const featureOptions = facets.features;

  // 保存搜索：当前筛选条件（去掉空值），与 localStorage 中的已存搜索比对
  const savedSearchParams = useMemo(() => {
    const rec: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v) rec[k] = v;
    }
    return rec;
  }, [filters]);
  const hasActiveFilters = Object.keys(savedSearchParams).length > 0;
  const [searchSaved, setSearchSaved] = useState(false);

  useEffect(() => {
    const update = () => setSearchSaved(isSearchSaved(savedSearchParams));
    update();
    window.addEventListener(SAVED_SEARCHES_EVENT, update);
    return () => window.removeEventListener(SAVED_SEARCHES_EVENT, update);
  }, [savedSearchParams]);

  function clearFilter(key: string) {
    const next = { ...filters };
    if (key === "price") {
      next.minPrice = "";
      next.maxPrice = "";
    } else if (key === "year") {
      next.minYear = "";
      next.maxYear = "";
    } else if (key.includes(":")) {
      // 单独移除多选筛选中的某个值（bodyStyle/model/transmission/features 等）
      const idx = key.indexOf(":");
      const field = key.slice(0, idx);
      const value = key.slice(idx + 1);
      const rec = next as Record<string, string>;
      rec[field] = (rec[field] || "")
        .split(",")
        .filter((v) => v && v !== value)
        .join(",");
    } else {
      (next as Record<string, string>)[key] = "";
    }
    setFilters(next);
  }

  // Build active filter chips for mobile display
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.make) {
      for (const m of filters.make.split(",")) {
        chips.push({ key: "make", label: brandShortLabel(m, MAKES_ZH[m], t, locale) });
      }
    }
    if (filters.model) {
      for (const v of filters.model.split(",")) {
        if (v.trim()) chips.push({ key: `model:${v}`, label: v.trim() });
      }
    }
    if (filters.location) {
      chips.push({
        key: "location",
        label: /^\d{5}$/.test(filters.location) ? `Zip ${filters.location}` : filters.location,
      });
    }
    if (filters.sellerType) chips.push({ key: "sellerType", label: filters.sellerType === "dealer" ? t("车行") : t("个人") });
    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : "$0";
      const max = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : t("不限");
      chips.push({ key: "price", label: `${min}-${max}` });
    }
    if (filters.minYear || filters.maxYear) {
      const min = filters.minYear || "2000";
      const max = filters.maxYear || "2026";
      chips.push({ key: "year", label: t("{min}-{max}年", { min, max }) });
    }
    if (filters.fuelType) {
      for (const v of filters.fuelType.split(",")) {
        chips.push({ key: "fuelType", label: t(v) });
      }
    }
    if (filters.transmission) {
      for (const v of filters.transmission.split(",")) {
        if (v) chips.push({ key: `transmission:${v}`, label: t(v) });
      }
    }
    if (filters.drivetrain) {
      for (const v of filters.drivetrain.split(",")) {
        chips.push({ key: "drivetrain", label: v });
      }
    }
    if (filters.maxMileage) chips.push({ key: "maxMileage", label: t("≤{n}万mi", { n: (Number(filters.maxMileage) / 10000).toFixed(0) }) });
    if (filters.exteriorColor) {
      for (const v of filters.exteriorColor.split(",")) {
        chips.push({ key: "exteriorColor", label: t("外" + v + "色") });
      }
    }
    if (filters.interiorColor) {
      for (const v of filters.interiorColor.split(",")) {
        chips.push({ key: "interiorColor", label: t("内" + v + "色") });
      }
    }
    if (filters.maxDistance) chips.push({ key: "maxDistance", label: `≤${filters.maxDistance}mi` });
    if (filters.bodyStyle) {
      for (const v of filters.bodyStyle.split(",")) {
        if (v) chips.push({ key: `bodyStyle:${v}`, label: t(bodyStyleLabel(v as BodyStyle)) });
      }
    }
    if (filters.maxPayment) chips.push({ key: "maxPayment", label: t("月供≤${n}", { n: filters.maxPayment }) });
    if (filters.dealRating) {
      chips.push({ key: "dealRating", label: filters.dealRating === "great" ? t("只看超值好价") : t("只看好价") });
    }
    if (filters.priceDropped === "true") chips.push({ key: "priceDropped", label: t("已降价") });
    if (filters.listedWithin) {
      chips.push({
        key: "listedWithin",
        label: filters.listedWithin === "1" ? t("24小时内上架") : t("{n}天内上架", { n: filters.listedWithin }),
      });
    }
    if (filters.features) {
      for (const v of filters.features.split(",")) {
        if (v) chips.push({ key: `features:${v}`, label: featureOptionLabel(v, featureOptions, t) });
      }
    }
    if (filters.noAccident === "true") chips.push({ key: "noAccident", label: t("无事故") });
    if (filters.oneOwner === "true") chips.push({ key: "oneOwner", label: t("一手车主") });
    if (filters.hasCarfax === "true") chips.push({ key: "hasCarfax", label: t("有Carfax") });
    if (filters.hasVideo === "true") chips.push({ key: "hasVideo", label: t("带视频") });
    if (filters.hasPrice === "true") chips.push({ key: "hasPrice", label: t("排除电议") });
    return chips;
  }, [filters, t, locale, featureOptions]);

  // 地图找车入口:携带当前筛选条件跳转 /browse/map
  const mapHref = useMemo(() => {
    const qs = filtersToQuery(filters, sort);
    return qs ? `/browse/map?${qs}` : "/browse/map";
  }, [filters, sort]);

  // 触底(提前 800px)拉下一页;每加载一页重建观察器,哨兵仍在视口内时会立刻再触发
  useEffect(() => {
    const el = resultsSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, total]);

  return (
    <PullToRefresh onRefresh={() => loadFirstPage(query, queryKey)}>
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />

      {/* Banner */}
      <div className="hidden border-b border-border bg-gradient-to-r from-foreground/[0.03] to-foreground/[0.06] sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 2xl:max-w-[88rem] min-[1920px]:max-w-[104rem] min-[2560px]:max-w-[120rem]">
          <div>
            <div className="flex items-center gap-2">
              <Image src={brandLogoSrc(locale)} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
              <p className="font-mono text-sm font-semibold">常來車網</p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {t("北美华人最信赖的二手车交易平台 · 免费发布 · 中文服务")}
            </p>
          </div>
          <Link href="/post">
            <Button size="sm" className="font-mono text-xs">
              {t("免费发布车辆")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile: search bar + filter button — sticky。安全区并入吸顶条自身的
          padding:只垫外层容器的话,滚动时条钉在 top:0 会顶进状态栏/刘海 */}
      <div
        className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 backdrop-blur-md md:hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="flex items-center gap-2">
          <div ref={searchWrapperRef} className="relative flex-1">
            <AnimatePresence initial={false} mode="popLayout">
              {mobileSearchOpen ? (
                <motion.div
                  key="input"
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="relative"
                >
                  <motion.span
                    layoutId="browse-search-icon"
                    className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"
                  >
                    <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </motion.span>
                  {/* 原生 input:iOS 搜索栏样式(圆角胶囊 + 系统填充色) */}
                  <input
                    autoFocus
                    placeholder={t("搜索品牌、车型...")}
                    className={`h-10 w-full rounded-full pl-9 pr-9 font-mono text-[15px] outline-none placeholder:text-muted-foreground/60 ${IOS_FILL}`}
                    value={filters.keyword}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(e) => {
                      const next = { ...filters, keyword: e.target.value };
                      setFilters(next);
                    }}
                    onBlur={() => {
                      commitSearchTerm(filters.keyword);
                      setSearchFocused(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchFocused(false);
                      setFilters({ ...filters, keyword: "" });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={t("关闭搜索")}
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="button"
                  type="button"
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  onClick={() => {
                    setMobileSearchOpen(true);
                    setSearchFocused(true);
                  }}
                  className={`flex h-10 w-full items-center gap-2 rounded-full px-4 text-left ${IOS_FILL}`}
                >
                  <motion.span layoutId="browse-search-icon" className="flex shrink-0">
                    <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </motion.span>
                  <span className={`truncate font-mono text-[15px] ${filters.keyword ? "text-foreground" : "text-muted-foreground/70"}`}>
                    {filters.keyword || t("搜索品牌、车型...")}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
            {/* 搜索面板:历史(未输入时)+ 猜你想搜(输入时按输入过滤)。
                onMouseDown preventDefault:点面板项不触发 input blur,点击才能生效 */}
            {mobileSearchOpen &&
              searchFocused &&
              ((!filters.keyword && searchHistory.length > 0) || suggestedKeywords.length > 0) && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[22px] bg-card shadow-lg"
              >
                {!filters.keyword && searchHistory.length > 0 && (
                  <>
                    <div className="flex items-center justify-between px-4 py-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{t("搜索历史")}</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearSearchHistory();
                          setSearchHistory([]);
                        }}
                        className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} />
                        {t("清除")}
                      </button>
                    </div>
                    {searchHistory.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setFilters({ ...filters, keyword: term });
                          commitSearchTerm(term);
                          setSearchFocused(false);
                        }}
                      >
                        <Clock className="h-3 w-3" strokeWidth={1.5} />
                        {term}
                      </button>
                    ))}
                  </>
                )}
                {suggestedKeywords.length > 0 && (
                  <>
                    <div className="px-4 py-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{t("猜你想搜")}</span>
                    </div>
                    {suggestedKeywords.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setFilters({ ...filters, keyword: term });
                          commitSearchTerm(term);
                          setSearchFocused(false);
                        }}
                      >
                        <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                        {term}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className={`relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 font-mono text-[13px] font-medium transition-opacity active:opacity-70 ${IOS_FILL}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t("筛选")}
                {activeFilterChips.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] text-primary-foreground">
                    {activeFilterChips.length}
                  </span>
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent>
              {/* iOS sheet 头:居中标题 + 右侧「完成」 */}
              <div className="relative flex items-center justify-center px-4 pb-3 pt-5">
                <span className="font-mono text-[17px] font-semibold">{t("筛选")}</span>
                <DrawerClose asChild>
                  <button type="button" className="absolute right-4 font-mono text-[15px] font-medium text-brand-ink transition-opacity active:opacity-60">
                    {t("完成")}
                  </button>
                </DrawerClose>
              </div>
              <div className="overflow-y-auto pb-6">
                <MobileFilterDrawer
                  filters={filters}
                  onFilter={setFilters}
                  activeCount={activeFilterChips.length}
                  modelOptions={modelOptions}
                  featureOptions={featureOptions}
                />
              </div>
            </DrawerContent>
          </Drawer>
          <Drawer>
            <DrawerTrigger asChild>
              <button
                type="button"
                className={`relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 font-mono text-[13px] font-medium transition-opacity active:opacity-70 ${IOS_FILL}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t(SORT_OPTIONS.find((o) => o.value === sort)?.label || "排序")}
              </button>
            </DrawerTrigger>
            <DrawerContent>
              {/* iOS sheet 头:居中标题 + 右侧「完成」 */}
              <div className="relative flex items-center justify-center px-4 pb-3 pt-5">
                <span className="font-mono text-[17px] font-semibold">{t("排序方式")}</span>
                <DrawerClose asChild>
                  <button type="button" className="absolute right-4 font-mono text-[15px] font-medium text-brand-ink transition-opacity active:opacity-60">
                    {t("完成")}
                  </button>
                </DrawerClose>
              </div>
              {/* iOS 单选列表:整行可点,选中项右侧 brand 对勾,分隔线不贯穿左缩进 */}
              <div className="pb-6">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="group flex w-full items-center pl-4 text-left transition-colors active:bg-muted/60"
                    onClick={() => setSort(opt.value)}
                  >
                    <span className="flex min-h-[52px] flex-1 items-center justify-between border-b border-border/50 pr-4 group-last:border-b-0">
                      <span className="font-mono text-[15px]">{t(opt.label)}</span>
                      {sort === opt.value && (
                        <Check className="h-5 w-5 text-brand-ink" strokeWidth={2} />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => clearFilter(chip.key)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[12px] transition-opacity active:opacity-70 ${IOS_FILL}`}
              >
                {chip.label}
                <X className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={2} />
              </button>
            ))}
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="flex items-center gap-1 px-2 py-1.5 font-mono text-[12px] text-destructive transition-opacity active:opacity-70"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2} />
              {t("清空所有")}
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 2xl:max-w-[88rem] min-[1920px]:max-w-[104rem] min-[2560px]:max-w-[120rem]">
        {/* Left sidebar filters — desktop only */}
        {/* 15rem 而非写死 240px:带鱼屏 root 字号放大时侧栏随内容等比变宽 */}
        <div className="hidden w-60 shrink-0 md:block">
          {/* top-[117px]:桌面 Header 改双行(56+44+1px)后吸顶位跟着下移,再留 16px 呼吸 */}
          <div className="sticky top-[117px] max-h-[calc(100vh-8.5rem)] space-y-4 overflow-y-auto overscroll-contain pb-6 pr-1">
            <SearchFilters
              onFilter={setFilters}
              initialFilters={filters}
              modelOptions={modelOptions}
              featureOptions={featureOptions}
            />
          </div>
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Results toolbar — sticky under header on desktop */}
          {/* md:border-b 细分隔线:吸顶后与下方卡片流有 1px 界限,符合"1px 边框"的工具感 */}
          <div className="mb-4 md:sticky md:top-[101px] md:z-20 md:-mx-1 md:border-b md:border-border/60 md:bg-background/90 md:px-1 md:pb-2 md:pt-1 md:backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-baseline gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>Results:</span>
                <span className="font-semibold tracking-normal text-foreground">
                  {t("共 {n} 辆", { n: total })}
                </span>
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    if (!searchSaved) saveSearch(savedSearchParams);
                  }}
                  disabled={searchSaved}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium transition-opacity hover:opacity-85 active:opacity-70 ${
                    searchSaved
                      ? `${IOS_FILL} text-muted-foreground`
                      : "bg-brand/30 text-brand-ink"
                  }`}
                >
                  <Bookmark
                    className={`h-3 w-3 ${searchSaved ? "fill-current" : ""}`}
                    strokeWidth={1.5}
                  />
                  {searchSaved ? t("已保存") : t("保存搜索")}
                </button>
              )}
              {/* Desktop sort */}
              <div className="ml-auto hidden items-center gap-2 md:flex">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Sort
                </span>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-8 w-[130px] rounded-full font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {t(opt.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link href={mapHref}>
                  <Button size="sm" className="h-8 gap-1.5 rounded-full font-mono text-xs font-semibold">
                    <MapIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("地图找车")}
                  </Button>
                </Link>
              </div>
            </div>
            {/* Desktop active filter chips */}
            {(activeFilterChips.length > 0 || !!filters.keyword) && (
              <div className="mt-2 hidden flex-wrap gap-1.5 md:flex">
                {/* 关键词来自导航栏搜索框(?q=),侧栏已无输入框,用 chip 展示并支持移除 */}
                {filters.keyword && (
                  <button
                    onClick={() => clearFilter("keyword")}
                    className={`group flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[12px] transition-colors hover:bg-black/[0.08] active:opacity-70 dark:hover:bg-white/[0.12] ${IOS_FILL}`}
                  >
                    “{filters.keyword}”
                    <X className="h-2.5 w-2.5 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2} />
                  </button>
                )}
                {activeFilterChips.map((chip, i) => (
                  <button
                    key={`${chip.key}-${i}`}
                    onClick={() => clearFilter(chip.key)}
                    /* 桌面 chips 补 hover 反馈:IOS_FILL 本身无 hover,鼠标场景需要即时提示"可点击移除" */
                    className={`group flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-[12px] transition-colors hover:bg-black/[0.08] active:opacity-70 dark:hover:bg-white/[0.12] ${IOS_FILL}`}
                  >
                    {chip.label}
                    <X className="h-2.5 w-2.5 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={2} />
                  </button>
                ))}
                <button
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="flex items-center gap-1 px-2 py-1.5 font-mono text-[12px] text-destructive transition-opacity hover:opacity-80 active:opacity-70"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2} />
                  {t("清空")}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            /* 加载中用动画过渡代替骨架屏:轻量 spinner,数据到达后卡片逐个淡入 */
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
              /* 宽屏下加载区加高:避免 spinner 贴着吸顶工具条显得局促 */
              className="flex flex-col items-center justify-center py-24 md:py-32"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                Loading
              </p>
            </motion.div>
          ) : items.length > 0 ? (
            <>
            {/* 规则网格:行行顶部对齐(替代瀑布流);列数比原来少一档,卡片更宽 */}
            <div className={`grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 md:gap-4 xl:grid-cols-3 min-[1920px]:grid-cols-4 min-[2560px]:grid-cols-5 ${refreshing ? "opacity-50" : ""}`}>
              {items.map((car) => (
                <Reveal key={car.id}>
                  <CarCard
                    car={car}
                    distance={car.distance ?? undefined}
                    priceInsight={fromStoredDeal(car.deal)}
                  />
                </Reveal>
              ))}
            </div>
            {/* 无限滚动哨兵 */}
            <div ref={resultsSentinelRef} className="h-px" aria-hidden="true" />
            {items.length < total && (
              <p className="flex items-center justify-center gap-2 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                {loadingMore && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
                Showing {items.length} / {total}
              </p>
            )}
            </>
          ) : (
            /* 空状态在宽屏限宽居中:整行拉通的空卡片在 4-5 列宽度下比例失衡 */
            <div className="flex flex-col items-center rounded-[26px] bg-card px-6 py-16 md:mx-auto md:max-w-md md:py-20">
              <Car className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                No Results
              </p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {t("没有找到符合条件的车辆")}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className={`flex h-9 items-center rounded-full px-4 font-mono text-xs font-medium transition-opacity active:opacity-70 ${IOS_FILL}`}
                  onClick={() => setFilters(INITIAL_FILTERS)}
                >
                  {t("清除所有筛选")}
                </button>
                {filters.maxPrice && (
                  <button
                    type="button"
                    className="px-3 py-2 font-mono text-xs text-brand-ink transition-opacity active:opacity-60"
                    onClick={() => setFilters({ ...filters, maxPrice: "" })}
                  >
                    {t("去掉价格上限")}
                  </button>
                )}
                {filters.maxDistance && (
                  <button
                    type="button"
                    className="px-3 py-2 font-mono text-xs text-brand-ink transition-opacity active:opacity-60"
                    onClick={() => setFilters({ ...filters, maxDistance: "" })}
                  >
                    {t("扩大搜索范围")}
                  </button>
                )}
              </div>
            </div>
          )}

          {recentCars.length > 0 && (
            <section
              className="mt-10 border-t border-border pt-6"
            >
              <h2 className="font-logo text-base">{t("最近浏览")}</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {recentCars.map((car) => (
                  <CarCard
                    key={"recent-" + car.id}
                    car={car}
                    distance={recentDistances.get(car.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <Footer />
      <BackToTop />

      {/* 地图找车悬浮入口(主推功能):移动端固定在底部导航上方居中 */}
      <Link
        href={mapHref}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 -translate-x-1/2 md:hidden"
      >
        <span className="flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 font-mono text-sm font-semibold text-primary-foreground shadow-lg shadow-brand/30 transition-transform active:scale-95">
          <MapIcon className="h-4 w-4" strokeWidth={1.75} />
          {t("地图找车")}
        </span>
      </Link>
    </div>
    </PullToRefresh>
  );
}
