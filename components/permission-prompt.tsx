"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Bell, Settings, ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useI18n } from "@/components/i18n-provider";
import {
  isNative,
  checkLocationPermission,
  checkNotificationPermission,
  requestLocationPermission,
  requestNotificationPermission,
  openAppSettings,
  onAppResume,
  notifyLocationGranted,
  type AppPermissionState,
} from "@/lib/capacitor";

// 每次进入 App(冷启动 + 从后台恢复)检查定位和通知权限,
// 未开启就弹出提醒。系统弹窗只能弹一次,已被拒绝时引导去设置页。
export function PermissionPrompt({ active = true }: { active?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<AppPermissionState>("granted");
  const [notification, setNotification] = useState<AppPermissionState>("granted");
  // 上次检查到的定位状态:从「未授权」变「已授权」时(比如用户去设置里开完回来)广播重新定位
  const prevLocation = useRef<AppPermissionState | null>(null);

  const check = useCallback(async () => {
    if (!isNative()) return;
    const [loc, notif] = await Promise.all([
      checkLocationPermission(),
      checkNotificationPermission(),
    ]);
    if (loc === "granted" && prevLocation.current && prevLocation.current !== "granted") {
      notifyLocationGranted();
    }
    prevLocation.current = loc;
    setLocation(loc);
    setNotification(notif);
    if (loc !== "granted" || notif !== "granted") {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, []);

  // 冷启动检查 + 前台恢复时重查(比如用户去设置里开完权限回来)
  useEffect(() => {
    if (!active || !isNative()) return;
    check();
    let cleanup = () => {};
    onAppResume(check).then((fn) => { cleanup = fn; });
    return () => cleanup();
  }, [active, check]);

  // 两个都开了自动收起
  useEffect(() => {
    if (location === "granted" && notification === "granted") {
      setOpen(false);
    }
  }, [location, notification]);

  async function handleLocation() {
    if (location === "denied") {
      await openAppSettings();
      return;
    }
    setLocation(await requestLocationPermission());
  }

  async function handleNotification() {
    if (notification === "denied") {
      await openAppSettings();
      return;
    }
    setNotification(await requestNotificationPermission());
  }

  if (!active) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="z-[95]">
        <div className="mx-auto w-full max-w-md px-5 pb-8 pt-2">
          <DrawerTitle className="text-base font-semibold">
            {t("开启权限,体验更完整")}
          </DrawerTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("以下权限未开启,部分功能将无法使用")}
          </p>

          <div className="mt-4 space-y-3">
            <PermissionRow
              icon={<MapPin className="h-5 w-5" strokeWidth={1.5} />}
              title={t("定位权限")}
              description={t("用于显示附近的车源和车行")}
              state={location}
              onEnable={handleLocation}
            />
            <PermissionRow
              icon={<Bell className="h-5 w-5" strokeWidth={1.5} />}
              title={t("通知权限")}
              description={t("接收新消息、留言和降价提醒")}
              state={notification}
              onEnable={handleNotification}
            />
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 w-full py-2 text-center text-sm text-muted-foreground active:opacity-60"
          >
            {t("暂不开启")}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PermissionRow({
  icon,
  title,
  description,
  state,
  onEnable,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: AppPermissionState;
  onEnable: () => void;
}) {
  const { t } = useI18n();
  const granted = state === "granted";
  const denied = state === "denied";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/30 text-brand-ink">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {granted ? (
        <span className="shrink-0 text-xs text-muted-foreground">{t("已开启")}</span>
      ) : (
        <button
          type="button"
          onClick={onEnable}
          className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground active:opacity-80"
        >
          {denied ? (
            <>
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t("去设置")}
            </>
          ) : (
            <>
              {t("开启")}
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
