import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "社区 - 华人汽车交流",
  description:
    "北美华人汽车社区，分享买车卖车经验、用车心得与维修保养技巧，和同城车友中文交流，避坑省钱。",
  alternates: { canonical: "/community" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
