import type { Metadata } from "next";

// key 管理是私人页面,不进搜索引擎
export const metadata: Metadata = {
  title: "API Key",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
