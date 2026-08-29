import { redirect } from "next/navigation";
import { BUILD_LOCALES } from "@/lib/i18n";

// 设置中间页已拆进 /account(iOS 26 改版):分组行直接在账户页展示,
// 子页(profile/security/notifications/appearance/stores)路由保留。
export function generateStaticParams() {
  return BUILD_LOCALES.map((locale) => ({ locale }));
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/account`);
}
