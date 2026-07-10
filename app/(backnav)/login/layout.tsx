import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录",
  description: "登录常来车网账户。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
