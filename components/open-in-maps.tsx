"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ChevronRight } from "lucide-react";

// 打开外部地图的目标:坐标 / 地址 / 类目搜索三种形态任选
export interface MapTarget {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  name?: string;
  // 类目搜索(如「汽车维修」),配合坐标做附近搜索
  query?: string;
  mode?: "search" | "directions";
  travelmode?: "driving" | "walking";
}

function destOf(t: MapTarget): string {
  if (t.address) return encodeURIComponent(t.address);
  return `${t.lat},${t.lng}`;
}

export function appleMapsUrl(t: MapTarget): string {
  if (t.mode === "directions") {
    const flag = t.travelmode === "walking" ? "w" : "d";
    return `https://maps.apple.com/?daddr=${destOf(t)}&dirflg=${flag}`;
  }
  if (t.query) {
    const near =
      t.lat != null && t.lng != null ? `&sll=${t.lat},${t.lng}&z=13` : "";
    return `https://maps.apple.com/?q=${encodeURIComponent(t.query)}${near}`;
  }
  if (t.address) {
    const near = t.lat != null && t.lng != null ? `&sll=${t.lat},${t.lng}` : "";
    return `https://maps.apple.com/?q=${encodeURIComponent(t.address)}${near}`;
  }
  return `https://maps.apple.com/?ll=${t.lat},${t.lng}&q=${encodeURIComponent(t.name || "位置")}`;
}

export function googleMapsUrl(t: MapTarget): string {
  if (t.mode === "directions") {
    return `https://www.google.com/maps/dir/?api=1&destination=${destOf(t)}&travelmode=${t.travelmode || "driving"}`;
  }
  if (t.query) {
    const near =
      t.lat != null && t.lng != null ? `/@${t.lat},${t.lng},13z` : "";
    return `https://www.google.com/maps/search/${encodeURIComponent(t.query)}${near}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destOf(t)}`;
}

function MapAppRow({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <DrawerClose asChild>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-border p-3.5 transition-colors active:bg-muted"
      >
        <span className="h-9 w-9 shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-sm font-medium">{label}</span>
          <span className="block font-mono text-[10px] text-muted-foreground">
            {sub}
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
      </a>
    </DrawerClose>
  );
}

// 统一的「用哪个地图打开」选择抽屉。children 作为触发器(asChild)。
export function OpenInMaps({
  target,
  children,
}: {
  target: MapTarget;
  children: ReactNode;
}) {
  const subtitle =
    target.query ||
    target.address ||
    (target.lat != null && target.lng != null
      ? `${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}`
      : "");
  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-mono">
            {target.mode === "directions" ? "选择导航应用" : "选择地图应用"}
          </DrawerTitle>
          {subtitle && (
            <DrawerDescription className="truncate font-mono text-xs">
              {subtitle}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="grid gap-2 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <MapAppRow
            href={appleMapsUrl(target)}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/map-icons/apple-maps.png"
                alt=""
                className="h-full w-full object-contain"
              />
            }
            label="Apple 地图"
            sub="Apple Maps"
          />
          <MapAppRow
            href={googleMapsUrl(target)}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/map-icons/google-maps.png"
                alt=""
                className="h-full w-full object-contain"
              />
            }
            label="Google 地图"
            sub="Google Maps"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
