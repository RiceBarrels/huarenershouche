import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/translate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    title: t("消息"),
    description: t("查看与买家、卖家的聊天消息。"),
    robots: { index: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
