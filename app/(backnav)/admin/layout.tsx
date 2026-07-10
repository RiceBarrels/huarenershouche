import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台",
  description: "常来车网管理后台。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
