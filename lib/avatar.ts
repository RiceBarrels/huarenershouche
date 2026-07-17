// 统一头像:无头像时回退到 DiceBear(与社区种子数据同风格)
const DICEBEAR_BASE = "https://api.dicebear.com/9.x/notionists/svg";

export function avatarUrl(
  avatar: string | null | undefined,
  seed: string | null | undefined
): string {
  if (avatar) return avatar;
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed || "anon")}`;
}
