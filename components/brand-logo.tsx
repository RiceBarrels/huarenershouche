"use client";

import { useState } from "react";
import { brandLogoDarkTreatment, brandMonogram, getBrandLogoUrl } from "@/lib/brand-logos";
import { cn } from "@/lib/utils";

/**
 * 品牌 logo —— 全站唯一渲染入口(筛选、首页品牌行、抽屉等)。
 * - 固定尺寸档位,宽高写死:有图、无图、加载失败三种情况占位一致,列表不跳动
 * - 浅色模式:白底 1px 边框小方块;深色模式:主题 secondary 深色底块,看不清的品牌按 brandLogoDarkTreatment
 *   反白(纯黑单色)或垫白色内衬(彩色 / 自带白底),详见 lib/brand-logos.ts
 * - 没有 logo / 加载失败 → 同尺寸字母占位(等宽字体,跟随主题色),不出现裂图
 * - 普通 <img>(静态导出 / Capacitor 可用,不走 next/image 远程配置)
 */
const SIZES = {
  xs: { box: "h-4 w-4", px: 16, text: "text-[8px]", letters: 1 },
  sm: { box: "h-6 w-6", px: 24, text: "text-[10px]", letters: 2 },
  md: { box: "h-8 w-8", px: 32, text: "text-[11px]", letters: 2 },
  lg: { box: "h-10 w-10", px: 40, text: "text-[13px]", letters: 2 },
} as const;

export type BrandLogoSize = keyof typeof SIZES;

export function BrandLogo({
  make,
  size = "sm",
  className,
}: {
  make: string;
  size?: BrandLogoSize;
  className?: string;
}) {
  const url = getBrandLogoUrl(make);
  // key 跟着 url 走:换品牌时失败状态自动重置
  return <BrandLogoInner key={url ?? make} make={make} url={url} size={size} className={className} />;
}

function BrandLogoInner({
  make,
  url,
  size,
  className,
}: {
  make: string;
  url: string | null;
  size: BrandLogoSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size];
  const base = cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[0.3rem] border", s.box, className);

  if (!url || failed) {
    return (
      <span
        role="img"
        aria-label={make}
        className={cn(base, "border-border bg-muted font-mono font-semibold leading-none text-muted-foreground", s.text)}
      >
        {brandMonogram(make, s.letters as 1 | 2)}
      </span>
    );
  }

  const dark = brandLogoDarkTreatment(make);
  return (
    <span className={cn(base, "border-stone-200 bg-white p-[12%] dark:border-border dark:bg-secondary")}>
      {/* plate:深色模式下在图后面垫白色内衬(浅色模式下与白底块融为一体,看不出) */}
      <span className={cn("flex h-full w-full items-center justify-center", dark === "plate" && "dark:rounded-[0.2rem] dark:bg-white dark:p-[6%]")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 静态导出需要普通 img */}
        <img
          src={url}
          alt={make}
          width={s.px}
          height={s.px}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-contain", dark === "invert" && "dark:invert")}
        />
      </span>
    </span>
  );
}
