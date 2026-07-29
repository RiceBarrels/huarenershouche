import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台",
  description: "常來車網管理后台。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
