"use client";

// 设置 · 个性化(iOS 26 风格):外观模式(浅色/深色/跟随系统)+ 语言

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SettingsGroup, GroupFooter, LargeTitle } from "@/components/ios-settings";
import { ThemeOptions } from "@/components/theme-options";
import { LanguageOptions } from "@/components/language-options";
import { useI18n } from "@/components/i18n-provider";

export default function AppearanceSettingsPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <LargeTitle title={t("个性化")} subtitle={t("外观模式")} />
        <SettingsGroup className="mt-5 p-2">
          <ThemeOptions />
        </SettingsGroup>
        <GroupFooter>{t("跟随系统会在日落后自动切换深色模式。")}</GroupFooter>
        <p className="mt-6 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("语言")}
        </p>
        <SettingsGroup className="mt-2 p-2">
          <LanguageOptions />
        </SettingsGroup>
      </main>
      <Footer />
    </div>
  );
}
