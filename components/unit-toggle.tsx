"use client";

// 价格币种 / 里程单位切换(cars.currency / cars.mileage_unit,lib/currency.ts):发布页与编辑页共用的两选一分段按钮。
// variant="wizard" 跟发布向导的胶囊样式(选中薄荷绿底 + 深墨字),"form" 跟编辑页的小号描边按钮。

import { useI18n } from "@/components/i18n-provider";
import { CURRENCIES, MILEAGE_UNITS, type Currency, type MileageUnit } from "@/lib/currency";

const CURRENCY_LABEL: Record<Currency, string> = { USD: "美元 (USD)", CAD: "加元 (CAD)" };
const MILEAGE_UNIT_LABEL: Record<MileageUnit, string> = { mi: "英里 (mi)", km: "公里 (km)" };

type Variant = "wizard" | "form";

function Segmented<T extends string>({
  options,
  labels,
  value,
  onChange,
  ariaLabel,
  variant,
  className = "",
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  variant: Variant;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o === value;
        const cls =
          variant === "wizard"
            ? `rounded-full px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-primary/30 font-medium text-brand-ink" : "bg-muted text-muted-foreground active:bg-muted/70"
              }`
            : `rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`;
        return (
          <button key={o} type="button" role="radio" aria-checked={active} onClick={() => onChange(o)} className={cls}>
            {t(labels[o])}
          </button>
        );
      })}
    </div>
  );
}

export function CurrencyToggle({
  value,
  onChange,
  variant = "wizard",
  className,
}: {
  value: Currency;
  onChange: (v: Currency) => void;
  variant?: Variant;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Segmented
      options={CURRENCIES}
      labels={CURRENCY_LABEL}
      value={value}
      onChange={onChange}
      ariaLabel={t("币种")}
      variant={variant}
      className={className}
    />
  );
}

export function MileageUnitToggle({
  value,
  onChange,
  variant = "wizard",
  className,
}: {
  value: MileageUnit;
  onChange: (v: MileageUnit) => void;
  variant?: Variant;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Segmented
      options={MILEAGE_UNITS}
      labels={MILEAGE_UNIT_LABEL}
      value={value}
      onChange={onChange}
      ariaLabel={t("里程单位")}
      variant={variant}
      className={className}
    />
  );
}
