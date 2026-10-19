// 结构化数据(JSON-LD)构建。与正文、metadata 共用 lib/i18n/content/resolve 的结果(B13/B14):
// 用显示出来的标题/正文(译文或原文)、对应的 inLanguage、带语言前缀的 URL 与 @id。
// 输出交给 <JsonLd>(lib/seo/jsonld.tsx)转义序列化;值为 undefined 的属性序列化时自动省略。
// 调用方传入的 url 应为完整地址(站内路径以 / 开头时补全为 SITE_URL + path)。

import { brandLogoSrc, carLocation, type Locale } from "@/lib/i18n";
import { htmlLang } from "@/lib/i18n/content-langs";
import type { CarView, Localized, PostView } from "@/lib/i18n/content/resolve";
import type { TFn } from "@/lib/i18n/content/types";
import { avatarUrl } from "@/lib/avatar";
import { SITE_URL } from "@/lib/seo-pages";
import { carCurrency, carMileageUnit } from "@/lib/currency";
import type { DbCar, DbCommunityPost, DbProfile, DbQaQuestion, PublicCar } from "@/lib/types";
import {
  schemaDriveWheelConfiguration,
  schemaFuelType,
  schemaTransmission,
} from "@/lib/seo/vehicle-schema";

const CONTEXT = "https://schema.org";
// 正文类字段(车源描述、帖子正文、评论/回答)的摘要长度
const TEXT_LIMIT = 500;
// 帖子 JSON-LD 最多带的评论数
const MAX_COMMENTS = 10;
const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i;

// 各语言品牌名(与词典「常來車網」的译名一致)
const BRAND: Record<Locale, string> = {
  zh: "常來車網",
  "zh-hant": "常來車網",
  en: "CLCAuto",
  ko: "또와카",
  ja: "常来カーネット",
  es: "CLCAuto",
  fr: "CLCAuto",
};
const BRAND_NAMES = Array.from(new Set(Object.values(BRAND)));

// 站点简介:zh 沿用原文案;其他语言为中性描述(不做特定人群定位)
const SITE_DESCRIPTION: Record<Locale, string> = {
  zh: "北美华人二手车交易平台，覆盖全美华人社区，提供中文买车卖车服务。",
  "zh-hant": "二手車買賣平台：個人與車行直售，免費刊登、VIN 召回查詢與 Carfax 報告，買車賣車更簡單。",
  en: "Used car marketplace in North America. Buy and sell used cars from private sellers and dealers, with free listings, VIN recall checks and Carfax reports.",
  ko: "북미 중고차 거래 플랫폼. 개인 판매자와 딜러의 중고차를 사고팔 수 있으며, 무료 등록, VIN 리콜 조회, Carfax 리포트를 제공합니다.",
  ja: "北米の中古車マーケットプレイス。個人・ディーラーの中古車を売買でき、無料掲載、VIN リコール検索、Carfax レポートに対応しています。",
  es: "Mercado de autos usados en Norteamérica. Compra y vende autos usados de particulares y concesionarios, con publicaciones gratis, verificación de VIN y reportes Carfax.",
  fr: "Marché de voitures d'occasion en Amérique du Nord. Achetez et vendez des voitures d'occasion de particuliers et de concessionnaires, avec annonces gratuites, vérification VIN et rapports Carfax.",
};

const homeUrl = (locale: Locale) => `${SITE_URL}/${locale}`;
const websiteId = (locale: Locale) => `${homeUrl(locale)}#website`;
const organizationId = (locale: Locale) => `${homeUrl(locale)}#organization`;
const userUrl = (locale: Locale, userId: string) => `${homeUrl(locale)}/user/${userId}`;
const absoluteUrl = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

/** 折叠空白并按字符(不拆代理对)截断 */
function clip(text: string, max = TEXT_LIMIT): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(flat);
  return chars.length > max ? chars.slice(0, max).join("") : flat;
}

/** 去掉视频与重复地址 */
function stillImages(urls: readonly (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const url of urls) if (url && !VIDEO_RE.test(url) && !out.includes(url)) out.push(url);
  return out;
}

/** 显示文本的语言:正文优先,其次标题;都无法判断时用页面语言 */
function shownLang(view: Localized<"title" | "content">, locale: Locale): string {
  return view.textLang.content ?? view.textLang.title ?? htmlLang(locale);
}

const person = (name: string, userId: string | null | undefined, locale: Locale) => ({
  "@type": "Person",
  name,
  url: userId ? userUrl(locale, userId) : undefined,
});

const organizationRef = (locale: Locale) => ({
  "@type": "Organization",
  "@id": organizationId(locale),
  name: BRAND[locale],
  url: homeUrl(locale),
});

export interface JsonLdLink {
  name: string;
  url: string;
}

/** 评论 / 回答:text 为显示的文本(译文或原文),lang 为其 lang 属性 */
export interface JsonLdReply {
  text: string;
  lang?: string;
  /** 作者显示名(无用户名时由调用方传 t("匿名用户")) */
  author: string;
  userId?: string | null;
  createdAt: string;
}

export interface JsonLdAnswer extends JsonLdReply {
  upvotes?: number;
  accepted?: boolean;
}

const replyJsonLd = (type: "Comment" | "Answer", reply: JsonLdReply, locale: Locale) => ({
  "@type": type,
  text: clip(reply.text),
  inLanguage: reply.lang,
  datePublished: reply.createdAt,
  author: person(reply.author, reply.userId, locale),
});

const listElements = (items: readonly JsonLdLink[]) => ({
  numberOfItems: items.length,
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    url: absoluteUrl(item.url),
  })),
});

/** 站点级 Organization + WebSite(根 layout 输出一次);品牌名、简介、搜索入口按语言 */
export function siteGraphJsonLd(locale: Locale) {
  const home = homeUrl(locale);
  const name = BRAND[locale];
  const alternateName = BRAND_NAMES.filter((brand) => brand !== name);
  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId(locale),
        name,
        alternateName,
        url: home,
        logo: `${SITE_URL}${brandLogoSrc(locale)}`,
        description: SITE_DESCRIPTION[locale],
        email: "contact@clcauto.com",
        areaServed: "US",
      },
      {
        "@type": "WebSite",
        "@id": websiteId(locale),
        name,
        alternateName,
        url: home,
        inLanguage: htmlLang(locale),
        publisher: { "@id": organizationId(locale) },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${home}/browse?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** 面包屑:按顺序传入 { name, url } */
export function breadcrumbJsonLd(items: readonly JsonLdLink[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

/** 车源(schema.org Car):标题 / 描述 / 颜色按页面语言,枚举映射为 schema.org 取值 */
export function vehicleJsonLd({
  car,
  view,
  locale,
  url,
  t,
}: {
  car: PublicCar | DbCar;
  view: CarView;
  locale: Locale;
  url: string;
  t: TFn;
}) {
  const pageUrl = absoluteUrl(url);
  const images = stillImages([car.image_url, ...(car.images ?? [])]);
  const description = view.description ? clip(view.description.text.description) : "";
  const dealer = car.profiles?.account_type === "dealer" || car.profiles?.is_system === true;
  return {
    "@context": CONTEXT,
    "@type": "Car",
    "@id": `${pageUrl}#vehicle`,
    url: pageUrl,
    name: view.title,
    // Car 不是 CreativeWork,没有 inLanguage:页面语言挂在承载它的 ItemPage 上
    mainEntityOfPage: {
      "@type": "ItemPage",
      "@id": pageUrl,
      url: pageUrl,
      inLanguage: htmlLang(locale),
      isPartOf: { "@id": websiteId(locale) },
    },
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    vehicleModelDate: String(car.year),
    vehicleConfiguration: car.trim || undefined,
    vehicleIdentificationNumber: car.vin || undefined,
    color: car.exterior_color ? t(car.exterior_color) : undefined,
    vehicleInteriorColor: car.interior_color ? t(car.interior_color) : undefined,
    fuelType: schemaFuelType(car.fuel_type),
    vehicleTransmission: schemaTransmission(car.transmission),
    driveWheelConfiguration: schemaDriveWheelConfiguration(car.drivetrain),
    // 里程按车源自己的单位:UN/CEFACT 代码 SMI = 英里、KMT = 公里
    mileageFromOdometer:
      car.mileage > 0
        ? { "@type": "QuantitativeValue", value: car.mileage, unitCode: carMileageUnit(car) === "km" ? "KMT" : "SMI" }
        : undefined,
    image: images.length > 0 ? images : undefined,
    description: description || undefined,
    itemCondition: "https://schema.org/UsedCondition",
    // 电议(price = 0)不输出报价
    offers:
      car.price > 0
        ? {
            "@type": "Offer",
            price: car.price,
            // 车源自己的币种(USD / CAD;car-currency.sql 未执行时按 USD)
            priceCurrency: carCurrency(car),
            availability:
              car.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/UsedCondition",
            url: pageUrl,
            seller: car.seller_name
              ? {
                  "@type": dealer ? "AutoDealer" : "Person",
                  name: car.seller_name,
                  url: userUrl(locale, car.seller_id),
                }
              : undefined,
            availableAtOrFrom: car.location
              ? { "@type": "Place", name: carLocation(car, locale), address: car.location }
              : undefined,
          }
        : undefined,
  };
}

/**
 * 社区帖子(DiscussionForumPosting):显示的标题/正文、话题标签作 keywords、前 10 条评论;
 * 显示的是译文时用 translationOfWork 指向原文语言页面(sourceUrl,通常为 x-default URL)。
 */
export function postJsonLd({
  post,
  view,
  author,
  comments,
  locale,
  url,
  sourceUrl,
}: {
  post: Pick<
    DbCommunityPost,
    "user_id" | "images" | "created_at" | "updated_at" | "content_updated_at" | "likes_count" | "comments_count"
  >;
  view: PostView;
  /** 作者显示名 */
  author: string;
  comments: readonly JsonLdReply[];
  locale: Locale;
  url: string;
  sourceUrl?: string | null;
}) {
  const pageUrl = absoluteUrl(url);
  const originalUrl = sourceUrl ? absoluteUrl(sourceUrl) : null;
  const { body } = view;
  const images = stillImages(post.images ?? []);
  const keywords = Array.from(new Set(view.topics.map((topic) => topic.label)));
  const text = clip(body.text.content);
  return {
    "@context": CONTEXT,
    "@type": "DiscussionForumPosting",
    "@id": `${pageUrl}#post`,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    headline: body.text.title,
    text: text || undefined,
    inLanguage: shownLang(body, locale),
    image: images.length > 0 ? images : undefined,
    datePublished: post.created_at,
    dateModified: post.content_updated_at ?? post.updated_at,
    author: person(author, post.user_id, locale),
    publisher: organizationRef(locale),
    isPartOf: { "@id": websiteId(locale) },
    keywords: keywords.length > 0 ? keywords : undefined,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.likes_count || 0,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.comments_count || 0,
      },
    ],
    comment:
      comments.length > 0
        ? comments.slice(0, MAX_COMMENTS).map((c) => replyJsonLd("Comment", c, locale))
        : undefined,
    translationOfWork:
      body.translated && originalUrl && originalUrl !== pageUrl
        ? {
            "@type": "DiscussionForumPosting",
            "@id": `${originalUrl}#post`,
            url: originalUrl,
            inLanguage: view.sourceLocale ? htmlLang(view.sourceLocale) : undefined,
          }
        : undefined,
  };
}

/** 问答页(QAPage):显示的问题标题/正文;accepted 的回答作 acceptedAnswer,其余为 suggestedAnswer */
export function qaPageJsonLd({
  question,
  answers,
  view,
  locale,
  url,
}: {
  question: Pick<DbQaQuestion, "user_id" | "created_at" | "profiles">;
  answers: readonly JsonLdAnswer[];
  view: Localized<"title" | "content">;
  locale: Locale;
  url: string;
}) {
  const pageUrl = absoluteUrl(url);
  const lang = shownLang(view, locale);
  const answerJsonLd = (a: JsonLdAnswer) => ({
    ...replyJsonLd("Answer", a, locale),
    upvoteCount: a.upvotes ?? 0,
  });
  const accepted = answers.find((a) => a.accepted);
  const suggested = answers.filter((a) => a !== accepted);
  const askedBy = question.profiles?.username;
  const text = clip(view.text.content);
  return {
    "@context": CONTEXT,
    "@type": "QAPage",
    "@id": pageUrl,
    url: pageUrl,
    inLanguage: lang,
    isPartOf: { "@id": websiteId(locale) },
    mainEntity: {
      "@type": "Question",
      name: view.text.title,
      text: text || undefined,
      inLanguage: lang,
      answerCount: answers.length,
      datePublished: question.created_at,
      author: askedBy ? person(askedBy, question.user_id, locale) : undefined,
      acceptedAnswer: accepted ? answerJsonLd(accepted) : undefined,
      suggestedAnswer: suggested.length > 0 ? suggested.map(answerJsonLd) : undefined,
    },
  };
}

/** 用户 / 车行主页(ProfilePage):车行输出 AutoDealer(可带评分),个人为 Person */
export function profilePageJsonLd({
  profile,
  locale,
  url,
  rating,
}: {
  profile: Pick<
    DbProfile,
    "id" | "username" | "avatar_url" | "location" | "account_type" | "is_system" | "created_at"
  >;
  locale: Locale;
  url: string;
  /** dealer_reviews 汇总;只对车行输出 aggregateRating */
  rating?: { avg: number; count: number } | null;
}) {
  const pageUrl = absoluteUrl(url);
  const profileUrl = userUrl(locale, profile.id);
  const dealer = profile.account_type === "dealer" || profile.is_system;
  return {
    "@context": CONTEXT,
    "@type": "ProfilePage",
    "@id": pageUrl,
    url: pageUrl,
    inLanguage: htmlLang(locale),
    dateCreated: profile.created_at,
    isPartOf: { "@id": websiteId(locale) },
    mainEntity: {
      "@type": dealer ? "AutoDealer" : "Person",
      "@id": `${profileUrl}#seller`,
      name: profile.username,
      url: profileUrl,
      image: avatarUrl(profile.avatar_url, profile.id),
      address: profile.location
        ? { "@type": "PostalAddress", addressLocality: profile.location }
        : undefined,
      aggregateRating:
        dealer && rating && rating.count > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: Number(rating.avg.toFixed(1)),
              reviewCount: rating.count,
              bestRating: 5,
            }
          : undefined,
    },
  };
}

/** 列表(在售车源、用户帖子、话题帖子等):items 的 url 为带语言前缀的详情地址 */
export function itemListJsonLd({
  name,
  url,
  items,
}: {
  name: string;
  url: string;
  items: readonly JsonLdLink[];
}) {
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    name,
    url: absoluteUrl(url),
    ...listElements(items),
  };
}

/** 集合页(话题聚合页等):CollectionPage + 内含的 ItemList */
export function collectionPageJsonLd({
  name,
  url,
  locale,
  items,
}: {
  name: string;
  url: string;
  locale: Locale;
  items: readonly JsonLdLink[];
}) {
  const pageUrl = absoluteUrl(url);
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    "@id": pageUrl,
    url: pageUrl,
    name,
    inLanguage: htmlLang(locale),
    isPartOf: { "@id": websiteId(locale) },
    mainEntity: { "@type": "ItemList", ...listElements(items) },
  };
}
