"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import Link from "@/components/localized-navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { paymentToPrice, LOAN_ASSUMPTION } from "@/lib/format";
import { useI18n } from "@/components/i18n-provider";

export default function BudgetToolPage() {
  const { t } = useI18n();
  const [monthly, setMonthly] = useState("400");
  const [down, setDown] = useState("0");

  const m = parseInt(monthly, 10) || 0;
  const d = parseInt(down, 10) || 0;
  const price = m > 0 ? paymentToPrice(m) + d : d;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="font-logo text-xl">{t("预算估车价")}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {t("用能接受的月供反推可以买多贵的车")}
        </p>
        <div className="mt-4 space-y-4 rounded-xl bg-card p-4">
          <div>
            <label className="font-mono text-xs font-medium">{t("每月预算 ($/月)")}</label>
            <Input
              className="mt-1.5 font-mono"
              inputMode="numeric"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value.replace(/\D/g, "").slice(0, 5))}
            />
          </div>
          <div>
            <label className="font-mono text-xs font-medium">{t("首付 ($)")}</label>
            <Input
              className="mt-1.5 font-mono"
              inputMode="numeric"
              value={down}
              onChange={(e) => setDown(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-primary/30 p-4">
          <p className="font-mono text-xs text-muted-foreground">{t("约可购买")}</p>
          <p className="mt-1 font-mono text-2xl font-bold text-brand-ink">
            {t("${price} 以内", { price: price.toLocaleString() })}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {t("按 {apr}% APR / {months} 期估算", { apr: (LOAN_ASSUMPTION.apr * 100).toFixed(1), months: LOAN_ASSUMPTION.months })}
          </p>
        </div>
        {price > 0 && (
          <Button asChild className="mt-4 w-full font-mono text-sm">
            <Link href={`/browse?maxPrice=${price}`}>{t("按此预算看车")}</Link>
          </Button>
        )}
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
