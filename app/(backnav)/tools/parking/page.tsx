"use client";

// 停车定位:满屏 OpenStreetMap + 底部悬浮信息卡(类苹果「查找」UI)。
// 车位存 localStorage;未记录时地图显示当前位置。

import { useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import { Header } from "@/components/header";
import { LocateFixed, Navigation, Trash2, Loader2, CarFront } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { haversineDistance, formatDistance } from "@/lib/geocode";

// leaflet 不能 SSR,按需加载
const StoreMap = nextDynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false },
);

const KEY = "clc_parking_spot";

interface Spot {
  lat: number;
  lng: number;
  note: string;
  at: string;
}

export default function ParkingToolPage() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as Spot;
        setSpot(s);
        setNote(s.note || "");
      }
    } catch { /* ignore */ }

    // 当前位置:未记录车位时用于居中地图;已记录时用于显示距离
    navigator.geolocation?.getCurrentPosition(
      (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // 地图标记:仅坐标变化时重建(备注输入不触发地图重绘)
  const markers = useMemo(
    () =>
      spot
        ? [{ lat: spot.lat, lng: spot.lng, name: "我的车", address: "车停在这里" }]
        : here
          ? [{ lat: here.lat, lng: here.lng, name: "当前位置", address: "你在这附近" }]
          : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spot?.lat, spot?.lng, here?.lat, here?.lng],
  );

  const distance =
    spot && here ? haversineDistance(here.lat, here.lng, spot.lat, spot.lng) : null;

  function save() {
    setSaving(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const s: Spot = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          note,
          at: new Date().toISOString(),
        };
        localStorage.setItem(KEY, JSON.stringify(s));
        setSpot(s);
        setHere({ lat: s.lat, lng: s.lng });
        setSaving(false);
      },
      () => {
        setError("获取定位失败,请检查定位权限");
        setSaving(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function saveNote(v: string) {
    setNote(v);
    if (spot) {
      const s = { ...spot, note: v };
      setSpot(s);
      localStorage.setItem(KEY, JSON.stringify(s));
    }
  }

  return (
    <div className="flex h-[calc(100dvh-41px)] flex-col bg-background font-mono">
      <Header />
      <main className="relative min-h-0 flex-1">
        {/* 满屏地图 */}
        {markers.length > 0 ? (
          <StoreMap
            markers={markers}
            zoom={17}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <p className="font-mono text-xs text-muted-foreground">
              {error || "正在获取定位..."}
            </p>
          </div>
        )}

        {/* 底部悬浮信息卡(类苹果「查找」) */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto w-full max-w-md rounded-2xl border border-black/5 bg-background/95 p-4 shadow-lg backdrop-blur-md dark:border-white/10">
            {spot ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <CarFront className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold">我的车</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {new Date(spot.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" 停放"}
                      {distance !== null && ` · 距你 ${formatDistance(distance)}`}
                    </p>
                  </div>
                </div>

                <Input
                  className="mt-3 rounded-lg font-mono text-sm"
                  placeholder="备注:如 3 楼 B 区 21 号柱子旁"
                  value={note}
                  onChange={(e) => saveNote(e.target.value)}
                />

                <div className="mt-3 flex gap-2">
                  <Button asChild className="flex-1 gap-1.5 font-mono text-xs">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
                      导航回车位
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 font-mono text-xs"
                    disabled={saving}
                    onClick={save}
                    title="更新为当前位置"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    更新
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    aria-label="清除车位"
                    onClick={() => {
                      localStorage.removeItem(KEY);
                      setSpot(null);
                      setNote("");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-mono text-sm font-bold">停车定位</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  停好车点一下,记住车停哪;回头一键导航回车位
                </p>
                <Button
                  className="mt-3 w-full gap-2 font-mono text-sm"
                  disabled={saving}
                  onClick={save}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <LocateFixed className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  记录当前位置
                </Button>
                {error && (
                  <p className="mt-2 font-mono text-[11px] text-destructive">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
