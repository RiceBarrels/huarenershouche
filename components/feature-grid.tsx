"use client";

// 首页金刚区:功能入口(按最近使用排序,第 5 格「全部功能」打开 drawer:
// 顶部搜索框 + 最近使用 8 个 + 按拼音字母序的全部功能列表)。
// 与品牌行(brandTiles 由页面传入)合并为同一个 snap 分页滑动条:
// 每页上排 5 个功能、下排 5 个品牌,整页横滑,底部页点指示。

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@/components/localized-navigation";
import { match } from "pinyin-pro";
import { Search, X, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCarOverlay } from "@/components/car-overlay-provider";
import { useI18n } from "@/components/i18n-provider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface Feature {
  id: string;
  name: string;
  desc: string;
  href: string;
  /** 拼音排序键(分类内按字母序) */
  py: string;
  /** 所属分类 */
  cat: string;
}

// drawer 里的分类展示顺序
const CATEGORIES = ["买车卖车", "小工具", "攻略指南", "社区互动", "我的", "服务合作"];

const FEATURES: Feature[] = [
  { id: "buy", name: "我要买车", desc: "浏览全部在售车源", href: "/browse", py: "woyaomaiche1" , cat: "买车卖车" },
  { id: "sell", name: "我要卖车", desc: "免费发布车辆信息", href: "/post", py: "woyaomaiche2" , cat: "买车卖车" },
  { id: "compare", name: "车辆对比", desc: "最多 3 辆参数逐项对比", href: "/compare", py: "cheliangduibi" , cat: "买车卖车" },
  { id: "vin", name: "VIN查询", desc: "免费查召回记录与安全评级", href: "/vin", py: "vin" , cat: "小工具" },
  { id: "drops", name: "降价好车", desc: "近期已降价的车源捡漏", href: "/browse?priceDropped=true", py: "jiangjiahaoche" , cat: "买车卖车" },
  { id: "messages", name: "消息", desc: "与买家卖家在线聊天", href: "/messages", py: "xiaoxi" , cat: "我的" },
  { id: "favorites", name: "我的收藏", desc: "收藏过的车辆", href: "/account/favorites", py: "wodeshoucang" , cat: "我的" },
  { id: "listings", name: "我的发布", desc: "管理我发布的车辆", href: "/account/listings", py: "wodefabu" , cat: "我的" },
  { id: "community", name: "车友社区", desc: "车评、晒车、经验交流", href: "/community", py: "cheyoushequ" , cat: "社区互动" },
  { id: "qa", name: "问答", desc: "购车、保险、过户答疑", href: "/qa", py: "wenda" , cat: "社区互动" },
  { id: "guide-buying", name: "购车指南", desc: "检查、谈价、防骗全流程", href: "/guide/buying", py: "gouchezhinan" , cat: "攻略指南" },
  { id: "guide-loan", name: "贷款攻略", desc: "贷款比价与预审", href: "/guide/loan", py: "daikuangonglue" , cat: "攻略指南" },
  { id: "guide-insurance", name: "保险攻略", desc: "车险选购省钱指南", href: "/guide/insurance", py: "baoxiangonglue" , cat: "攻略指南" },
  { id: "guide-dmv", name: "过户攻略", desc: "DMV 过户流程详解", href: "/guide/dmv", py: "guohugonglue" , cat: "攻略指南" },
  { id: "cars", name: "分类找车", desc: "按城市、品牌、车型浏览", href: "/cars", py: "fenleizhaoche" , cat: "买车卖车" },
  { id: "business", name: "车行入驻", desc: "车行免费入驻合作", href: "/business", py: "chehangruzhu" , cat: "服务合作" },
  { id: "contact", name: "联系客服", desc: "问题反馈与使用帮助", href: "/contact", py: "lianxikefu" , cat: "服务合作" },
  // ---- 小工具 ----
  { id: "tool-loan", name: "月供计算器", desc: "输入车价算每月还款", href: "/tools/loan", py: "yuegongjisuanqi" , cat: "小工具" },
  { id: "tool-fuel", name: "油费计算器", desc: "每月油钱心里有数", href: "/tools/fuel", py: "youfeijisuanqi" , cat: "小工具" },
  { id: "tool-budget", name: "预算估车价", desc: "月供反推可买多贵的车", href: "/tools/budget", py: "yusuanguchejia" , cat: "小工具" },
  { id: "tool-units", name: "单位换算", desc: "英里/公里、MPG/油耗换算", href: "/tools/units", py: "danweihuansuan" , cat: "小工具" },
  { id: "tool-parking", name: "停车定位", desc: "记住车停哪了,一键导航回去", href: "/tools/parking", py: "tingchedingwei" , cat: "小工具" },
  { id: "tool-luck", name: "今日车运", desc: "宜提车?每日娱乐黄历", href: "/tools/luck", py: "jinricheyun" , cat: "小工具" },
  { id: "tool-plate", name: "车牌打分", desc: "车牌号吉利度(娱乐向)", href: "/tools/plate", py: "chepaidafen" , cat: "小工具" },
  { id: "tool-haggle", name: "砍价锦囊", desc: "谈价话术,点句即复制", href: "/tools/haggle", py: "kanjiajinnang" , cat: "小工具" },
];

const FEATURE_MAP = new Map(FEATURES.map((f) => [f.id, f]));
const RECENT_KEY = "clc_recent_features";
// 无使用记录时的默认顺序
const DEFAULT_ORDER = ["buy", "sell", "compare", "vin", "drops", "messages", "community", "qa"];

function getRecentIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_ORDER;
  try {
    const stored: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const valid = stored.filter((id) => FEATURE_MAP.has(id));
    // 补默认项凑满
    for (const id of DEFAULT_ORDER) {
      if (!valid.includes(id)) valid.push(id);
    }
    return valid;
  } catch {
    return DEFAULT_ORDER;
  }
}

function recordUse(id: string) {
  try {
    const stored: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [id, ...stored.filter((s) => s !== id)].slice(0, 16);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function FeatureIcon({ f, size = "lg" }: { f: Feature; size?: "lg" | "sm" }) {
  return (
    <img
      src={`/icons/features/${f.id}.png`}
      alt=""
      loading="lazy"
      className={`object-contain ${size === "lg" ? "h-12 w-12" : "h-10 w-10"}`}
    />
  );
}

export function FeatureRow({ brandTiles = [] }: { brandTiles?: ReactNode[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const { openPage } = useCarOverlay();
  const [recent, setRecent] = useState<string[]>(DEFAULT_ORDER);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // snap 滑动条当前页(页点指示)
  const [page, setPage] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage 信号,仅首帧一次
    setRecent(getRecentIds());
  }, []);

  function go(f: Feature) {
    recordUse(f.id);
    setOpen(false);
    // 手机端:注册过的页面以浮层栈打开(当前页保持挂载,真实垫在后面);否则正常跳转
    if (openPage(f.href)) return;
    router.push(f.href);
  }

  // 功能位:最近使用优先,不足按目录顺序补齐到 14 个;末位是「全部功能」
  const rowIds = [...recent];
  for (const f of FEATURES) {
    if (!rowIds.includes(f.id)) rowIds.push(f.id);
  }
  const rowFeatures = rowIds
    .slice(0, 14)
    .map((id) => FEATURE_MAP.get(id))
    .filter(Boolean) as Feature[];

  const recentEight = recent
    .slice(0, 8)
    .map((id) => FEATURE_MAP.get(id))
    .filter(Boolean) as Feature[];

  const featureTile = (f: Feature) => (
    <button
      key={f.id}
      type="button"
      onClick={() => go(f)}
      className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition-colors active:bg-muted/50"
    >
      <FeatureIcon f={f} />
      <span className="font-mono text-[11px]">{t(f.name)}</span>
    </button>
  );

  const q = query.trim().toLowerCase();
  const filtered = FEATURES.filter(
    (f) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.desc.toLowerCase().includes(q) ||
      f.py.includes(q) ||
      (/^[a-z]+$/.test(q) && match(f.name + f.desc, q) !== null),
  ).sort((a, b) => a.py.localeCompare(b.py));

  // 「全部功能」磁贴:排在滑动条最后一页的末位
  const allFeaturesTile = (
    <Drawer key="all-features" open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition-colors active:bg-muted/50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LayoutGrid className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span className="font-mono text-[11px]">{t("全部功能")}</span>
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[88vh]">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </DrawerClose>
            <span className="font-mono text-sm font-semibold">{t("全部功能")}</span>
            <div className="h-8 w-8" />
          </div>

          {/* 搜索框 */}
          <div className="relative px-4 pb-1">
            <Search className="absolute left-7 top-1/2 h-3.5 w-3.5 -translate-y-[65%] text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder={t("搜索功能(支持拼音)...")}
              className="h-9 rounded-full pl-9 font-mono text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-3">
            {/* 最近使用(搜索时隐藏) */}
            {!q && (
              <>
                <p className="font-mono text-[11px] font-medium text-muted-foreground">{t("最近使用")}</p>
                <div className="mt-2 grid grid-cols-4 gap-y-3">
                  {recentEight.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => go(f)}
                      className="flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors active:bg-muted/50"
                    >
                      <FeatureIcon f={f} size="sm" />
                      <span className="font-mono text-[10px]">{t(f.name)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 全部功能:按分类分组;搜索时展示扁平结果 */}
            {q ? (
              <div className="mt-1 space-y-1">
                {filtered.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => go(f)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors active:bg-muted/50"
                  >
                    <FeatureIcon f={f} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-mono text-[13px] font-medium">{t(f.name)}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">{t(f.desc)}</span>
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                    {t("没有找到相关功能")}
                  </p>
                )}
              </div>
            ) : (
              CATEGORIES.map((cat) => {
                const items = filtered.filter((f) => f.cat === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="mt-5 font-mono text-[11px] font-medium text-muted-foreground">{t(cat)}</p>
                    <div className="mt-2 space-y-1">
                      {items.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => go(f)}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors active:bg-muted/50"
                        >
                          <FeatureIcon f={f} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-mono text-[13px] font-medium">{t(f.name)}</span>
                            <span className="block truncate font-mono text-[11px] text-muted-foreground">{t(f.desc)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DrawerContent>
    </Drawer>
  );

  // 功能磁贴 + 全部功能,与品牌行按 5 个/页切片,页数取两者较多的一方
  const featureTiles = [...rowFeatures.map(featureTile), allFeaturesTile];
  const pages = Math.max(
    Math.ceil(featureTiles.length / 5),
    Math.ceil(brandTiles.length / 5),
    1,
  );

  return (
    <div className="mt-3">
      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current;
          if (el) setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
      >
        {Array.from({ length: pages }, (_, i) => {
          const pageBrands = brandTiles.slice(i * 5, i * 5 + 5);
          return (
            <div key={i} className="w-full shrink-0 snap-start">
              <div className="grid grid-cols-5">
                {featureTiles.slice(i * 5, i * 5 + 5)}
              </div>
              {pageBrands.length > 0 && (
                <div className="mt-1 grid grid-cols-5">{pageBrands}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 页点指示 */}
      {pages > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1">
          {Array.from({ length: pages }, (_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${
                page === i ? "w-3 bg-primary" : "w-1 bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
