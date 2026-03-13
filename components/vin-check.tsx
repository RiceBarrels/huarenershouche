"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  ChevronDown,
  ChevronUp,
  Car,
  Calendar,
  Fuel,
  Settings,
  Gauge,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { decodeVin, verifyVinMatch, hasVinData, type VinResult } from "@/lib/vin";

interface VinCheckProps {
  vin: string;
  car: { make: string; year: number; model: string };
}

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

export function VinCheck({ vin, car }: VinCheckProps) {
  const [vinData, setVinData] = useState<VinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  async function handleCheck() {
    setLoading(true);
    setError("");
    const result = await decodeVin(vin);
    if (!result || !hasVinData(result)) {
      setError("VIN 解码失败，请检查 VIN 是否正确");
      setLoading(false);
      setChecked(true);
      return;
    }
    setVinData(result);
    setChecked(true);
    setLoading(false);
  }

  const verification = vinData ? verifyVinMatch(vinData, car) : null;

  if (!checked) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-2 h-7 gap-1.5 font-mono text-[11px]"
        onClick={handleCheck}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        ) : (
          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
        )}
        VIN 认证
      </Button>
    );
  }

  if (error) {
    return (
      <div className="mt-3 border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
        <div className="flex items-center gap-2">
          <ShieldX className="h-4 w-4 shrink-0 text-red-500" strokeWidth={1.5} />
          <span className="font-mono text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-6 font-mono text-[10px] text-muted-foreground"
          onClick={() => {
            setChecked(false);
            setError("");
          }}
        >
          重试
        </Button>
      </div>
    );
  }

  if (!vinData || !verification) return null;

  return (
    <div
      className={`mt-3 border p-3 ${
        verification.matched
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
      }`}
    >
      {/* Status header */}
      <div className="flex items-center gap-2">
        {verification.matched ? (
          <ShieldCheck className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" strokeWidth={1.5} />
        ) : (
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
        )}
        <span
          className={`font-mono text-xs font-semibold ${
            verification.matched
              ? "text-green-700 dark:text-green-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {verification.matched ? "VIN 认证通过" : "VIN 信息存在差异"}
        </span>
      </div>

      {/* Mismatches */}
      {verification.mismatches.length > 0 && (
        <ul className="mt-2 space-y-1">
          {verification.mismatches.map((m, i) => (
            <li
              key={i}
              className="font-mono text-[11px] text-amber-700 dark:text-amber-300"
            >
              · {m}
            </li>
          ))}
        </ul>
      )}

      {/* Expand/collapse detail */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
        )}
        {expanded ? "收起详情" : "查看 VIN 详情"}
      </button>

      {/* Detail specs */}
      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/50 pt-3">
          {SPEC_ITEMS.map(({ key, label, icon: Icon }) => {
            const value = String(vinData[key] || "");
            if (!value || value === "0") return null;
            return (
              <div key={key} className="flex items-start gap-1.5">
                <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <p className="font-mono text-[11px] font-medium">{value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
