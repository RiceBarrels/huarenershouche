"use client";

// 新用户取名后的可选第二步:底部 drawer 里放偏好三问(与 /account/setup 同一个表单)。
// 「跳过」/ 下拉关闭 → setupDone = skipped;「完成」→ completed。之后首页卡片不再出现。

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { PreferencesForm } from "@/components/preferences-form";
import { getPreferences, updatePreferences } from "@/components/use-preferences";
import { useI18n } from "@/components/i18n-provider";
import { trackSetupAnswer } from "@/lib/analytics/client";

export function SetupDrawer({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(true);
  // 按钮关闭后 vaul 可能再回调一次 onOpenChange(false),只处理第一次
  const doneRef = useRef(false);

  function finish(done: "completed" | "skipped") {
    if (doneRef.current) return;
    doneRef.current = true;
    if (getPreferences().setupDone !== "completed") {
      updatePreferences({ setupDone: done });
      trackSetupAnswer(`setup:${done}`, locale);
    }
    setOpen(false);
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) finish("skipped"); }}>
      <DrawerContent className="z-[95] max-h-[90dvh]" aria-describedby={undefined}>
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-8 pt-2">
          <DrawerTitle className="px-1 text-base font-semibold">{t("三个问题,让找车更顺手")}</DrawerTitle>
          <p className="mt-1 px-1 font-mono text-xs text-muted-foreground">{t("随时可以在「我的 · 偏好」里修改。")}</p>
          <PreferencesForm />
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="h-11 flex-1 font-mono" onClick={() => finish("skipped")}>
              {t("跳过")}
            </Button>
            <Button type="button" className="h-11 flex-1 font-mono" onClick={() => finish("completed")}>
              {t("完成")}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
