"use client";

// 开屏广告(手机端):冷启动全屏展示,倒计时自动关闭 + 右上角跳过按钮。
// · 广告配置缓存在 localStorage:启动时同步读取瞬时展示(无网络等待),
//   后台拉取最新配置 + 预载图片供下次启动用;首次启动无缓存则不展示;
// · 每个会话(sessionStorage)最多展示一次;仅 <768px 生效;
// · 数据源 splash_ads 表(supabase/splash-ads.sql),active + 投放期内,
//   多条按 weight 加权随机;
// · 展示期间隐藏 iOS 原生底部导航。

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { openExternal } from "@/lib/open-external";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";

interface SplashAdRow {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  duration_seconds: number;
  weight: number;
  starts_at: string | null;
  ends_at: string | null;
}

const CACHE_KEY = "splash-ad-cache";
const SESSION_KEY = "splash-ad-shown";

function inWindow(ad: SplashAdRow): boolean {
  const now = Date.now();
  if (ad.starts_at && Date.parse(ad.starts_at) > now) return false;
  if (ad.ends_at && Date.parse(ad.ends_at) < now) return false;
  return true;
}

function pickWeighted(ads: SplashAdRow[]): SplashAdRow | null {
  if (ads.length === 0) return null;
  const total = ads.reduce((s, a) => s + Math.max(1, a.weight), 0);
  let r = Math.random() * total;
  for (const a of ads) {
    r -= Math.max(1, a.weight);
    if (r <= 0) return a;
  }
  return ads[ads.length - 1];
}

function readCachedAd(): SplashAdRow | null {
  if (window.innerWidth >= 768) return null;
  if (sessionStorage.getItem(SESSION_KEY)) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const ad = JSON.parse(raw) as SplashAdRow;
    if (!ad?.image_url || !inWindow(ad)) return null;
    return ad;
  } catch {
    return null;
  }
}

export function SplashAd() {
  const router = useRouter();
  // SSR 首帧渲染空,挂载后才读本地缓存(避免 hydration 不一致)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const ad = useMemo(() => (mounted ? readCachedAd() : null), [mounted]);
  const [dismissed, setDismissed] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const showing = !!ad && !dismissed;

  // 标记本会话已展示 + 倒计时(到 0 自动关闭)
  useEffect(() => {
    if (!showing || !ad) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    let s = Math.max(1, ad.duration_seconds || 5);
    const t = setInterval(() => {
      s -= 1;
      setLeft(s);
      if (s <= 0) {
        clearInterval(t);
        setDismissed(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [showing, ad]);

  // 展示期间隐藏 iOS 原生底部导航
  useEffect(() => {
    if (!showing) return;
    return acquireNativeBarHideLock();
  }, [showing]);

  // 后台刷新配置供下次启动:active + 投放期内,加权随机选一条,预载图片
  const refreshed = useRef(false);
  useEffect(() => {
    if (!mounted || refreshed.current) return;
    refreshed.current = true;
    supabase
      .from("splash_ads")
      .select("*")
      .eq("active", true)
      .then(({ data }) => {
        const candidates = ((data as SplashAdRow[]) || []).filter(inWindow);
        const next = pickWeighted(candidates);
        try {
          if (next) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            new window.Image().src = next.image_url; // 预载进 HTTP 缓存
          } else {
            localStorage.removeItem(CACHE_KEY);
          }
        } catch {}
      });
  }, [mounted]);

  const openAd = () => {
    if (!ad?.link_url) return;
    setDismissed(true);
    if (ad.link_url.startsWith("/")) router.push(ad.link_url);
    else openExternal(ad.link_url);
  };

  const remain = left ?? Math.max(1, ad?.duration_seconds || 5);

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col bg-background md:hidden"
          data-app-overlay=""
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 广告主体:点击跳转 */}
          <button
            type="button"
            onClick={openAd}
            className="relative min-h-0 flex-1"
            aria-label={ad!.title || "广告"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad!.image_url}
              alt={ad!.title || "广告"}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* 跳过按钮(垫出刘海安全区) */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              className="absolute right-4 rounded-full bg-black/45 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-sm"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
            >
              跳过 {remain}s
            </span>
          </button>
          {/* 品牌栏 */}
          <div
            className="flex shrink-0 items-center justify-center gap-2 bg-background py-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
          >
            <span className="font-logo text-2xl text-brand-ink">常來車網</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              北美华人的二手车平台
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
