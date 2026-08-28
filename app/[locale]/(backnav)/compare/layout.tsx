import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "车辆对比 - 二手车参数对比",
  description:
    "多辆二手车参数对比：价格、里程、年份、配置一目了然，帮你在北美华人二手车源中快速做出选择。",
  alternates: { canonical: "/compare" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
