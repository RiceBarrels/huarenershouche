"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function grade(plate: string): { score: number; comment: string; tags: string[] } {
  const p = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let score = 60 + (hash(p) % 31);
  const tags: string[] = [];
  if (/8/.test(p)) { score += 4; tags.push("带 8,发发发"); }
  if (/888/.test(p)) { score += 4; tags.push("888 三连,豪气"); }
  if (/6/.test(p)) { score += 3; tags.push("带 6,一路顺"); }
  if (/9/.test(p)) { score += 2; tags.push("带 9,长长久久"); }
  if (/520|1314/.test(p)) { score += 3; tags.push("藏着情话"); }
  if (/4/.test(p)) { score -= 3; tags.push("有 4,介意的话见仁见智"); }
  if (/(.)\1\1/.test(p)) { score += 2; tags.push("三连号,好记"); }
  if (/^[A-Z]+$/.test(p)) tags.push("纯字母,个性");
  score = Math.max(35, Math.min(100, score));
  const comment =
    score >= 90 ? "神牌!这号别人求都求不来" :
    score >= 80 ? "相当不错,开出去有面子" :
    score >= 70 ? "中规中矩,踏实过日子" :
    score >= 55 ? "一般般,车好比啥都强" :
    "号不太行,但路是自己开的";
  return { score, comment, tags };
}

export default function PlateToolPage() {
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<ReturnType<typeof grade> | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="font-logo text-xl">车牌打分</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          输入车牌号,测测吉利度(纯属娱乐)
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            className="flex-1 font-mono uppercase"
            placeholder="如 8ABC888"
            maxLength={8}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && plate.trim()) setResult(grade(plate));
            }}
          />
          <Button
            className="font-mono text-sm"
            disabled={!plate.trim()}
            onClick={() => setResult(grade(plate))}
          >
            打分
          </Button>
        </div>

        {result && (
          <div className="mt-4 rounded-xl bg-card p-5 text-center">
            <p className="font-mono text-5xl font-bold text-brand-ink">{result.score}</p>
            <p className="mt-2 font-mono text-sm font-medium">{result.comment}</p>
            {result.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {result.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 font-mono text-[10px] text-muted-foreground/60">
          * 同一车牌分数固定,不服可以换车牌 :)
        </p>
      </main>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
