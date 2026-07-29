// NativeMap 本地 Capacitor 插件的 JS 桥接(iOS MapKit)
// 原生实现见 ios/App/App/NativeMapPlugin.swift(仅 iOS,web/Android 走 leaflet)
//
// mode 说明:
// - "overlay":原生地图浮在 webview 之上的指定 frame(嵌入式卡片地图,
//   滚动时需要持续同步 frame)
// - "behind":原生地图垫在透明 webview 之后(全屏地图页,网页 UI 如底部
//   面板渲染在地图上方);触摸由原生透明代理路由——地图区域直达 MKMapView
//   (原生手势),setPassthroughRects 同步的网页 UI 区域放行给 webview
// 本 webview 中 CSS px 与原生 pt 1:1 对应。

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface NativeMapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;      // callout title
  subtitle?: string;   // callout subtitle
  label?: string;      // short pill text e.g. "$1.2万" — renders a price-pill annotation instead of a default pin
  selected?: boolean;
}
export interface NativeMapFrame { x: number; y: number; width: number; height: number } // CSS px, viewport-relative

export interface NativeMapPlugin {
  create(options: { id: string; frame: NativeMapFrame; markers: NativeMapMarker[]; mode?: "overlay" | "behind"; zoom?: number; interactive?: boolean; showsUserLocation?: boolean; dark?: boolean }): Promise<void>;
  destroy(options: { id: string }): Promise<void>;
  setFrame(options: { id: string; frame: NativeMapFrame }): Promise<void>;
  setMarkers(options: { id: string; markers: NativeMapMarker[]; fit?: boolean }): Promise<void>;
  setCamera(options: { id: string; lat: number; lng: number; zoom?: number; animate?: boolean }): Promise<void>;
  fitMarkers(options: { id: string; padding?: number; animate?: boolean }): Promise<void>;
  setHidden(options: { id: string; hidden: boolean }): Promise<void>;
  // behind 模式:同步需要放行给网页 UI 的区域(其余触摸原生代理直接路由给地图)
  setPassthroughRects(options: { id: string; rects: NativeMapFrame[] }): Promise<void>;
  addListener(eventName: "markerTap", listener: (ev: { mapId: string; markerId: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "clusterTap", listener: (ev: { mapId: string; markerIds: string[] }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "mapTap", listener: (ev: { mapId: string }) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const NativeMap = registerPlugin<NativeMapPlugin>("NativeMap");

export function nativeMapAvailable(): boolean {
  return Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("NativeMap");
}
