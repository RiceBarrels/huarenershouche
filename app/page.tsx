"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Shield,
  MapPin,
  DollarSign,
  Zap,
  ChevronRight,
  Gauge,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import type { DbCar } from "@/lib/types";

const POPULAR_MAKES = [
  "Toyota",
  "Honda",
  "BMW",
  "Mercedes-Benz",
  "Tesla",
  "Lexus",
  "Audi",
  "Porsche",
];

const QUICK_TAGS: { label: string; params: Record<string, string> }[] = [
  { label: "$15K以下", params: { maxPrice: "15000" } },
  { label: "混动省油", params: { fuelType: "混动" } },
  { label: "纯电车型", params: { fuelType: "纯电" } },
  { label: "低里程", params: { maxMileage: "30000" } },
  { label: "四驱SUV", params: { drivetrain: "AWD" } },
];

function buildUrl(params: Record<string, string>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(mi: number): string {
  return new Intl.NumberFormat("en-US").format(mi) + " mi";
}

export default function Home() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [make, setMake] = useState("");
  const [zip, setZip] = useState("");
  const [featured, setFeatured] = useState<DbCar[]>([]);

  useEffect(() => {
    supabase
      .from("cars")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setFeatured(data as DbCar[]);
      });
  }, []);

  function handleSearch() {
    const params: Record<string, string> = {};
    if (keyword) params.q = keyword;
    if (make && make !== "all") params.make = make;
    if (zip) params.zip = zip;
    router.push(buildUrl(params));
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pb-12 pt-16 md:pb-16 md:pt-24">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-linear-to-b from-muted/40 to-background" />

        <div className="relative mx-auto w-full max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-mono text-3xl font-semibold tracking-tight md:text-5xl"
          >
            北美华人二手车
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="mt-3 font-mono text-sm text-muted-foreground md:text-base"
          >
            可靠车源 · 中文服务 · 覆盖全美
          </motion.p>

          {/* Structured search form - cars.com style */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mt-8 overflow-hidden border border-border bg-background shadow-sm"
          >
            {/* Row: Make | Keyword | ZIP | Search */}
            <div className="flex flex-col md:flex-row">
              {/* Make dropdown */}
              <div className="border-b border-border md:border-b-0 md:border-r">
                <Select value={make} onValueChange={setMake}>
                  <SelectTrigger className="h-12 rounded-none border-0 px-4 font-mono text-sm shadow-none focus:ring-0 md:w-44">
                    <SelectValue placeholder="品牌" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部品牌</SelectItem>
                    {MAKES.filter((m) => m !== "Other").map((m) => (
                      <SelectItem key={m} value={m}>
                        {MAKES_ZH[m]} {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Keyword input */}
              <div className="relative flex-1 border-b border-border md:border-b-0 md:border-r">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  placeholder="搜索车型、关键词..."
                  className="h-12 rounded-none border-0 pl-11 font-mono text-sm shadow-none focus-visible:ring-0"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              {/* ZIP input */}
              <div className="border-b border-border md:border-b-0 md:border-r">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    placeholder="ZIP"
                    className="h-12 w-full rounded-none border-0 pl-11 font-mono text-sm shadow-none focus-visible:ring-0 md:w-28"
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Search button */}
              <Button
                type="submit"
                className="h-12 gap-2 rounded-none px-8 font-mono text-sm"
              >
                搜索
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </motion.form>

          {/* Popular makes */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
          >
            {POPULAR_MAKES.map((m) => (
              <motion.button
                key={m}
                variants={fadeInUp}
                transition={{ duration: 0.3 }}
                onClick={() => router.push(buildUrl({ make: m }))}
                className="border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {MAKES_ZH[m]}
              </motion.button>
            ))}
          </motion.div>

          {/* Quick tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-3 flex flex-wrap items-center justify-center gap-1.5"
          >
            {QUICK_TAGS.map((t) => (
              <button
                key={t.label}
                onClick={() => router.push(buildUrl(t.params))}
                className="bg-muted/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.label}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4 }}
              className="mb-4 flex items-center justify-between"
            >
              <h2 className="font-mono text-sm font-medium">最新车源</h2>
              <Link
                href="/browse"
                className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                查看全部
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 gap-3 md:grid-cols-3"
            >
              {featured.map((car) => (
                <motion.div key={car.id} variants={scaleIn} transition={{ duration: 0.4 }}>
                <Link
                  href={`/car/${car.id}`}
                  className="group block border border-border transition-colors hover:border-foreground/20"
                >
                  {/* Image */}
                  <div className="aspect-16/10 overflow-hidden bg-muted">
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.title_zh}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-mono text-xs text-muted-foreground">
                          暂无图片
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="truncate font-mono text-xs font-medium">
                      {car.title_zh}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                      {formatPrice(car.price)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Gauge className="h-3 w-3" strokeWidth={1.5} />
                        {formatMileage(car.mileage)}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <MapPin className="h-3 w-3" strokeWidth={1.5} />
                        {car.location_zh}
                      </span>
                    </div>
                  </div>
                </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Features - minimal */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t border-border px-4 py-8"
      >
        <div className="mx-auto flex max-w-2xl justify-around">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              可靠车源
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              覆盖全美
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              价格透明
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[11px] text-muted-foreground">
              中文服务
            </span>
          </div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
