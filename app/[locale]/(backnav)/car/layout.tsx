import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "二手车详情",
  description:
    "查看二手车详细信息：车况、里程、价格、配置与卖家联系方式，北美华人卖家直售，中文沟通更放心。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
