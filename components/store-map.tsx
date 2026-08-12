"use client";

// 兼容包装:StoreMap 的旧 API 原样保留,内部走 AppMap 的 leaflet 路径。
// 嵌入式小地图固定用 web 地图(forceWeb):原生 overlay 视图永远浮在整个
// webview 之上,会压住浮层卡片的 sticky 头部/上层抽屉,层级无法正确;
// 原生 MapKit 只用于全屏地图场景(behind 模式,见 /browse/map 与停车定位)。

import { useMemo } from "react";
import { AppMap } from "@/components/app-map";

interface StoreMarker {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export function StoreMap({
  markers,
  className,
  zoom = 14,
}: {
  markers: StoreMarker[];
  className?: string;
  /** 单标记时的缩放级别 */
  zoom?: number;
}) {
  // markers 引用不变时保持同一数组,避免 AppMap 每次渲染都重建标记图层
  const appMarkers = useMemo(
    () =>
      markers.map((m, i) => ({
        id: String(i),
        lat: m.lat,
        lng: m.lng,
        name: m.name,
        address: m.address,
      })),
    [markers]
  );

  if (markers.length === 0) return null;

  return (
    <AppMap
      markers={appMarkers}
      className={className ?? "h-48 w-full"}
      zoom={zoom}
      mode="embed"
      forceWeb
    />
  );
}
