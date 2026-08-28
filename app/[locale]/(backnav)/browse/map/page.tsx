"use client";

// 地图找车:类苹果「查找」的全屏地图页。
// 与 /browse 共用同一套筛选参数(lib/car-filters);车源/店铺按当前视口
// 检索(相机停稳 → 防抖查询该范围,不整表全拉);
// iOS 原生壳走 MapKit(behind 模式),其余平台走 leaflet。

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import nextDynamic from "next/dynamic";
import Link from "@/components/localized-navigation";
import { useSearchParams } from "next/navigation";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  ArrowUpDown,
  List,
  Loader2,
  LocateFixed,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { readDualCache, writeDualCache } from "@/lib/session-cache";
import type { DbCar } from "@/lib/types";
import {
  applyCarFilters,
  buildDistances,
  filtersFromParams,
  filtersToQuery,
  sortCars,
  INITIAL_FILTERS,
  SORT_OPTIONS,
  type Filters,
  type SortKey,
} from "@/lib/car-filters";
import { getUserCoords } from "@/lib/geocode";
import { Header } from "@/components/header";
import { CarCard } from "@/components/car-card";
import { useCarOverlay } from "@/components/car-overlay-provider";
import { MobileFilterDrawer } from "@/components/mobile-filters";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppMapMarker, AppMapRegion } from "@/components/app-map";

// leaflet 不能 SSR,按需加载
const AppMap = nextDynamic(
  () => import("@/components/app-map").then((m) => m.AppMap),
  { ssr: false }
);

// 视口检索:相机停稳后等 1s 再查(期间再动就重置计时),限量防止大视野拉爆
const REGION_DEBOUNCE_MS = 1000;
// 移动不足视口跨度此比例(且缩放几乎没变)视为「动了一点点」,不重新检索
const REGION_MIN_MOVE_FRAC = 0.1;
const VIEWPORT_CAR_LIMIT = 300;
const VIEWPORT_STORE_LIMIT = 100;

// 没有定位权限时的兜底初始视野:北美大陆
const FALLBACK_CAMERA = { lat: 39.8, lng: -98.6, zoom: 4 };

// 地图上的店铺(车行 + 转载系统收录的店铺,都在 dealer_stores)
interface MapStore {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  store_photos: string[];
  /** owner 头像(店铺无照片时的标记图兜底;单独批量查,owner_id 无 profiles 外键不能内嵌) */
  avatar_url?: string | null;
  /** 在售车图片(标注下方预览条,最多 3 张)与在售总数 */
  carImages?: string[];
  carCount?: number;
}

// 上次视口检索结果双层缓存(社区/车源列表同款):sessionStorage 会话内秒开,
// localStorage 冷启动兜底;先展示旧结果,相机停稳后照常按视口刷新
const MAP_CACHE_KEY = "clc_browse_map_v1";
interface MapCache {
  cars: DbCar[];
  stores: MapStore[];
}

// 绘制前还原缓存(社区同款):useEffect 在首帧后才跑会闪一下加载态
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// 底部结果面板的三档吸附高度(可见比例):收起 / 半屏 / 全屏
const SNAPS = [0.1, 0.6, 0.9];
// 收起档内容最低可见高度(px):保证 搜索框 + 筛选/排序行 露出
const COLLAPSED_MIN_PX = 132;
// 浮岛态底部间隙(px,另加底部安全区)
const FLOAT_GAP = 16;
// iOS 底部安全区(home indicator)高度,挂载时用 env() 探针量出
let SAFE_BOTTOM = 0;
const snapVisible = (i: number, h: number) =>
  Math.max(
    h * SNAPS[i],
    i === 0 ? COLLAPSED_MIN_PX + FLOAT_GAP + SAFE_BOTTOM : 0
  );

// 价格胶囊短格式:$8,500 → $8.5k / $23,900 → $24k / 0 → 面议
function pillPrice(price: number): string {
  if (price <= 0) return "面议";
  if (price < 1000) return `$${price}`;
  const k = price / 1000;
  return `$${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
}

// 同一坐标(zip 质心)会叠很多车:按坐标分组,一组一个标记
function groupKey(car: DbCar): string {
  return `${car.lat!.toFixed(4)},${car.lng!.toFixed(4)}`;
}

function BrowseMapContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { enabled: overlayEnabled, openUser } = useCarOverlay();

  const [cars, setCars] = useState<DbCar[]>([]);
  const [stores, setStores] = useState<MapStore[]>([]);
  const [loading, setLoading] = useState(true);
  // 视口检索进行中(地图顶部小指示条)
  const [fetching, setFetching] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [filters, setFiltersRaw] = useState<Filters>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString()))
  );
  const [sort, setSort] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) || "newest"
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  // 选中的坐标组(点标记 → 单组;原生聚簇点开 → 多组)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // 选中的店铺(与坐标组选中互斥)+ 该店在售车(单独按 seller 查,不受视口限制)
  const [selectedStore, setSelectedStore] = useState<MapStore | null>(null);
  const [storeCars, setStoreCars] = useState<DbCar[] | null>(null);
  const [camera, setCamera] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // URL → 筛选状态(浏览器前进后退/外部带参进入)
  useEffect(() => {
    setFiltersRaw(filtersFromParams(new URLSearchParams(searchParams.toString())));
    setSort((searchParams.get("sort") as SortKey) || "newest");
  }, [searchParams]);

  // 地图位置/缩放持久化到 URL(pos=lat,lng,zoom):刷新/分享/返回都能还原视野
  const posRef = useRef<string | null>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("pos")
      : null
  );

  function urlWithState(f: Filters, s: SortKey): string {
    const parts = [
      filtersToQuery(f, s),
      posRef.current ? `pos=${posRef.current}` : "",
    ]
      .filter(Boolean)
      .join("&");
    return parts ? `/browse/map?${parts}` : "/browse/map";
  }

  function setFilters(next: Filters) {
    // 换品牌时清掉车型(与 /browse 同规则)
    const f = next.make !== filters.make ? { ...next, model: "" } : next;
    setFiltersRaw(f);
    clearSelection();
    window.history.replaceState(window.history.state, "", urlWithState(f, sort));
  }

  // 初始相机:URL 里带 pos 就还原该视野;否则定位到用户附近,拿不到定位
  // 落在兜底视野。相机一动就会触发 regionChange → 视口检索。
  useEffect(() => {
    const pos = posRef.current?.split(",").map(Number) ?? [];
    if (pos.length === 3 && pos.every((n) => Number.isFinite(n))) {
      setCamera({ lat: pos[0], lng: pos[1], zoom: pos[2] });
      getUserCoords().then((c) => c && setUserCoords(c));
      return;
    }
    getUserCoords().then((c) => {
      if (c) {
        setUserCoords(c);
        setCamera({ lat: c.lat, lng: c.lng, zoom: 10 });
      } else {
        setCamera(FALLBACK_CAMERA);
      }
    });
  }, []);

  // 绘制前还原上次视口结果(双层缓存,社区同款):先秒开旧数据顶住加载态,
  // 相机停稳后的视口检索会照常覆盖(相当于「先展示、后台刷新」)
  useIsoLayoutEffect(() => {
    const hit = readDualCache<MapCache>(MAP_CACHE_KEY);
    if (hit && (hit.data.cars.length > 0 || hit.data.stores.length > 0)) {
      setCars(hit.data.cars);
      setStores(hit.data.stores);
      setFetchedAt(hit.at);
      setLoading(false);
    }
  }, []);

  // 视口检索:相机停稳(regionChange)→ 防抖 → 查询该范围内的车源与店铺;
  // 用序号丢弃过期响应(快速连续拖动时只认最后一次)
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeq = useRef(0);

  async function fetchViewport(r: AppMapRegion) {
    const seq = ++fetchSeq.current;
    setFetching(true);
    const [carsRes, storesRes] = await Promise.all([
      supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type, avatar_url)")
        .eq("status", "active")
        .eq("owner_hidden", false)
        .gte("lat", r.south)
        .lte("lat", r.north)
        .gte("lng", r.west)
        .lte("lng", r.east)
        .order("created_at", { ascending: false })
        .limit(VIEWPORT_CAR_LIMIT),
      supabase
        .from("dealer_stores")
        .select("id, owner_id, name, address, lat, lng, store_photos")
        .not("lat", "is", null)
        .gte("lat", r.south)
        .lte("lat", r.north)
        .gte("lng", r.west)
        .lte("lng", r.east)
        .limit(VIEWPORT_STORE_LIMIT),
    ]);
    if (seq !== fetchSeq.current) return;
    let nextStores = (storesRes.data as MapStore[]) || [];
    // 只显示有在售车的店铺,并收集每店最新 3 张车图 + 在售数(标注预览条用)
    if (nextStores.length > 0) {
      const ownerIds = [...new Set(nextStores.map((s) => s.owner_id))];
      const { data: sellerRows } = await supabase
        .from("cars")
        .select("seller_id, image_url, images")
        .eq("status", "active")
        .eq("owner_hidden", false)
        .in("seller_id", ownerIds)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (seq !== fetchSeq.current) return;
      const byOwner = new Map<string, { images: string[]; count: number }>();
      for (const row of (sellerRows as Pick<DbCar, "seller_id" | "image_url" | "images">[]) || []) {
        const entry = byOwner.get(row.seller_id) ?? { images: [], count: 0 };
        entry.count += 1;
        const img = row.image_url || row.images?.[0];
        if (img && entry.images.length < 3) entry.images.push(img);
        byOwner.set(row.seller_id, entry);
      }
      nextStores = nextStores
        .filter((s) => byOwner.has(s.owner_id))
        .map((s) => ({
          ...s,
          carImages: byOwner.get(s.owner_id)!.images,
          carCount: byOwner.get(s.owner_id)!.count,
        }));
    }
    // 没有店铺照片的补 owner 头像作标记图
    const needAvatar = [
      ...new Set(
        nextStores.filter((s) => !s.store_photos?.[0]).map((s) => s.owner_id)
      ),
    ];
    if (needAvatar.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", needAvatar);
      if (seq !== fetchSeq.current) return;
      const avatars = new Map(
        ((profs as { id: string; avatar_url: string | null }[]) || []).map(
          (p) => [p.id, p.avatar_url]
        )
      );
      nextStores = nextStores.map((s) =>
        s.store_photos?.[0]
          ? s
          : { ...s, avatar_url: avatars.get(s.owner_id) ?? null }
      );
    }
    const nextCars = (carsRes.data as DbCar[]) || [];
    setCars(nextCars);
    setStores(nextStores);
    setLoading(false);
    setFetching(false);
    setFetchedAt(Date.now());
    if (nextCars.length > 0 || nextStores.length > 0) {
      writeDualCache<MapCache>(MAP_CACHE_KEY, { cars: nextCars, stores: nextStores });
    }
  }

  // 最近一次停稳的视口(相机跟随档位平移、目标点偏移居中都要用)
  const lastRegionRef = useRef<AppMapRegion | null>(null);
  // 最近一次真正发起检索的视口(判断「动了一点点」用)
  const lastFetchedRef = useRef<AppMapRegion | null>(null);

  function handleRegionChange(r: AppMapRegion) {
    lastRegionRef.current = r;
    // 相机停稳即把中心点/缩放写回 URL(replaceState 不压历史)
    const lat = (r.north + r.south) / 2;
    const lng = (r.east + r.west) / 2;
    posRef.current = `${lat.toFixed(5)},${lng.toFixed(5)},${Math.round(r.zoom * 10) / 10}`;
    window.history.replaceState(window.history.state, "", urlWithState(filters, sort));

    // 「动了一点点」不算:相对上次检索,中心位移不足视口跨度 10% 且缩放
    // 几乎没变 → 不重新检索(已有的待触发计时也取消)
    const prev = lastFetchedRef.current;
    if (prev) {
      const dLat = Math.abs(lat - (prev.north + prev.south) / 2);
      const dLng = Math.abs(lng - (prev.east + prev.west) / 2);
      const minor =
        dLat < (r.north - r.south) * REGION_MIN_MOVE_FRAC &&
        dLng < (r.east - r.west) * REGION_MIN_MOVE_FRAC &&
        Math.abs(r.zoom - prev.zoom) < 0.2;
      if (minor) {
        if (regionTimer.current) clearTimeout(regionTimer.current);
        return;
      }
    }

    // 停稳后等 1s 再查;期间再动会走到这里重置计时
    if (regionTimer.current) clearTimeout(regionTimer.current);
    // 触发时再裁剪:用查询发出那一刻的档位(拖面板期间相机不动,档位可能变)
    regionTimer.current = setTimeout(() => {
      lastFetchedRef.current = r;
      fetchViewport(visibleRegion(r));
    }, REGION_DEBOUNCE_MS);
  }

  // web mercator:当前缩放下每 CSS px 对应的纬度跨度
  function latPerPx(zoom: number, atLat: number): number {
    return (360 / (256 * Math.pow(2, zoom))) * Math.cos((atLat * Math.PI) / 180);
  }

  // 面板对地图的「有效遮挡高度」:0.9 全屏档按 0.6 计——展开只是看列表,
  // 检索范围/相机偏移保持半屏时的口径,不会缩成一条细缝
  function effectiveSheetH(h: number): number {
    return Math.min(snapVisible(snapIdxRef.current, h), h * SNAPS[1]);
  }

  // 视口 bbox 裁掉被面板盖住的下半部分:检索/列表只覆盖真正看得见的区域
  function visibleRegion(r: AppMapRegion): AppMapRegion {
    const h = mainHRef.current;
    if (!h || !overlayEnabled) return r;
    const frac = effectiveSheetH(h) / h;
    return { ...r, south: r.south + (r.north - r.south) * frac };
  }

  // 让目标点落在「未被面板遮挡区域」的视觉中心:
  // 面板盖住底部 sheetH px → 可见区中心比地图几何中心高 sheetH/2,
  // 相机中心相应向南偏移(仅移动端;桌面左栏不遮地图)
  function cameraFor(lat: number, lng: number, zoom?: number) {
    const h = mainHRef.current;
    const z = zoom ?? lastRegionRef.current?.zoom ?? 12;
    if (!h || !overlayEnabled) return { lat, lng, zoom };
    const offsetPx = effectiveSheetH(h) / 2;
    return { lat: lat - offsetPx * latPerPx(z, lat), lng, zoom };
  }

  useEffect(() => {
    return () => {
      if (regionTimer.current) clearTimeout(regionTimer.current);
    };
  }, []);

  const distances = useMemo(
    () => buildDistances(cars, userCoords),
    [cars, userCoords]
  );

  const filtered = useMemo(() => {
    const { cars: result, forcedDistanceSort } = applyCarFilters(cars, filters, {
      userCoords,
      distances,
      fetchedAt,
    });
    return sortCars(result, forcedDistanceSort ? "distance" : sort, distances);
  }, [cars, filters, userCoords, distances, fetchedAt, sort]);

  // 坐标分组 → 地图标记
  const groups = useMemo(() => {
    const map = new Map<string, DbCar[]>();
    for (const car of filtered) {
      if (car.lat == null || car.lng == null) continue;
      const key = groupKey(car);
      const list = map.get(key);
      if (list) list.push(car);
      else map.set(key, [car]);
    }
    return map;
  }, [filtered]);

  const markers = useMemo<AppMapMarker[]>(() => {
    const carMarkers: AppMapMarker[] = [...groups.entries()].map(
      ([key, group]) => ({
        id: key,
        lat: group[0].lat!,
        lng: group[0].lng!,
        label:
          group.length === 1 ? t(pillPrice(group[0].price)) : t("{n} 辆", { n: group.length }),
        image: group[0].image_url || group[0].images?.[0] || undefined,
        selected: selectedKeys.includes(key),
      })
    );
    // 店铺(车行 + 系统收录):图 = 店铺照片,退头像
    const storeMarkers: AppMapMarker[] = stores.map((s) => ({
      id: `store:${s.id}`,
      lat: s.lat,
      lng: s.lng,
      label: s.name,
      image: s.store_photos?.[0] || s.avatar_url || undefined,
      kind: "store" as const,
      previewImages: s.carImages,
      previewCount: s.carCount,
      selected: selectedStore?.id === s.id,
    }));
    return [...carMarkers, ...storeMarkers];
  }, [groups, selectedKeys, stores, selectedStore, t]);

  // 面板展示的车:选中店铺 → 该店在售;选中坐标组 → 该位置;否则视口内全部
  const shownCars = useMemo(() => {
    if (selectedStore) return storeCars ?? [];
    if (selectedKeys.length === 0) return filtered;
    const set = new Set(selectedKeys);
    return filtered.filter(
      (c) => c.lat != null && c.lng != null && set.has(groupKey(c))
    );
  }, [filtered, selectedKeys, selectedStore, storeCars]);

  // 筛选抽屉的角标数(maxDistance 默认 "50" 不算激活)
  const activeCount = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(INITIAL_FILTERS) as (keyof Filters)[]) {
      if (k === "maxDistance") {
        if (filters[k] && filters[k] !== "50") n++;
      } else if (filters[k]) {
        n++;
      }
    }
    return n;
  }, [filters]);

  // 车型/配置选项(与 /browse 同逻辑,供筛选抽屉)
  const modelOptions = useMemo(() => {
    const makes = filters.make.split(",").map((m) => m.trim()).filter(Boolean);
    if (makes.length !== 1) return [];
    const counts = new Map<string, { name: string; count: number }>();
    for (const car of cars) {
      if (car.make !== makes[0]) continue;
      const name = (car.model || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { name, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [cars, filters.make]);

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

  // ---------- 底部结果面板(拖拽 + 三档吸附) ----------

  const mainRef = useRef<HTMLDivElement>(null);
  const [mainH, setMainH] = useState(0);
  const mainHRef = useRef(0);
  // 默认收起档(0.1):进页面先看地图
  const snapIdxRef = useRef(0);
  // 首帧尚未量出容器高度,先把面板放到屏幕外避免闪现
  const y = useMotionValue(10000);
  const dragControls = useDragControls();

  const yFor = (i: number, h: number) => h - snapVisible(i, h);

  // 三段式面板样式:0.2–0.6 档为「浮岛」(四角圆角 + 16px 边距 + 半透明 blur),
  // 0.6 → 0.9 之间渐变为贴边卡片(现有样式)。floatP: 0 = 浮岛, 1 = 贴边。
  const floatP = useTransform(y, (v) => {
    const h = mainHRef.current;
    if (!h) return 1;
    const yMid = h * (1 - SNAPS[1]);
    const yTop = h * (1 - SNAPS[2]);
    return Math.min(1, Math.max(0, (yMid - v) / Math.max(1, yMid - yTop)));
  });
  const cardMx = useTransform(floatP, (p) => 16 * (1 - p));
  const cardBottomRadius = useTransform(floatP, (p) => 28 * (1 - p));
  const cardBg = useTransform(
    floatP,
    (p) => `color-mix(in srgb, var(--card) ${Math.round(75 + 25 * p)}%, transparent)`
  );
  const cardBlur = useTransform(floatP, (p) => (p >= 0.99 ? "none" : "blur(20px)"));
  // 浮岛态底部留 间隙 + 安全区(悬浮在 home indicator 之上),贴边态占满
  const cardHeight = useTransform(y, (v) => {
    const h = mainHRef.current;
    if (!h) return "100%";
    const yMid = h * (1 - SNAPS[1]);
    const yTop = h * (1 - SNAPS[2]);
    const p = Math.min(1, Math.max(0, (yMid - v) / Math.max(1, yMid - yTop)));
    return Math.max(0, h - v - (FLOAT_GAP + SAFE_BOTTOM) * (1 - p));
  });
  // 0.2 档只露搜索框:标题行/店铺信息/列表在 0.2 → 0.6 之间淡入
  const contentOpacity = useTransform(y, (v) => {
    const h = mainHRef.current;
    if (!h) return 1;
    const yLow = h - snapVisible(0, h);
    const yMid = h * (1 - SNAPS[1]);
    return Math.min(1, Math.max(0, (yLow - v) / Math.max(1, yLow - yMid)));
  });
  const contentPE = useTransform(contentOpacity, (o) =>
    o < 0.5 ? ("none" as const) : ("auto" as const)
  );

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // env() 探针:量出底部安全区高度(档位计算/浮岛间隙都要用)
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;bottom:0;width:0;pointer-events:none;visibility:hidden;height:env(safe-area-inset-bottom,0px)";
    document.body.appendChild(probe);
    SAFE_BOTTOM = probe.getBoundingClientRect().height;
    probe.remove();
    const measure = () => {
      const h = el.clientHeight;
      setMainH(h);
      mainHRef.current = h;
      // 尺寸变化时保持当前吸附档位
      y.set(yFor(snapIdxRef.current, h));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snapTo(i: number) {
    const prev = snapIdxRef.current;
    snapIdxRef.current = i;
    animate(y, yFor(i, mainRef.current?.clientHeight || mainH), {
      type: "spring",
      damping: 32,
      stiffness: 340,
    });
    // 地图中心随档位切换:面板升降时相机平移半个高度差,
    // 保持当前关注区域落在可见区中心(类苹果地图抬 sheet 推地图)
    const r = lastRegionRef.current;
    const h = mainHRef.current;
    if (i !== prev && r && h && overlayEnabled) {
      const cap = h * SNAPS[1];
      const deltaPx =
        (Math.min(snapVisible(i, h), cap) - Math.min(snapVisible(prev, h), cap)) / 2;
      if (Math.abs(deltaPx) > 8) {
        const centerLat = (r.north + r.south) / 2;
        const centerLng = (r.east + r.west) / 2;
        setCamera({
          lat: centerLat - deltaPx * latPerPx(r.zoom, centerLat),
          lng: centerLng,
          zoom: r.zoom,
        });
      }
    }
  }

  // 按投影位置(当前 + 惯性,vy 单位 px/s)选最近档位吸附
  function settle(vy: number) {
    const h = mainRef.current?.clientHeight || mainH;
    if (!h) return;
    const projected = y.get() + vy * 0.15;
    let best = 0;
    let bestDist = Infinity;
    SNAPS.forEach((_, i) => {
      const d = Math.abs(projected - yFor(i, h));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    snapTo(best);
  }
  const settleRef = useRef(settle);
  settleRef.current = settle;

  function onDragEnd(_: unknown, info: { velocity: { y: number } }) {
    settle(info.velocity.y);
  }

  // 结果列表的触摸仲裁:列表已滚到顶再往下拉 / 滚到底再往上拉 → 拖动面板;
  // 其余情况正常滚动列表。手动驱动 y,松手按同一套投影逻辑吸附。
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let mode: "idle" | "scroll" | "sheet" = "idle";
    let startY = 0;
    let yStart = 0;
    let lastY = 0;
    let lastT = 0;
    let prevY = 0;
    let prevT = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      // 抽屉/浮层打开期间(如用户正在滑动 vaul 抽屉),面板完全不接管手势
      if (document.querySelector("[data-vaul-drawer], [data-app-overlay]")) {
        mode = "scroll";
        return;
      }
      const t = e.touches[0];
      mode = "idle";
      startY = lastY = prevY = t.clientY;
      lastT = prevT = e.timeStamp;
      yStart = y.get();
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (mode === "idle") {
        const dy = t.clientY - startY;
        if (Math.abs(dy) < 6) return;
        // 只有最高档(0.9)才允许滚动列表内容;其余档位任何拖动都归面板
        const h = mainRef.current?.clientHeight || 0;
        const atTopSnap = h > 0 && y.get() <= yFor(SNAPS.length - 1, h) + 2;
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        mode =
          !atTopSnap || (dy > 0 && atTop) || (dy < 0 && atBottom)
            ? "sheet"
            : "scroll";
        if (mode === "sheet") {
          // 从判定点起算,避免面板起步跳 6px
          startY = t.clientY;
          yStart = y.get();
        }
      }
      if (mode !== "sheet") return;
      e.preventDefault();
      prevY = lastY;
      prevT = lastT;
      lastY = t.clientY;
      lastT = e.timeStamp;
      const h = mainRef.current?.clientHeight || 0;
      if (!h) return;
      const top = yFor(SNAPS.length - 1, h);
      const bottom = yFor(0, h);
      y.set(Math.min(bottom, Math.max(top, yStart + (t.clientY - startY))));
    };

    const onEnd = () => {
      if (mode === "sheet") {
        const vy = lastT > prevT ? ((lastY - prevY) / (lastT - prevT)) * 1000 : 0;
        settleRef.current(vy);
        // 拖过面板后吞掉紧随的合成 click,避免误触列表里的卡片
        if (Math.abs(lastY - startY) > 6) {
          const swallow = (ce: Event) => {
            ce.stopPropagation();
            ce.preventDefault();
          };
          el.addEventListener("click", swallow, { capture: true, once: true });
          setTimeout(
            () => el.removeEventListener("click", swallow, { capture: true }),
            400
          );
        }
      }
      mode = "idle";
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSelection() {
    setSelectedKeys([]);
    setSelectedStore(null);
    setStoreCars(null);
  }

  function selectMarkers(keys: string[]) {
    // 店铺标记:面板切换为该店在售车(单独查,不受视口/筛选限制)
    const storeId = keys.find((k) => k.startsWith("store:"))?.slice(6);
    if (storeId) {
      const store = stores.find((s) => s.id === storeId);
      if (!store) return;
      setSelectedKeys([]);
      setSelectedStore(store);
      setStoreCars(null);
      // 先切档再定相机:cameraFor 按新档位偏移,标记落在可见区中心
      if (snapIdxRef.current === 0) snapTo(1);
      setCamera(cameraFor(store.lat, store.lng));
      supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type, avatar_url)")
        .eq("status", "active")
        .eq("owner_hidden", false)
        .eq("seller_id", store.owner_id)
        .order("created_at", { ascending: false })
        .limit(60)
        .then(({ data }) => setStoreCars((data as DbCar[]) || []));
      return;
    }
    setSelectedStore(null);
    setStoreCars(null);
    setSelectedKeys(keys);
    if (keys.length > 0) {
      // 点开标记时把面板抬到半屏,方便看结果;先切档再定相机
      if (snapIdxRef.current === 0) snapTo(1);
      const group = groups.get(keys[0]);
      if (group?.[0]) {
        setCamera(cameraFor(group[0].lat!, group[0].lng!));
      }
    }
  }

  async function locateMe() {
    const c = userCoords || (await getUserCoords());
    if (c) {
      setUserCoords(c);
      setCamera(cameraFor(c.lat, c.lng, 11));
    }
  }

  const listHref = useMemo(() => {
    const qs = filtersToQuery(filters, sort);
    return qs ? `/browse?${qs}` : "/browse";
  }, [filters, sort]);

  // 桌面排序切换(与 setFilters 同规则同步 URL)
  function changeSort(next: SortKey) {
    setSort(next);
    window.history.replaceState(
      window.history.state,
      "",
      urlWithState(filters, next)
    );
  }

  // ---------- 关键词搜索(接入 filters.keyword,拼音匹配走 applyCarFilters) ----------

  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [prevKeyword, setPrevKeyword] = useState(filters.keyword);
  // 外部改动(筛选抽屉清空/URL 变化)时在渲染期同步输入框,不打断正在输入的防抖
  if (filters.keyword !== prevKeyword) {
    setPrevKeyword(filters.keyword);
    setKeywordInput(filters.keyword);
  }
  const keywordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onKeywordChange(v: string) {
    setKeywordInput(v);
    if (keywordTimer.current) clearTimeout(keywordTimer.current);
    keywordTimer.current = setTimeout(() => {
      setFilters({ ...filters, keyword: v });
    }, 300);
  }

  // ---------- 面板内容(移动端底部面板 / 桌面左栏共用) ----------

  const panelTitle = loading ? (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
      {t("加载车源中...")}
    </span>
  ) : selectedStore ? (
    storeCars === null
      ? selectedStore.name
      : `${selectedStore.name} · ${t("{n} 辆在售", { n: storeCars.length })}`
  ) : selectedKeys.length > 0 ? (
    t("该位置 {n} 辆车", { n: shownCars.length })
  ) : (
    t("此区域 {n} 辆车", { n: filtered.length })
  );

  // 搜索框(移动端 sheet 顶部 / 桌面左栏共用):
  // 不拦截 pointerdown——起手在搜索框上也能拖动面板(无位移的点按仍正常聚焦);
  // 聚焦时展开面板方便看结果
  const searchBox = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
      />
      <input
        type="search"
        enterKeyHint="search"
        value={keywordInput}
        onChange={(e) => onKeywordChange(e.target.value)}
        onFocus={() => {
          if (snapIdxRef.current !== SNAPS.length - 1) snapTo(SNAPS.length - 1);
        }}
        placeholder={t("搜索品牌 / 车型 / 关键词")}
        className="h-9 w-full rounded-full bg-muted/50 pl-9 pr-8 font-mono text-[13px] outline-none transition-colors focus:bg-background focus:ring-2 focus:ring-brand-ink/40"
      />
      {keywordInput && (
        <button
          type="button"
          aria-label={t("清空搜索")}
          onClick={() => onKeywordChange("")}
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground"
        >
          <X className="h-3 w-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );

  // 筛选/排序抽屉内容(浮动控件与 sheet 内两处触发共用)
  const filterDrawerContent = (
    <DrawerContent>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <DrawerClose asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </DrawerClose>
        <span className="font-mono text-sm font-semibold">{t("筛选")}</span>
        <div className="h-8 w-8" />
      </div>
      <div className="overflow-y-auto pb-6">
        <MobileFilterDrawer
          filters={filters}
          onFilter={setFilters}
          activeCount={activeCount}
          modelOptions={modelOptions}
          featureOptions={featureOptions}
        />
      </div>
    </DrawerContent>
  );

  const sortDrawerContent = (
    <DrawerContent>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <DrawerClose asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </DrawerClose>
        <span className="font-mono text-sm font-semibold">{t("排序方式")}</span>
        <div className="h-8 w-8" />
      </div>
      <div className="px-4 pb-6">
        {SORT_OPTIONS.map((opt) => (
          <DrawerClose asChild key={opt.value}>
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 font-mono text-sm transition-colors ${
                sort === opt.value ? "bg-primary/30 font-medium text-brand-ink" : "hover:bg-muted/50"
              }`}
              onClick={() => changeSort(opt.value)}
            >
              {t(opt.label)}
              {sort === opt.value && <span className="text-brand-ink">✓</span>}
            </button>
          </DrawerClose>
        ))}
      </div>
    </DrawerContent>
  );

  const selectionActions = (
    <span className="flex shrink-0 items-center gap-3">
      {selectedStore && (
        <Link
          href={`/user/${selectedStore.owner_id}`}
          onClick={(e) => {
            // 手机端在当前页浮层(drawer)打开卖家主页,桌面端正常跳转
            if (overlayEnabled) {
              e.preventDefault();
              openUser(selectedStore.owner_id);
            }
          }}
          className="font-mono text-[11px] font-medium text-brand-ink"
        >
          {t("查看店铺")}
        </Link>
      )}
      {(selectedKeys.length > 0 || selectedStore) && (
        <button
          type="button"
          onClick={clearSelection}
          className="font-mono text-[11px] font-medium text-brand-ink"
        >
          {t("显示全部")}
        </button>
      )}
    </span>
  );

  // 与 /browse 同款卡片瀑布流(显式列分发,更新不换列);手机 1 列,桌面左栏 2 列
  const renderResults = (columns: number) => (
    <>
      {!loading && shownCars.length === 0 && (
        <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
          {selectedStore
            ? storeCars === null
              ? t("加载店铺车源...")
              : t("该店暂无在售车源")
            : t("此区域暂无车源,拖动或缩放地图看看别处")}
        </p>
      )}
      {shownCars.length > 0 && (
        <div className="flex items-start gap-3 px-3 pt-1">
          {Array.from({ length: columns }, (_, ci) => (
            <div key={ci} className="flex min-w-0 flex-1 flex-col gap-3">
              {shownCars
                .filter((_, i) => i % columns === ci)
                .map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    distance={distances.get(car.id)}
                  />
                ))}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="native-map-transparent flex h-[calc(100dvh-41px)] flex-col bg-background font-mono">
      <Header />
      <div className="flex min-h-0 flex-1">
        {/* 桌面左栏(借鉴 /browse):工具栏 + 同款卡片瀑布流;移动端隐藏 */}
        <aside className="hidden w-[400px] shrink-0 flex-col border-r border-border bg-card md:flex xl:w-[460px]">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">
                {panelTitle}
              </p>
              {selectionActions}
            </div>
            {selectedStore && (
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {selectedStore.address}
              </p>
            )}
            <div className="mt-2.5">{searchBox}</div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Sort
              </span>
              <Select value={sort} onValueChange={(v) => changeSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[130px] font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="font-mono text-xs"
                    >
                      {t(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
            {renderResults(2)}
          </div>
        </aside>

        <main ref={mainRef} className="relative min-h-0 flex-1 overflow-hidden">
        {/* 满屏地图 */}
        <AppMap
          markers={markers}
          mode="fullscreen"
          className="absolute inset-0 h-full w-full"
          zoom={12}
          showsUserLocation
          center={camera}
          autoFit={false}
          onMarkerTap={(id) => selectMarkers([id])}
          onClusterTap={(ids) => selectMarkers(ids)}
          onMapTap={clearSelection}
          onRegionChange={handleRegionChange}
        />

        {/* 视口检索中:顶部居中指示条 */}
        {fetching && (
          <div className="pointer-events-none absolute left-1/2 top-3.5 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 font-mono text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
            {t("加载中")}
          </div>
        )}

        {/* 顶部悬浮控件:列表 / 筛选 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
          <Link
            href={listHref}
            data-native-map-ui=""
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-background/95 px-3.5 py-2 font-mono text-xs font-medium shadow-sm backdrop-blur-sm"
          >
            <List className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("列表")}
          </Link>
          <div data-native-map-ui="" className="pointer-events-auto flex flex-col items-end gap-2">
            {/* 桌面筛选入口(手机版筛选/排序在 sheet 搜索框下方) */}
            <Drawer>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="relative hidden items-center gap-1.5 rounded-full bg-background/95 px-3.5 py-2 font-mono text-xs font-medium shadow-sm backdrop-blur-sm md:flex"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t("筛选")}
                  {activeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </button>
              </DrawerTrigger>
              {filterDrawerContent}
            </Drawer>
            <button
              type="button"
              onClick={locateMe}
              aria-label={t("定位到我")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-sm backdrop-blur-sm"
            >
              <LocateFixed className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 底部结果面板(类苹果「查找」:常驻 + 拖拽吸附;桌面用左栏代替) */}
        <motion.div
          data-native-map-ui=""
          className="absolute inset-x-0 top-0 z-30 h-full md:hidden"
          style={{ y, touchAction: "none" }}
          drag="y"
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={
            mainH
              ? { top: yFor(SNAPS.length - 1, mainH), bottom: yFor(0, mainH) }
              : undefined
          }
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={onDragEnd}
        >
          <motion.div
            className="flex flex-col overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
            style={{
              height: cardHeight,
              marginLeft: cardMx,
              marginRight: cardMx,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: cardBottomRadius,
              borderBottomRightRadius: cardBottomRadius,
              backgroundColor: cardBg,
              backdropFilter: cardBlur,
              WebkitBackdropFilter: cardBlur,
            }}
            // 面板任意位置(除滚动列表,由触摸仲裁接管)都可拖动;
            // 抽屉/浮层打开期间不接管,避免用户滑动抽屉时把面板一起带动
            onPointerDown={(e) => {
              const t = e.target as Element;
              if (t.closest("[data-sheet-scroll]")) return;
              if (document.querySelector("[data-vaul-drawer], [data-app-overlay]")) return;
              dragControls.start(e);
            }}
          >
            {/* 手柄/标题区(拖动由卡片根节点统一接管) */}
            <div
              className="shrink-0 cursor-grab select-none px-4 pb-2 pt-3"
              style={{ touchAction: "none" }}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
              <div className="mt-2.5">{searchBox}</div>
              {/* 筛选 / 排序(搜索框下方,收起档也保持可见) */}
              <div className="my-2.5 flex items-center gap-2">
                <Drawer>
                  <DrawerTrigger asChild>
                    <button
                      type="button"
                      className="relative flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 font-mono text-xs font-medium"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("筛选")}
                      {activeCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                          {activeCount}
                        </span>
                      )}
                    </button>
                  </DrawerTrigger>
                  {filterDrawerContent}
                </Drawer>
                <Drawer>
                  <DrawerTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 font-mono text-xs font-medium"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t(SORT_OPTIONS.find((o) => o.value === sort)?.label || "排序")}
                    </button>
                  </DrawerTrigger>
                  {sortDrawerContent}
                </Drawer>
              </div>
              {/* 收起档只露搜索框+筛选行:以下内容淡入 */}
              <motion.div style={{ opacity: contentOpacity, pointerEvents: contentPE }}>
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">
                    {panelTitle}
                  </p>
                  {selectionActions}
                </div>
                {selectedStore && (
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {selectedStore.address}
                  </p>
                )}
              </motion.div>
            </div>

            {/* 结果列表(手机单列):滚动与面板拖动由触摸仲裁切换,仅 0.9 档可滚 */}
            <motion.div
              ref={listRef}
              data-sheet-scroll=""
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
              data-vaul-no-drag=""
              style={{ opacity: contentOpacity, pointerEvents: contentPE }}
            >
              {renderResults(1)}
            </motion.div>
          </motion.div>
        </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function BrowseMapPage() {
  return (
    <Suspense>
      <BrowseMapContent />
    </Suspense>
  );
}
