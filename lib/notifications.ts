import type { TFn } from "@/lib/i18n/content/types";

const PREFS_KEY = "clcauto_notification_prefs";

export interface NotificationPrefs {
  enabled: boolean;
  priceDrops: boolean;
  newMessages: boolean;
  statusChanges: boolean;
  newListings: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  priceDrops: true,
  newMessages: true,
  statusChanges: true,
  newListings: true,
};

export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string; url?: string }
): void {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body: options?.body,
    icon: options?.icon || "/logo.png",
    tag: options?.tag,
  });

  if (options?.url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.url!;
    };
  }
}

/** 降价提醒的内容:标题、金额、链接都由调用方按当前显示语言准备好 */
export interface PriceDropNotice {
  carId: string;
  /** carTitle(car, locale) */
  title: string;
  /** 已格式化的降价金额,如 "$1,500" */
  drop: string;
  /** 降幅百分比(整数) */
  pct: number;
  /** 已格式化的现价 */
  price: string;
  /** 带语言前缀的站内路径 */
  url: string;
}

export function notifyPriceDrop(notice: PriceDropNotice, t: TFn): void {
  const prefs = getNotificationPrefs();
  if (!prefs.priceDrops) return;

  sendNotification(t("降价提醒: {title}", { title: notice.title }), {
    body: t("降价 {drop} ({pct}%)，现价 {price}", {
      drop: notice.drop,
      pct: notice.pct,
      price: notice.price,
    }),
    tag: `price-drop-${notice.carId}`,
    url: notice.url,
  });
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function notifyNewListingMatches(searchName: string, count: number, url: string): void {
  const prefs = getNotificationPrefs();
  if (!prefs.newListings) return;

  sendNotification("新车源提醒", {
    body: `「${searchName}」有 ${count} 台新上架车源`,
    tag: `saved-search-${hashString(url)}`,
    url,
  });
}

export function notifyNewMessage(senderName: string, preview: string, conversationUrl: string): void {
  const prefs = getNotificationPrefs();
  if (!prefs.newMessages) return;

  sendNotification(`新消息: ${senderName}`, {
    body: preview.slice(0, 80),
    tag: `message-${Date.now()}`,
    url: conversationUrl,
  });
}

export function notifyStatusChange(carTitle: string, newStatus: string, carId: string): void {
  const prefs = getNotificationPrefs();
  if (!prefs.statusChanges) return;

  const statusText: Record<string, string> = {
    sold: "已被标记为已售",
    removed: "已下架",
    active: "已重新上架",
  };

  sendNotification(`车辆状态更新`, {
    body: `${carTitle} ${statusText[newStatus] || newStatus}`,
    tag: `status-${carId}`,
    url: `/car/${carId}`,
  });
}
