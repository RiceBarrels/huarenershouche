import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "验证邮箱",
  description: "验证你的常来车网账户邮箱。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
