"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const LINES = [
  "我看了 Carfax,这车有记录,价格是不是该再聊聊?",
  "同款同年份的,隔壁挂 $X,你这个贵在哪?",
  "现金全款,今天能定,给个实在价。",
  "轮胎快到磨损线了,换四条要好几百,匀一点?",
  "我预算就到这,合适现在就交定金。",
  "OTD 多少?把税和费都算进来报个总价。",
  "这车挂了快两个月了吧?再放下去更掉价。",
  "小刮痕我不介意,但价格得体现出来。",
  "你不用急着答复,我今天还约了另外两台。",
  "保养记录不全,后期风险我担,价格你让。",
  "刹车片剩不多了,这也是钱,再让一点。",
  "只要价格合适,我朋友买车我也带过来。",
];

function pick(n: number, exclude: string[]): string[] {
  const pool = LINES.filter((l) => !exclude.includes(l));
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export default function HaggleToolPage() {
  const [lines, setLines] = useState<string[]>(() => LINES.slice(0, 3));
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="font-logo text-xl">砍价锦囊</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          谈价前抄两句,底气足一点
        </p>

        <div className="mt-4 space-y-3">
          {lines.map((l) => (
            <button
              key={l}
              type="button"
              className="flex w-full items-start justify-between gap-3 rounded-xl bg-card p-4 text-left transition-colors active:bg-muted/50"
              onClick={() => {
                navigator.clipboard.writeText(l);
                setCopied(l);
                setTimeout(() => setCopied(null), 1500);
              }}
            >
              <span className="font-mono text-sm leading-relaxed">{l}</span>
              {copied === l ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              ) : (
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              )}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          className="mt-4 w-full gap-1.5 font-mono text-sm"
          onClick={() => setLines(pick(3, lines))}
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          换一批
        </Button>

        <p className="mt-4 font-mono text-[10px] text-muted-foreground/60">
          * 点句子即可复制;砍价要有理有据,祝你砍到好价
        </p>
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
