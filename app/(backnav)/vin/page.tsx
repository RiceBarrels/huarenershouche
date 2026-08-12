"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  Search,
  Car,
  Calendar,
  Fuel,
  Settings,
  Gauge,
  Globe,
} from "lucide-react";

import { Header } from "@/components/header";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VehicleHistoryPanel } from "@/components/vehicle-history";
import { decodeVin, isValidVinFormat, hasVinData, type VinResult } from "@/lib/vin";

const SPEC_ITEMS: {
  key: keyof VinResult;
  label: string;
  icon: typeof Car;
}[] = [
  { key: "manufacturer", label: "制造商", icon: Car },
  { key: "make", label: "品牌", icon: Car },
  { key: "model", label: "车型", icon: Car },
  { key: "year", label: "年份", icon: Calendar },
  { key: "trim", label: "配置", icon: Settings },
  { key: "vehicleType", label: "车辆类型", icon: Car },
  { key: "bodyClass", label: "车身类型", icon: Car },
  { key: "driveType", label: "驱动方式", icon: Settings },
  { key: "fuelType", label: "燃油类型", icon: Fuel },
  { key: "transmission", label: "变速箱", icon: Settings },
  { key: "engineCylinders", label: "气缸数", icon: Gauge },
  { key: "engineDisplacement", label: "排量 (L)", icon: Gauge },
  { key: "engineHP", label: "马力 (HP)", icon: Gauge },
  { key: "doors", label: "车门数", icon: Car },
  { key: "plantCountry", label: "产地", icon: Globe },
  { key: "plantCity", label: "生产城市", icon: Globe },
];

export default function VinPage() {
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<VinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const cleaned = vin.trim().toUpperCase();
    if (!isValidVinFormat(cleaned)) {
      setError("请输入有效的 17 位 VIN 码");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const data = await decodeVin(cleaned);

    if (!data || !hasVinData(data)) {
      setError("无法识别此 VIN，请确认输入是否正确");
    } else {
      setResult(data);
    }

    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">

      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            VIN Decoder
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <h1 className="font-logo text-2xl tracking-tight">
          VIN 车辆认证
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          输入 17 位 VIN 码，查询车辆出厂信息，验证车辆真实性
        </p>

        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="mt-6 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="输入 17 位 VIN 码，如 1HGCM82633A004352"
              className="pl-10 font-mono text-sm uppercase"
              value={vin}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
                setVin(v);
                if (searched) {
                  setSearched(false);
                  setResult(null);
                  setError("");
                }
              }}
              maxLength={17}
            />
          </div>
          <Button
            type="submit"
            className="gap-1.5 font-mono text-xs"
            disabled={loading || vin.length !== 17}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            查询
          </Button>
        </form>

        {/* VIN length indicator */}
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          {vin.length}/17 位
        </p>

        {/* Error */}
        {error && (
          <div
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 dark:bg-red-950/30"
          >
            <ShieldX className="h-5 w-5 shrink-0 text-red-500" strokeWidth={1.5} />
            <span className="font-mono text-xs text-red-600 dark:text-red-400">
              {error}
            </span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className="mt-6"
          >
            {/* Title card */}
            <div className="rounded-xl bg-green-50 p-4 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                <span className="font-mono text-sm font-semibold text-green-700 dark:text-green-300">
                  VIN 解码成功
                </span>
              </div>
              <p className="mt-2 font-mono text-lg font-bold">
                {[
                  result.year || "",
                  result.make || result.manufacturer || "",
                  result.model || "",
                  result.trim || "",
                ].filter(Boolean).join(" ") || result.vehicleType}
              </p>
              {result.vehicleType && result.vehicleType !== "PASSENGER CAR" && (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  类型: {result.vehicleType}
                </p>
              )}
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                VIN: {vin}
              </p>
            </div>

            {/* Specs grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SPEC_ITEMS.map(({ key, label, icon: Icon }) => {
                const value = String(result[key] || "");
                if (!value || value === "0") return null;
                return (
                  <div key={key} className="rounded-xl bg-card p-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs font-medium">{value}</p>
                  </div>
                );
              })}
            </div>

            {/* Vehicle History */}
            {result.make && result.model && result.year > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h2 className="font-mono text-sm font-semibold">
                    事故与召回记录
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    查询 {result.year} {result.make} {result.model} 的安全召回、投诉和碰撞评级
                  </p>
                  <div className="mt-3">
                    <VehicleHistoryPanel
                      make={result.make}
                      model={result.model}
                      year={result.year}
                      autoLoad
                    />
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <p className="mt-6 font-mono text-[10px] text-muted-foreground">
              数据来源: NHTSA (美国国家公路交通安全管理局)。出厂信息和召回/投诉数据针对该品牌车型年款。如需查询特定车辆的事故历史，请使用 CarFax 或 AutoCheck。
            </p>
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && (
          <div className="mt-12 flex flex-col items-center py-8">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              输入 VIN 码开始查询
            </p>
            <div className="mt-4 rounded-xl bg-card p-4">
              <p className="font-mono text-[11px] font-medium">VIN 码在哪里找？</p>
              <ul className="mt-2 space-y-1.5">
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 驾驶座侧仪表盘底部（挡风玻璃可见）
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 驾驶座侧车门框上的铭牌
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 车辆行驶证 (Title / Registration)
                </li>
                <li className="font-mono text-[11px] text-muted-foreground">
                  · 保险卡或保险单
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
