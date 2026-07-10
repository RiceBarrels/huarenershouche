import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "免费发布卖车 - 卖给同城华人",
  description:
    "免费发布二手车信息，卖给同城华人买家。中文交流更放心，几分钟完成发布，快速联系北美本地买家，安全高效卖车。",
  alternates: { canonical: "/post" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
