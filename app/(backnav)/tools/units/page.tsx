"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import { Input } from "@/components/ui/input";

function Pair({
  title, aLabel, bLabel, aToB, bToA,
}: {
  title: string; aLabel: string; bLabel: string;
  aToB: (n: number) => number; bToA: (n: number) => number;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  function onA(v: string) {
    const clean = v.replace(/[^0-9.]/g, "").slice(0, 10);
    setA(clean);
    const n = parseFloat(clean);
    setB(Number.isFinite(n) ? String(Math.round(aToB(n) * 100) / 100) : "");
  }
  function onB(v: string) {
    const clean = v.replace(/[^0-9.]/g, "").slice(0, 10);
    setB(clean);
    const n = parseFloat(clean);
    setA(Number.isFinite(n) ? String(Math.round(bToA(n) * 100) / 100) : "");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-xs font-medium">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <Input className="font-mono" inputMode="decimal" value={a} onChange={(e) => onA(e.target.value)} />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{aLabel}</p>
        </div>
        <span className="pb-4 font-mono text-muted-foreground">=</span>
        <div className="flex-1">
          <Input className="font-mono" inputMode="decimal" value={b} onChange={(e) => onB(e.target.value)} />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{bLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default function UnitsToolPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="font-logo text-xl">单位换算</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          美国车相关单位快速换算
        </p>
        <div className="mt-4 space-y-3">
          <Pair title="里程" aLabel="英里 (mi)" bLabel="公里 (km)" aToB={(n) => n * 1.60934} bToA={(n) => n / 1.60934} />
          <Pair title="油耗" aLabel="MPG" bLabel="升/百公里 (L/100km)" aToB={(n) => (n > 0 ? 235.215 / n : 0)} bToA={(n) => (n > 0 ? 235.215 / n : 0)} />
          <Pair title="容积" aLabel="加仑 (gal)" bLabel="升 (L)" aToB={(n) => n * 3.78541} bToA={(n) => n / 3.78541} />
          <Pair title="功率" aLabel="马力 (hp)" bLabel="千瓦 (kW)" aToB={(n) => n * 0.7457} bToA={(n) => n / 0.7457} />
        </div>
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
