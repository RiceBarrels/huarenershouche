"use client";

import { useState } from "react";
import { Calculator, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";

// Simple estimation algorithm based on depreciation
function estimateValue(
  make: string,
  year: number,
  mileage: number,
  condition: string
): { low: number; mid: number; high: number } {
  // Base MSRP estimates by brand tier
  const brandTier: Record<string, number> = {
    Toyota: 32000,
    Honda: 30000,
    Nissan: 28000,
    Hyundai: 27000,
    Kia: 26000,
    Mazda: 29000,
    Subaru: 30000,
    Volkswagen: 31000,
    BMW: 48000,
    "Mercedes-Benz": 50000,
    Audi: 47000,
    Lexus: 45000,
    Acura: 38000,
    Tesla: 42000,
    Porsche: 65000,
  };

  const baseMsrp = brandTier[make] || 30000;
  const age = 2026 - year;

  // Depreciation: ~15% year 1, ~10% per year after
  let value = baseMsrp;
  if (age >= 1) value *= 0.85;
  for (let i = 1; i < age; i++) value *= 0.9;

  // Mileage adjustment: -$0.08 per mile over 12k/year average
  const expectedMiles = age * 12000;
  const mileageDiff = mileage - expectedMiles;
  if (mileageDiff > 0) value -= mileageDiff * 0.08;
  if (mileageDiff < 0) value += Math.abs(mileageDiff) * 0.04;

  // Condition adjustment
  const conditionMultiplier: Record<string, number> = {
    excellent: 1.1,
    good: 1.0,
    fair: 0.9,
    poor: 0.75,
  };
  value *= conditionMultiplier[condition] || 1.0;

  value = Math.max(value, 2000);
  const mid = Math.round(value / 100) * 100;

  return {
    low: Math.round((mid * 0.9) / 100) * 100,
    mid,
    high: Math.round((mid * 1.12) / 100) * 100,
  };
}

function calculateMonthlyPayment(
  carPrice: number,
  downPayment: number,
  apr: number,
  termMonths: number
): number {
  const principal = carPrice - downPayment;
  if (principal <= 0) return 0;
  if (apr === 0) return principal / termMonths;
  const monthlyRate = apr / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}

export default function ValuationPage() {
  const [make, setMake] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("good");
  const [result, setResult] = useState<{
    low: number;
    mid: number;
    high: number;
  } | null>(null);

  // Loan calculator state
  const [loanPrice, setLoanPrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [apr, setApr] = useState("6.5");
  const [loanTerm, setLoanTerm] = useState("60");
  const [loanResult, setLoanResult] = useState<number | null>(null);

  function handleEstimate(e: React.FormEvent) {
    e.preventDefault();
    if (!make || !year || !mileage) return;
    const val = estimateValue(
      make,
      Number(year),
      Number(mileage),
      condition
    );
    setResult(val);
  }

  const formatUsd = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">

      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" strokeWidth={1.5} />
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            车辆估价
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          输入车辆信息，快速获取参考估价
        </p>

        <form onSubmit={handleEstimate} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                品牌 *
              </Label>
              <Select value={make} onValueChange={setMake} required>
                <SelectTrigger className="mt-1 h-9 font-mono text-xs">
                  <SelectValue placeholder="选择品牌" />
                </SelectTrigger>
                <SelectContent>
                  {MAKES.map((m) => (
                    <SelectItem
                      key={m}
                      value={m}
                      className="font-mono text-xs"
                    >
                      {MAKES_ZH[m]} {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                年份 *
              </Label>
              <Select value={year} onValueChange={setYear} required>
                <SelectTrigger className="mt-1 h-9 font-mono text-xs">
                  <SelectValue placeholder="选择年份" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => 2026 - i).map((y) => (
                    <SelectItem
                      key={y}
                      value={String(y)}
                      className="font-mono text-xs"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                里程 (mi) *
              </Label>
              <Input
                className="mt-1 h-9 font-mono text-xs"
                type="number"
                placeholder="30000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                车况
              </Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1 h-9 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent" className="font-mono text-xs">
                    极好
                  </SelectItem>
                  <SelectItem value="good" className="font-mono text-xs">
                    良好
                  </SelectItem>
                  <SelectItem value="fair" className="font-mono text-xs">
                    一般
                  </SelectItem>
                  <SelectItem value="poor" className="font-mono text-xs">
                    较差
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="font-mono text-xs">
            估算价格
          </Button>
        </form>

        {result && (
          <div className="mt-8 border border-border">
            <div className="border-b border-border bg-card p-4">
              <h2 className="font-mono text-sm font-semibold">估价结果</h2>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                基于市场数据的参考价格区间
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingDown
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    低价
                  </span>
                </div>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {formatUsd(result.low)}
                </p>
              </div>
              <div className="bg-foreground/[0.02] p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Minus
                    className="h-3.5 w-3.5 text-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] font-medium">
                    建议价
                  </span>
                </div>
                <p className="mt-2 font-mono text-xl font-bold">
                  {formatUsd(result.mid)}
                </p>
              </div>
              <div className="p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    高价
                  </span>
                </div>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {formatUsd(result.high)}
                </p>
              </div>
            </div>
            <div className="border-t border-border p-3">
              <p className="font-mono text-[10px] text-muted-foreground/60">
                * 估价仅供参考，实际价格受市场供需、车况细节、地区差异等因素影响
              </p>
            </div>
          </div>
        )}
        {/* Loan Calculator */}
        <div className="mt-12 border-t border-border pt-8">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" strokeWidth={1.5} />
            <h1 className="font-mono text-lg font-semibold tracking-tight">
              贷款计算器
            </h1>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            输入购车价格，计算每月还款金额
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loanPrice) return;
              const monthly = calculateMonthlyPayment(
                Number(loanPrice),
                Number(downPayment || 0),
                Number(apr || 0),
                Number(loanTerm || 60)
              );
              setLoanResult(monthly);
            }}
            className="mt-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  车辆价格 ($) *
                </Label>
                <Input
                  className="mt-1 h-9 font-mono text-xs"
                  type="number"
                  placeholder="30000"
                  value={loanPrice}
                  onChange={(e) => setLoanPrice(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  首付金额 ($)
                </Label>
                <Input
                  className="mt-1 h-9 font-mono text-xs"
                  type="number"
                  placeholder="5000"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  年利率 APR (%)
                </Label>
                <Input
                  className="mt-1 h-9 font-mono text-xs"
                  type="number"
                  step="0.1"
                  placeholder="6.5"
                  value={apr}
                  onChange={(e) => setApr(e.target.value)}
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  分期期数 (月)
                </Label>
                <Select value={loanTerm} onValueChange={setLoanTerm}>
                  <SelectTrigger className="mt-1 h-9 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24" className="font-mono text-xs">24个月 (2年)</SelectItem>
                    <SelectItem value="36" className="font-mono text-xs">36个月 (3年)</SelectItem>
                    <SelectItem value="48" className="font-mono text-xs">48个月 (4年)</SelectItem>
                    <SelectItem value="60" className="font-mono text-xs">60个月 (5年)</SelectItem>
                    <SelectItem value="72" className="font-mono text-xs">72个月 (6年)</SelectItem>
                    <SelectItem value="84" className="font-mono text-xs">84个月 (7年)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="font-mono text-xs">
              计算月供
            </Button>
          </form>

          {loanResult !== null && (
            <div className="mt-6 border border-border">
              <div className="border-b border-border bg-card p-4">
                <h2 className="font-mono text-sm font-semibold">贷款计算结果</h2>
              </div>
              <div className="p-6 text-center">
                <p className="font-mono text-[11px] text-muted-foreground">每月还款</p>
                <p className="mt-1 font-mono text-3xl font-bold">
                  {formatUsd(Math.round(loanResult))}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">/月</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                <div className="p-3 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground">贷款总额</p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {formatUsd(Number(loanPrice) - Number(downPayment || 0))}
                  </p>
                </div>
                <div className="p-3 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground">利息总额</p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {formatUsd(Math.round(loanResult * Number(loanTerm) - (Number(loanPrice) - Number(downPayment || 0))))}
                  </p>
                </div>
                <div className="p-3 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground">还款总额</p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {formatUsd(Math.round(loanResult * Number(loanTerm)))}
                  </p>
                </div>
              </div>
              <div className="border-t border-border p-3">
                <p className="font-mono text-[10px] text-muted-foreground/60">
                  * 计算结果仅供参考，实际贷款条件以银行/金融机构为准
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
