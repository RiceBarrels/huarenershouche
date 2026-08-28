import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "消息",
  description: "查看与买家、卖家的聊天消息。",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
