"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
  CarFront,
  CircleAlert,
  FileWarning,
  Ban,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import {
  fetchVehicleHistory,
  type VehicleHistory as VehicleHistoryData,
  type RecallItem,
  type ComplaintItem,
} from "@/lib/vehicle-history";

function RatingStars({ rating }: { rating: string }) {
  const { t } = useI18n();
  const num = parseInt(rating);
  if (!num || num < 1) return <span className="font-mono text-[11px] text-muted-foreground">{t("未评级")}</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= num ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          }`}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1 font-mono text-xs font-semibold">{num}/5</span>
    </div>
  );
}

function RecallCard({ recall }: { recall: RecallItem }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    // 整卡可点展开:hover 轻微变色提示可交互(触屏无 hover,不影响手机)
    <div className="rounded-xl bg-card p-3 transition-colors hover:bg-muted/40">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="font-mono text-xs font-medium">{recall.component}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {recall.reportDate} · #{recall.campaignNumber}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div>
                <span className="font-mono text-[10px] font-medium text-muted-foreground">{t("问题描述")}</span>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{recall.summary}</p>
              </div>
              {recall.consequence && (
                <div>
                  <span className="font-mono text-[10px] font-medium text-red-500">{t("潜在后果")}</span>
                  <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{recall.consequence}</p>
                </div>
              )}
              {recall.remedy && (
                <div>
                  <span className="font-mono text-[10px] font-medium text-green-600 dark:text-green-400">{t("解决方案")}</span>
                  <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{recall.remedy}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComplaintCard({ complaint }: { complaint: ComplaintItem }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const hasSeverity = complaint.crash || complaint.injuries > 0 || complaint.deaths > 0;
  return (
    // 同 RecallCard:hover 变色提示整卡可展开
    <div className="rounded-xl bg-card p-3 transition-colors hover:bg-muted/40">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="font-mono text-xs font-medium">{complaint.components}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              {complaint.dateOfIncident || complaint.dateComplaintFiled}
            </span>
            {complaint.crash && (
              <span className="flex items-center gap-0.5 font-mono text-[10px] font-semibold text-red-500">
                <CarFront className="h-2.5 w-2.5" strokeWidth={2} />
                {t("碰撞")}
              </span>
            )}
            {complaint.injuries > 0 && (
              <span className="font-mono text-[10px] font-semibold text-red-500">
                {t("{n} 人受伤", { n: complaint.injuries })}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mt-3 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {complaint.summary}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface VehicleHistoryProps {
  make: string;
  model: string;
  year: number;
  autoLoad?: boolean;
}

export function VehicleHistoryPanel({ make, model, year, autoLoad = false }: VehicleHistoryProps) {
  const { t } = useI18n();
  const [data, setData] = useState<VehicleHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"recalls" | "complaints">("recalls");
  const [complaintsShown, setComplaintsShown] = useState(10);

  useEffect(() => {
    if (autoLoad && make && model && year) {
      handleLoad();
    }
  }, [autoLoad, make, model, year]);

  async function handleLoad() {
    if (!make || !model || !year) return;
    setLoading(true);
    const result = await fetchVehicleHistory(make, model, year);
    setData(result);
    setLoaded(true);
    setLoading(false);
  }

  if (!loaded && !loading) {
    return (
      <button
        type="button"
        className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        onClick={handleLoad}
      >
        <Search className="h-3 w-3" strokeWidth={1.5} />
        {t("查询该车型的 NHTSA 召回与安全评级（针对车型年款，非本车记录）")}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
        <span className="font-mono text-xs text-muted-foreground">
          {t("正在查询 {year} {make} {model} 的记录...", { year, make, model })}
        </span>
      </div>
    );
  }

  if (!data) return null;

  const crashComplaints = data.complaints.filter((c) => c.crash);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card p-3">
          <div className="flex items-center gap-1.5">
            <FileWarning className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.5} />
            <span className="font-mono text-[10px] text-muted-foreground">{t("安全召回")}</span>
          </div>
          <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${data.recalls.length > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {data.recalls.length}
          </p>
        </div>
        <div className="rounded-xl bg-card p-3">
          <div className="flex items-center gap-1.5">
            <CircleAlert className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[10px] text-muted-foreground">{t("投诉记录")}</span>
          </div>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums">{data.complaints.length}</p>
        </div>
        <div className="rounded-xl bg-card p-3">
          <div className="flex items-center gap-1.5">
            <CarFront className="h-3.5 w-3.5 text-red-500" strokeWidth={1.5} />
            <span className="font-mono text-[10px] text-muted-foreground">{t("涉及碰撞")}</span>
          </div>
          <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${crashComplaints.length > 0 ? "text-red-500" : ""}`}>
            {crashComplaints.length}
          </p>
        </div>
      </div>

      {/* Safety rating */}
      {data.safetyRating && (
        <div className="rounded-xl bg-card p-4">
          <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("NHTSA 安全评级")}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">{t("综合评分")}</span>
              <div className="mt-1">
                <RatingStars rating={data.safetyRating.overallRating} />
              </div>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">{t("正面碰撞")}</span>
              <div className="mt-1">
                <RatingStars rating={data.safetyRating.frontCrashRating} />
              </div>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">{t("侧面碰撞")}</span>
              <div className="mt-1">
                <RatingStars rating={data.safetyRating.sideCrashRating} />
              </div>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">{t("翻车风险")}</span>
              <div className="mt-1">
                <RatingStars rating={data.safetyRating.rolloverRating} />
              </div>
              {data.safetyRating.rolloverPossibility > 0 && (
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {t("翻车概率 {pct}%", { pct: (data.safetyRating.rolloverPossibility * 100).toFixed(1) })}
                </p>
              )}
            </div>
          </div>
          {data.safetyRating.frontCrashPicture && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              <img
                src={data.safetyRating.frontCrashPicture}
                alt={t("正面碰撞测试")}
                className="h-20 rounded-lg border border-border object-cover"
              />
              {data.safetyRating.sideCrashPicture && (
                <img
                  src={data.safetyRating.sideCrashPicture}
                  alt={t("侧面碰撞测试")}
                  className="h-20 rounded-lg border border-border object-cover"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs: Recalls / Complaints */}
      <div>
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("recalls")}
            className={`px-4 py-2 font-mono text-xs transition-colors ${
              activeTab === "recalls"
                ? "border-b-2 border-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("召回记录")} ({data.recalls.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("complaints")}
            className={`px-4 py-2 font-mono text-xs transition-colors ${
              activeTab === "complaints"
                ? "border-b-2 border-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("投诉记录")} ({data.complaints.length})
          </button>
        </div>

        <div className="mt-3">
          {activeTab === "recalls" && (
            data.recalls.length > 0 ? (
              <div className="space-y-2">
                {data.recalls.map((recall) => (
                  <RecallCard key={recall.campaignNumber} recall={recall} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-6">
                <ShieldCheck className="h-4 w-4 text-green-500" strokeWidth={1.5} />
                <span className="font-mono text-xs text-muted-foreground">
                  {t("该车型暂无安全召回记录")}
                </span>
              </div>
            )
          )}

          {activeTab === "complaints" && (
            data.complaints.length > 0 ? (
              <div className="space-y-2">
                {data.complaints.slice(0, complaintsShown).map((complaint) => (
                  <ComplaintCard key={complaint.odiNumber} complaint={complaint} />
                ))}
                {data.complaints.length > complaintsShown && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full font-mono text-[11px] text-muted-foreground"
                    onClick={() => setComplaintsShown((n) => n + 20)}
                  >
                    {t("加载更多 ({n} 条剩余)", { n: data.complaints.length - complaintsShown })}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-6">
                <ShieldCheck className="h-4 w-4 text-green-500" strokeWidth={1.5} />
                <span className="font-mono text-xs text-muted-foreground">
                  {t("该车型暂无投诉记录")}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="font-mono text-[10px] text-muted-foreground">
        {t("数据来源: NHTSA (美国国家公路交通安全管理局)。召回和投诉数据针对该品牌车型年款，并非特定于某辆车。如需查询特定车辆的事故历史，请使用 CarFax 或 AutoCheck。")}
      </p>
    </motion.div>
  );
}
