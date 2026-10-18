"use client";

// 车源详情的车况清单(cars.condition,lib/car-condition.ts):只列卖家填了的项,整张没填(或列不存在)不渲染。
// 取值都是固定枚举 / 是否,t() 渲染;已知问题用中性琥珀标签(和非清白产权同一套警示色,不用红色),
// 「无已知问题」(known_issues = [])单独显示一行。底部一句提示:以上由卖家填写。

import { CircleAlert } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { CONDITION_BOOL_KEYS, CONDITION_LABELS, normalizeCarCondition } from "@/lib/car-condition";

export function CarConditionChecklist({ value, className = "" }: { value: unknown; className?: string }) {
  const { t } = useI18n();
  const c = normalizeCarCondition(value);
  if (Object.keys(c).length === 0) return null;

  // [标题, 值]:是否 / 钥匙数 / 轮胎状况,没填的项不出现
  const rows: [string, string][] = [];
  for (const k of CONDITION_BOOL_KEYS) {
    const v = c[k];
    if (v !== undefined) rows.push([CONDITION_LABELS[k], t(v ? "是" : "否")]);
  }
  if (c.keys_count !== undefined) rows.push([CONDITION_LABELS.keys_count, String(c.keys_count)]);
  if (c.tires_condition) rows.push([CONDITION_LABELS.tires_condition, t(c.tires_condition)]);

  return (
    <div className={className}>
      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t("车况清单")}
      </h2>
      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map(([label, v]) => (
            <div key={label} className="rounded-md border border-border bg-card px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{t(label)}</dt>
              <dd className="mt-0.5 font-mono text-sm font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {c.known_issues && (
        <div className="mt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {t(CONDITION_LABELS.known_issues)}
          </p>
          {c.known_issues.length === 0 ? (
            <p className="mt-1 font-mono text-sm">{t("无已知问题")}</p>
          ) : (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {c.known_issues.map((issue) => (
                <li
                  key={issue}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-800 dark:text-amber-300"
                >
                  <CircleAlert className="h-3 w-3" strokeWidth={1.5} />
                  {t(issue)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">{t("以上由卖家填写，看车时请自行核实")}</p>
    </div>
  );
}
