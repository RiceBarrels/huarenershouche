// 语言树的 Provider 与全局挂件。web 根 layout(app/[locale]/layout.tsx)与静态导出的
// 嵌套 layout(app/[locale]/layout.static.tsx)共用同一棵树。

import { Suspense } from "react";
import { I18nProvider } from "@/components/i18n-provider";
import { MotionProvider } from "@/components/motion-provider";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { IdentityProvider } from "@/components/identity-provider";
import { UsernameGate } from "@/components/username-gate";
import { ZhHantContentProvider } from "@/components/content/zh-hant-content";
import { ZH_HANT_CHAR_PAIRS } from "@/lib/i18n/zh-hant-chars";
import { OAuthLocaleRestore } from "@/components/oauth-locale-restore";
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
import { AnalyticsTracker } from "@/components/analytics-tracker";
import type { Locale } from "@/lib/i18n";

export function LocaleProviders({
  locale,
  children,
}: Readonly<{
  locale: Locale;
  children: React.ReactNode;
}>) {
  return (
    <I18nProvider initialLocale={locale}>
      {/* 名称逐字表只随繁體树下发(约 15KB,作为 props 进 RSC payload) */}
      <ZhHantContentProvider chars={locale === "zh-hant" ? ZH_HANT_CHAR_PAIRS : undefined}>
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
                <OAuthLocaleRestore />
                <CompareBar />
                <Analytics />
                <SpeedInsights />
                <OpenPanelAnalytics />
                {/* 第一方访问统计(/api/vt);useSearchParams 需要 Suspense 边界 */}
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
              </CarOverlayProvider>
            </IdentityProvider>
          </CapacitorProvider>
        </div>
      </MotionProvider>
      </ZhHantContentProvider>
    </I18nProvider>
  );
}
