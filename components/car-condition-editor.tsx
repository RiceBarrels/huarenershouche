"use client";

// 车况清单填写(cars.condition,lib/car-condition.ts):发布向导的选填步与编辑页共用。
// 每项都可以不填:再点一次已选中的按钮即清除。只有固定选项,没有自由文本(细节写在描述里)。
// variant="wizard" 跟发布向导的胶囊样式(选中薄荷绿底 + 深墨字),"form" 跟编辑页的小号描边按钮。

import { useI18n } from "@/components/i18n-provider";
import {
  CONDITION_BOOL_KEYS,
  CONDITION_LABELS,
  KEYS_COUNT_MAX,
  KNOWN_ISSUES,
  TIRES_CONDITIONS,
  setConditionField,
  toggleKnownIssue,
  type CarCondition,
} from "@/lib/car-condition";

type Variant = "wizard" | "form";

const KEYS_OPTIONS = Array.from({ length: KEYS_COUNT_MAX + 1 }, (_, i) => i);

function chipClass(variant: Variant, active: boolean): string {
  return variant === "wizard"
    ? `rounded-full px-3.5 py-2 text-sm transition-colors ${
        active ? "bg-primary/30 font-medium text-brand-ink" : "bg-muted text-muted-foreground active:bg-muted/70"
      }`
    : `rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:bg-muted"
      }`;
}

export function CarConditionEditor({
  value,
  onChange,
  variant = "wizard",
  className = "",
}: {
  value: CarCondition;
  onChange: (next: CarCondition) => void;
  variant?: Variant;
  className?: string;
}) {
  const { t } = useI18n();
  const labelCls =
    variant === "wizard"
      ? "text-sm font-medium text-foreground"
      : "font-mono text-[11px] text-muted-foreground";
  const gap = variant === "wizard" ? "gap-2" : "gap-1.5";

  return (
    <div className={`${variant === "wizard" ? "space-y-5" : "space-y-3"} ${className}`}>
      {/* 是 / 否三项:同一行左标题右按钮 */}
      {CONDITION_BOOL_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className={labelCls}>{t(CONDITION_LABELS[key])}</span>
          <div className={`flex shrink-0 ${gap}`} role="radiogroup" aria-label={t(CONDITION_LABELS[key])}>
            {[true, false].map((v) => {
              const active = value[key] === v;
              return (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(setConditionField(value, key, active ? undefined : v))}
                  className={chipClass(variant, active)}
                >
                  {t(v ? "是" : "否")}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className={labelCls}>{t(CONDITION_LABELS.keys_count)}</p>
        <div className={`mt-2 flex flex-wrap ${gap}`} role="radiogroup" aria-label={t(CONDITION_LABELS.keys_count)}>
          {KEYS_OPTIONS.map((n) => {
            const active = value.keys_count === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(setConditionField(value, "keys_count", active ? undefined : n))}
                className={`${chipClass(variant, active)} min-w-10 tabular-nums`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={labelCls}>{t(CONDITION_LABELS.tires_condition)}</p>
        <div className={`mt-2 flex flex-wrap ${gap}`} role="radiogroup" aria-label={t(CONDITION_LABELS.tires_condition)}>
          {TIRES_CONDITIONS.map((v) => {
            const active = value.tires_condition === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(setConditionField(value, "tires_condition", active ? undefined : v))}
                className={chipClass(variant, active)}
              >
                {t(v)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={labelCls}>{t(CONDITION_LABELS.known_issues)}</p>
        <div className={`mt-2 flex flex-wrap ${gap}`}>
          {/* 「无已知问题」= known_issues: [],和没填不同;选了具体问题就自动取消 */}
          <button
            type="button"
            aria-pressed={value.known_issues?.length === 0}
            onClick={() => onChange(toggleKnownIssue(value, null))}
            className={chipClass(variant, value.known_issues?.length === 0)}
          >
            {t("无已知问题")}
          </button>
          {KNOWN_ISSUES.map((issue) => {
            const active = !!value.known_issues?.includes(issue);
            return (
              <button
                key={issue}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(toggleKnownIssue(value, issue))}
                className={chipClass(variant, active)}
              >
                {t(issue)}
              </button>
            );
          })}
        </div>
      </div>

      <p className={variant === "wizard" ? "text-xs text-muted-foreground" : "font-mono text-[10px] text-muted-foreground"}>
        {t("没填的项不会显示，其他情况请写在描述里")}
      </p>
    </div>
  );
}
