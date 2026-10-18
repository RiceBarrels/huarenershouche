"use client";

// 即时通讯联系方式填写(发布页「怎么联系你?」一步、设置 · 个人资料共用)。
// 按界面语言的 CONTACT_APP_ORDER:第一个直接显示,其余收进「更多联系方式」(已填过的自动展开)。
// 受控组件:value 为每个应用的原始输入;规范化 / 校验用 lib/contact-apps.ts 的 normalizeContactApps,
// 这里只在输入非空且不合规时显示错误,保存与否由调用方决定。

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { SettingsGroup } from "@/components/ios-settings";
import {
  CONTACT_APP_ERROR_MESSAGE,
  CONTACT_APP_LABEL,
  CONTACT_APP_LABEL_TRANSLATED,
  CONTACT_APP_ORDER,
  normalizeContactApp,
  type ContactApp,
} from "@/lib/contact-apps";

export type ContactAppsInput = Record<ContactApp, string>;

const PLACEHOLDER: Record<ContactApp, string> = {
  wechat: "微信号",
  kakao: "KakaoTalk ID",
  line: "LINE ID",
  whatsapp: "+1 626 555 0123",
};

export function ContactAppsEditor({
  value,
  onChange,
  onBlur,
  variant = "post",
}: {
  value: ContactAppsInput;
  onChange: (next: ContactAppsInput) => void;
  /** 某个输入框失焦(设置页在这里保存) */
  onBlur?: () => void;
  /** post = 发布页灰底输入框;settings = iOS 分组卡表单行 */
  variant?: "post" | "settings";
}) {
  const { t, locale } = useI18n();
  const [first, ...rest] = CONTACT_APP_ORDER[locale];
  const [expanded, setExpanded] = useState(false);
  // 已填过的收起项直接展开;在收起项里改过(哪怕清空)也保持展开,输入时不会突然消失
  const showRest = expanded || rest.some((app) => value[app].trim() !== "");
  const visible = showRest ? [first, ...rest] : [first];

  const label = (app: ContactApp) =>
    CONTACT_APP_LABEL_TRANSLATED.has(app) ? t(CONTACT_APP_LABEL[app]) : CONTACT_APP_LABEL[app];
  const placeholder = (app: ContactApp) => (app === "wechat" ? t(PLACEHOLDER[app]) : PLACEHOLDER[app]);
  const errorOf = (app: ContactApp) => {
    const { error } = normalizeContactApp(app, value[app]);
    return error ? t(CONTACT_APP_ERROR_MESSAGE[error]) : null;
  };
  const set = (app: ContactApp, v: string) => {
    if (app !== first) setExpanded(true);
    onChange({ ...value, [app]: v });
  };

  const moreToggle = !showRest && (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="font-mono text-sm text-muted-foreground underline underline-offset-2"
    >
      {t("+ 更多联系方式")}
    </button>
  );

  if (variant === "settings") {
    return (
      <>
        <SettingsGroup className="mt-2">
          {visible.map((app) => {
            const error = errorOf(app);
            return (
              <label key={app} htmlFor={`contact-${app}`} className="group/row block pl-4">
                <span className="block border-b border-border/60 pr-4 group-last/row:border-0">
                  <span className="flex items-center gap-3">
                    <span className="w-24 shrink-0 font-mono text-[15px]">{label(app)}</span>
                    <input
                      id={`contact-${app}`}
                      value={value[app]}
                      placeholder={placeholder(app)}
                      inputMode={app === "whatsapp" ? "tel" : undefined}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={40}
                      onChange={(e) => set(app, e.target.value)}
                      onBlur={onBlur}
                      aria-invalid={!!error}
                      className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-muted-foreground/50"
                    />
                  </span>
                  {error && <span className="block pb-2 font-mono text-[11px] text-destructive">{error}</span>}
                </span>
              </label>
            );
          })}
        </SettingsGroup>
        {moreToggle && <div className="mt-2 px-5">{moreToggle}</div>}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((app) => {
        const error = errorOf(app);
        return (
          <div key={app}>
            <label className="flex items-center rounded-xl bg-muted transition-colors focus-within:bg-background focus-within:ring-2 focus-within:ring-brand-ink/40">
              <span className="w-28 shrink-0 pl-4 font-mono text-[13px] text-muted-foreground">{label(app)}</span>
              <input
                value={value[app]}
                placeholder={placeholder(app)}
                inputMode={app === "whatsapp" ? "tel" : undefined}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={40}
                onChange={(e) => set(app, e.target.value)}
                onBlur={onBlur}
                aria-invalid={!!error}
                className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </label>
            {error && <p className="mt-1 px-1 text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
      {moreToggle}
      <p className="text-xs text-muted-foreground">{t("即时通讯选填,只展示给已登录的买家")}</p>
    </div>
  );
}
