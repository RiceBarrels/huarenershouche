import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "使用条款",
  description: "常来车网使用条款与服务协议。",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
