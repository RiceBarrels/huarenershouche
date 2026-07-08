"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  isNotificationSupported,
  getPermissionStatus,
  requestPermission,
  type NotificationPrefs,
} from "@/lib/notifications";

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<string>("default");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setPrefs(getNotificationPrefs());
    setSupported(isNotificationSupported());
    setPermission(getPermissionStatus());
  }, []);

  if (!supported) {
    return (
      <div className="border border-border p-4">
        <div className="flex items-center gap-2">
          <BellOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="font-mono text-sm">通知不可用</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          当前浏览器不支持推送通知
        </p>
      </div>
    );
  }

  if (!prefs) return null;

  async function handleEnable() {
    const granted = await requestPermission();
    if (granted) {
      const updated = { ...prefs!, enabled: true };
      setPrefs(updated);
      saveNotificationPrefs(updated);
      setPermission("granted");
    } else {
      setPermission(getPermissionStatus());
    }
  }

  function togglePref(key: keyof Omit<NotificationPrefs, "enabled">) {
    const updated = { ...prefs!, [key]: !prefs![key] };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  }

  function handleDisable() {
    const updated = { ...prefs!, enabled: false };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="font-mono text-sm font-medium">推送通知</span>
        </div>
        {prefs.enabled ? (
          <Button variant="outline" size="sm" className="h-7 font-mono text-[11px]" onClick={handleDisable}>
            关闭
          </Button>
        ) : (
          <Button size="sm" className="h-7 font-mono text-[11px]" onClick={handleEnable}>
            {permission === "denied" ? "已被浏览器拒绝" : "开启"}
          </Button>
        )}
      </div>

      {prefs.enabled && (
        <div className="mt-3 space-y-2">
          <ToggleRow label="降价提醒" description="关注车辆降价时通知" checked={prefs.priceDrops} onChange={() => togglePref("priceDrops")} />
          <ToggleRow label="新车源提醒" description="保存的搜索有新车源时通知" checked={prefs.newListings} onChange={() => togglePref("newListings")} />
          <ToggleRow label="新消息" description="收到私信时通知" checked={prefs.newMessages} onChange={() => togglePref("newMessages")} />
          <ToggleRow label="状态变更" description="收藏车辆状态变化时通知" checked={prefs.statusChanges} onChange={() => togglePref("statusChanges")} />
        </div>
      )}

      {permission === "denied" && (
        <p className="mt-2 font-mono text-[10px] text-destructive">
          通知权限已被浏览器拒绝，请在浏览器设置中重新允许
        </p>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between py-1.5 text-left"
      onClick={onChange}
    >
      <div>
        <p className="font-mono text-xs">{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{description}</p>
      </div>
      <div className={`h-5 w-9 rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted"}`}>
        <div className={`h-4 w-4 translate-y-0.5 rounded-full bg-background transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}
