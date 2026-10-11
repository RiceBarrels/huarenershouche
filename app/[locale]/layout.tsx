import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/i18n-provider";
import { MotionProvider } from "@/components/motion-provider";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { IdentityProvider } from "@/components/identity-provider";
import { UsernameGate } from "@/components/username-gate";
import { CarOverlayProvider } from "@/components/car-overlay-provider";
import { InitHaptic } from "@/components/init-haptic";
import { CommunityPrefetch } from "@/components/community-prefetch";
import { SplashAd } from "@/components/splash-ad";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import { CompareBar } from "@/components/compare-bar";
import { KeyboardSpacer } from "@/components/keyboard-spacer";
import { StatusBarMask } from "@/components/status-bar-mask";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OpenPanelAnalytics } from "@/components/openpanel";
import { LOCALES, BUILD_LOCALES, type Locale } from "@/lib/i18n";

// 路径级 i18n:/zh/... 与 /en/... 各自预渲染一份 HTML(SEO 关键)。
// Capacitor 静态导出同样生成两棵树,原生端由入口页 + Provider 内的
// 原生分支处理语言(切换不跳转,直接替换文案)。
export function generateStaticParams() {
  return BUILD_LOCALES.map((locale) => ({ locale }));
}

// 英文树的站点级 metadata 覆盖(zh 沿用根 layout 的默认值)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale === "en") {
    return {
      title: {
        // absolute:绕过根 layout 的 "%s | 常來車網" 模板
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
      title: {
        // absolute:绕过根 layout 的 "%s | 常來車網" 模板
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
  // ja 品牌名「常来カーネット」,es/fr 用 CLCAuto,结构同上
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
  const m = SITE_META[locale];
  if (m) {
    return {
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
  return {};
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  return (
    <I18nProvider initialLocale={locale as Locale}>
      <MotionProvider>
        <div
          vaul-drawer-wrapper=""
          className="min-h-dvh bg-background"
          style={{
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
          <CapacitorProvider>
            <IdentityProvider>
              <CarOverlayProvider>
                {/* 状态栏遮罩:仅刘海机型 + 滚动越过安全区后淡入 */}
                <StatusBarMask />
                {children}
                {/* 原生键盘弹起时页面底部垫等高空白(文档流内,所有页面生效) */}
                <KeyboardSpacer />
                <CommunityPrefetch />
                <SplashAd />
                <InitHaptic />
                <RealtimeNotifications />
                {/* Google/Apple 新用户首次登录强制取名(默认随机名) */}
                <UsernameGate />
                <CompareBar />
                <Analytics />
                <SpeedInsights />
                <OpenPanelAnalytics />
              </CarOverlayProvider>
            </IdentityProvider>
          </CapacitorProvider>
        </div>
      </MotionProvider>
    </I18nProvider>
  );
}
