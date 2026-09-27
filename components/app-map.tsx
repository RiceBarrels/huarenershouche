"use client";

// 平台感知的统一地图组件:
// - iOS 原生壳(NativeMap 插件可用)→ MapKit 原生视图(overlay/behind 模式)
// - 其他环境 → leaflet + CARTO 瓦片(沿用 StoreMap 的实现并扩展)

import { useEffect, useRef, useState } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import {
  NativeMap,
  nativeMapAvailable,
  type NativeMapFrame,
  type NativeMapMarker,
} from "@/lib/native-map";

export interface AppMapMarker {
  id: string;
  lat: number;
  lng: number;
  /** 原生 callout 标题 / leaflet 弹窗首行 */
  name?: string;
  /** 原生 callout 副标题 / leaflet 弹窗次行 */
  address?: string;
  /** 价格胶囊文本(如 "$1.2万");存在时渲染胶囊标注而非默认图钉 */
  label?: string;
  /** 胶囊内圆形缩略图 URL(车图/店铺照片) */
  image?: string;
  /** store = 店铺标记:不参与聚簇,文字用前景色(默认 car) */
  kind?: "car" | "store";
  /** 店铺胶囊下方的在售车图片条(最多 3 张) */
  previewImages?: string[];
  /** 在售总数(超出 3 张时最后一张叠 N+) */
  previewCount?: number;
  selected?: boolean;
}

/** 视口范围(regionChange 上报,视口检索用) */
export interface AppMapRegion {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

// ---------- leaflet 侧素材(沿用 StoreMap) ----------

// Custom minimal marker using inline SVG data URI — 品牌绿图钉,深浅色通用
// viewBox 四周留 2px 余量,避免描边超出画布被裁切
function createMarkerIcon() {
  const fill = "%2389fcd2";
  const stroke = "%23ffffff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 2C8.27 2 2 8.27 2 16c0 10.5 14 22 14 22s14-11.5 14-22C30 8.27 23.73 2 16 2z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="${stroke}"/></svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

// 价格胶囊标注(divIcon):锚点为 [0,0],整体 translate(-50%,-50%) 居中;
// 店铺胶囊下方挂在售车图片条(最多 3 张,多余的最后一张叠 N+)
function createPillIcon(m: AppMapMarker) {
  const cls = [
    "car-pill",
    m.selected ? "car-pill--selected" : "",
    m.kind === "store" ? "car-pill--store" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const img = m.image
    ? `<img class="car-pill__img" src="${escapeHtml(m.image)}" alt="" loading="lazy" />`
    : "";
  const pill = `<div class="${cls}">${img}<span class="car-pill__text">${escapeHtml(m.label ?? "")}</span></div>`;

  const previews = m.kind === "store" ? (m.previewImages ?? []).slice(0, 3) : [];
  let strip = "";
  if (previews.length > 0) {
    const more = (m.previewCount ?? previews.length) - previews.length;
    strip = `<div class="car-pill-strip">${previews
      .map((url, i) => {
        const overlay =
          i === previews.length - 1 && more > 0
            ? `<span class="car-pill-strip__more">${more}+</span>`
            : "";
        return `<span class="car-pill-strip__item"><img src="${escapeHtml(url)}" alt="" loading="lazy" />${overlay}</span>`;
      })
      .join("")}</div>`;
  }

  return L.divIcon({
    className: "car-pill-anchor",
    html: `<div class="car-pill-wrap">${pill}${strip}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Tile layers
// 浅色/深色均走矢量底图(OpenFreeMap + 自托管 ZCOOL 字形,标注用品牌字体);
// 矢量加载失败(无 WebGL 等)时回退 OSM 标准栅格瓦片,深色靠 CSS 反色。
// (CARTO basemaps 已改为需 API key,不再使用)
const RASTER_FALLBACK = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
};

const VECTOR_STYLE_URL = {
  light: "/map-styles/clc-light.json",
  dark: "/map-styles/clc-dark.json",
};
const VECTOR_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org/copyright">OSM</a>';

// 矢量品牌底图:动态加载 maplibre(体积大,按需),样式里的 __ORIGIN__
// 替换为当前源(字形 PBF 自托管于 public/map-glyphs)
async function createVectorLayer(dark: boolean): Promise<L.Layer> {
  await import("@maplibre/maplibre-gl-leaflet");
  const res = await fetch(dark ? VECTOR_STYLE_URL.dark : VECTOR_STYLE_URL.light);
  if (!res.ok) throw new Error(`style ${res.status}`);
  const style = await res.json();
  style.glyphs = String(style.glyphs).replace("__ORIGIN__", window.location.origin);
  return (L as unknown as { maplibreGL: (opts: object) => L.Layer }).maplibreGL({
    style,
    // 默认 CJK 用本地系统字体渲染以省流量;置 false 强制汉字也走
    // 自托管 ZCOOL 字形 PBF,让中文标注同样使用品牌字体
    localIdeographFontFamily: false,
  });
}

// 无标记时(全屏地图页初始态)的兜底视野:北美大陆
const DEFAULT_CENTER: [number, number] = [39.8, -98.6];
const DEFAULT_ZOOM = 4;

// ---------- 原生侧辅助 ----------

let nativeMapSeq = 0;

function toNativeMarker(m: AppMapMarker): NativeMapMarker {
  return {
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    title: m.name,
    subtitle: m.address,
    label: m.label,
    image: m.image,
    kind: m.kind,
    previewImages: m.previewImages,
    previewCount: m.previewCount,
    selected: m.selected,
  };
}

function frameOf(r: DOMRect): NativeMapFrame {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

// ---------- 组件 ----------

export function AppMap({
  markers,
  className,
  zoom = 14,
  mode = "embed",
  interactive = true,
  showsUserLocation = false,
  fitPadding = 40,
  forceWeb = false,
  autoFit = true,
  center,
  onMarkerTap,
  onClusterTap,
  onMapTap,
  onRegionChange,
}: {
  markers: AppMapMarker[];
  className?: string;
  /** 单标记时的缩放级别 */
  zoom?: number;
  /** embed = 嵌入卡片(原生 overlay);fullscreen = 全屏地图页(原生 behind) */
  mode?: "embed" | "fullscreen";
  interactive?: boolean;
  /** 显示用户位置(原生 = MapKit 蓝点;leaflet = watchPosition 蓝点 + 精度圈) */
  showsUserLocation?: boolean;
  /** 多标记 fitBounds 的内边距(px) */
  fitPadding?: number;
  /** 强制走 leaflet(嵌入可滚动/浮层内容时必须:原生 overlay 视图压不住层级) */
  forceWeb?: boolean;
  /** false = 标记更新时从不自动 fit(视口检索页:相机归页面管,fit 会打断用户) */
  autoFit?: boolean;
  /** 受控相机:对象引用变化时飞到该点(定位到我/选中标记等场景) */
  center?: { lat: number; lng: number; zoom?: number } | null;
  onMarkerTap?: (id: string) => void;
  onClusterTap?: (ids: string[]) => void;
  onMapTap?: () => void;
  /** 相机停稳后上报视口范围(按视口检索数据用) */
  onRegionChange?: (region: AppMapRegion) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<"init" | "native" | "web">("init");
  // null = 尚未读取(挂载前不知道主题,两条路径都等它就绪)
  const [dark, setDark] = useState<boolean | null>(null);

  // 回调 / 频繁变化的 prop 走 ref,避免地图创建 effect 反复重跑
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const fitPaddingRef = useRef(fitPadding);
  fitPaddingRef.current = fitPadding;
  const onMarkerTapRef = useRef(onMarkerTap);
  onMarkerTapRef.current = onMarkerTap;
  const onClusterTapRef = useRef(onClusterTap);
  onClusterTapRef.current = onClusterTap;
  const onMapTapRef = useRef(onMapTap);
  onMapTapRef.current = onMapTap;
  const onRegionChangeRef = useRef(onRegionChange);
  onRegionChangeRef.current = onRegionChange;
  const autoFitRef = useRef(autoFit);
  autoFitRef.current = autoFit;
  // 建图完成前到达的受控相机不能丢(视口检索页靠它触发首次 regionChange)
  const centerRef = useRef(center);
  centerRef.current = center;

  // 首批非空标记到达后置 true;之后的标记更新不再自动 fit(保留用户视角)
  const hadMarkersRef = useRef(false);

  // 平台判定:挂载时一次
  useEffect(() => {
    setPlatform(!forceWeb && nativeMapAvailable() ? "native" : "web");
  }, [forceWeb]);

  // 主题监听:documentElement class 变化(next-themes 切换)
  useEffect(() => {
    const root = document.documentElement;
    const read = () => root.classList.contains("dark");
    setDark(read());
    const obs = new MutationObserver(() => setDark(read()));
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ==================== web 路径(leaflet) ====================

  const leafletMapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  function fitWeb(map: L.Map) {
    if (!autoFitRef.current) return;
    const ms = markersRef.current;
    if (ms.length === 0) return;
    if (ms.length === 1) {
      map.setView([ms[0].lat, ms[0].lng], zoomRef.current);
    } else {
      const bounds = L.latLngBounds(ms.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [fitPaddingRef.current, fitPaddingRef.current] });
    }
  }

  function syncWebMarkers(group: L.LayerGroup) {
    group.clearLayers();
    const icon = createMarkerIcon();
    markersRef.current.forEach((m) => {
      let marker: L.Marker;
      if (m.label) {
        // 价格胶囊:无弹窗,点击直接回调
        marker = L.marker([m.lat, m.lng], {
          icon: createPillIcon(m),
          zIndexOffset: m.selected ? 1000 : 0,
        });
      } else {
        marker = L.marker([m.lat, m.lng], { icon });
        if (m.name || m.address) {
          marker.bindPopup(
            `<div class="store-popup"><strong>${escapeHtml(m.name ?? "")}</strong><span>${escapeHtml(m.address ?? "")}</span></div>`,
            {
              closeButton: false,
              className: "modern-popup",
              maxWidth: 240,
            }
          );
        }
      }
      marker.on("click", () => onMarkerTapRef.current?.(m.id));
      group.addLayer(marker);
    });
  }

  // 建图 effect:每种 模式/主题/交互性 组合只建一次;标记同步在下一个 effect
  useEffect(() => {
    if (platform !== "web" || dark === null || !containerRef.current) return;

    const container = containerRef.current;
    const map = L.map(container, {
      scrollWheelZoom: mode === "fullscreen" && interactive,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    leafletMapRef.current = map;

    if (interactive) {
      L.control.zoom({ position: "bottomright" }).addTo(map);
    }

    // Minimal attribution
    const attribution = L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addTo(map);

    // 栅格路径:CSS 降饱和滤镜靠 clc-map--raster 类生效(矢量底图自带品牌配色)
    let disposed = false;
    function addRasterLayer() {
      container.classList.add("clc-map--raster");
      attribution.addAttribution(RASTER_FALLBACK.attribution);
      L.tileLayer(RASTER_FALLBACK.url, { maxZoom: 19 }).addTo(map);
    }

    createVectorLayer(!!dark)
      .then((layer) => {
        if (disposed) return;
        attribution.addAttribution(VECTOR_ATTRIBUTION);
        layer.addTo(map);
      })
      .catch(() => {
        // WebGL 不可用 / 样式加载失败 → 回退栅格
        if (!disposed) addRasterLayer();
      });

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;

    // 初始视野:有标记就 fit,没有就兜底视野(全屏页需要空地图也可见)
    if (markersRef.current.length > 0) {
      fitWeb(map);
      hadMarkersRef.current = true;
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    syncWebMarkers(group);

    // 点空白处(标记点击不冒泡到地图)
    map.on("click", () => onMapTapRef.current?.());

    // 建图前已到达的受控相机(如挂载即定位成功)此刻补上
    if (centerRef.current) {
      map.setView(
        [centerRef.current.lat, centerRef.current.lng],
        centerRef.current.zoom ?? zoomRef.current
      );
    }

    // 相机停稳 → 上报视口范围(setView/fitBounds/拖拽缩放后都会触发 moveend);
    // 初始视野也上报一次,否则用户不动地图就不会有首次检索
    const reportRegion = () => {
      const cb = onRegionChangeRef.current;
      if (!cb) return;
      const b = map.getBounds();
      cb({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
        zoom: map.getZoom(),
      });
    };
    map.on("moveend", reportRegion);
    reportRegion();

    // 用户位置蓝点(对齐原生 showsUserLocation):watchPosition 持续更新
    // 蓝点 + 精度圈;拿不到权限就静默跳过
    let geoWatch: number | null = null;
    let userDot: L.CircleMarker | null = null;
    let userAcc: L.Circle | null = null;
    if (showsUserLocation && "geolocation" in navigator) {
      geoWatch = navigator.geolocation.watchPosition(
        (pos) => {
          const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          if (!userDot) {
            userAcc = L.circle(ll, {
              radius: pos.coords.accuracy,
              weight: 0,
              fillColor: "#007aff",
              fillOpacity: 0.08,
              interactive: false,
            }).addTo(map);
            userDot = L.circleMarker(ll, {
              radius: 6,
              color: "#ffffff",
              weight: 2,
              fillColor: "#007aff",
              fillOpacity: 1,
              interactive: false,
            }).addTo(map);
          } else {
            userDot.setLatLng(ll);
            userAcc?.setLatLng(ll).setRadius(pos.coords.accuracy);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    }

    return () => {
      disposed = true;
      if (geoWatch !== null) navigator.geolocation.clearWatch(geoWatch);
      map.remove();
      container.classList.remove("clc-map--raster");
      leafletMapRef.current = null;
      layerGroupRef.current = null;
    };

  }, [platform, dark, mode, interactive, showsUserLocation]);

  // 标记同步 effect:只重建标记图层,不重建地图(保留用户平移/缩放)
  useEffect(() => {
    if (platform !== "web") return;
    const map = leafletMapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    syncWebMarkers(group);
    // 仅 0 → >0 的首批标记到达时 fit 一次
    if (markers.length > 0 && !hadMarkersRef.current) {
      hadMarkersRef.current = true;
      fitWeb(map);
    }
     
  }, [platform, markers]);

  // ==================== 原生路径(MapKit) ====================

  const nativeIdRef = useRef<string | null>(null);
  if (nativeIdRef.current === null) nativeIdRef.current = `appmap-${++nativeMapSeq}`;
  const nativeCreatedRef = useRef(false);

  function sendNativeMarkers() {
    const ms = markersRef.current;
    const fit = autoFitRef.current && !hadMarkersRef.current && ms.length > 1;
    if (ms.length > 0) hadMarkersRef.current = true;
    NativeMap.setMarkers({
      id: nativeIdRef.current!,
      markers: ms.map(toNativeMarker),
      fit,
    }).catch(() => {});
  }

  // 建图 + 事件 + frame 同步(主题/模式变化 → 销毁重建,最简单且正确)
  useEffect(() => {
    if (platform !== "native" || dark === null) return;
    const el = containerRef.current;
    if (!el) return;

    const id = nativeIdRef.current!;
    const pluginMode = mode === "embed" ? "overlay" : "behind";
    let cancelled = false;
    let created = false;
    let raf = 0;

    // behind 模式:整页透明打洞,让 webview 后面的 MapKit 显示出来
    if (mode === "fullscreen") {
      document.documentElement.classList.add("native-map-behind");
    }

    const rect0 = el.getBoundingClientRect();
    const sentMarkers = markersRef.current;

    NativeMap.create({
      id,
      frame: frameOf(rect0),
      markers: sentMarkers.map(toNativeMarker),
      mode: pluginMode,
      zoom,
      interactive,
      showsUserLocation,
      dark,
    })
      .then(() => {
        if (cancelled) {
          NativeMap.destroy({ id }).catch(() => {});
          return;
        }
        created = true;
        nativeCreatedRef.current = true;
        if (sentMarkers.length > 0) hadMarkersRef.current = true;
        // create 在途期间标记已变化 → 补发一次
        if (markersRef.current !== sentMarkers) sendNativeMarkers();
        // 建图前已到达的受控相机此刻补上(也触发首次 regionChange)
        if (centerRef.current) {
          NativeMap.setCamera({
            id,
            lat: centerRef.current.lat,
            lng: centerRef.current.lng,
            zoom: centerRef.current.zoom,
            animate: false,
          }).catch(() => {});
        }
      })
      .catch(() => {
        // 原生创建失败 → 回退 leaflet
        if (!cancelled) setPlatform("web");
      });

    // 事件订阅:按 mapId 过滤,只转发本实例的事件
    const handles: Promise<PluginListenerHandle>[] = [
      NativeMap.addListener("markerTap", (ev) => {
        if (ev.mapId === id) onMarkerTapRef.current?.(ev.markerId);
      }),
      NativeMap.addListener("clusterTap", (ev) => {
        if (ev.mapId === id) onClusterTapRef.current?.(ev.markerIds);
      }),
      NativeMap.addListener("mapTap", (ev) => {
        if (ev.mapId === id) onMapTapRef.current?.();
      }),
      NativeMap.addListener("regionChange", (ev) => {
        if (ev.mapId === id) {
          onRegionChangeRef.current?.({
            north: ev.north,
            south: ev.south,
            east: ev.east,
            west: ev.west,
            zoom: ev.zoom,
          });
        }
      }),
    ];

    // rAF 循环持续同步 frame(两种模式都要:嵌入卡片要跟随滚动;全屏页
    // 挂载常发生在 PageTransition 推入动画中,首测的 rect 带着 transform
    // 偏移,必须逐帧跟到动画结束才落在正确位置),并在移出视口时隐藏
    let last = { x: rect0.x, y: rect0.y, w: rect0.width, h: rect0.height };
    let lastHidden = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!created) return;
      const r = el.getBoundingClientRect();
      const hidden =
        r.width <= 0 ||
        r.height <= 0 ||
        r.bottom <= 0 ||
        r.right <= 0 ||
        r.top >= window.innerHeight ||
        r.left >= window.innerWidth;
      if (hidden !== lastHidden) {
        lastHidden = hidden;
        NativeMap.setHidden({ id, hidden }).catch(() => {});
      }
      if (hidden) return;
      if (
        Math.abs(r.x - last.x) > 0.5 ||
        Math.abs(r.y - last.y) > 0.5 ||
        Math.abs(r.width - last.w) > 0.5 ||
        Math.abs(r.height - last.h) > 0.5
      ) {
        last = { x: r.x, y: r.y, w: r.width, h: r.height };
        NativeMap.setFrame({ id, frame: frameOf(r) }).catch(() => {});
      }
      if (pluginMode === "behind") syncPassRects();
    };
    raf = requestAnimationFrame(tick);

    // behind 模式:每帧同步「需要放行给网页 UI 的触摸区域」,原生触摸代理
    // 据此决定触摸给地图(原生手势)还是给 webview。标记了 [data-native-map-ui]
    // 的元素(顶部控件/底部面板)放行;浮层(车辆卡片压 overlay 历史 / vaul
    // 抽屉)打开时整屏放行;左缘细条放行保住边缘右滑返回手势。
    let lastPassKey: string | null = null;
    function syncPassRects() {
      const rects: NativeMapFrame[] = [
        { x: 0, y: 0, width: 20, height: window.innerHeight },
      ];
      // 浮层判定用 DOM 标记(SwipeSheet/ProfileDrawer 带 data-app-overlay,
      // vaul 抽屉带 data-vaul-drawer),不依赖 history 状态——可靠且无时序问题
      const overlayOpen = !!document.querySelector(
        "[data-app-overlay], [data-vaul-drawer]"
      );
      if (overlayOpen) {
        rects.push({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
      } else {
        document.querySelectorAll("[data-native-map-ui]").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
          }
        });
      }
      const key = rects
        .map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`)
        .join(";");
      if (key !== lastPassKey) {
        lastPassKey = key;
        NativeMap.setPassthroughRects({ id, rects }).catch(() => {
          // 发送失败(如原生短暂重建中)则下一帧重试,不能让放行区停在旧状态
          lastPassKey = null;
        });
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      // 只移除自己的监听句柄(removeAllListeners 是全局的,不能用)
      handles.forEach((p) => p.then((h) => h.remove()).catch(() => {}));
      if (mode === "fullscreen") {
        document.documentElement.classList.remove("native-map-behind");
      }
      if (created) {
        nativeCreatedRef.current = false;
        NativeMap.destroy({ id }).catch(() => {});
      }
    };
     
  }, [platform, dark, mode, interactive, showsUserLocation, zoom]);

  // 原生标记同步
  useEffect(() => {
    if (platform !== "native" || !nativeCreatedRef.current) return;
    sendNativeMarkers();

  }, [platform, markers]);

  // 受控相机:center 引用变化时飞到该点(两条路径共用)
  useEffect(() => {
    if (!center) return;
    if (platform === "web") {
      const map = leafletMapRef.current;
      if (map) map.flyTo([center.lat, center.lng], center.zoom ?? map.getZoom());
    } else if (platform === "native" && nativeCreatedRef.current) {
      NativeMap.setCamera({
        id: nativeIdRef.current!,
        lat: center.lat,
        lng: center.lng,
        zoom: center.zoom,
        animate: true,
      }).catch(() => {});
    }

  }, [platform, center]);

  // ==================== 渲染 ====================

  const isNative = platform === "native";
  return (
    <>
      {platform === "web" && (
        <style jsx global>{`
          /* ===== 常來車網品牌化地图 ===== */
          .clc-map.leaflet-container,
          .clc-map .leaflet-container {
            font-family: var(--font-mono, "PingFang SC", "Microsoft YaHei", sans-serif);
            background: var(--muted, #f4f4f5);
          }
          /* 栅格瓦片调色:降饱和贴近站内浅灰画布(矢量底图自带品牌配色,不套滤镜) */
          .clc-map--raster .leaflet-tile-pane {
            filter: saturate(0.72) contrast(0.98) brightness(1.02);
          }
          .dark .clc-map--raster .leaflet-tile-pane {
            filter: invert(1) hue-rotate(180deg) saturate(0.35) brightness(0.9) contrast(0.9);
          }
          /* 淡淡的品牌绿罩层(在瓦片之上、标注之下) */
          .clc-map::after {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 300;
            pointer-events: none;
            background: rgba(7, 193, 96, 0.045);
          }
          .modern-popup .leaflet-popup-content-wrapper {
            background: var(--card, #fff);
            color: var(--foreground, #000);
            border: 1px solid var(--border, #e5e7eb);
            border-radius: 0.75rem;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
            padding: 0;
          }
          .modern-popup .leaflet-popup-content {
            margin: 0;
            line-height: 1.4;
          }
          .modern-popup .leaflet-popup-tip {
            background: var(--card, #fff);
            border: 1px solid var(--border, #e5e7eb);
            border-top: 0;
            border-left: 0;
            box-shadow: none;
          }
          .store-popup {
            padding: 10px 14px;
            font-family: var(--font-mono, "PingFang SC", "Microsoft YaHei", sans-serif);
          }
          .store-popup strong {
            display: block;
            font-family: var(--font-logo, "ZCOOL QingKe HuangYou", "PingFang SC", sans-serif);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.01em;
          }
          .store-popup strong::before {
            content: "";
            display: inline-block;
            width: 6px;
            height: 6px;
            margin-right: 6px;
            border-radius: 9999px;
            background: var(--primary, #89fcd2);
            vertical-align: 2px;
          }
          .store-popup span {
            display: block;
            margin-top: 3px;
            font-size: 11px;
            opacity: 0.6;
          }
          .clc-map .leaflet-control-zoom {
            border: 1px solid var(--border, #e5e7eb) !important;
            border-radius: 0.75rem !important;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
          }
          .clc-map .leaflet-control-zoom a {
            width: 30px !important;
            height: 30px !important;
            line-height: 30px !important;
            font-size: 15px !important;
            font-family: var(--font-mono, sans-serif) !important;
            border-radius: 0 !important;
            background: var(--card, #fff) !important;
            color: var(--foreground, #000) !important;
            border-color: var(--border, #e5e7eb) !important;
          }
          .clc-map .leaflet-control-zoom a:hover {
            background: var(--muted, #f5f5f5) !important;
            color: var(--primary, #89fcd2) !important;
          }
          .leaflet-control-attribution {
            background: transparent !important;
            font-family: var(--font-mono, sans-serif) !important;
            font-size: 9px !important;
            opacity: 0.5;
          }
          .leaflet-control-attribution a {
            color: var(--foreground, #000) !important;
          }
          /* 价格胶囊标注 */
          .car-pill-anchor {
            background: transparent;
            border: none;
          }
          .car-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transform: translate(-50%, -50%);
            padding: 3px 9px;
            font-family: var(--font-mono, "PingFang SC", sans-serif);
            font-size: 12px;
            font-weight: 600;
            line-height: 1.3;
            white-space: nowrap;
            border-radius: 9999px;
            background: var(--background, #fff);
            color: var(--primary, #89fcd2);
            border: 1px solid var(--border, #e5e7eb);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
            cursor: pointer;
          }
          .car-pill:has(.car-pill__img) {
            padding: 3px 9px 3px 3px;
          }
          .car-pill__img {
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            object-fit: cover;
            flex-shrink: 0;
            background: var(--muted, #f4f4f5);
          }
          .car-pill__text {
            max-width: 110px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          /* 店铺标记:前景色文字,与价格胶囊区分 */
          .car-pill--store {
            color: var(--foreground, #111);
          }
          /* 胶囊 + 店铺图片条的竖排容器(整体居中于坐标) */
          .car-pill-wrap {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            transform: translate(-50%, -50%);
            cursor: pointer;
          }
          .car-pill-wrap .car-pill {
            transform: none;
          }
          .car-pill-wrap .car-pill--selected {
            transform: scale(1.08);
          }
          .car-pill-strip {
            display: flex;
            gap: 3px;
          }
          .car-pill-strip__item {
            position: relative;
            display: block;
            width: 40px;
            height: 32px;
            overflow: hidden;
            border-radius: 6px;
            border: 1px solid var(--background, #fff);
            background: var(--muted, #f4f4f5);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
          }
          .car-pill-strip__item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .car-pill-strip__more {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.45);
            color: #fff;
            font-size: 11px;
            font-weight: 600;
          }
          .car-pill--selected {
            transform: translate(-50%, -50%) scale(1.08);
            background: var(--primary, #89fcd2);
            color: #fff;
            border-color: var(--primary, #89fcd2);
          }
        `}</style>
      )}
      <div
        ref={containerRef}
        // 地图拖动不应带动外层容器:
        // data-vaul-no-drag → vaul drawer(卖家主页抽屉)放行
        // data-sheet-static → SwipeSheet(详情浮层)放行
        // 原生 overlay 模式下触摸实际落在原生视图上,保留这些属性作双保险
        data-vaul-no-drag=""
        data-sheet-static=""
        className={cn(
          isNative && "native-map-container",
          isNative && mode === "fullscreen" && "native-map-hole",
          platform === "web" && "clc-map",
          className
        )}
        style={{
          touchAction: "none",
          // isolation: leaflet 内部图层 z-index 高达 1000,不隔离会盖住页面上
          // 与地图同级的浮动元素(顶部控件/底部面板等),两种模式都必须隔离
          isolation: "isolate",
          zIndex: 0,
          ...(isNative ? { background: "transparent" } : null),
        }}
      />
    </>
  );
}
