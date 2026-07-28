"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import { Input } from "@/components/ui/input";

function Row({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <div>
      <label className="font-mono text-xs font-medium">{label}</label>
      <div className="relative mt-1.5">
        <Input
          className="pr-16 font-mono"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

export default function FuelToolPage() {
  const [gasPrice, setGasPrice] = useState("4.5");
  const [mpg, setMpg] = useState("30");
  const [miles, setMiles] = useState("1000");

  const p = parseFloat(gasPrice) || 0;
  const m = parseFloat(mpg) || 0;
  const mi = parseFloat(miles) || 0;
  const monthly = m > 0 ? (mi / m) * p : 0;
  const perMile = m > 0 ? p / m : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="font-mono text-lg font-bold">油费计算器</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          按油价、油耗和月里程,估算每月油钱
        </p>
        <div className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4">
          <Row label="当地油价" value={gasPrice} onChange={setGasPrice} suffix="$/加仑" />
          <Row label="车辆油耗" value={mpg} onChange={setMpg} suffix="MPG" />
          <Row label="每月里程" value={miles} onChange={setMiles} suffix="miles" />
        </div>
        <div className="mt-3 rounded-xl bg-primary/10 p-4">
          <p className="font-mono text-xs text-muted-foreground">预计油费</p>
          <p className="mt-1 font-mono text-2xl font-bold text-primary">
            ${monthly.toFixed(0)}<span className="text-sm font-medium">/月</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            约 ${(monthly * 12).toFixed(0)}/年 · 每 mile 约 ${perMile.toFixed(2)}
          </p>
        </div>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">
          * 估算值仅供参考;混动/电车油耗差异较大
        </p>
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
