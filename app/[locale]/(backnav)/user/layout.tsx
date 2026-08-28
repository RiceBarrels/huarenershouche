import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户主页",
  description: "查看用户主页与其发布的二手车源。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
