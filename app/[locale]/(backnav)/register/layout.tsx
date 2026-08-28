import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "注册",
  description: "注册常來車網账户，免费发布和收藏二手车。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
