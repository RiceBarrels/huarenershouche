// 统一头像:无头像时回退到 DiceBear(与社区种子数据同风格)
const DICEBEAR_BASE = "https://api.dicebear.com/9.x/notionists/svg";

export function avatarUrl(
  avatar: string | null | undefined,
  seed: string | null | undefined
): string {
  if (avatar) return avatar;
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed || "anon")}`;
}

/**
 * 「使用默认头像」写进 profiles.avatar_url 的地址:以用户 id 为种子的 DiceBear。
 * 显式存下来而不是置空——各页面回退时用的种子不统一(有的用 id 有的用昵称),
 * 置空会导致同一个人在不同页面头像不一样。
 */
export function defaultAvatarUrl(userId: string): string {
  return avatarUrl(null, userId);
}

/** 当前是否是默认(DiceBear)头像:没有头像或存的就是 DiceBear 地址 */
export function isDefaultAvatar(avatar: string | null | undefined): boolean {
  return !avatar || avatar.startsWith(DICEBEAR_BASE);
}

/** Google 等 OAuth 登录带来的头像(Apple 不提供) */
export function oauthAvatarUrl(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  const url = metadata?.avatar_url || metadata?.picture;
  return typeof url === "string" && url ? url : null;
}
