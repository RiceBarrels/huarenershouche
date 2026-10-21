"use client";

import { Mail, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "@/components/localized-navigation";
import { useMemo } from "react";
import { makeSlug, SEO_STATES, SEO_CITIES, SEO_PRICE_PAGES, SEO_MODELS, HOT_STATE_ABBRS } from "@/lib/seo-pages";
import { HOT_MAKES, MAKES_ZH } from "@/lib/mock-data";
import { useI18n } from "@/components/i18n-provider";
import { brandLogoSrc, isZhLocale } from "@/lib/i18n";
import { toHantName } from "@/lib/i18n/zh-hant-names";

const buyLinks = [
  { label: "搜索车辆", href: "/browse" },
  { label: "车辆对比", href: "/compare" },
  { label: "购车指南", href: "/guide" },
  { label: "二手车分类导航", href: "/cars" },
];

const HOT_MODEL_NAMES = ["Camry", "Corolla", "Civic", "Accord", "CR-V", "RAV4", "Model 3", "Model Y", "3 Series", "X5"];

const sellLinks = [
  { label: "免费发布", href: "/post" },
  { label: "车行入驻", href: "/dealer-apply" },
  { label: "我的车辆", href: "/account" },
];

const helpLinks = [
  { label: "联系我们", href: "/contact" },
  { label: "使用条款", href: "/terms" },
  { label: "商业合作", href: "/business" },
  { label: "关于我们", href: "/about" },
];

export function Footer() {
  const { t, locale } = useI18n();

  // SEO 链接文案由中文名拼接而成,英文下改用英文名 + "Used X" 句式,所以按语言构建
  const seoLinkRows = useMemo(() => {
    const zh = isZhLocale(locale);
    // 繁體:拼出来的中文名逐字转繁体(同步查表,SSR 与水合一致)
    const h = (text: string) => (locale === "zh-hant" ? toHantName(text) : text);
    const rows = [
      {
        title: t("热门品牌"),
        links: HOT_MAKES.map((m) => ({
          label: zh ? `${MAKES_ZH[m] || m}二手车` : `Used ${m}`,
          href: `/cars/${makeSlug(m)}`,
        })),
      },
      {
        title: t("热门车型"),
        links: SEO_MODELS.filter((m) => HOT_MODEL_NAMES.includes(m.name)).map((m) => ({
          label: zh ? `二手${m.zh || m.name}` : `Used ${m.name}`,
          href: `/cars/${makeSlug(m.make)}/${makeSlug(m.name)}`,
        })),
      },
      {
        title: t("热门城市"),
        links: SEO_CITIES.slice(0, 10).map((c) => ({
          label: zh ? `${c.zh}二手车` : `Used cars in ${c.en}`,
          href: `/cars/${c.slug}`,
        })),
      },
      {
        title: t("热门地区"),
        links: SEO_STATES.filter((s) => HOT_STATE_ABBRS.includes(s.abbr))
          .slice(0, 8)
          .map((s) => ({ label: zh ? `${s.zh}二手车` : `Used cars in ${s.abbr}`, href: `/cars/${s.slug}` })),
      },
      {
        title: t("按预算"),
        links: SEO_PRICE_PAGES.map((n) => ({
          label: zh ? `$${n / 1000}k以下二手车` : `Used cars under $${n / 1000}k`,
          href: `/cars/under-${n}`,
        })),
      },
    ];
    return rows.map((row) => ({ ...row, links: row.links.map((l) => ({ ...l, label: h(l.label) })) }));
  }, [t, locale]);

  return (
    <footer className="hidden overflow-hidden border-t border-border bg-card md:block">
      <div className="mx-auto max-w-7xl px-4 py-12 2xl:max-w-[88rem] min-[1920px]:max-w-[104rem] min-[2560px]:max-w-[120rem]">
        {/* Watermark wordmark */}
        <div className="select-none pb-10">
          {/* 宽屏容器已放大到 88/104rem,水印跟着升一档,否则左侧字、右侧大片空白 */}
          <p className="whitespace-nowrap font-logo text-5xl leading-none tracking-tighter text-foreground/[0.07] lg:text-7xl 2xl:text-8xl">
            {/* en 词典把品牌翻成 CLCAuto,再拼 / CLCAUTO 会重复,直接单写 */}
            {locale === "en" ? "CLCAUTO" : `${t("常來車網")} / CLCAUTO`}
          </p>
        </div>

        {/* 品牌栏内容更"重"(简介 + 联系方式),lg 起多分一点宽度,链接三栏视觉更均匀 */}
        <div className="grid grid-cols-2 gap-8 border-t border-border pt-10 md:grid-cols-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src={brandLogoSrc(locale)} alt={t("常來車網")} width={24} height={24} className="h-6 w-6 object-contain" />
              <span className="font-logo text-base">{t("常來車網")}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("北美华人最信赖的二手车交易平台，让买卖车更简单、更安心。")}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="mailto:colinwilsonfan@gmail.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" strokeWidth={1.5} />
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                {t("微信客服")}
              </span>
            </div>
          </div>

          {/* Buy */}
          <div>
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{locale === "zh-hant" ? toHantName("买车 / Buy") : "买车 / Buy"}</h4>
            <ul className="mt-4 space-y-2 border-t border-border pt-3">
              {buyLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{locale === "zh-hant" ? toHantName("卖车 / Sell") : "卖车 / Sell"}</h4>
            <ul className="mt-4 space-y-2 border-t border-border pt-3">
              {sellLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{locale === "zh-hant" ? toHantName("帮助 / Support") : "帮助 / Support"}</h4>
            <ul className="mt-4 space-y-2 border-t border-border pt-3">
              {helpLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SEO internal links */}
        <div className="mt-10 border-t border-border pt-6">
          <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{locale === "zh-hant" ? toHantName("热门搜索 / Popular") : "热门搜索 / Popular"}</h4>
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
            &copy; {new Date().getFullYear()} {t("常來車網 CLCAuto")}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              {t("用户协议")}
            </Link>
            <span className="text-border">|</span>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              {t("隐私政策")}
            </Link>
            <span className="text-border">|</span>
            <Link href="/developers" className="transition-colors hover:text-foreground">
              {t("开发者 / API")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
