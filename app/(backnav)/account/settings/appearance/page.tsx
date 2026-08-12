"use client";

// 设置 · 个性化(iOS 26 风格):外观模式(浅色/深色/跟随系统)

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SettingsGroup, GroupFooter, LargeTitle } from "@/components/ios-settings";
import { ThemeOptions } from "@/components/theme-options";

export default function AppearanceSettingsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <LargeTitle title="个性化" subtitle="外观模式" />
        <SettingsGroup className="mt-5 p-2">
          <ThemeOptions />
        </SettingsGroup>
        <GroupFooter>跟随系统会在日落后自动切换深色模式。</GroupFooter>
      </main>
      <Footer />
    </div>
  );
}
