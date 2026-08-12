import { redirect } from "next/navigation";

// 设置中间页已拆进 /account(iOS 26 改版):分组行直接在账户页展示,
// 子页(profile/security/notifications/appearance/stores)路由保留。
export default function SettingsPage() {
  redirect("/account");
}
