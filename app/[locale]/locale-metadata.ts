// 语言树的站点级 metadata / viewport。
// zh 是默认文案(原根 layout 的 metadata 原样搬来);其他语言整体覆盖标题、关键词、描述与 OG,
// metadataBase / robots 各语言共用。web 端 app/[locale]/layout.tsx 是根 layout,直接用它;
// 静态导出的根 layout(app/layout.static.tsx)用 zh 版本,嵌套的语言树 layout 再按语言覆盖。

import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/seo-pages";

export const localeViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // 状态栏/浏览器框颜色跟随主题(与 --background 对应)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0f" },
  ],
};

const ZH_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  // absolute:静态导出的根 layout 也带 title 模板,用 default 会被再套一层「| 常來車網」
  title: {
    absolute: "常來車網 CLCAuto - 北美二手车交易平台 | 买车卖车·免费发布·中文服务",
    template: "%s | 常來車網",
  },
  description:
    "常來車網是北美二手车买卖平台：覆盖洛杉矶、旧金山、纽约、西雅图、达拉斯等城市，个人与车行直售二手车，支持按品牌、价格、里程、距离筛选，免费发布卖车信息，提供 VIN 召回查询、Carfax 报告和全中文服务，让买车卖车更简单放心。",
  keywords: [
    "北美二手车",
    "美国二手车",
    "二手车买卖",
    "中文二手车平台",
    "留学生买车",
    "used car marketplace",
    "常來車網",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "常來車網",
    title: "常來車網 CLCAuto - 北美二手车交易平台",
    description:
      "买车卖车 · 就上常來車網：覆盖洛杉矶、旧金山、纽约等城市，个人与车行直售，免费发布，VIN 召回查询，全中文服务。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ja 品牌名「常来カーネット」,es/fr 用 CLCAuto,结构同 en/ko
const SITE_META: Record<string, { title: string; template: string; siteName: string; description: string; ogLocale: string; keywords: string[] }> = {
  ja: {
    title: "常来カーネット - 北米の中古車マーケットプレイス | 購入・売却・無料掲載",
    template: "%s | 常来カーネット",
    siteName: "常来カーネット",
    description:
      "常来カーネット(CLCAuto)は北米の信頼できる中古車マーケットプレイスです。LA、サンフランシスコ、ニューヨーク、シアトル、ダラスなどで個人・ディーラーの車両を検索。無料掲載、VIN リコール検索、Carfax レポート対応。",
    ogLocale: "ja_JP",
    keywords: ["北米 中古車", "アメリカ 中古車", "中古車 購入", "中古車 売却", "常来カーネット", "CLCAuto"],
  },
  es: {
    title: "CLCAuto - Mercado de autos usados en Norteamérica | Compra, vende, publica gratis",
    template: "%s | CLCAuto",
    siteName: "CLCAuto",
    description:
      "CLCAuto es un mercado confiable de autos usados en Norteamérica. Explora autos de vendedores particulares y concesionarios en LA, SF, NYC, Seattle, Dallas y más — publicaciones gratis, verificación de VIN y reportes Carfax.",
    ogLocale: "es_US",
    keywords: ["autos usados", "carros usados Estados Unidos", "comprar auto usado", "vender mi auto", "CLCAuto"],
  },
  fr: {
    title: "CLCAuto - Marché de voitures d'occasion en Amérique du Nord | Achat, vente, annonces gratuites",
    template: "%s | CLCAuto",
    siteName: "CLCAuto",
    description:
      "CLCAuto est un marché fiable de voitures d'occasion en Amérique du Nord. Parcourez les annonces de particuliers et de concessionnaires à LA, SF, NYC, Seattle, Dallas et plus — annonces gratuites, vérification VIN, rapports Carfax.",
    ogLocale: "fr_CA",
    keywords: ["voiture d'occasion", "auto usagée Amérique du Nord", "acheter voiture d'occasion", "vendre ma voiture", "CLCAuto"],
  },
};

/** 语言树的站点级 metadata;未知语言按 zh(layout 随后 notFound()) */
export function localeMetadata(locale: string): Metadata {
  if (locale === "en") {
    return {
      ...ZH_METADATA,
      title: {
        // absolute:不套上层模板(静态导出时根 layout 带 zh 的 "%s | 常來車網")
        absolute: "CLCAuto - Used Car Marketplace in North America",
        template: "%s | CLCAuto",
      },
      keywords: [
        "used cars north america",
        "used car marketplace",
        "buy used car",
        "sell my car",
        "CLCAuto",
      ],
      description:
        "CLCAuto is a trusted used-car marketplace in North America. Browse cars from private sellers and dealers in LA, SF, NYC, Seattle, Dallas and more — free listings, VIN recall checks, Carfax reports.",
      openGraph: {
        type: "website",
        locale: "en_US",
        siteName: "CLCAuto",
        title: "CLCAuto - Used Car Marketplace in North America",
        description:
          "Buy and sell used cars in North America. Free listings, VIN recall lookup, Carfax reports.",
      },
    };
  }
  if (locale === "ko") {
    return {
      ...ZH_METADATA,
      title: {
        absolute: "또와카 - 북미 중고차 거래 플랫폼 | 중고차 구매·판매·무료 등록",
        template: "%s | 또와카",
      },
      keywords: [
        "북미 중고차",
        "미국 중고차",
        "중고차 구매",
        "중고차 판매",
        "또와카",
      ],
      description:
        "또와카는 북미 지역의 신뢰할 수 있는 중고차 거래 플랫폼입니다. LA, 샌프란시스코, 뉴욕, 시애틀, 댈러스 등에서 개인·딜러 매물을 검색하고, 무료로 차량을 등록하세요. VIN 리콜 조회와 Carfax 리포트 제공.",
      openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "또와카",
        title: "또와카 - 북미 중고차 거래 플랫폼",
        description:
          "북미 중고차 구매·판매 플랫폼. 개인·딜러 직거래, 무료 등록, VIN 리콜 조회, Carfax 리포트.",
      },
    };
  }
  const m = SITE_META[locale];
  if (m) {
    return {
      ...ZH_METADATA,
      title: { absolute: m.title, template: m.template },
      keywords: m.keywords,
      description: m.description,
      openGraph: {
        type: "website",
        locale: m.ogLocale,
        siteName: m.siteName,
        title: m.title,
        description: m.description,
      },
    };
  }
  return ZH_METADATA;
}
