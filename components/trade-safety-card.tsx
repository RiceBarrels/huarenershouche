"use client";

import { ChevronDown, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

// 车辆详情页联系区下方的「交易安全提示」折叠卡片:默认收起,只占一行。
// 手机端是页面内的普通流式元素,底部固定联系栏不受影响(不会被顶开)。
// 文案尽量不区分国家(产权证/VIN 措辞在北美/澳新都通用)。
const BUYER_TIPS = [
  "付款前先看车,并核对产权证和 VIN 与车辆一致",
  "不要为了「留车」提前付定金",
  "价格明显低于市场又催你马上付款,要格外警惕",
] as const;

const SELLER_TIPS = [
  "收到本票先打电话给开票银行核实真伪",
  "款项确认到账后再交出产权证",
  "不要接受「多付再退差价」的付款方式",
] as const;

export function TradeSafetyCard() {
  const { t } = useI18n();

  return (
    <details className="group mt-4 rounded-xl bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 font-mono text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="flex-1">{t("交易安全提示")}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          strokeWidth={1.5}
        />
      </summary>
      <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
        <TipList heading={t("买家")} tips={BUYER_TIPS.map((k) => t(k))} />
        <TipList heading={t("卖家")} tips={SELLER_TIPS.map((k) => t(k))} />
      </div>
    </details>
  );
}

function TipList({ heading, tips }: { heading: string; tips: string[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] font-semibold text-foreground">{heading}</p>
      <ul className="mt-1 space-y-1">
        {tips.map((tip) => (
          <li
            key={tip}
            className="flex gap-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground"
          >
            <span aria-hidden className="shrink-0">·</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
