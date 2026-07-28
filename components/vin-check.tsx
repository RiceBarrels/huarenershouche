"use client";

import { useState, useEffect } from "react";
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
  Shield,
  Eye,
  Zap,
  Weight,
} from "lucide-react";
import { decodeVin, verifyVinMatch, hasVinData, type VinResult } from "@/lib/vin";

interface VinCheckProps {
  vin: string;
  car: { make: string; year: number; model: string };
}

type SpecGroup = {
  title: string;
  icon: typeof Car;
  items: { key: keyof VinResult; label: string }[];
};

const SPEC_GROUPS: SpecGroup[] = [
  {
    title: "基本信息",
    icon: Car,
    items: [
      { key: "manufacturer", label: "制造商" },
      { key: "make", label: "品牌" },
      { key: "model", label: "车型" },
      { key: "year", label: "年份" },
      { key: "trim", label: "配置" },
      { key: "vehicleType", label: "车辆类型" },
      { key: "bodyClass", label: "车身类型" },
      { key: "doors", label: "车门数" },
      { key: "seats", label: "座位数" },
    ],
  },
  {
    title: "动力系统",
    icon: Gauge,
    items: [
      { key: "engineConfig", label: "发动机布局" },
      { key: "engineCylinders", label: "气缸数" },
      { key: "engineDisplacement", label: "排量 (L)" },
      { key: "engineHP", label: "马力 (HP)" },
      { key: "engineKW", label: "功率 (kW)" },
      { key: "fuelType", label: "燃油类型" },
      { key: "transmission", label: "变速箱" },
      { key: "transmissionSpeeds", label: "挡位数" },
      { key: "driveType", label: "驱动方式" },
    ],
  },
  {
    title: "车身参数",
    icon: Weight,
    items: [
      { key: "curbWeight", label: "整备质量 (lbs)" },
      { key: "gvwr", label: "总重 (GVWR)" },
      { key: "wheelBase", label: "轴距 (inches)" },
      { key: "bedType", label: "货箱类型" },
      { key: "cabType", label: "驾驶室类型" },
    ],
  },
  {
    title: "安全配置",
    icon: Shield,
    items: [
      { key: "airbagFront", label: "前排气囊" },
      { key: "airbagSide", label: "侧面气囊" },
      { key: "airbagCurtain", label: "帘式气囊" },
      { key: "airbagKnee", label: "膝部气囊" },
      { key: "abs", label: "防抱死 (ABS)" },
      { key: "esc", label: "车身稳定 (ESC)" },
      { key: "tractionControl", label: "牵引力控制" },
      { key: "tpms", label: "胎压监测" },
    ],
  },
  {
    title: "驾驶辅助",
    icon: Eye,
    items: [
      { key: "backupCamera", label: "倒车影像" },
      { key: "blindSpotMon", label: "盲点监测" },
      { key: "laneDeparture", label: "车道偏离预警" },
      { key: "forwardCollision", label: "前碰撞预警" },
      { key: "autoEmergencyBraking", label: "自动紧急制动" },
      { key: "adaptiveCruise", label: "自适应巡航" },
      { key: "parkAssist", label: "泊车辅助" },
    ],
  },
  {
    title: "电动化",
    icon: Zap,
    items: [
      { key: "evRange", label: "电动化等级" },
      { key: "batteryType", label: "电池类型" },
      { key: "batteryKWh", label: "电池容量 (kWh)" },
      { key: "chargerLevel", label: "充电等级" },
      { key: "chargerKW", label: "充电功率 (kW)" },
    ],
  },
  {
    title: "产地信息",
    icon: Globe,
    items: [
      { key: "plantCountry", label: "生产国" },
      { key: "plantCity", label: "生产城市" },
    ],
  },
];

export function VinCheck({ vin, car }: VinCheckProps) {
  const [vinData, setVinData] = useState<VinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  // Auto-load on mount
  useEffect(() => {
    if (vin && !checked && !loading) {
      handleCheck();
    }
  }, [vin]);

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

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" strokeWidth={1.5} />
        <span className="font-mono text-xs text-muted-foreground">正在解码 VIN...</span>
      </div>
    );
  }

  if (!checked) return null;

  if (error) {
    return (
      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
        <div className="flex items-center gap-2">
          <ShieldX className="h-4 w-4 shrink-0 text-red-500" strokeWidth={1.5} />
          <span className="font-mono text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        </div>
      </div>
    );
  }

  if (!vinData || !verification) return null;

  // Filter groups to only those with data
  const groupsWithData = SPEC_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const val = String(vinData[item.key] || "");
      return val && val !== "0" && val !== "Not Applicable";
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className={`mt-3 rounded-xl border p-3 ${
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

      {/* Key specs summary (always visible) */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-3">
        {vinData.engineDisplacement && (
          <span className="font-mono text-[11px]">{vinData.engineDisplacement}L</span>
        )}
        {vinData.engineHP && (
          <span className="font-mono text-[11px]">{vinData.engineHP} HP</span>
        )}
        {vinData.engineCylinders && (
          <span className="font-mono text-[11px]">{vinData.engineCylinders}缸</span>
        )}
        {vinData.transmission && (
          <span className="font-mono text-[11px]">{vinData.transmission}</span>
        )}
        {vinData.driveType && (
          <span className="font-mono text-[11px]">{vinData.driveType}</span>
        )}
        {vinData.plantCountry && (
          <span className="font-mono text-[11px] text-muted-foreground">产地: {vinData.plantCountry}</span>
        )}
      </div>

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
        {expanded ? "收起详情" : `查看全部 VIN 信息 (${groupsWithData.reduce((n, g) => n + g.items.length, 0)} 项)`}
      </button>

      {/* Detail specs grouped */}
      {expanded && (
        <div className="mt-3 space-y-4 border-t border-border/50 pt-3">
          {groupsWithData.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title}>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  <span className="font-mono text-[11px] font-semibold">{group.title}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {group.items.map(({ key, label }) => {
                    const value = String(vinData[key] || "");
                    return (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
                        <span className="text-right font-mono text-[11px] font-medium">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
