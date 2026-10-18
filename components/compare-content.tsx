"use client";

// 车辆对比内容:/compare 页与移动端 drawer 共用。
// 只展示已加入对比的车辆(在车源卡片/详情页添加),此处不提供添加入口。

import { useEffect, useState } from "react";
import { X, Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCompareIds, removeFromCompare } from "@/lib/compare";
import { Badge } from "@/components/ui/badge";
import { MAKES_ZH } from "@/lib/mock-data";
import { useI18n } from "@/components/i18n-provider";
import { useTermLabels } from "@/hooks/use-term-labels";
import { carLocation, carTitle, brandLabel, type Locale } from "@/lib/i18n";
import { normTag } from "@/lib/i18n/hashtags";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles);
}

const COMPARE_FIELDS: { key: keyof DbCar | "make_zh" | "account_type"; label: string }[] = [
  { key: "make_zh", label: "品牌" },
  { key: "year", label: "年份" },
  { key: "price", label: "价格" },
  { key: "mileage", label: "里程" },
  { key: "fuel_type", label: "燃油类型" },
  { key: "transmission", label: "变速箱" },
  { key: "drivetrain", label: "驱动方式" },
  { key: "exterior_color", label: "外观颜色" },
  { key: "interior_color", label: "内饰颜色" },
  { key: "location_zh", label: "所在地" },
  { key: "account_type", label: "卖家类型" },
  { key: "views_count", label: "浏览量" },
];

function getCellValue(
  car: DbCar,
  key: string,
  t: (text: string) => string,
  locale: Locale,
): string {
  switch (key) {
    case "make_zh":
      // zh「宝马 BMW」/ ko「도요타 Toyota」/ en「Toyota」
      return brandLabel(car.make, MAKES_ZH[car.make], t, locale);
    case "price":
      return formatPrice(car.price);
    case "mileage":
      return `${formatMileage(car.mileage)} mi`;
    case "account_type":
      return car.profiles?.account_type === "dealer" ? t("车行") : t("个人");
    case "views_count":
      return String(car.views_count || 0);
    case "location_zh":
      return carLocation(car, locale) || "—";
    case "fuel_type":
    case "transmission":
    case "drivetrain":
    case "exterior_color":
    case "interior_color": {
      const value = (car as unknown as Record<string, unknown>)[key];
      return value ? t(String(value)) : "—";
    }
    default:
      return String((car as unknown as Record<string, unknown>)[key] || "—");
  }
}

// 卖家原始配置标签(features_original;SQL 未上线时只有 features),规范化后为空的不算
function featureRaws(car: DbCar): string[] {
  return (car.features_original ?? car.features ?? []).filter((raw) => normTag(raw) !== null);
}

type FeatureChip = { key: string; label: string };

/** 一辆车的配置:按术语 key 去重(同一配置的中英文双写只留一条),标签为当前界面语言 */
function featureChips(car: DbCar, labels: Record<string, FeatureChip>): FeatureChip[] {
  const seen = new Set<string>();
  const chips: FeatureChip[] = [];
  for (const raw of featureRaws(car)) {
    const chip = labels[raw];
    if (seen.has(chip.key)) continue;
    seen.add(chip.key);
    chips.push(chip);
  }
  return chips;
}

export function CompareContent() {
  const { t, locale } = useI18n();
  const [ids, setIds] = useState<string[]>([]);
  const [cars, setCars] = useState<Map<string, DbCar>>(new Map());

  useEffect(() => {
    setIds(getCompareIds());
    function onCompareChange() {
      setIds(getCompareIds());
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, []);

  useEffect(() => {
    const missing = ids.filter((id) => !cars.has(id));
    if (missing.length === 0) return;
    supabase
      .from("cars")
      .select("*, profiles!seller_id(account_type)")
      .in("id", missing)
      .then(({ data }) => {
        if (data) {
          setCars((prev) => {
            const next = new Map(prev);
            for (const car of data as DbCar[]) next.set(car.id, car);
            return next;
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const selected = ids.map((id) => cars.get(id)).filter(Boolean) as DbCar[];
  // 所有对比车的原始标签一次查术语表(未归并的回退 UI 词典)
  const featureLabels = useTermLabels("feature", [...new Set(selected.flatMap(featureRaws))]);

  function getBestValue(key: string): string | null {
    if (selected.length < 2) return null;
    switch (key) {
      case "price":
        return selected.reduce((a, b) => (a.price < b.price ? a : b)).id;
      case "mileage":
        return selected.reduce((a, b) => (a.mileage < b.mileage ? a : b)).id;
      case "year":
        return selected.reduce((a, b) => (a.year > b.year ? a : b)).id;
      default:
        return null;
    }
  }

  if (ids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Scale className="h-10 w-10 text-muted-foreground/40" strokeWidth={1} />
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          {t("还没有对比车辆")}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
          {t("在车源卡片或详情页点「对比」添加,最多 3 辆")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 已选车辆 */}
      <div className="grid grid-cols-3 gap-3">
        {selected.map((car) => (
          <div key={car.id} className="relative overflow-hidden rounded-xl bg-card">
            <div className="aspect-[16/10] overflow-hidden bg-muted">
              {car.image_url ? (
                <img
                  src={car.image_url}
                  alt={carTitle(car, locale)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                  {t("暂无图片")}
                </div>
              )}
            </div>
            <button
              onClick={() => removeFromCompare(car.id)}
              aria-label={t("移出对比")}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
            <div className="p-2">
              <p className="truncate font-mono text-xs font-semibold">
                {carTitle(car, locale)}
              </p>
              <p className="font-mono text-sm font-bold">
                {formatPrice(car.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 对比表 */}
      {selected.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {COMPARE_FIELDS.map((field) => {
                const bestId = getBestValue(field.key);
                return (
                  <tr key={field.key} className="border-b border-border">
                    <td className="whitespace-nowrap bg-muted/30 px-3 py-2.5 font-mono text-[11px] font-medium text-muted-foreground">
                      {t(field.label)}
                    </td>
                    {selected.map((car) => (
                      <td
                        key={car.id}
                        className={`px-3 py-2.5 font-mono text-xs ${
                          bestId === car.id
                            ? "font-semibold text-green-600 dark:text-green-400"
                            : ""
                        }`}
                      >
                        {getCellValue(car, field.key, t, locale)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {/* Features row */}
              <tr className="border-b border-border">
                <td className="whitespace-nowrap bg-muted/30 px-3 py-2.5 font-mono text-[11px] font-medium text-muted-foreground">
                  {t("配置")}
                </td>
                {selected.map((car) => {
                  const chips = featureChips(car, featureLabels);
                  return (
                    <td key={car.id} className="px-3 py-2.5">
                      {chips.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {chips.map((f) => (
                            <Badge
                              key={f.key}
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {f.label}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
