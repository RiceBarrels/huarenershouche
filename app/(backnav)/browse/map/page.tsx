"use client";

// 地图找车:类苹果「查找」的全屏地图页。
// 与 /browse 共用同一套筛选参数(lib/car-filters)与会话缓存;
// iOS 原生壳走 MapKit(behind 模式),其余平台走 leaflet。

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";
import {
  List,
  Loader2,
  LocateFixed,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { DbCar } from "@/lib/types";
import {
  applyCarFilters,
  buildDistances,
  filtersFromParams,
  filtersToQuery,
  sortCars,
  INITIAL_FILTERS,
  type Filters,
  type SortKey,
} from "@/lib/car-filters";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";
import { formatDistance, getUserCoords } from "@/lib/geocode";
import { formatMileage, formatPrice } from "@/lib/format";
import { carLink } from "@/lib/static-link";
import { Header } from "@/components/header";
import { useCarOverlay } from "@/components/car-overlay-provider";
import { MobileFilterDrawer } from "@/components/mobile-filters";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { AppMapMarker } from "@/components/app-map";

// leaflet 不能 SSR,按需加载
const AppMap = nextDynamic(
  () => import("@/components/app-map").then((m) => m.AppMap),
  { ssr: false }
);

// 与 /browse 共用同一份会话缓存,互相免拉
const BROWSE_CACHE_KEY = "clc_browse_cars_v1";
const BROWSE_CACHE_TTL = 10 * 60 * 1000;

// 底部结果面板的三档吸附高度(可见比例):收起 / 半屏 / 展开
const SNAPS = [0.14, 0.42, 0.85];

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

function CarRow({ car, distance }: { car: DbCar; distance?: number }) {
  const { enabled: overlayEnabled, openCar } = useCarOverlay();
  return (
    <Link
      href={carLink(car.id)}
      onClick={(e) => {
        // 与 /browse 一致:移动端在当前页浮层打开车辆卡片,桌面端正常跳转
        if (overlayEnabled) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openCar(
            car,
            { top: r.top, left: r.left, width: r.width, height: r.height },
            e.currentTarget.outerHTML
          );
        }
      }}
      className="flex gap-3 border-b border-border/60 px-4 py-3 transition-colors active:bg-muted/50"
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        {(car.image_url || car.images?.[0]) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={car.image_url || car.images[0]}
            alt={car.title_zh || car.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[13px] font-medium">
          {car.title_zh || car.title}
        </p>
        <p className="mt-0.5 font-mono text-sm font-bold text-primary">
          {car.price > 0 ? formatPrice(car.price) : "价格面议"}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {car.year} · {formatMileage(car.mileage)}
          {distance != null && ` · ${formatDistance(distance)}`}
        </p>
      </div>
    </Link>
  );
}

function BrowseMapContent() {
  const searchParams = useSearchParams();

  const [cars, setCars] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [camera, setCamera] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // URL → 筛选状态(浏览器前进后退/外部带参进入)
  useEffect(() => {
    setFiltersRaw(filtersFromParams(new URLSearchParams(searchParams.toString())));
    setSort((searchParams.get("sort") as SortKey) || "newest");
  }, [searchParams]);

  function setFilters(next: Filters) {
    // 换品牌时清掉车型(与 /browse 同规则)
    const f = next.make !== filters.make ? { ...next, model: "" } : next;
    setFiltersRaw(f);
    setSelectedKeys([]);
    const qs = filtersToQuery(f, sort);
    window.history.replaceState(
      window.history.state,
      "",
      qs ? `/browse/map?${qs}` : "/browse/map"
    );
  }

  // 车源:与 /browse 完全同源(同查询 + 同会话缓存)
  useEffect(() => {
    async function fetchCars() {
      const { data } = await supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type, avatar_url)")
        .eq("status", "active")
        .eq("owner_hidden", false)
        .order("created_at", { ascending: false });
      const allCars = (data as DbCar[]) || [];
      setCars(allCars);
      setLoading(false);
      setFetchedAt(Date.now());
      if (allCars.length > 0) writeSessionCache(BROWSE_CACHE_KEY, allCars);
    }
    const cached = readSessionCache<DbCar[]>(BROWSE_CACHE_KEY);
    if (cached && cached.data.length > 0) {
      setCars(cached.data);
      setLoading(false);
      setFetchedAt(cached.at);
      if (Date.now() - cached.at > BROWSE_CACHE_TTL) fetchCars();
    } else {
      fetchCars();
    }
    getUserCoords().then((c) => c && setUserCoords(c));
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

  const markers = useMemo<AppMapMarker[]>(
    () =>
      [...groups.entries()].map(([key, group]) => ({
        id: key,
        lat: group[0].lat!,
        lng: group[0].lng!,
        label:
          group.length === 1 ? pillPrice(group[0].price) : `${group.length} 辆`,
        selected: selectedKeys.includes(key),
      })),
    [groups, selectedKeys]
  );

  const noCoordCount = useMemo(
    () => filtered.filter((c) => c.lat == null || c.lng == null).length,
    [filtered]
  );

  // 面板展示的车:有选中就只看选中位置,否则全部筛选结果
  const shownCars = useMemo(() => {
    if (selectedKeys.length === 0) return filtered;
    const set = new Set(selectedKeys);
    return filtered.filter(
      (c) => c.lat != null && c.lng != null && set.has(groupKey(c))
    );
  }, [filtered, selectedKeys]);

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
  const snapIdxRef = useRef(1);
  // 首帧尚未量出容器高度,先把面板放到屏幕外避免闪现
  const y = useMotionValue(10000);
  const dragControls = useDragControls();

  const yFor = (i: number, h: number) => h * (1 - SNAPS[i]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      setMainH(h);
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
    snapIdxRef.current = i;
    animate(y, yFor(i, mainRef.current?.clientHeight || mainH), {
      type: "spring",
      damping: 32,
      stiffness: 340,
    });
  }

  function onDragEnd(_: unknown, info: { velocity: { y: number } }) {
    const h = mainRef.current?.clientHeight || mainH;
    if (!h) return;
    // 按投影位置(当前 + 惯性)选最近档位
    const projected = y.get() + info.velocity.y * 0.15;
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

  function selectMarkers(keys: string[]) {
    setSelectedKeys(keys);
    if (keys.length > 0) {
      const group = groups.get(keys[0]);
      if (group?.[0]) {
        setCamera({ lat: group[0].lat!, lng: group[0].lng! });
      }
      // 点开标记时把面板抬到半屏,方便看结果
      if (snapIdxRef.current === 0) snapTo(1);
    }
  }

  async function locateMe() {
    const c = userCoords || (await getUserCoords());
    if (c) {
      setUserCoords(c);
      setCamera({ lat: c.lat, lng: c.lng, zoom: 11 });
    }
  }

  const listHref = useMemo(() => {
    const qs = filtersToQuery(filters, sort);
    return qs ? `/browse?${qs}` : "/browse";
  }, [filters, sort]);

  return (
    <div className="native-map-transparent flex h-[calc(100dvh-41px)] flex-col bg-background font-mono">
      <Header />
      <main ref={mainRef} className="relative min-h-0 flex-1 overflow-hidden">
        {/* 满屏地图 */}
        <AppMap
          markers={markers}
          mode="fullscreen"
          className="absolute inset-0 h-full w-full"
          zoom={12}
          showsUserLocation
          center={camera}
          onMarkerTap={(id) => selectMarkers([id])}
          onClusterTap={(ids) => selectMarkers(ids)}
          onMapTap={() => setSelectedKeys([])}
        />

        {/* 顶部悬浮控件:列表 / 筛选 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
          <Link
            href={listHref}
            data-native-map-ui=""
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3.5 py-2 font-mono text-xs font-medium shadow-sm backdrop-blur-sm"
          >
            <List className="h-3.5 w-3.5" strokeWidth={1.5} />
            列表
          </Link>
          <div data-native-map-ui="" className="pointer-events-auto flex flex-col items-end gap-2">
            <Drawer>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="relative flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3.5 py-2 font-mono text-xs font-medium shadow-sm backdrop-blur-sm"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                  筛选
                  {activeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </button>
              </DrawerTrigger>
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
                  <span className="font-mono text-sm font-semibold">筛选</span>
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
            </Drawer>
            <button
              type="button"
              onClick={locateMe}
              aria-label="定位到我"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm backdrop-blur-sm"
            >
              <LocateFixed className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 底部结果面板(类苹果「查找」:常驻 + 拖拽吸附) */}
        <motion.div
          data-native-map-ui=""
          className="absolute inset-x-0 top-0 z-30 h-full"
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
          <div className="flex h-full flex-col overflow-hidden rounded-t-[20px] border border-b-0 border-border bg-card shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            {/* 拖拽手柄区(仅此处可拖动面板,列表区自由滚动) */}
            <div
              className="shrink-0 cursor-grab select-none px-4 pb-2 pt-3"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
              <div className="mt-2.5 flex items-center justify-between">
                <p className="font-mono text-sm font-semibold">
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      加载车源中...
                    </span>
                  ) : selectedKeys.length > 0 ? (
                    `该位置 ${shownCars.length} 辆车`
                  ) : (
                    `${filtered.length} 辆车`
                  )}
                </p>
                {selectedKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKeys([])}
                    className="font-mono text-[11px] font-medium text-primary"
                  >
                    显示全部
                  </button>
                )}
              </div>
              {!loading && noCoordCount > 0 && selectedKeys.length === 0 && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {noCoordCount} 辆缺少位置信息,未显示在地图上
                </p>
              )}
            </div>

            {/* 结果列表 */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
              data-vaul-no-drag=""
            >
              {!loading && shownCars.length === 0 && (
                <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                  没有符合条件的车源,试试放宽筛选
                </p>
              )}
              {shownCars.map((car) => (
                <CarRow key={car.id} car={car} distance={distances.get(car.id)} />
              ))}
            </div>
          </div>
        </motion.div>
      </main>
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
