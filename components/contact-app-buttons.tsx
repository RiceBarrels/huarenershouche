"use client";

// 车辆详情页的即时通讯 / 短信联系按钮(桌面侧栏 + 手机底栏)。
// 只给已登录访客:卖家的 contact_apps 由 useSellerContactApps 在客户端单独取(不随 SSR / 详情行下发);
// 只显示卖家填了的,按访客界面语言的 CONTACT_APP_ORDER 排,短信(有电话且已点开联系方式时)排最后。
// 手机底栏空间紧(价格 + 收藏 + 分享 + 电话):只放排第一的即时通讯应用,纯图标;短信不进底栏(电话按钮旁已有,
// 卖家卡片里的整组按钮在手机上也看得到)。
// WhatsApp → wa.me 带预填消息;短信 → sms: 带同一条预填;LINE → 加好友链接;微信 / KakaoTalk → 复制 ID + 提示。
// 外链在原生壳里经 openExternal(AppLauncher)唤起对应 App。每次点击上报一次 contact_click(lib/analytics/client.ts)。

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { trackContactClick } from "@/lib/analytics/client";
import { isNative } from "@/lib/capacitor";
import { openExternal } from "@/lib/open-external";
import { loadContactApps } from "@/lib/contact-apps-client";
import {
  CONTACT_APP_LABEL,
  CONTACT_APP_LABEL_TRANSLATED,
  canSms,
  lineUrl,
  orderedContactChannels,
  smsUrl,
  whatsappUrl,
  type ContactApps,
  type ContactChannel,
} from "@/lib/contact-apps";

const EMPTY: ContactApps = {};

/** 已登录时取卖家的即时通讯联系方式;未登录 / 列不存在 / 取失败 → 空 */
export function useSellerContactApps(sellerId: string | null | undefined, enabled: boolean): ContactApps {
  const [state, setState] = useState<{ id: string; apps: ContactApps } | null>(null);
  useEffect(() => {
    if (!enabled || !sellerId) return;
    let cancelled = false;
    loadContactApps(sellerId).then(({ apps }) => {
      if (!cancelled) setState({ id: sellerId, apps });
    });
    return () => {
      cancelled = true;
    };
  }, [sellerId, enabled]);
  return enabled && state && state.id === sellerId ? state.apps : EMPTY;
}

export function ContactAppButtons({
  apps,
  carId,
  title,
  shareUrl,
  phone,
  variant,
}: {
  apps: ContactApps;
  carId: string;
  /** 访客界面语言的车辆标题(预填消息用) */
  title: string;
  /** 带语言前缀的公网详情地址 */
  shareUrl: string;
  /** 已取到的卖家电话(未点开联系方式时传 null,不显示短信) */
  phone: string | null;
  /** sidebar = 侧栏整组按钮;bar = 手机底栏只放排第一的即时通讯应用(纯图标,不含短信) */
  variant: "sidebar" | "bar";
}) {
  const { t, locale } = useI18n();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const smsPhone = canSms(phone) ? phone : null;
  const channels = orderedContactChannels(apps, locale, variant === "sidebar" && !!smsPhone);
  if (channels.length === 0) return null;
  const shown = variant === "bar" ? channels.slice(0, 1) : channels;

  const label = (ch: ContactChannel) =>
    ch === "sms" ? t("发短信") : CONTACT_APP_LABEL_TRANSLATED.has(ch) ? t(CONTACT_APP_LABEL[ch]) : CONTACT_APP_LABEL[ch];

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  async function copyId(ch: "wechat" | "kakao", id: string) {
    let copied = false;
    try {
      await navigator.clipboard.writeText(id);
      copied = true;
    } catch {
      /* 剪贴板不可用:直接把 ID 显示出来,让用户自己记下 */
    }
    if (ch === "wechat") {
      showToast(copied ? t("已复制微信号 {id}，请在微信中搜索添加", { id }) : t("微信: {id}", { id }));
    } else {
      showToast(copied ? t("已复制 KakaoTalk ID {id}，请在 KakaoTalk 中搜索添加", { id }) : `KakaoTalk ID: ${id}`);
    }
  }

  function onClick(ch: ContactChannel) {
    trackContactClick(carId, ch, locale);
    const message = t("你好，我对常來車網上的 {title} 感兴趣 {link}", { title, link: shareUrl });
    switch (ch) {
      case "whatsapp":
        if (apps.whatsapp) void openExternal(whatsappUrl(apps.whatsapp, message));
        break;
      case "line":
        if (apps.line) void openExternal(lineUrl(apps.line));
        break;
      case "sms":
        if (!smsPhone) break;
        // 原生壳经 AppLauncher 唤起短信;网页端直接导航(新标签页打开 sms: 会留下空白页)
        if (isNative()) void openExternal(smsUrl(smsPhone, message));
        else window.location.assign(smsUrl(smsPhone, message));
        break;
      case "wechat":
      case "kakao": {
        const id = apps[ch];
        if (id) void copyId(ch, id);
        break;
      }
    }
  }

  // 底栏有 backdrop-blur(会成为 fixed 子元素的包含块),提示条挂到 body 上
  const toastNode =
    toast && typeof document !== "undefined"
      ? createPortal(
          <div
            role="status"
            className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] mx-auto w-fit max-w-sm rounded-md bg-foreground px-3 py-2 text-center font-mono text-xs text-background shadow-sm md:bottom-8"
          >
            {toast}
          </div>,
          document.body
        )
      : null;

  if (variant === "bar") {
    const ch = shown[0];
    const Icon = ch === "sms" ? MessageSquareText : MessageCircle;
    return (
      <>
        {/* 与收藏 / 分享同尺寸的纯图标按钮(应用名走 aria-label / title),任何语言都不挤掉价格 */}
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => onClick(ch)}
          aria-label={label(ch)}
          title={label(ch)}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        {toastNode}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {shown.map((ch) => {
          const Icon = ch === "sms" ? MessageSquareText : MessageCircle;
          return (
            <Button
              key={ch}
              variant="secondary"
              className={`gap-1.5 font-mono text-xs ${shown.length % 2 === 1 && ch === shown[shown.length - 1] ? "col-span-2" : ""}`}
              onClick={() => onClick(ch)}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {label(ch)}
            </Button>
          );
        })}
      </div>
      {toastNode}
    </>
  );
}
