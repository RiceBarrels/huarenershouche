"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { LoanCalculator } from "@/components/loan-calculator";

export default function LoanToolPage() {
  const [price, setPrice] = useState("25000");
  const priceNum = parseInt(price, 10) || 0;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="font-mono text-lg font-bold">月供计算器</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          输入车价,调整首付与期数,估算每月还款
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <label className="font-mono text-xs font-medium">车价 ($)</label>
          <Input
            className="mt-1.5 font-mono"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 7))}
            placeholder="如 25000"
          />
        </div>
        {priceNum > 0 && (
          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            <LoanCalculator price={priceNum} />
          </div>
        )}
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
