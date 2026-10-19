// 程序化 SEO 落地页：/cars/<slug>（支持二级路径如 /cars/toyota/california）。
// 全部页面在构建时静态生成，数据来自 lib/seo-pages.ts；车源列表由客户端组件拉取。

import type { Metadata } from "next";
import Link from "@/components/localized-navigation";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SeoCarList } from "@/components/seo-car-list";
import { JsonLd } from "@/lib/seo/jsonld";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { ogLocale } from "@/lib/i18n/content-langs";
import type { Locale } from "@/lib/i18n";
import { hantString, hantTree, zhContentLang } from "@/lib/i18n/content/hant-node";
import {
  localeAlternates,
  SEO_PAGES,
  SITE_NAME,
  getSeoPage,
  seoPageHref,
  browseHref,
  getRelatedPages,
} from "@/lib/seo-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const def = getSeoPage(slug);
  if (!def) return {};
  return {
    // def.title 已含「| 站名」,absolute 跳过 layout 的 %s 模板,避免站名重复两次
    title: { absolute: hantString(locale, def.title) },
    description: hantString(locale, def.description),
    alternates: localeAlternates(locale, `/cars/${def.slug}`, { zhOnly: true }),
    openGraph: {
      title: hantString(locale, def.title),
      description: hantString(locale, def.description),
      locale: ogLocale(locale as Locale),
    },
  };
}

export default async function SeoLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  const def = getSeoPage(slug);
  if (!def) notFound();

  const relatedGroups = getRelatedPages(def);
  const browseUrl = browseHref(def);

  // 正文只有中文:非中文树的 canonical 回 /zh;繁體树是服务端整页转换的独立版本,结构化数据指向自身
  const tree = locale === "zh-hant" ? "zh-hant" : "zh";
  const breadcrumb = breadcrumbJsonLd([
    { name: hantString(locale, SITE_NAME), url: `/${tree}` },
    { name: hantString(locale, "二手车"), url: `/${tree}/cars` },
    { name: hantString(locale, def.label), url: `/${tree}/cars/${def.slug}` },
  ]);

  return (
    <>
      <Header />
      {hantTree(locale, <main lang={zhContentLang(locale)} className="container mx-auto max-w-5xl px-4 py-8 2xl:max-w-6xl">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-[11px] text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            首页
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/cars" className="hover:text-foreground">
            二手车
          </Link>
          <span className="mx-1.5">/</span>
          <span>{def.label}</span>
        </nav>

        <h1 className="mt-4 font-logo text-2xl">{def.h1}</h1>

        {def.intro.map((para, i) => (
          <p
            key={i}
            className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground"
          >
            {para}
          </p>
        ))}

        <div className="mt-4">
          <Link
            href={browseUrl}
            className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 font-mono text-xs transition-colors hover:bg-muted/70"
          >
            在买车页按更多条件筛选 →
          </Link>
        </div>

        <div className="mt-6">
          <SeoCarList filter={def.listFilter} browseHref={browseUrl} />
        </div>

        {relatedGroups.map((group) => (
          <section key={group.title} className="mt-8">
            <h2 className="font-mono text-sm font-semibold">{group.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.pages.map((p) => (
                <Link
                  key={p.slug}
                  href={seoPageHref(p)}
                  className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] transition-colors hover:bg-muted/70"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <JsonLd data={breadcrumb} />
      </main>)}
      <Footer />
    </>
  );
}
