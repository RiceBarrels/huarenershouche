"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ArrowRight, MapPin, DollarSign, Zap, Shield } from "lucide-react";
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

/* eslint-disable @typescript-eslint/no-unused-vars */

const POPULAR_MAKES = ["Toyota", "Honda", "BMW", "Mercedes-Benz", "Tesla", "Lexus"];

const US_STATES = [
  { value: "CA", label: "加州 California" },
  { value: "NY", label: "纽约 New York" },
  { value: "TX", label: "德州 Texas" },
  { value: "FL", label: "佛州 Florida" },
  { value: "IL", label: "伊利诺伊 Illinois" },
  { value: "WA", label: "华盛顿 Washington" },
  { value: "MA", label: "麻省 Massachusetts" },
  { value: "NJ", label: "新泽西 New Jersey" },
  { value: "PA", label: "宾州 Pennsylvania" },
  { value: "GA", label: "乔治亚 Georgia" },
  { value: "OH", label: "俄亥俄 Ohio" },
  { value: "MI", label: "密歇根 Michigan" },
  { value: "NC", label: "北卡 North Carolina" },
  { value: "VA", label: "弗吉尼亚 Virginia" },
  { value: "AZ", label: "亚利桑那 Arizona" },
  { value: "MD", label: "马里兰 Maryland" },
  { value: "CO", label: "科罗拉多 Colorado" },
  { value: "MN", label: "明尼苏达 Minnesota" },
  { value: "OR", label: "俄勒冈 Oregon" },
  { value: "NV", label: "内华达 Nevada" },
  { value: "CT", label: "康州 Connecticut" },
  { value: "HI", label: "夏威夷 Hawaii" },
];

const QUICK_SEARCHES: { label: string; params: Record<string, string> }[] = [
  { label: "$15K 以下好车", params: { maxPrice: "15000" } },
  { label: "省油混动", params: { fuelType: "混动" } },
  { label: "纯电车型", params: { fuelType: "纯电" } },
  { label: "低里程精品", params: { maxMileage: "30000" } },
];

function buildBrowseUrl(params: Record<string, string>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

export default function Home() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");

  function handleSearch() {
    router.push(buildBrowseUrl({ q: keyword || model, make, location }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />

      {/* Hero search */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-10">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h1 className="font-mono text-3xl font-semibold tracking-tight md:text-4xl">
            北美华人二手车
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            可靠车源 · 中文服务 · 覆盖全美主要华人社区
          </p>

          {/* Search bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="mt-8 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder="搜索品牌、车型、关键词..."
                className="h-11 pl-10 font-mono text-sm"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="h-11 gap-2 px-6 font-mono text-sm">
              搜索
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </form>

          {/* Filters - only region, brand, model */}
          <div className="mt-5 grid grid-cols-3 gap-3 text-left">
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">地区</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                  <SelectValue placeholder="选择地区" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="font-mono text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">品牌</Label>
              <Select value={make} onValueChange={setMake}>
                <SelectTrigger className="mt-1 h-8 font-mono text-xs">
                  <SelectValue placeholder="选择品牌" />
                </SelectTrigger>
                <SelectContent>
                  {MAKES.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-xs">
                      {MAKES_ZH[m]} {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">型号</Label>
              <Input
                className="mt-1 h-8 font-mono text-xs"
                placeholder="如 Camry, CR-V"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>

          {/* Popular makes */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">热门:</span>
            {POPULAR_MAKES.map((m) => (
              <button
                key={m}
                onClick={() => router.push(buildBrowseUrl({ make: m }))}
                className="border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {MAKES_ZH[m]} {m}
              </button>
            ))}
          </div>

          {/* Quick search tags */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {QUICK_SEARCHES.map((qs) => (
              <button
                key={qs.label}
                onClick={() => router.push(buildBrowseUrl(qs.params))}
                className="bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {qs.label}
              </button>
            ))}
          </div>

          {/* Browse all */}
          <button
            onClick={() => router.push("/browse")}
            className="mt-6 font-mono text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            浏览全部车辆
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
          <div className="text-center">
            <Shield className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 font-mono text-xs font-medium">可靠车源</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">认证车行 + 个人</p>
          </div>
          <div className="text-center">
            <MapPin className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 font-mono text-xs font-medium">覆盖全美</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">10+ 华人社区</p>
          </div>
          <div className="text-center">
            <DollarSign className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 font-mono text-xs font-medium">价格透明</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">市场行情参考</p>
          </div>
          <div className="text-center">
            <Zap className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 font-mono text-xs font-medium">中文服务</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">沟通无障碍</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border px-4 py-10">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          <div className="border border-border p-4 text-center">
            <p className="font-mono text-2xl font-semibold">1,200+</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">在售车辆</p>
          </div>
          <div className="border border-border p-4 text-center">
            <p className="font-mono text-2xl font-semibold">50+</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">认证车行</p>
          </div>
          <div className="border border-border p-4 text-center">
            <p className="font-mono text-2xl font-semibold">10</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">覆盖城市</p>
          </div>
          <div className="border border-border p-4 text-center">
            <p className="font-mono text-2xl font-semibold">中文</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">全程服务</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
