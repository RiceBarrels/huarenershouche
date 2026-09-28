import type { Metadata } from "next";
import { serverT } from "@/lib/i18n/translate";

// 注意:不要在这里写死 canonical —— 帖子详情页 ([id]) 的 generateMetadata
// 会输出各自的 canonical,layout 级 canonical 会把所有帖子都指向列表页。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    // default + template:让 [id] 页的 generateMetadata 标题仍带站点后缀(按语言换品牌名)
    title: {
      default: t("社区 - 华人汽车交流"),
      template: `%s | ${t("常來車網")}`,
    },
    description: t(
      "北美华人汽车社区，分享买车卖车经验、用车心得与维修保养技巧，和同城车友中文交流，避坑省钱。"
    ),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
