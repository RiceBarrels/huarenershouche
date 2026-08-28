"use client";

// 通知设置(iOS 26 风格):白色分组卡 + 彩色线条图标 + 绿色开关。
// 总开关一组;开启后细分项一组,分隔线行内缩进。

import { useEffect, useState } from "react";
import { Bell, BellOff, Tag, Sparkles, MessageSquare, RefreshCw } from "lucide-react";
import { SettingsGroup, SettingsRow, GroupFooter, IOSSwitch } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  isNotificationSupported,
  getPermissionStatus,
  requestPermission,
  type NotificationPrefs,
} from "@/lib/notifications";

const PREF_ROWS: {
  key: keyof Omit<NotificationPrefs, "enabled">;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "priceDrops", label: "降价提醒", icon: <Tag className="h-5 w-5 text-orange-500" strokeWidth={1.5} /> },
  { key: "newListings", label: "新车源提醒", icon: <Sparkles className="h-5 w-5 text-violet-500" strokeWidth={1.5} /> },
  { key: "newMessages", label: "新消息", icon: <MessageSquare className="h-5 w-5 text-green-500" strokeWidth={1.5} /> },
  { key: "statusChanges", label: "状态变更", icon: <RefreshCw className="h-5 w-5 text-sky-500" strokeWidth={1.5} /> },
];

const PREF_HINTS: Record<string, string> = {
  priceDrops: "关注车辆降价时通知",
  newListings: "保存的搜索有新车源时通知",
  newMessages: "收到私信时通知",
  statusChanges: "收藏车辆状态变化时通知",
};

export function NotificationSettings() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<string>("default");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage/Notification API,仅客户端首帧一次
    setPrefs(getNotificationPrefs());
    setSupported(isNotificationSupported());
    setPermission(getPermissionStatus());
  }, []);

  if (!supported) {
    return (
      <>
        <SettingsGroup capsule>
          <SettingsRow
            icon={<BellOff className="h-5 w-5 text-slate-400" strokeWidth={1.5} />}
            label={t("通知不可用")}
          />
        </SettingsGroup>
        <GroupFooter>{t("当前浏览器不支持推送通知。")}</GroupFooter>
      </>
    );
  }

  if (!prefs) return null;

  async function handleMasterToggle(next: boolean) {
    if (next) {
      const granted = await requestPermission();
      if (granted) {
        const updated = { ...prefs!, enabled: true };
        setPrefs(updated);
        saveNotificationPrefs(updated);
        setPermission("granted");
      } else {
        setPermission(getPermissionStatus());
      }
    } else {
      const updated = { ...prefs!, enabled: false };
      setPrefs(updated);
      saveNotificationPrefs(updated);
    }
  }

  function togglePref(key: keyof Omit<NotificationPrefs, "enabled">) {
    const updated = { ...prefs!, [key]: !prefs![key] };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  }

  return (
    <>
      <SettingsGroup capsule>
        <SettingsRow
          icon={<Bell className="h-5 w-5 text-red-500" strokeWidth={1.5} />}
          label={t("推送通知")}
          trailing={<IOSSwitch checked={prefs.enabled} onChange={handleMasterToggle} disabled={permission === "denied"} />}
        />
      </SettingsGroup>
      <GroupFooter>
        {permission === "denied"
          ? t("通知权限已被浏览器拒绝,请在系统设置中重新允许后再开启。")
          : t("开启后可接收降价、新车源、私信等提醒。")}
      </GroupFooter>

      {prefs.enabled && (
        <>
          <SettingsGroup className="mt-5">
            {PREF_ROWS.map((row) => (
              <SettingsRow
                key={row.key}
                icon={row.icon}
                label={t(row.label)}
                trailing={<IOSSwitch checked={prefs[row.key]} onChange={() => togglePref(row.key)} />}
              />
            ))}
          </SettingsGroup>
          <GroupFooter>
            {PREF_ROWS.map((r) => t(PREF_HINTS[r.key])).join(";")}。
          </GroupFooter>
        </>
      )}
    </>
  );
}
