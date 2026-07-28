"use client";

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import Image from "next/image";

import { ArrowUpDown, Bookmark, Search, SlidersHorizontal, X, Clock, Trash2, Loader2, Car } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarCard } from "@/components/car-card";
import { Reveal } from "@/components/reveal";
import { SearchFilters } from "@/components/search-filters";
import { MobileFilterDrawer } from "@/components/mobile-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { match } from "pinyin-pro";
import { MAKES_ZH } from "@/lib/mock-data";
import { detectUserZip, geocodeZipToCoords, haversineDistance } from "@/lib/geocode";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { getSearchHistory, addSearchHistory, clearSearchHistory } from "@/lib/search-history";
import { getPriceInsight, type PriceInsight } from "@/lib/price-insight";
import { classifyBodyStyle, bodyStyleLabel, type BodyStyle } from "@/lib/body-style";
import { paymentToPrice } from "@/lib/format";
import { saveSearch, isSearchSaved, SAVED_SEARCHES_EVENT, carHasVideo } from "@/lib/saved-searches";
import { BackToTop } from "@/components/back-to-top";
import { PullToRefresh } from "@/components/pull-to-refresh";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { DbCar } from "@/lib/types";

interface Filters {
  keyword: string;
  make: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  location: string;
  sellerType: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  maxMileage: string;
  exteriorColor: string;
  interiorColor: string;
  features: string;
  maxDistance: string;
  bodyStyle: string;
  maxPayment: string;
  dealRating: string;
  priceDropped: string;
  listedWithin: string;
  noAccident: string;
  oneOwner: string;
  hasCarfax: string;
  hasVideo: string;
  hasPrice: string;
}

const INITIAL_FILTERS: Filters = {
  keyword: "",
  make: "",
  model: "",
  minPrice: "",
  maxPrice: "",
  minYear: "",
  maxYear: "",
  location: "",
  sellerType: "",
  fuelType: "",
  transmission: "",
  drivetrain: "",
  maxMileage: "",
  exteriorColor: "",
  interiorColor: "",
  features: "",
  maxDistance: "50",
  bodyStyle: "",
  maxPayment: "",
  dealRating: "",
  priceDropped: "",
  listedWithin: "",
  noAccident: "",
  oneOwner: "",
  hasCarfax: "",
  hasVideo: "",
  hasPrice: "",
};

type SortKey = "newest" | "price-asc" | "price-desc" | "mileage" | "year" | "distance";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "最新发布" },
  { value: "price-asc", label: "价格↑" },
  { value: "price-desc", label: "价格↓" },
  { value: "mileage", label: "里程最少" },
  { value: "year", label: "年份最新" },
  { value: "distance", label: "距离最近" },
];

function filtersFromParams(sp: URLSearchParams): Filters {
  return {
    keyword: sp.get("q") || sp.get("keyword") || "",
    make: sp.get("make") || "",
    model: sp.get("model") || "",
    minPrice: sp.get("minPrice") || "",
    maxPrice: sp.get("maxPrice") || "",
    minYear: sp.get("minYear") || "",
    maxYear: sp.get("maxYear") || "",
    // 主页搜索表单用 zip 参数传 Zipcode,统一并入 location(位置筛选只认 zip/城市名)
    location: sp.get("location") || sp.get("zip") || "",
    sellerType: sp.get("sellerType") || "",
    fuelType: sp.get("fuelType") || "",
    transmission: sp.get("transmission") || "",
    drivetrain: sp.get("drivetrain") || "",
    maxMileage: sp.get("maxMileage") || "",
    exteriorColor: sp.get("exteriorColor") || "",
    interiorColor: sp.get("interiorColor") || "",
    features: sp.get("features") || "",
    maxDistance: sp.get("maxDistance") || "50",
    bodyStyle: sp.get("bodyStyle") || "",
    maxPayment: sp.get("maxPayment") || "",
    dealRating: sp.get("dealRating") || "",
    priceDropped: sp.get("priceDropped") || "",
    listedWithin: sp.get("listedWithin") || "",
    noAccident: sp.get("noAccident") || "",
    oneOwner: sp.get("oneOwner") || "",
    hasCarfax: sp.get("hasCarfax") || "",
    hasVideo: sp.get("hasVideo") || "",
    hasPrice: sp.get("hasPrice") || "",
  };
}

// 关键词全字段检索:把该车所有可读信息(中英标题、双语描述、标签、配置、
// 颜色、地区、卖家、VIN、年份等)拼成一个字符串,按空格拆词做「与」匹配
// (输入越多词结果越精确,且与词序无关)。英文/中文直接子串命中,
// 另对较短的中文字段做拼音匹配(支持 kaimeirui / byd 这类拼音/首字母输入)。
function carMatchesKeyword(car: DbCar, rawKeyword: string): boolean {
  const tokens = rawKeyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [
    car.title, car.title_zh,
    car.make, MAKES_ZH[car.make], car.model, car.trim, String(car.year ?? ""),
    car.description, car.description_zh,
    (car.features || []).join(" "),
    car.fuel_type, car.transmission, car.drivetrain,
    car.exterior_color, car.interior_color,
    car.location, car.location_zh, car.seller_name, car.vin,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 拼音检索:仅保留「纯中文字符」(去掉英文车型名/配置/卖家名等,否则拼音会误配
  // 英文字母,导致 camry 命中几乎所有车),并且只对纯字母词(可能是拼音输入)启用。
  const zhOnly = [
    car.title_zh, MAKES_ZH[car.make], car.location_zh, car.seller_name,
    (car.features || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[^一-鿿]/g, "");

  // continuous: 拼音必须连续命中(默认允许跳字匹配,会让 camry 这类英文词
  // 以 c-a-m-r-y 首字母散落命中长中文串里不相邻的五个字,导致搜什么都全命中)
  return tokens.every(
    (tok) =>
      haystack.includes(tok) ||
      (/^[a-z]+$/.test(tok) && zhOnly.length > 0 && match(zhOnly, tok, { continuous: true }) !== null),
  );
}

// 响应式列数(与社区瀑布流一致):2 / md 3 / xl 4
function useColumnCount(): number {
  // 手机端一排一个;平板 3 列、桌面 4 列
  const [count, setCount] = useState(1);
  useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 768px)");
    const xlQuery = window.matchMedia("(min-width: 1280px)");
    const update = () => setCount(xlQuery.matches ? 4 : mdQuery.matches ? 3 : 1);
    update();
    mdQuery.addEventListener("change", update);
    xlQuery.addEventListener("change", update);
    return () => {
      mdQuery.removeEventListener("change", update);
      xlQuery.removeEventListener("change", update);
    };
  }, []);
  return count;
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
  // 数据拉取时间，作为"上架时间"筛选的基准（避免在渲染期直接调用 Date.now）
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [filters, setFiltersRaw] = useState<Filters>(() => filtersFromParams(searchParams));
  const [sort, setSortRaw] = useState<SortKey>(() => (searchParams.get("sort") as SortKey) || "newest");
  // 无限滚动:增量渲染结果(数据已全量在内存,只分批挂 DOM)
  const [visibleCount, setVisibleCount] = useState(24);
  const resultsSentinelRef = useRef<HTMLDivElement>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [recentCars, setRecentCars] = useState<DbCar[]>([]);
  const columnCount = useColumnCount();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [userZip, setUserZip] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // 移动端搜索:默认折叠成按钮,有关键词时展开
  const [mobileSearchOpen, setMobileSearchOpen] = useState(() => !!(searchParams.get("q") || searchParams.get("keyword")));

  // Sync filters & sort to URL (replaceState avoids full Next.js re-render)
  const syncToUrl = useCallback((f: Filters, s: SortKey) => {
    const params = new URLSearchParams();
    if (f.keyword) params.set("q", f.keyword);
    if (f.make) params.set("make", f.make);
    if (f.model) params.set("model", f.model);
    if (f.minPrice) params.set("minPrice", f.minPrice);
    if (f.maxPrice) params.set("maxPrice", f.maxPrice);
    if (f.minYear) params.set("minYear", f.minYear);
    if (f.maxYear) params.set("maxYear", f.maxYear);
    if (f.location) params.set("location", f.location);
    if (f.sellerType) params.set("sellerType", f.sellerType);
    if (f.fuelType) params.set("fuelType", f.fuelType);
    if (f.transmission) params.set("transmission", f.transmission);
    if (f.drivetrain) params.set("drivetrain", f.drivetrain);
    if (f.maxMileage) params.set("maxMileage", f.maxMileage);
    if (f.exteriorColor) params.set("exteriorColor", f.exteriorColor);
    if (f.interiorColor) params.set("interiorColor", f.interiorColor);
    if (f.features) params.set("features", f.features);
    if (f.maxDistance) params.set("maxDistance", f.maxDistance);
    if (f.bodyStyle) params.set("bodyStyle", f.bodyStyle);
    if (f.maxPayment) params.set("maxPayment", f.maxPayment);
    if (f.dealRating) params.set("dealRating", f.dealRating);
    if (f.priceDropped) params.set("priceDropped", f.priceDropped);
    if (f.listedWithin) params.set("listedWithin", f.listedWithin);
    if (f.noAccident) params.set("noAccident", f.noAccident);
    if (f.oneOwner) params.set("oneOwner", f.oneOwner);
    if (f.hasCarfax) params.set("hasCarfax", f.hasCarfax);
    if (f.hasVideo) params.set("hasVideo", f.hasVideo);
    if (f.hasPrice) params.set("hasPrice", f.hasPrice);
    if (s !== "newest") params.set("sort", s);
    const qs = params.toString();
    const url = qs ? `/browse?${qs}` : "/browse";
    window.history.replaceState(window.history.state, "", url);
  }, []);

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
    setSearchHistory(getSearchHistory());
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
    setFiltersRaw(filtersFromParams(searchParams));
    const s = (searchParams.get("sort") as SortKey) || "newest";
    setSortRaw(s);
  }, [searchParams]);

  async function fetchCars() {
    const { data } = await supabase
      .from("cars")
      .select("*, profiles!seller_id(account_type, avatar_url)")
      .eq("status", "active")
      .eq("owner_hidden", false)
      .order("created_at", { ascending: false });
    const allCars = (data as DbCar[]) || [];
    setCars(allCars);
    setFetchedAt(Date.now());
    setLoading(false);

    const recentIds = getRecentlyViewed();
    if (recentIds.length > 0) {
      const recent = recentIds
        .map((id) => allCars.find((c) => c.id === id))
        .filter(Boolean) as DbCar[];
      setRecentCars(recent.slice(0, 6));
    }
  }

  useEffect(() => {
    fetchCars();

    // Auto-detect user zipcode for distance calculation only (don't auto-filter)
    if (!userZip) {
      detectUserZip().then((zip) => {
        if (zip) setUserZip(zip);
      });
    }
  }, []);

  // 距离计算基准:优先用「位置」筛选里输入的 Zipcode,没有则用自动定位到的 zip
  const effectiveZip = /^\d{5}$/.test(filters.location) ? filters.location : userZip;

  useEffect(() => {
    if (/^\d{5}$/.test(effectiveZip)) {
      geocodeZipToCoords(effectiveZip).then((coords) => {
        setUserCoords(coords);
      });
    } else {
      setUserCoords(null);
    }
  }, [effectiveZip]);

  const distances = useMemo(() => {
    if (!userCoords) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const car of cars) {
      if (car.lat && car.lng) {
        map.set(car.id, haversineDistance(userCoords.lat, userCoords.lng, car.lat, car.lng));
      }
    }
    return map;
  }, [cars, userCoords]);

  // 价格评级：以完整未过滤的车源列表为对比基准，建一张 carId -> insight 的表
  // （筛选与卡片渲染复用，避免在 filter 循环里反复线性扫全表）
  const insightMap = useMemo(() => {
    const map = new Map<string, PriceInsight | null>();
    for (const car of cars) {
      map.set(car.id, getPriceInsight(car, cars));
    }
    return map;
  }, [cars]);

  // 车型选项：仅当恰好选中 1 个品牌时，统计该品牌下各车型及数量（按数量降序）
  const modelOptions = useMemo(() => {
    const makes = filters.make.split(",").map((m) => m.trim()).filter(Boolean);
    if (makes.length !== 1) return [];
    const make = makes[0];
    const counts = new Map<string, { name: string; count: number }>();
    for (const car of cars) {
      if (car.make !== make) continue;
      const name = (car.model || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { name, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [cars, filters.make]);

  // 车辆配置选项：统计全部车源 features 标签出现次数，取前 12
  const featureOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const car of cars) {
      for (const f of car.features || []) {
        const tag = f.trim();
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [cars]);

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
        chips.push({ key: "make", label: MAKES_ZH[m] || m });
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
    if (filters.sellerType) chips.push({ key: "sellerType", label: filters.sellerType === "dealer" ? "车行" : "个人" });
    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : "$0";
      const max = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : "不限";
      chips.push({ key: "price", label: `${min}-${max}` });
    }
    if (filters.minYear || filters.maxYear) {
      const min = filters.minYear || "2000";
      const max = filters.maxYear || "2026";
      chips.push({ key: "year", label: `${min}-${max}年` });
    }
    if (filters.fuelType) {
      for (const v of filters.fuelType.split(",")) {
        chips.push({ key: "fuelType", label: v });
      }
    }
    if (filters.transmission) {
      for (const v of filters.transmission.split(",")) {
        if (v) chips.push({ key: `transmission:${v}`, label: v });
      }
    }
    if (filters.drivetrain) {
      for (const v of filters.drivetrain.split(",")) {
        chips.push({ key: "drivetrain", label: v });
      }
    }
    if (filters.maxMileage) chips.push({ key: "maxMileage", label: `≤${(Number(filters.maxMileage) / 10000).toFixed(0)}万mi` });
    if (filters.exteriorColor) {
      for (const v of filters.exteriorColor.split(",")) {
        chips.push({ key: "exteriorColor", label: "外" + v + "色" });
      }
    }
    if (filters.interiorColor) {
      for (const v of filters.interiorColor.split(",")) {
        chips.push({ key: "interiorColor", label: "内" + v + "色" });
      }
    }
    if (filters.maxDistance) chips.push({ key: "maxDistance", label: `≤${filters.maxDistance}mi` });
    if (filters.bodyStyle) {
      for (const v of filters.bodyStyle.split(",")) {
        if (v) chips.push({ key: `bodyStyle:${v}`, label: bodyStyleLabel(v as BodyStyle) });
      }
    }
    if (filters.maxPayment) chips.push({ key: "maxPayment", label: `月供≤$${filters.maxPayment}` });
    if (filters.dealRating) {
      chips.push({ key: "dealRating", label: filters.dealRating === "great" ? "只看超值好价" : "只看好价" });
    }
    if (filters.priceDropped === "true") chips.push({ key: "priceDropped", label: "已降价" });
    if (filters.listedWithin) {
      chips.push({
        key: "listedWithin",
        label: filters.listedWithin === "1" ? "24小时内上架" : `${filters.listedWithin}天内上架`,
      });
    }
    if (filters.features) {
      for (const v of filters.features.split(",")) {
        if (v) chips.push({ key: `features:${v}`, label: v });
      }
    }
    if (filters.noAccident === "true") chips.push({ key: "noAccident", label: "无事故" });
    if (filters.oneOwner === "true") chips.push({ key: "oneOwner", label: "一手车主" });
    if (filters.hasCarfax === "true") chips.push({ key: "hasCarfax", label: "有Carfax" });
    if (filters.hasVideo === "true") chips.push({ key: "hasVideo", label: "带视频" });
    if (filters.hasPrice === "true") chips.push({ key: "hasPrice", label: "排除电议" });
    return chips;
  }, [filters]);

  const filtered = useMemo(() => {
    // Helper: check if car value matches any of the comma-separated filter values
    function matchesMulti(filterVal: string, carVal: string | undefined | null): boolean {
      if (!filterVal) return true;
      if (!carVal) return false;
      return filterVal.split(",").includes(carVal);
    }

    function matchesColorMulti(filterVal: string, carVal: string | undefined | null): boolean {
      if (!filterVal) return true;
      if (!carVal) return false;
      return filterVal.split(",").some((c) => carVal.includes(c));
    }

    // 预计算：月供预算换算的价格上限 / 上架时间截止点（避免在循环里重复算）
    const paymentPriceCap = filters.maxPayment ? paymentToPrice(Number(filters.maxPayment)) : null;
    const listedCutoff =
      filters.listedWithin && fetchedAt
        ? fetchedAt - Number(filters.listedWithin) * 24 * 60 * 60 * 1000
        : null;

    // Filter without location first to check fallback
    function applyNonLocationFilters(car: DbCar): boolean {
      if (filters.keyword && !carMatchesKeyword(car, filters.keyword)) return false;
      if (filters.make && !matchesMulti(filters.make, car.make)) return false;
      if (filters.model) {
        const models = filters.model
          .split(",")
          .map((m) => m.trim().toLowerCase())
          .filter(Boolean);
        if (models.length > 0 && (!car.model || !models.includes(car.model.trim().toLowerCase()))) return false;
      }
      if (filters.minPrice && car.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && car.price > Number(filters.maxPrice)) return false;
      if (filters.minYear && car.year < Number(filters.minYear)) return false;
      if (filters.maxYear && car.year > Number(filters.maxYear)) return false;
      if (filters.sellerType && car.profiles?.account_type !== filters.sellerType) return false;
      if (filters.fuelType && !matchesMulti(filters.fuelType, car.fuel_type)) return false;
      if (filters.transmission && !matchesMulti(filters.transmission, car.transmission)) return false;
      if (filters.drivetrain && !matchesMulti(filters.drivetrain, car.drivetrain)) return false;
      if (filters.maxMileage && car.mileage > Number(filters.maxMileage)) return false;
      if (filters.exteriorColor && !matchesColorMulti(filters.exteriorColor, car.exterior_color)) return false;
      if (filters.interiorColor && !matchesColorMulti(filters.interiorColor, car.interior_color)) return false;
      if (filters.bodyStyle) {
        const style = classifyBodyStyle(car);
        if (!style || !filters.bodyStyle.split(",").includes(style)) return false;
      }
      if (paymentPriceCap !== null) {
        // 电议（price<=0）的车无法估算月供，排除
        if (car.price <= 0 || car.price > paymentPriceCap) return false;
      }
      if (filters.dealRating) {
        const insight = insightMap.get(car.id);
        if (!insight) return false;
        if (filters.dealRating === "great" && insight.level !== "great") return false;
        if (filters.dealRating === "good" && insight.level !== "great" && insight.level !== "good") return false;
      }
      if (filters.priceDropped === "true") {
        if (!car.original_price || car.original_price <= car.price) return false;
      }
      if (listedCutoff !== null) {
        if (new Date(car.created_at).getTime() < listedCutoff) return false;
      }
      if (filters.features) {
        // AND 语义：车辆需包含全部所选配置
        const wanted = filters.features.split(",").filter(Boolean);
        const has = car.features || [];
        if (!wanted.every((f) => has.includes(f))) return false;
      }
      if (filters.noAccident === "true" && !car.carfax_summary?.includes("无事故")) return false;
      if (filters.oneOwner === "true") {
        if (!car.carfax_summary || !/(?:^|\D)1 任车主/.test(car.carfax_summary)) return false;
      }
      if (filters.hasCarfax === "true" && !car.carfax_url) return false;
      if (filters.hasVideo === "true" && !carHasVideo(car)) return false;
      if (filters.hasPrice === "true" && car.price <= 0) return false;
      return true;
    }

    function applyLocationFilter(car: DbCar): boolean {
      if (!filters.location) return true;
      const loc = filters.location;
      // Zipcode:不做硬过滤,由距离筛选/排序(以该 zip 为中心)处理
      if (/^\d{5}$/.test(loc)) return true;
      // 城市名(主页「按地区找车」入口链接):子串匹配
      return (
        car.location.toLowerCase().includes(loc.toLowerCase()) ||
        car.location_zh.includes(loc)
      );
    }

    // Apply non-location filters
    const nonLocFiltered = cars.filter(applyNonLocationFilters);

    // Try applying location filter
    let result: DbCar[];
    let usingDistanceFallback = false;
    if (filters.location) {
      const locFiltered = nonLocFiltered.filter(applyLocationFilter);
      if (locFiltered.length > 0) {
        result = locFiltered;
      } else {
        // Fallback: show all results sorted by distance
        result = nonLocFiltered;
        usingDistanceFallback = true;
      }
    } else {
      result = nonLocFiltered;
    }

    // Apply distance filter
    if (filters.maxDistance && userCoords) {
      const maxDist = Number(filters.maxDistance);
      if (maxDist > 0) {
        result = result.filter((car) => {
          const d = distances.get(car.id);
          return d !== undefined && d <= maxDist;
        });
      }
    }

    const sorted = [...result];
    // If location yielded no results and we have coords, sort by distance
    const effectiveSort = usingDistanceFallback && userCoords ? "distance" as SortKey : sort;
    switch (effectiveSort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "mileage":
        sorted.sort((a, b) => a.mileage - b.mileage);
        break;
      case "year":
        sorted.sort((a, b) => b.year - a.year);
        break;
      case "distance":
        sorted.sort((a, b) => {
          const da = distances.get(a.id) ?? Infinity;
          const db = distances.get(b.id) ?? Infinity;
          return da - db;
        });
        break;
      default:
        // 默认排序:个人/车行直发排在系统检索转载之前,各自组内按最新
        sorted.sort((a, b) => {
          const tier = Number(!!a.source_id) - Number(!!b.source_id);
          if (tier !== 0) return tier;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }
    return sorted;
  }, [cars, filters, sort, distances, userCoords, insightMap, fetchedAt]);

  // 筛选/排序变化时回到第一批
  useEffect(() => {
    setVisibleCount(24);
  }, [filters, sort]);

  // 触底加载下一批
  useEffect(() => {
    const el = resultsSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => (c < filtered.length ? c + 24 : c));
        }
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  return (
    <PullToRefresh onRefresh={fetchCars}>
    <div
    className="flex min-h-screen flex-col bg-background font-mono"
    style={{
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}
    >
      <Header />

      {/* Banner */}
      <div className="hidden border-b border-border bg-gradient-to-r from-foreground/[0.03] to-foreground/[0.06] sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
              <p className="font-mono text-sm font-semibold">常来车网</p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              北美华人最信赖的二手车交易平台 · 免费发布 · 中文服务
            </p>
          </div>
          <Link href="/post">
            <Button size="sm" className="font-mono text-xs">
              免费发布车辆
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile: search bar + filter button — sticky */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
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
                  <Input
                    autoFocus
                    placeholder="搜索品牌、车型..."
                    className="px-9 font-mono text-sm"
                    value={filters.keyword}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(e) => {
                      const next = { ...filters, keyword: e.target.value };
                      setFilters(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filters.keyword.trim()) {
                        addSearchHistory(filters.keyword.trim());
                        setSearchHistory(getSearchHistory());
                        setSearchFocused(false);
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
                    aria-label="关闭搜索"
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
                  className="flex h-9 w-full items-center gap-2 rounded-[0.3rem] border border-input bg-transparent px-3 text-left"
                >
                  <motion.span layoutId="browse-search-icon" className="flex shrink-0">
                    <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </motion.span>
                  <span className={`truncate font-mono text-sm ${filters.keyword ? "text-foreground" : "text-muted-foreground/70"}`}>
                    {filters.keyword || "搜索品牌、车型..."}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
            {/* Search history dropdown */}
            {mobileSearchOpen && searchFocused && !filters.keyword && searchHistory.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-md">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">搜索历史</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearSearchHistory();
                      setSearchHistory([]);
                    }}
                    className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} />
                    清除
                  </button>
                </div>
                {searchHistory.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setFilters({ ...filters, keyword: term });
                      setSearchFocused(false);
                    }}
                  >
                    <Clock className="h-3 w-3" strokeWidth={1.5} />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative gap-1 font-mono text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                筛选
                {activeFilterChips.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[10px] text-background">
                    {activeFilterChips.length}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <DrawerClose asChild>
                  <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </DrawerClose>
                <span className="font-mono text-sm font-semibold">筛选</span>
                <div className="h-8 w-8" />
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
              <Button
                variant="outline"
                size="sm"
                className="gap-1 font-mono text-xs"
              >
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                {SORT_OPTIONS.find((o) => o.value === sort)?.label || "排序"}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <DrawerClose asChild>
                  <button type="button" className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </DrawerClose>
                <span className="font-mono text-sm font-semibold">排序方式</span>
                <div className="h-8 w-8" />
              </div>
              <div className="px-4 pb-6">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-3 font-mono text-sm transition-colors ${sort === opt.value ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
                    onClick={() => setSort(opt.value)}
                  >
                    {opt.label}
                    {sort === opt.value && (
                      <span className="text-foreground">✓</span>
                    )}
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
                className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] transition-colors hover:bg-muted"
              >
                {chip.label}
                <X className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={2} />
              </button>
            ))}
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2} />
              清空所有
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 2xl:max-w-[88rem]">
        {/* Left sidebar filters — desktop only */}
        <div className="hidden w-[240px] shrink-0 md:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto overscroll-contain pr-1">
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
          <div className="mb-4 md:sticky md:top-14 md:z-20 md:-mx-1 md:bg-background/90 md:px-1 md:pb-2 md:pt-1 md:backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-baseline gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>Results:</span>
                <span className="font-semibold tracking-normal text-foreground">
                  共 {filtered.length} 辆
                </span>
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    if (!searchSaved) saveSearch(savedSearchParams);
                  }}
                  disabled={searchSaved}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[11px] transition-colors ${
                    searchSaved
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <Bookmark
                    className={`h-3 w-3 ${searchSaved ? "fill-current" : ""}`}
                    strokeWidth={1.5}
                  />
                  {searchSaved ? "已保存" : "保存搜索"}
                </button>
              )}
              {/* Desktop sort */}
              <div className="ml-auto hidden items-center gap-2 md:flex">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Sort
                </span>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-8 w-[130px] font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Desktop active filter chips */}
            {activeFilterChips.length > 0 && (
              <div className="mt-2 hidden flex-wrap gap-1.5 md:flex">
                {activeFilterChips.map((chip, i) => (
                  <button
                    key={`${chip.key}-${i}`}
                    onClick={() => clearFilter(chip.key)}
                    className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] transition-colors hover:bg-muted"
                  >
                    {chip.label}
                    <X className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={2} />
                  </button>
                ))}
                <button
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2} />
                  清空
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
              className="flex flex-col items-center justify-center py-24"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                Loading
              </p>
            </motion.div>
          ) : filtered.length > 0 ? (
            <>
            {/* 瀑布流:显式列分发(与社区一致)。按全局序号 i%列数 分列,
                加载更多时已有卡片不会换列,避免重排。 */}
            <div className="flex items-start gap-3 md:gap-4">
              {Array.from({ length: columnCount }, (_, ci) => (
                <div key={ci} className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
                  {filtered
                    .slice(0, visibleCount)
                    .filter((_, i) => i % columnCount === ci)
                    .map((car) => (
                      <Reveal key={car.id}>
                        <CarCard
                          car={car}
                          distance={distances.get(car.id)}
                          priceInsight={insightMap.get(car.id) ?? null}
                        />
                      </Reveal>
                    ))}
                </div>
              ))}
            </div>
            {/* 无限滚动哨兵 */}
            <div ref={resultsSentinelRef} className="h-px" aria-hidden="true" />
            {visibleCount < filtered.length && (
              <p className="py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                Showing {Math.min(visibleCount, filtered.length)} / {filtered.length}
              </p>
            )}
            </>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16">
              <Car className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                No Results
              </p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                没有找到符合条件的车辆
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                >
                  清除所有筛选
                </Button>
                {filters.maxPrice && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs text-muted-foreground"
                    onClick={() => setFilters({ ...filters, maxPrice: "" })}
                  >
                    去掉价格上限
                  </Button>
                )}
                {filters.maxDistance && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs text-muted-foreground"
                    onClick={() => setFilters({ ...filters, maxDistance: "" })}
                  >
                    扩大搜索范围
                  </Button>
                )}
              </div>
            </div>
          )}

          {recentCars.length > 0 && (
            <section
              className="mt-10 border-t border-border pt-6"
            >
              <h2 className="font-mono text-sm font-semibold">最近浏览</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {recentCars.map((car) => (
                  <CarCard
                    key={"recent-" + car.id}
                    car={car}
                    distance={distances.get(car.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <Footer />
      <BackToTop />
    </div>
    </PullToRefresh>
  );
}
