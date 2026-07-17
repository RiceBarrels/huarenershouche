import { Mail, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { makeSlug, SEO_STATES, SEO_CITIES, SEO_PRICE_PAGES, SEO_MODELS, HOT_STATE_ABBRS } from "@/lib/seo-pages";
import { HOT_MAKES, MAKES_ZH } from "@/lib/mock-data";

const buyLinks = [
  { label: "搜索车辆", href: "/browse" },
  { label: "车辆对比", href: "/compare" },
  { label: "购车指南", href: "/guide" },
  { label: "二手车分类导航", href: "/cars" },
];

const HOT_MODEL_NAMES = ["Camry", "Corolla", "Civic", "Accord", "CR-V", "RAV4", "Model 3", "Model Y", "3 Series", "X5"];

const seoLinkRows: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "热门品牌",
    links: HOT_MAKES.map((m) => ({
      label: `${MAKES_ZH[m] || m}二手车`,
      href: `/cars/${makeSlug(m)}`,
    })),
  },
  {
    title: "热门车型",
    links: SEO_MODELS.filter((m) => HOT_MODEL_NAMES.includes(m.name)).map((m) => ({
      label: `二手${m.zh || m.name}`,
      href: `/cars/${makeSlug(m.make)}/${makeSlug(m.name)}`,
    })),
  },
  {
    title: "热门城市",
    links: SEO_CITIES.slice(0, 10).map((c) => ({
      label: `${c.zh}二手车`,
      href: `/cars/${c.slug}`,
    })),
  },
  {
    title: "热门地区",
    links: SEO_STATES.filter((s) => HOT_STATE_ABBRS.includes(s.abbr))
      .slice(0, 8)
      .map((s) => ({ label: `${s.zh}二手车`, href: `/cars/${s.slug}` })),
  },
  {
    title: "按预算",
    links: SEO_PRICE_PAGES.map((n) => ({
      label: `$${n / 1000}k以下二手车`,
      href: `/cars/under-${n}`,
    })),
  },
];

const sellLinks = [
  { label: "免费发布", href: "/post" },
  { label: "车行入驻", href: "/dealer-apply" },
  { label: "我的车辆", href: "/account" },
];

const helpLinks = [
  { label: "联系我们", href: "/contact" },
  { label: "使用条款", href: "/terms" },
  { label: "商业合作", href: "/business" },
];

export function Footer() {
  return (
    <footer className="hidden border-t border-border bg-card md:block">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/logo.png" alt="常来车网" width={24} height={24} className="h-6 w-6 object-contain" />
              <span className="font-mono text-sm font-semibold">常来车网</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              北美华人最信赖的二手车交易平台，让买卖车更简单、更安心。
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="mailto:contact@clcauto.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                微信客服
              </span>
            </div>
          </div>

          {/* Buy */}
          <div>
            <h4 className="text-sm font-semibold">买车</h4>
            <ul className="mt-3 space-y-2">
              {buyLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h4 className="text-sm font-semibold">卖车</h4>
            <ul className="mt-3 space-y-2">
              {sellLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-sm font-semibold">帮助与支持</h4>
            <ul className="mt-3 space-y-2">
              {helpLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SEO internal links */}
        <div className="mt-10 border-t border-border pt-6">
          <h4 className="font-mono text-xs font-semibold">热门搜索</h4>
          <div className="mt-3 space-y-2">
            {seoLinkRows.map((row) => (
              <div key={row.title} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-[11px] text-muted-foreground/60">{row.title}</span>
                {row.links.map((link, i) => (
                  <span key={link.href} className="inline-flex items-baseline gap-x-2">
                    {i > 0 && <span className="text-[11px] text-border">·</span>}
                    <Link
                      href={link.href}
                      className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} 常来车网 CLCAuto. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              用户协议
            </Link>
            <span className="text-border">|</span>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              隐私政策
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
