"use client";

// 主页(手机端)精选车源 tab 流:多分类 + 无限滚动 + 切换动画。
// · 最新/降价/新能源 走 Supabase 分页(range),滚到底自动加载;
// · 低价/低里程 走 /browse 同一个 browse_cars RPC(按折合美元 / 英里排序,加元 / 公里车源才排得对,
//   和「查看全部」打开的 /browse 顺序一致);RPC 不可用时退回直接按原值排序;
// · 为你推荐 是客户端排序的列表(rankCars),按页逐步显示;
// · 切换分类:下划线 layoutId 滑动 + 列表按切换方向滑入/滑出;
// · 每个分类的已加载数据常驻内存,切回不重新请求。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/localized-navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { CarCard } from "@/components/car-card";
import { useI18n } from "@/components/i18n-provider";
import { supabase } from "@/lib/supabase";
import { fetchBrowsePage } from "@/lib/browse-cars";
import { INITIAL_FILTERS } from "@/components/search-filters";
import type { SortKey } from "@/lib/car-filters";
import type { Locale } from "@/lib/i18n";
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
  { key: "budget", label: "低价好车", browseHref: "/browse?sort=price-asc&hasPrice=true" },
  { key: "ev", label: "新能源", browseHref: "/browse?fuelType=纯电" },
  { key: "lowmileage", label: "低里程", browseHref: "/browse?sort=mileage" },
];

// 低价 / 低里程 tab 跳过电议 / 0 里程(新车 / 未填)时,一次最多连翻几页凑出可显示的车(防止全被跳过时空转)
const MAX_SKIP_PAGES = 5;

/**
 * 低价 / 低里程 tab:按 browse_cars 的折合美元 / 英里排序取一页。
 * 低价排除电议(hasPrice,同「查看全部」链接);低里程在前端去掉 0 里程(browse 没有最低里程筛选),
 * 与原先直接查询的 price > 0 / mileage > 0 口径一致。
 * 返回 null = RPC 不可用(未部署 / 出错),调用方退回直接查询;raw = 这一页的原始条数(判断是否到底)。
 */
async function fetchConvertedTab(
  key: "budget" | "lowmileage",
  locale: Locale,
  offset: number,
): Promise<{ rows: DbCar[]; raw: number; nextOffset: number } | null> {
  const sort: SortKey = key === "budget" ? "price-asc" : "mileage";
  const filters = key === "budget" ? { ...INITIAL_FILTERS, hasPrice: "true" } : INITIAL_FILTERS;
  let cursor = offset;
  for (let i = 0; i < MAX_SKIP_PAGES; i++) {
    const page = await fetchBrowsePage({ filters, sort, locale, coords: null }, cursor, PAGE);
    if (!page) return i === 0 ? null : { rows: [], raw: 0, nextOffset: cursor };
    cursor += PAGE;
    // 低价再按 price > 0 过一遍:数据库里若还是不认 hasPrice 的旧版 RPC,电议(0)会排在最前
    const rows = page.items.filter((c) => (key === "budget" ? c.price > 0 : c.mileage > 0));
    if (rows.length > 0 || page.items.length < PAGE) return { rows, raw: page.items.length, nextOffset: cursor };
  }
  return { rows: [], raw: PAGE, nextOffset: cursor };
}

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
  const { t, locale } = useI18n();
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
      const converted = key === "budget" || key === "lowmileage" ? await fetchConvertedTab(key, locale, offset) : null;
      if (converted) {
        loadingRef.current.delete(key);
        setDbState((s) => {
          const cur = s[key] ?? EMPTY_TAB;
          const seen = new Set(cur.items.map((c) => c.id));
          return {
            ...s,
            [key]: {
              items: [...cur.items, ...converted.rows.filter((c) => !seen.has(c.id))],
              offset: converted.nextOffset,
              hasMore: converted.raw === PAGE,
              loading: false,
            },
          };
        });
        return;
      }
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
    [dbState, recommended.length, locale],
  );
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // 无限滚动:底部哨兵进入视口(提前 600px)就加载下一页
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeState = active === "recommended" ? null : dbState[active] ?? EMPTY_TAB;
  const activeOffset = activeState?.offset ?? revealCount;
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
    // activeOffset:一页拉完(哪怕过滤后没有新卡片)就重建观察器,哨兵仍在视口内会立即再拉下一页,
    // 不会因为「这一页全被过滤掉、列表没变长」卡住
  }, [active, hasMore, activeOffset]);

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
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchTab(tab.key)}
                className={`relative shrink-0 pb-2 font-mono transition-colors ${
                  isActive
                    ? "text-[15px] font-bold text-foreground"
                    : "text-sm text-muted-foreground"
                }`}
              >
                {t(tab.label)}
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
              {t("暂无该分类的车源")}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 哨兵 + 底部状态:加载中转圈;到底后给「查看全部」出口 */}
      <div ref={sentinelRef} />
      {loading && (
        <div className="flex items-center justify-center gap-1.5 py-4 font-mono text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          {t("加载中…")}
        </div>
      )}
      {!hasMore && display.length > 0 && (
        <Link
          href={activeDef.browseHref}
          className="mt-4 flex h-11 items-center justify-center gap-1 rounded-full bg-card font-mono text-sm font-medium transition-colors active:bg-muted"
        >
          {t("查看全部车源")}
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      )}
    </section>
  );
}
