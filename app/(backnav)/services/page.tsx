"use client";

import { useState } from "react";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";
import { AdUnit, AadsUnit } from "@/components/ad-unit";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  Shield,
  Landmark,
  Fuel,
  Droplets,
  ClipboardCheck,
  MapPin,
  Loader2,
} from "lucide-react";

const categories = [
  {
    name: "修车",
    english: "Auto Repair",
    icon: Wrench,
    query: "auto+repair",
  },
  {
    name: "保险",
    english: "Insurance",
    icon: Shield,
    query: "auto+insurance",
  },
  {
    name: "DMV",
    english: "DMV",
    icon: Landmark,
    query: "DMV",
  },
  {
    name: "加油站",
    english: "Gas Station",
    icon: Fuel,
    query: "gas+station",
  },
  {
    name: "洗车",
    english: "Car Wash",
    icon: Droplets,
    query: "car+wash",
  },
  {
    name: "验车",
    english: "Inspection",
    icon: ClipboardCheck,
    query: "vehicle+inspection",
  },
];

export default function ServicesPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationText, setLocationText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getLocation() {
    setLoading(true);
    setError("");
    try {
      const { getLocation: getNativeLocation } = await import("@/lib/capacitor");
      const loc = await getNativeLocation();
      if (loc) {
        setLocation(loc);
        setLocationText(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
      } else {
        setError("无法获取位置，请允许访问您的位置");
      }
    } catch {
      setError("无法获取位置，请允许访问您的位置");
    }
    setLoading(false);
  }

  function getMapsUrl(query: string) {
    if (!location) return "#";
    return `https://www.google.com/maps/search/${query}/@${location.lat},${location.lng},13z`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono text-foreground">

      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="mb-8">
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            附近服务
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            查找您附近的汽车相关服务
          </p>
        </div>

        {!location ? (
          <div className="mb-8 flex flex-col items-center gap-3 rounded border border-border p-8">
            <MapPin
              className="h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="font-mono text-xs text-muted-foreground">
              需要获取您的位置以查找附近服务
            </p>
            <Button
              size="sm"
              className="gap-1.5 font-mono text-xs"
              onClick={getLocation}
              disabled={loading}
            >
              {loading ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.5}
                />
              ) : (
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              获取位置
            </Button>
            {error && (
              <p className="font-mono text-[11px] text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2">
            <MapPin
              className="h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={1.5}
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              当前位置: {locationText}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 font-mono text-[10px] text-muted-foreground"
              onClick={getLocation}
            >
              刷新
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                className="flex flex-col gap-3 border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className="h-5 w-5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="font-mono text-sm font-medium">{cat.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {cat.english}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 font-mono text-xs"
                  disabled={!location}
                  asChild
                >
                  {location ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const { openBrowser } = await import("@/lib/capacitor");
                        openBrowser(getMapsUrl(cat.query));
                      }}
                    >
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                      查看附近
                    </button>
                  ) : (
                    <span>
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                      查看附近
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </main>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <AdUnit slot="SERVICES" format="horizontal" />
        <AadsUnit id="2430994" background="" />
      </div>
      <Footer />
    </div>
  );
}
