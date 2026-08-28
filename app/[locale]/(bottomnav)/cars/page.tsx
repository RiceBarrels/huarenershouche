// 二手车分类导航 hub 页：/cars。按品牌、地区、价格等维度列出所有 SEO 落地页入口。

import type { Metadata } from "next";
import Link from "@/components/localized-navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  SEO_PAGES,
  SITE_URL,
  SITE_NAME,
  seoPageHref,
  type SeoPageDef,
  type SeoPageKind,
} from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: `二手车分类导航 - 按品牌、地区、价格找车 | ${SITE_NAME}`,
  description: `${SITE_NAME}二手车分类导航：按丰田、本田、宝马等热门品牌，加州、纽约、德州等地区，以及车身类型、预算、年份、新能源快速找到适合你的二手车，北美华人买车卖车更放心。`,
  alternates: { canonical: `${SITE_URL}/cars` },
};

const SECTIONS: { title: string; kind: SeoPageKind }[] = [
  { title: "热门品牌", kind: "make" },
  { title: "热门车型", kind: "model" },
  { title: "按州找车", kind: "state" },
  { title: "热门城市", kind: "city" },
  { title: "车身类型", kind: "body" },
  { title: "按预算", kind: "price" },
  { title: "按年份", kind: "year" },
  { title: "新能源与燃油", kind: "fuel" },
  { title: "精选专题", kind: "theme" },
];

export default function CarsHubPage() {
  const byKind = new Map<SeoPageKind, SeoPageDef[]>();
  for (const p of SEO_PAGES) {
    const list = byKind.get(p.kind);
    if (list) list.push(p);
    else byKind.set(p.kind, [p]);
  }

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
          <span>二手车</span>
        </nav>

        <h1 className="mt-4 font-logo text-2xl">二手车分类导航</h1>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          按品牌、地区、车身类型、预算、年份快速找到北美华人社区的二手车源，中文沟通，免费发布。
        </p>

        {SECTIONS.map(({ title, kind }) => {
          const pages = byKind.get(kind) ?? [];
          if (pages.length === 0) return null;
          return (
            <section key={kind} className="mt-8">
              <h2 className="font-mono text-sm font-semibold">{title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {pages.map((p) => (
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
          );
        })}
      </main>
      <Footer />
    </>
  );
}
