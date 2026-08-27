"use client";

import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoanCalculatorProps {
  price: number;
}

const TERM_OPTIONS = [36, 48, 60, 72] as const;

export function LoanCalculator({ price }: LoanCalculatorProps) {
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [loanTerm, setLoanTerm] = useState<number>(60);
  const [interestRate, setInterestRate] = useState(7.9);

  const downPayment = useMemo(
    () => Math.round(price * (downPaymentPct / 100)),
    [price, downPaymentPct]
  );

  const { monthlyPayment, totalInterest, totalCost } = useMemo(() => {
    const principal = price - downPayment;
    if (principal <= 0 || loanTerm <= 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalCost: downPayment };
    }
    const monthlyRate = interestRate / 100 / 12;
    if (monthlyRate === 0) {
      const mp = principal / loanTerm;
      return {
        monthlyPayment: mp,
        totalInterest: 0,
        totalCost: price,
      };
    }
    const mp =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) /
      (Math.pow(1 + monthlyRate, loanTerm) - 1);
    const totalPaid = mp * loanTerm;
    return {
      monthlyPayment: mp,
      totalInterest: totalPaid - principal,
      totalCost: totalPaid + downPayment,
    };
  }, [price, downPayment, loanTerm, interestRate]);

  function fmt(n: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  }

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs font-semibold">月供计算器</h3>

      {/* Monthly payment highlight — 桌面加大结果数字,让"月供"这个核心结论一眼可读 */}
      <div className="rounded-xl bg-card p-3 text-center md:p-4">
        <p className="font-mono text-[10px] text-muted-foreground md:text-[11px]">预估月供</p>
        <p className="mt-1 font-mono text-xl font-bold tabular-nums md:text-2xl">
          {fmt(monthlyPayment)}
          <span className="text-[11px] font-normal text-muted-foreground">
            /月
          </span>
        </p>
      </div>

      {/* Down payment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[10px] text-muted-foreground">
            首付比例
          </Label>
          <span className="font-mono text-xs font-medium tabular-nums">
            {downPaymentPct}% ({fmt(downPayment)})
          </span>
        </div>
        <Slider
          value={[downPaymentPct]}
          onValueChange={(v) => setDownPaymentPct(v[0])}
          min={0}
          max={90}
          step={5}
        />
      </div>

      {/* Loan term */}
      <div className="space-y-2">
        <Label className="font-mono text-[10px] text-muted-foreground">
          贷款期限
        </Label>
        <div className="grid grid-cols-4 gap-1.5">
          {TERM_OPTIONS.map((t) => (
            <Button
              key={t}
              variant={loanTerm === t ? "default" : "secondary"}
              size="sm"
              className="font-mono text-[10px] tabular-nums md:text-xs"
              onClick={() => setLoanTerm(t)}
            >
              {t}月
            </Button>
          ))}
        </div>
      </div>

      {/* Interest rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[10px] text-muted-foreground">
            年利率
          </Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={interestRate}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 30) setInterestRate(v);
              }}
              step={0.1}
              min={0}
              max={30}
              className="h-6 w-16 font-mono text-xs text-right"
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              %
            </span>
          </div>
        </div>
        <Slider
          value={[interestRate]}
          onValueChange={(v) =>
            setInterestRate(Math.round(v[0] * 10) / 10)
          }
          min={0}
          max={30}
          step={0.1}
        />
      </div>

      {/* Summary — 金额统一 tabular-nums,右侧数字列对齐不跳动 */}
      <div className="space-y-1.5 border-t border-border pt-3">
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-muted-foreground md:text-[11px]">
            贷款金额
          </span>
          <span className="font-mono text-xs tabular-nums">{fmt(price - downPayment)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-muted-foreground md:text-[11px]">
            利息总额
          </span>
          <span className="font-mono text-xs tabular-nums">{fmt(totalInterest)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-muted-foreground md:text-[11px]">
            总花费
          </span>
          <span className="font-mono text-xs font-medium tabular-nums">
            {fmt(totalCost)}
          </span>
        </div>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground">
        * 仅供参考，实际利率以贷款机构为准
      </p>
    </div>
  );
}
