"use client";

import { useEffect, useState } from "react";
import { Check, Settings2 } from "lucide-react";
import { useRouter } from "@/components/localized-navigation";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_STORAGE_KEY, rememberLocaleCookie, type Locale } from "@/lib/i18n";
import { isNative } from "@/lib/capacitor";
import { openExternal } from "@/lib/open-external";
import { translate } from "@/lib/i18n/translate";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

// 按指定语言取词(确认 drawer 要同时用当前语言和目标语言显示,
// useI18n 的 t 只有当前语言,这里直接走同一套词典与回退链;词典已随 provider 打进包,无额外体积)
function tIn(locale: Locale, key: string): string {
  return translate(locale, key);
}

/** 两种语言各写一遍;译文相同(如 en/ja 都是 "OK")时只显示一遍 */
function bilingual(a: string, b: string): string {
  return a === b ? a : `${a} · ${b}`;
}

// 语言名用各自语言书写(不翻译),切错语言时用户也能认出自己的语言
const OPTIONS: { value: Locale; label: string }[] = [
  { value: "zh", label: "简体中文" },
  { value: "zh-hant", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

/**
 * 语言选择,样式与 ThemeOptions 对齐,Popover 和设置页共用。
 * confirmGoHome(手机设置页用):选中后先弹确认框,点「确定」写入偏好并
 * 跳转到新语言的首页;桌面 Popover 不传,保持原地切换。
 */
export function LanguageOptions({
  onSelect,
  confirmGoHome = false,
}: {
  onSelect?: () => void;
  confirmGoHome?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState<Locale | null>(null);
  const pendingLabel = OPTIONS.find((o) => o.value === pending)?.label;
  // 原生 App:语言跟随系统,应用内不可改,只提供"去系统设置"入口
  const [native, setNative] = useState(false);
  useEffect(() => {
    if (isNative()) setNative(true);
  }, []);

  if (native) {
    return (
      <div className="space-y-2 px-3 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          {OPTIONS.find((o) => o.value === locale)?.label}
          <Check className="h-4 w-4 text-brand-ink" strokeWidth={2} />
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("App 语言跟随系统设置。")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="w-full gap-1.5 font-mono text-xs"
          onClick={() => openExternal("app-settings:")}
        >
          <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          {t("去系统设置更改语言")}
        </Button>
      </div>
    );
  }

  function choose(next: Locale) {
    if (next === locale) {
      onSelect?.();
      return;
    }
    if (confirmGoHome) {
      setPending(next);
      return;
    }
    setLocale(next);
    onSelect?.();
  }

  function confirm() {
    if (!pending) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, pending);
    } catch {
      // 存不了也照样跳转,本次会话生效
    }
    rememberLocaleCookie(pending);
    setPending(null);
    onSelect?.();
    // 直接进新语言树的首页(带前缀路径,web/Capacitor 两端一致)
    router.push(`/${pending}`);
  }

  return (
    <div className="space-y-0.5">
      {OPTIONS.map((opt) => {
        const selected = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => choose(opt.value)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted active:bg-muted ${
              selected ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {opt.label}
            {selected && (
              <Check className="ml-auto h-4 w-4 text-brand-ink" strokeWidth={2} />
            )}
          </button>
        );
      })}

      {/* 确认 drawer:显示目标语言名,确定后回首页 */}
      <Drawer open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DrawerContent className="font-mono">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base">
              {pending ? bilingual(t("切换语言"), tIn(pending, "切换语言")) : t("切换语言")}
            </DrawerTitle>
            {/* 当前语言 → 目标语言,再把说明用两种语言各写一遍 */}
            <DrawerDescription asChild>
              <div className="space-y-1.5 text-xs leading-relaxed">
                <p className="font-medium text-foreground">
                  {OPTIONS.find((o) => o.value === locale)?.label} → {pendingLabel}
                </p>
                <p>{t("将切换到该语言并返回首页。")}</p>
                {pending && tIn(pending, "将切换到该语言并返回首页。") !== t("将切换到该语言并返回首页。") && (
                  <p>{tIn(pending, "将切换到该语言并返回首页。")}</p>
                )}
              </div>
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pb-[max(env(safe-area-inset-bottom),1rem)]">
            <Button className="w-full font-mono text-xs" onClick={confirm}>
              {pending ? bilingual(t("确定"), tIn(pending, "确定")) : t("确定")}
            </Button>
            <Button
              variant="secondary"
              className="w-full font-mono text-xs"
              onClick={() => setPending(null)}
            >
              {pending ? bilingual(t("取消"), tIn(pending, "取消")) : t("取消")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
