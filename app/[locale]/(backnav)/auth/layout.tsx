import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录验证",
  description: "正在完成登录验证。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
