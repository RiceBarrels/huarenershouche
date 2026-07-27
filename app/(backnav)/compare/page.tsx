"use client";

import { useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CompareContent } from "@/components/compare-content";
import { addToCompare, getCompareIds } from "@/lib/compare";

export default function ComparePage() {
  // 分享链接 ?ids= 恢复到对比列表(添加入口在车源卡片/详情页,本页只展示)
  useEffect(() => {
    const urlIds = (new URLSearchParams(window.location.search).get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const id of urlIds) {
      if (!getCompareIds().includes(id)) addToCompare(id);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Compare
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            车辆对比
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            在车源卡片或详情页添加车辆,最多 3 辆
          </p>
        </div>
        <CompareContent />
      </main>
      <Footer />
    </div>
  );
}
