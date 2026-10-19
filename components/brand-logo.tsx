import { brandMonogram, getBrandLogo } from "@/lib/brand-logos";
import { cn } from "@/lib/utils";

/**
 * 品牌 logo —— 全站唯一渲染入口(筛选、首页品牌行、抽屉、onboarding)。
 * - 无底块:单色图标用 CSS mask 填 currentColor,跟随父元素文字色(浅色 / 深色 / 选中态都不用单独处理)
 * - 固定尺寸档位,宽高写死:有图、无图两种情况占位一致,列表不跳动;图标在方框里按 lib/brand-logos.ts 的
 *   视觉面积归一尺寸居中
 * - 没有 logo → 同尺寸等宽字母占位
 * - 触控热区和品牌名由调用处的按钮负责(图标本身不可点)
 */
const SIZES = {
  xs: { box: "h-4 w-4", text: "text-[8px]", letters: 1 },
  sm: { box: "h-6 w-6", text: "text-[10px]", letters: 2 },
  md: { box: "h-8 w-8", text: "text-[11px]", letters: 2 },
  lg: { box: "h-10 w-10", text: "text-[13px]", letters: 2 },
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
  const s = SIZES[size];
  const logo = getBrandLogo(make);
  const base = cn("inline-flex shrink-0 items-center justify-center", s.box, className);

  if (!logo) {
    return (
      <span role="img" aria-label={make} className={cn(base, "font-mono font-semibold leading-none opacity-70", s.text)}>
        {brandMonogram(make, s.letters as 1 | 2)}
      </span>
    );
  }

  const mask = `url(${logo.url})`;
  return (
    <span role="img" aria-label={make} className={base}>
      <span
        className="block bg-current"
        style={{
          width: `${logo.w}%`,
          height: `${logo.h}%`,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </span>
  );
}
