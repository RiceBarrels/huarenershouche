"use client";

// 偏好设置(/account/setup):三问 —— 界面密度 / 居住地 / 计划持有年限。
// 入口:首页一次性卡片、取名后的可选第二步之外的随时修改(账户页「偏好」行)。不登录也能用,只存本机。
// 每题选完即生效;「完成」记 setupDone = completed,「跳过」记 skipped —— 两者之后首页卡片都不再出现。

import { useRouter } from "@/components/localized-navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LargeTitle } from "@/components/ios-settings";
import { Button } from "@/components/ui/button";
import { PreferencesForm } from "@/components/preferences-form";
import { usePreferences, usePreferencesReady } from "@/components/use-preferences";
import { useI18n } from "@/components/i18n-provider";
import { trackSetupAnswer } from "@/lib/analytics/client";

export default function SetupPreferencesPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { prefs, update } = usePreferences();
  // 偏好只在本机:挂载前(SSR / 水合)不渲染表单,避免先闪一遍默认值
  const mounted = usePreferencesReady();

  function leave() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  function finish(done: "completed" | "skipped") {
    // 已经完成过的用户再来改,不把状态改回 skipped
    if (prefs.setupDone !== "completed") {
      update({ setupDone: done });
      trackSetupAnswer(`setup:${done}`, locale);
    }
    leave();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <LargeTitle title={t("偏好")} subtitle={t("三个问题,让找车更顺手")} />
        {mounted && (
          <>
            <PreferencesForm className="mt-2" />
            <div className="mt-8 flex gap-3">
              {!prefs.setupDone && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 font-mono"
                  onClick={() => finish("skipped")}
                >
                  {t("跳过")}
                </Button>
              )}
              <Button type="button" className="h-11 flex-1 font-mono" onClick={() => finish("completed")}>
                {t("完成")}
              </Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
