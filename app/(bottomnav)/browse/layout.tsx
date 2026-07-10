import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "买车 - 搜索全美华人二手车源",
  description:
    "浏览北美华人二手车源，按品牌、价格、里程、地区筛选。全美各城市华人卖家直售，中文沟通更放心，快速找到心仪的二手车。",
  alternates: { canonical: "/browse" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
