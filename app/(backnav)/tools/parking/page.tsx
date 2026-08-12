"use client";

// 停车定位:满屏地图 + 底部悬浮信息卡(类苹果「查找」UI)。
// iOS 原生壳走 MapKit(behind 模式),其余平台 leaflet;车位存 localStorage。

import { useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import { Header } from "@/components/header";
import { LocateFixed, Navigation, Trash2, Loader2, CarFront } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { haversineDistance, formatDistance, getCurrentPosition } from "@/lib/geocode";
import { OpenInMaps } from "@/components/open-in-maps";

// leaflet 不能 SSR,按需加载
const AppMap = nextDynamic(
  () => import("@/components/app-map").then((m) => m.AppMap),
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

    // 当前位置(经 Capacitor 插件,原生端正确弹权限):未记录车位时居中地图,已记录时算距离
    getCurrentPosition()
      .then((pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
      .catch(() => {});
  }, []);

  // 地图标记:仅坐标变化时重建(备注输入不触发地图重绘)
  const markers = useMemo(
    () =>
      spot
        ? [{ id: "spot", lat: spot.lat, lng: spot.lng, name: "我的车", address: "车停在这里" }]
        : here
          ? [{ id: "here", lat: here.lat, lng: here.lng, name: "当前位置", address: "你在这附近" }]
          : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spot?.lat, spot?.lng, here?.lat, here?.lng],
  );

  const distance =
    spot && here ? haversineDistance(here.lat, here.lng, spot.lat, spot.lng) : null;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const pos = await getCurrentPosition();
      const s: Spot = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        note,
        at: new Date().toISOString(),
      };
      localStorage.setItem(KEY, JSON.stringify(s));
      setSpot(s);
      setHere({ lat: s.lat, lng: s.lng });
    } catch {
      setError("获取定位失败,请检查定位权限");
    } finally {
      setSaving(false);
    }
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
    <div className="native-map-transparent flex h-[calc(100dvh-41px)] flex-col bg-background font-mono">
      <Header />
      <main className="relative min-h-0 flex-1">
        {/* 满屏地图(原生 behind 模式 / leaflet) */}
        {markers.length > 0 ? (
          <AppMap
            markers={markers}
            zoom={17}
            mode="fullscreen"
            showsUserLocation
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
          data-native-map-ui=""
          className="absolute inset-x-0 bottom-0 z-10 p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto w-full max-w-md rounded-2xl border border-black/5 bg-background/95 p-4 shadow-lg backdrop-blur-md dark:border-white/10">
            {spot ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/40 text-brand-ink">
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
                  className="mt-3 font-mono text-sm"
                  placeholder="备注:如 3 楼 B 区 21 号柱子旁"
                  value={note}
                  onChange={(e) => saveNote(e.target.value)}
                />

                <div className="mt-3 flex gap-2">
                  <OpenInMaps
                    target={{
                      lat: spot.lat,
                      lng: spot.lng,
                      name: "我的车",
                      mode: "directions",
                      travelmode: "walking",
                    }}
                  >
                    <Button className="flex-1 gap-1.5 font-mono text-xs">
                      <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
                      导航回车位
                    </Button>
                  </OpenInMaps>
                  <Button
                    variant="secondary"
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
                    variant="secondary"
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
                  <div className="mt-2 rounded-xl bg-destructive/10 px-3 py-2.5">
                    <p className="font-mono text-[11px] text-destructive">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
