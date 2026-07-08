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

export function notifyPriceDrop(carTitle: string, oldPrice: number, newPrice: number, carId: string): void {
  const prefs = getNotificationPrefs();
  if (!prefs.priceDrops) return;

  const drop = oldPrice - newPrice;
  const pct = Math.round((drop / oldPrice) * 100);

  sendNotification(`降价提醒: ${carTitle}`, {
    body: `降价 $${drop.toLocaleString()} (${pct}%)，现价 $${newPrice.toLocaleString()}`,
    tag: `price-drop-${carId}`,
    url: `/car/${carId}`,
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
