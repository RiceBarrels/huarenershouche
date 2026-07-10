import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "汽车服务 - 保险、贷款、过户",
  description:
    "北美华人汽车服务一站式平台：汽车保险、购车贷款、过户代办等中文服务，买车卖车更省心。",
  alternates: { canonical: "/services" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
