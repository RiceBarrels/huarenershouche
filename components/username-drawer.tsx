"use client";

// 新用户取名:只问用户名(账户类型用默认的「个人」,车行另走认证申请),
// 底部 drawer 呈现,不能下拉或点遮罩关闭。默认填好随机用户名,骰子换一个。
// Google 登录带了头像时,再让用户选用默认头像还是 Google 头像(默认选前者,
// 与随机用户名一样不直接暴露真实身份)。

import { useState } from "react";
import type { User as SupaUser } from "@supabase/supabase-js";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { defaultAvatarUrl, oauthAvatarUrl } from "@/lib/avatar";
import { useI18n } from "@/components/i18n-provider";
import { UsernameInput } from "@/components/username-input";
import { useRandomUsername } from "@/hooks/use-random-username";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface UsernameDrawerProps {
  userId: string;
  /** 用于随机名的 Google/Apple 姓名线索,以及 Google 头像 */
  user?: SupaUser | null;
  onComplete: () => void;
}

function AvatarOption({
  src,
  label,
  selected,
  onSelect,
}: {
  src: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
    >
      <span
        className={cn(
          "relative h-16 w-16 rounded-full ring-offset-2 ring-offset-card transition-shadow",
          selected ? "ring-2 ring-brand-ink" : "ring-1 ring-border"
        )}
      >
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-full bg-muted object-cover"
        />
        {selected && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
        )}
      </span>
      <span
        className={cn(
          "font-mono text-xs",
          selected ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function UsernameDrawer({ userId, user, onComplete }: UsernameDrawerProps) {
  const { t } = useI18n();
  const { username, setUsername, reroll } = useRandomUsername(user);
  const googleAvatar = oauthAvatarUrl(user?.user_metadata);
  const defaultAvatar = defaultAvatarUrl(userId);
  const [avatarChoice, setAvatarChoice] = useState<"default" | "oauth">("default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("profiles")
      .update({
        username: name,
        username_set_at: new Date().toISOString(),
        // 没有 Google 头像(邮箱 / Apple)时不动头像
        ...(googleAvatar && {
          avatar_url: avatarChoice === "oauth" ? googleAvatar : defaultAvatar,
        }),
      })
      .eq("id", userId);
    setSaving(false);
    // 保存失败就留在 drawer 里(关不掉),把错误显示出来让用户重试
    if (error) {
      setError(error.message);
      return;
    }
    onComplete();
  }

  return (
    <Drawer open dismissible={false}>
      <DrawerContent className="z-[95]" aria-describedby={undefined}>
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md px-5 pb-8 pt-2">
          <DrawerTitle className="text-base font-semibold">{t("设置你的名字")}</DrawerTitle>

          {googleAvatar && (
            <div className="mt-5 flex justify-center gap-10">
              <AvatarOption
                src={defaultAvatar}
                label={t("默认头像")}
                selected={avatarChoice === "default"}
                onSelect={() => setAvatarChoice("default")}
              />
              <AvatarOption
                src={googleAvatar}
                label={t("Google 头像")}
                selected={avatarChoice === "oauth"}
                onSelect={() => setAvatarChoice("oauth")}
              />
            </div>
          )}

          {/* text-base=16px,避免 iOS 聚焦自动放大 */}
          <UsernameInput
            containerClassName="mt-5"
            className="h-12 font-mono text-base"
            placeholder={t("输入你的用户名")}
            aria-label={t("用户名")}
            value={username}
            onValueChange={setUsername}
            onReroll={reroll}
          />
          {error && (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="mt-5 h-12 w-full font-mono text-base"
            disabled={!username.trim() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
            {t("完成")}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
