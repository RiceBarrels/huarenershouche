"use client";

// 访客身份展示:登录过的设备显示头像 + 用户名(可点进后台用户页),
// 从未登录的显示「匿名访客 #3f9a1c」。访客列表 / 车辆浏览者 / 时间线 / 实时流共用。

import Link from "@/components/localized-navigation";
import { UserRound } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { avatarUrl } from "@/lib/avatar";
import { adminUserLink } from "@/lib/static-link";
import { anonymousLabel } from "@/components/analytics/format";

export interface VisitorIdentityProps {
  visitorId: string;
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  /**
   * 这批事件发生时是否处于登录态。userId 存在但 loggedIn=false 表示
   * 「该设备后来/曾经登录过这个用户,但这段浏览是未登录状态」。
   */
  loggedIn?: boolean;
  /** 用户名是否渲染为指向后台用户页的链接(行本身可点击时传 false,避免嵌套交互) */
  linkUser?: boolean;
  size?: "sm" | "md";
}

export function VisitorIdentity({
  visitorId,
  userId,
  username,
  avatarUrl: avatar,
  loggedIn = true,
  linkUser = false,
  size = "sm",
}: VisitorIdentityProps) {
  const { t } = useI18n();
  const box = size === "md" ? "h-8 w-8" : "h-6 w-6";

  if (!userId) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className={`${box} flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground`}>
          <UserRound className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="truncate text-xs text-muted-foreground">{anonymousLabel(visitorId, t)}</span>
      </span>
    );
  }

  const name = username || userId.slice(0, 8);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl(avatar, username || userId)} alt="" className={`${box} shrink-0 rounded-full bg-muted object-cover`} />
      {/* 放不下时「未登录浏览」折到用户名下一行:否则窄列 + 较长的译文(en「Signed-out browsing」)会把用户名挤得只剩一个字 */}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        {linkUser ? (
          <Link
            href={adminUserLink(userId)}
            className="max-w-full truncate text-xs font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span className="max-w-full truncate text-xs font-medium">{name}</span>
        )}
        {!loggedIn && (
          <span className="max-w-full shrink-0 truncate rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t("未登录浏览")}
          </span>
        )}
      </span>
    </span>
  );
}
