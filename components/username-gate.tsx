"use client";

// 新用户必须先取名:profiles.username_set_at 为空(Google/Apple 首次登录,
// 触发器只拿到了真实姓名)时弹出关不掉的取名 drawer,默认填好随机用户名。
// 邮箱注册在注册页已取名,触发器直接写入 username_set_at,不会弹。
// 列不存在(未执行 supabase/username-onboarding.sql)或查询失败时不拦。
// 取名完成后,还没回答过偏好(clc_prefs.setupDone 为空)的新用户再弹一个可选的第二步
// (偏好三问,可「跳过」、可下拉关闭),不是强制门禁。
// 网页版新账号(创建 72 小时内、本机没看过)改为全屏 onboarding,偏好三问是它的末页,不再单独弹 drawer;
// 邮箱注册(不经过取名 drawer)也在这里弹。Capacitor App 有 welcome-screen,维持原来的取名 → 偏好 drawer。

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useIdentity } from "@/components/identity-provider";
import { UsernameDrawer } from "@/components/username-drawer";
import { SetupDrawer } from "@/components/setup-drawer";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { getPreferences } from "@/components/use-preferences";
import { shouldShowOnboarding } from "@/lib/preferences";
import { isNative } from "@/lib/capacitor";
import { pauseClickTracking } from "@/lib/analytics/client";

export function UsernameGate() {
  const { authUser } = useIdentity();
  const authId = authUser?.id;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  // ?onboarding=1 测试预览:无视 72h / onboarded 强制显示一次,不写埋点、关闭时还原本机偏好
  const [preview, setPreview] = useState<(() => void) | null>(null);
  const createdAt = authUser?.created_at;

  function wantsOnboarding() {
    return !isNative() && shouldShowOnboarding(getPreferences(), createdAt);
  }

  useEffect(() => {
    if (!authId) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("username_set_at")
      .eq("id", authId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data && !data.username_set_at) setPendingId(authId);
        // 用户名已设(邮箱注册 / 刷新回来):新账号直接进 onboarding;查询失败也不拦
        else if (!error && data && consumePreviewFlag()) {
          setPreview(() => pauseClickTracking());
          setOnboardingOpen(true);
        } else if (wantsOnboarding()) setOnboardingOpen(true);
      });
    return () => {
      alive = false;
    };
    // wantsOnboarding 只读 createdAt(随 authId 变)和本机偏好
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authId]);

  if (onboardingOpen)
    return (
      <OnboardingScreen
        preview={!!preview}
        onClose={() => {
          preview?.();
          setPreview(null);
          setOnboardingOpen(false);
        }}
      />
    );
  if (setupOpen) return <SetupDrawer onClose={() => setSetupOpen(false)} />;
  if (!authUser || pendingId !== authUser.id) return null;
  return (
    <UsernameDrawer
      userId={authUser.id}
      user={authUser}
      onComplete={() => {
        setPendingId(null);
        if (wantsOnboarding()) setOnboardingOpen(true);
        else if (!getPreferences().setupDone) setSetupOpen(true);
      }}
    />
  );
}

/** 网页地址带 ?onboarding=1 时返回 true,并把参数从地址栏去掉(刷新不会再出现) */
function consumePreviewFlag(): boolean {
  if (isNative() || typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get("onboarding") !== "1") return false;
  url.searchParams.delete("onboarding");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  return true;
}
