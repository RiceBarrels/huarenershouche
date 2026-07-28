"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const GOOD = ["提车", "看车", "砍价", "洗车", "贴膜", "约试驾", "跑高速", "换机油", "晒车", "发布卖车"];
const BAD = ["冲动下定", "路怒", "忘带驾照", "加错油", "乱停车", "轻信口头承诺", "不看 Carfax", "深夜看车"];
const COLORS = ["薄荷绿", "珍珠白", "曜石黑", "星空蓝", "落日橙", "樱花粉", "枪灰"];

// 简单确定性 hash:同一天结果固定
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pick<T>(arr: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  let s = seed;
  const pool = [...arr];
  for (let i = 0; i < n && pool.length > 0; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(s % pool.length, 1)[0]);
  }
  return out;
}

export default function LuckToolPage() {
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }));
  }, []);

  if (!today) return null;
  const seed = hash(today);
  const good = pick(GOOD, seed, 2);
  const bad = pick(BAD, seed + 7, 2);
  const color = COLORS[seed % COLORS.length];
  const luckyNum = (seed % 9) + 1;
  const score = 60 + (seed % 41);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="flex items-center gap-1.5 font-mono text-lg font-bold">
          <Sparkles className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
          今日车运
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{today}</p>

        <div className="mt-4 rounded-xl bg-primary/10 p-5 text-center">
          <p className="font-mono text-xs text-muted-foreground">今日提车指数</p>
          <p className="mt-1 font-mono text-4xl font-bold text-primary">{score}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-sm font-bold text-emerald-600">宜</p>
            {good.map((g) => (
              <p key={g} className="mt-1.5 font-mono text-sm">{g}</p>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-sm font-bold text-red-500">忌</p>
            {bad.map((b) => (
              <p key={b} className="mt-1.5 font-mono text-sm">{b}</p>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] text-muted-foreground">幸运车色</p>
            <p className="mt-1 font-mono text-sm font-semibold">{color}</p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-[11px] text-muted-foreground">幸运数字</p>
            <p className="mt-1 font-mono text-sm font-semibold">{luckyNum}</p>
          </div>
        </div>

        <p className="mt-4 font-mono text-[10px] text-muted-foreground/60">
          * 纯属娱乐,买车还是要看车况和价格 :)
        </p>
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
