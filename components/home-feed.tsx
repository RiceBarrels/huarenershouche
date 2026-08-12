"use client";

// 主页(手机端)精选车源 tab 流:多分类 + 无限滚动 + 切换动画。
// · 最新/降价/低价/新能源/低里程 走 Supabase 分页(range),滚到底自动加载;
// · 为你推荐 是客户端排序的列表(rankCars),按页逐步显示;
// · 切换分类:下划线 layoutId 滑动 + 列表按切换方向滑入/滑出;
// · 每个分类的已加载数据常驻内存,切回不重新请求。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { CarCard } from "@/components/car-card";
import { supabase } from "@/lib/supabase";
import type { DbCar } from "@/lib/types";

const PAGE = 8;
const EV_FUELS = ["纯电", "混动", "插电混动"];

type FeedKey =
  | "latest"
  | "recommended"
  | "dropped"
  | "budget"
  | "ev"
  | "lowmileage";

const TAB_DEFS: { key: FeedKey; label: string; browseHref: string }[] = [
  { key: "latest", label: "最新车源", browseHref: "/browse" },
  { key: "recommended", label: "为你推荐", browseHref: "/browse" },
  { key: "dropped", label: "降价捡漏", browseHref: "/browse?priceDropped=true" },
  { key: "budget", label: "低价好车", browseHref: "/browse?sort=price-asc" },
  { key: "ev", label: "新能源", browseHref: "/browse?fuelType=纯电" },
  { key: "lowmileage", label: "低里程", browseHref: "/browse?sort=mileage" },
];

interface DbTabState {
  items: DbCar[];
  offset: number;
  hasMore: boolean;
  loading: boolean;
}

const EMPTY_TAB: DbTabState = { items: [], offset: 0, hasMore: true, loading: false };

// 列表切换:按方向滑入/滑出
const listVariants = {
  enter: (d: number) => ({ opacity: 0, x: 40 * d }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -40 * d }),
};

export function HomeFeed({
  featured,
  recommended,
  showRecommended,
}: {
  featured: DbCar[];
  recommended: DbCar[];
  showRecommended: boolean;
}) {
  const tabs = TAB_DEFS.filter(
    (t) => t.key !== "recommended" || (showRecommended && recommended.length > 0),
  );
  const [active, setActive] = useState<FeedKey>("latest");
  const [dir, setDir] = useState(1);
  // 为你推荐:客户端列表按页显示
  const [revealCount, setRevealCount] = useState(PAGE);
  // DB 分类的分页状态(latest 的种子 featured 在渲染时合并,不进这里)
  const [dbState, setDbState] = useState<Partial<Record<FeedKey, DbTabState>>>({});
  const loadingRef = useRef(new Set<FeedKey>());

  const load = useCallback(
    async (key: FeedKey) => {
      if (key === "recommended") {
        setRevealCount((c) => Math.min(c + PAGE, Math.max(recommended.length, PAGE)));
        return;
      }
      if (loadingRef.current.has(key)) return;
      loadingRef.current.add(key);
      setDbState((s) => ({
        ...s,
        [key]: { ...(s[key] ?? EMPTY_TAB), loading: true },
      }));

      const offset = (dbState[key] ?? EMPTY_TAB).offset;
      let q = supabase
        .from("cars")
        .select("*, profiles!seller_id(account_type, avatar_url)")
        .eq("status", "active")
        .eq("owner_hidden", false);
      switch (key) {
        case "dropped":
          // 列级比较(original_price > price)PostgREST 不支持,取有原价的再客户端过滤
          q = q.not("original_price", "is", null).order("price_updated_at", {
            ascending: false,
            nullsFirst: false,
          });
          break;
        case "budget":
          q = q.gt("price", 0).order("price", { ascending: true });
          break;
        case "ev":
          q = q.in("fuel_type", EV_FUELS).order("created_at", { ascending: false });
          break;
        case "lowmileage":
          q = q.gt("mileage", 0).order("mileage", { ascending: true });
          break;
        default:
          q = q.order("created_at", { ascending: false });
      }
      const { data } = await q.range(offset, offset + PAGE - 1);
      const raw = (data as DbCar[]) || [];
      const rows =
        key === "dropped"
          ? raw.filter((c) => c.original_price && c.original_price > c.price)
          : raw;

      loadingRef.current.delete(key);
      setDbState((s) => {
        const cur = s[key] ?? EMPTY_TAB;
        const seen = new Set(cur.items.map((c) => c.id));
        return {
          ...s,
          [key]: {
            items: [...cur.items, ...rows.filter((c) => !seen.has(c.id))],
            offset: offset + PAGE,
            // 原始页未满即到底(dropped 客户端过滤后可能少于一页,但只要原始页满就继续)
            hasMore: raw.length === PAGE,
            loading: false,
          },
        };
      });
    },
    [dbState, recommended.length],
  );
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // 无限滚动:底部哨兵进入视口(提前 600px)就加载下一页
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeState = active === "recommended" ? null : dbState[active] ?? EMPTY_TAB;
  const hasMore =
    active === "recommended"
      ? revealCount < recommended.length
      : activeState!.hasMore;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadRef.current(active);
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [active, hasMore]);

  // 渲染列表:latest 用 featured 作种子与已拉取页合并去重
  const display = useMemo(() => {
    if (active === "recommended") return recommended.slice(0, revealCount);
    const fetched = (dbState[active] ?? EMPTY_TAB).items;
    if (active !== "latest") return fetched;
    const seen = new Set(featured.map((c) => c.id));
    return [...featured, ...fetched.filter((c) => !seen.has(c.id))];
  }, [active, dbState, featured, recommended, revealCount]);

  const loading = active !== "recommended" && (dbState[active] ?? EMPTY_TAB).loading;
  const activeDef = TAB_DEFS.find((t) => t.key === active)!;

  const switchTab = (key: FeedKey) => {
    if (key === active) return;
    const from = tabs.findIndex((t) => t.key === active);
    const to = tabs.findIndex((t) => t.key === key);
    setDir(to > from ? 1 : -1);
    setActive(key);
  };

  return (
    <section className="px-3 pt-1 md:hidden">
      <div className="px-1">
        <div className="flex items-end gap-5 overflow-x-auto scrollbar-none">
          {tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => switchTab(t.key)}
                className={`relative shrink-0 pb-2 font-mono transition-colors ${
                  isActive
                    ? "text-[15px] font-bold text-foreground"
                    : "text-sm text-muted-foreground"
                }`}
              >
                {t.label}
                {isActive && (
                  <motion.span
                    layoutId="home-feed-underline"
                    className="absolute inset-x-0 bottom-0.5 mx-auto h-[3px] w-6 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={active}
          custom={dir}
          variants={listVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 flex flex-col gap-3"
        >
          {display.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
          {display.length === 0 && !loading && !hasMore && (
            <p className="py-10 text-center font-mono text-xs text-muted-foreground">
              暂无该分类的车源
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 哨兵 + 底部状态:加载中转圈;到底后给「查看全部」出口 */}
      <div ref={sentinelRef} />
      {loading && (
        <div className="flex items-center justify-center gap-1.5 py-4 font-mono text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          加载中…
        </div>
      )}
      {!hasMore && display.length > 0 && (
        <Link
          href={activeDef.browseHref}
          className="mt-4 flex h-11 items-center justify-center gap-1 rounded-full bg-card font-mono text-sm font-medium transition-colors active:bg-muted"
        >
          查看全部车源
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      )}
    </section>
  );
}
