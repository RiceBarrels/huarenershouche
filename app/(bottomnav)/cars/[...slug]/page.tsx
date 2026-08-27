// 程序化 SEO 落地页：/cars/<slug>（支持二级路径如 /cars/toyota/california）。
// 全部页面在构建时静态生成，数据来自 lib/seo-pages.ts；车源列表由客户端组件拉取。

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SeoCarList } from "@/components/seo-car-list";
import {
  SEO_PAGES,
  SITE_URL,
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
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const def = getSeoPage(slug);
  if (!def) return {};
  return {
    // def.title 已含「| 站名」,absolute 跳过 layout 的 %s 模板,避免站名重复两次
    title: { absolute: def.title },
    description: def.description,
    alternates: { canonical: `${SITE_URL}/cars/${def.slug}` },
    openGraph: { title: def.title, description: def.description },
  };
}

export default async function SeoLandingPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const def = getSeoPage(slug);
  if (!def) notFound();

  const relatedGroups = getRelatedPages(def);
  const browseUrl = browseHref(def);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "二手车",
        item: `${SITE_URL}/cars`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: def.label,
        item: `${SITE_URL}/cars/${def.slug}`,
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="container mx-auto max-w-5xl px-4 py-8 2xl:max-w-6xl">
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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      </main>
      <Footer />
    </>
  );
}
