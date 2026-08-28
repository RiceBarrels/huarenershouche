import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的账户",
  description: "管理你的常來車網账户、发布的车源与收藏。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
