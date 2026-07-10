import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "找回密码",
  description: "找回常来车网账户密码。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
