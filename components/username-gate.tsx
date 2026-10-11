"use client";

// 新用户必须先取名:profiles.username_set_at 为空(Google/Apple 首次登录,
// 触发器只拿到了真实姓名)时弹出不可关闭的取名对话框,默认填好随机用户名。
// 邮箱注册在注册页已取名,触发器直接写入 username_set_at,不会弹。
// 列不存在(未执行 supabase/username-onboarding.sql)或查询失败时不拦。

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useIdentity } from "@/components/identity-provider";
import { ProfileSetupDialog } from "@/components/profile-setup-dialog";

export function UsernameGate() {
  const { authUser } = useIdentity();
  const authId = authUser?.id;
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authId) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("username_set_at")
      .eq("id", authId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (alive && !error && data && !data.username_set_at) setPendingId(authId);
      });
    return () => {
      alive = false;
    };
  }, [authId]);

  if (!authUser || pendingId !== authUser.id) return null;
  return (
    <ProfileSetupDialog
      open
      userId={authUser.id}
      user={authUser}
      onComplete={() => setPendingId(null)}
    />
  );
}
