import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "实用工具",
  description: "买车养车实用小工具:月供计算、油费估算、停车定位等。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
