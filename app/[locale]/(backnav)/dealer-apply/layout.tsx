import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    title: t("车行入驻 - 华人车行免费入驻申请"),
    description: t(
      "华人车行免费入驻常來車網：批量发布车源、门店品牌展示、地图曝光、优先排序。提交门店资料，1-2 个工作日完成审核，升级认证车行账号。"
    ),
    alternates: localeAlternates(locale, "/dealer-apply"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
