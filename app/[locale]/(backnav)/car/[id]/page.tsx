// 车辆详情 — server component:每辆车独立 SEO metadata + Vehicle JSON-LD + 服务端预取。
// 只渲染公开车源(getPublicCar:active 且未停用,不含电话等内部列),否则 notFound();
// 车主 / 认领者 / 管理员看自己已下架的车由同目录 not-found.tsx 用登录会话在客户端补拉。
// 正文、metadata、JSON-LD 共用同一份 resolveCarView(同一条 i18n_bundle 行):
// 有译文出译文,没有就出原文 + canonical 指回原文语言页;本页只读,不触发任何翻译(无 LLM、无 after())。
// 静态导出(Capacitor)构建时整个 [id] 目录被隐藏,原生端走 /car?id= + 客户端 car-detail 自行拉取。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME, getSeoPage, makeSlug, seoPageHref } from "@/lib/seo-pages";
import { carLocation, isZhLocale, type Locale } from "@/lib/i18n";
import { serverT } from "@/lib/i18n/translate";
import { ogLocale } from "@/lib/i18n/content-langs";
import {
  getBundle,
  getBundles,
  getPublicCar,
  getPublicCarComments,
  serverHant,
} from "@/lib/i18n/content/server";
import { resolveCarView, type CarView } from "@/lib/i18n/content/resolve";
import type { TFn } from "@/lib/i18n/content/types";
import { contentAlternates, ogAlternates } from "@/lib/seo/alternates";
import { JsonLd } from "@/lib/seo/jsonld";
import { breadcrumbJsonLd, vehicleJsonLd } from "@/lib/seo/structured-data";
import { formatCarMileage, formatCarPrice } from "@/lib/format";
import type { PublicCar } from "@/lib/types";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import CarDetail from "../car-detail";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;
// 随页面 SSR 的首批评论条数(客户端挂载后补全其余并接实时更新)
const SSR_COMMENT_LIMIT = 20;
const DESCRIPTION_MAX = 160;

function coverImage(car: PublicCar): string | null {
  const pics = [car.image_url, ...(car.images || [])].filter(
    (u): u is string => !!u && !VIDEO_RE.test(u),
  );
  return pics[0] ?? null;
}

function priceLabel(car: PublicCar, t: TFn): string {
  // 车源自己的币种(加元「CA$」/ 澳元「A$」/ 纽元「NZ$」)
  return car.price > 0 ? formatCarPrice(car, car.price) : t("电议");
}

/** 按字符(而非 UTF-16 码元)截断,emoji 等不会被切成半个 */
function truncate(text: string, max: number): string {
  return text.length <= max ? text : Array.from(text).slice(0, max).join("");
}

/** 面向搜索/分享的一句话描述:关键规格 + 本页显示的描述(译文或原文);无描述时用品牌标语 */
function buildDescription(car: PublicCar, view: CarView, locale: Locale, t: TFn): string {
  // 里程按车源自己的单位(英里 / 公里),单位文案按页面语言
  const miles = car.mileage > 0 ? formatCarMileage(car, t) : "";
  const specs = [
    view.title,
    priceLabel(car, t),
    miles,
    carLocation(car, locale),
    car.transmission && t(car.transmission),
    car.fuel_type && t(car.fuel_type),
  ]
    .filter(Boolean)
    .join(" · ");
  const body = (view.description?.text.description ?? "").replace(/\s+/g, " ").trim();
  const sep = isZhLocale(locale) ? "。" : ". ";
  return truncate(`${specs}${sep}${body || t("买车卖车 · 就上常來車網")}`, DESCRIPTION_MAX);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const t = serverT(locale);
  const car = await getPublicCar(id);

  if (!car) {
    return { title: t("车源不存在或已下架"), robots: { index: false, follow: false } };
  }

  const view = resolveCarView(car, await getBundle("car", car.id, locale), locale, t);
  const location = carLocation(car, locale);
  // layout 的 title.template 会补上品牌后缀
  const title = [`${view.title} ${priceLabel(car, t)}`, location].filter(Boolean).join(" - ");
  const description = buildDescription(car, view, locale, t);
  const cover = coverImage(car);
  // 本语言没有可用译文时 canonical 指向原文语言页,hreflang 只列可用语言
  const alternates = contentAlternates(locale, `/car/${car.id}`, view.available, view.xDefault);

  return {
    title,
    description,
    keywords: [
      car.make,
      car.model,
      `${car.make} ${car.model}`,
      String(car.year),
      location,
      car.fuel_type && t(car.fuel_type),
      t("二手车"),
      t("常來車網"),
    ].filter(Boolean) as string[],
    alternates,
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      alternateLocale: ogAlternates(locale, view.available),
      title,
      description,
      url: alternates.canonical,
      siteName: t(SITE_NAME),
      ...(cover && { images: [{ url: cover, alt: view.title }] }),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(cover && { images: [cover] }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const car = await getPublicCar(id);
  if (!car) notFound();

  const t = serverT(locale);
  const [row, comments] = await Promise.all([
    getBundle("car", car.id, locale),
    getPublicCarComments(car.id, SSR_COMMENT_LIMIT),
  ]);
  const commentRows = await getBundles(
    "car_comment",
    comments.map((c) => c.id),
    locale,
  );
  const view = resolveCarView(car, row, locale, t);
  const url = `${SITE_URL}/${locale}/car/${car.id}`;

  // 面包屑:首页 → 二手车 → 品牌落地页(/cars/* 只有中文版,zh / zh-hant 树挂各自的版本) → 本车
  const makePage = isZhLocale(locale) ? getSeoPage([makeSlug(car.make)]) : undefined;
  const crumbs = [
    { name: t("首页"), url: `${SITE_URL}/${locale}` },
    { name: t("二手车"), url: `${SITE_URL}/${locale}/browse` },
    ...(makePage?.kind === "make"
      ? [
          {
            name: locale === "zh-hant" ? serverHant(makePage.label) : makePage.label,
            url: `${SITE_URL}/${locale === "zh-hant" ? "zh-hant" : "zh"}${seoPageHref(makePage)}`,
          },
        ]
      : []),
    { name: view.title, url },
  ];

  return (
    <>
      <JsonLd data={vehicleJsonLd({ car, view, locale, url, t })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <ContentI18nProvider
        locale={locale}
        rows={{ car: row ? { [car.id]: row } : {}, car_comment: commentRows }}
      >
        <CarDetail initialCar={car} initialComments={comments} />
      </ContentI18nProvider>
    </>
  );
}
