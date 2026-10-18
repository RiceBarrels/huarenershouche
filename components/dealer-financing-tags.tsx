"use client";

// 车源详情卖家卡片里的车行贷款 / 付款方式标签(dealer_stores.financing,lib/dealer-financing.ts):
// 卖家名下全部门店标签的并集,点一下展开一句白话解释(并记一次点击统计 kind = financing_tag);
// 标签下固定一行「具体条件以车行为准，本站不提供贷款」。
// 没有标签 / 不是门店卖家 / dealer-financing.sql 未执行(列不存在)时整块不渲染。
// 调用方用 key={sellerId} 挂载,换卖家时整体重置。

import { useEffect, useId, useState } from "react";
import { HandCoins } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { loadSellerFinancing } from "@/lib/dealer-financing-client";
import { FINANCING_DISCLAIMER, FINANCING_EXPLAIN, type FinancingTag } from "@/lib/dealer-financing";
import { trackFinancingTagClick } from "@/lib/analytics/client";

export function DealerFinancingTags({ sellerId, carId }: { sellerId: string; carId: string }) {
  const { t, locale } = useI18n();
  const [tags, setTags] = useState<FinancingTag[]>([]);
  const [open, setOpen] = useState<FinancingTag | null>(null);
  const panelId = useId();

  useEffect(() => {
    let cancelled = false;
    loadSellerFinancing(sellerId).then((list) => {
      if (!cancelled) setTags(list);
    });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (tags.length === 0) return null;

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-expanded={open === tag}
            aria-controls={panelId}
            onClick={() => {
              const next = open === tag ? null : tag;
              setOpen(next);
              if (next) trackFinancingTagClick(carId, next, locale);
            }}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors ${
              open === tag
                ? "border-foreground/30 bg-muted text-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            <HandCoins className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
            {t(tag)}
          </button>
        ))}
      </div>
      {open && (
        <p id={panelId} className="mt-1.5 font-mono text-[11px] leading-relaxed text-foreground/80">
          {t(FINANCING_EXPLAIN[open])}
        </p>
      )}
      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">{t(FINANCING_DISCLAIMER)}</p>
    </div>
  );
}
