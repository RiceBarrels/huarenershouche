import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API 用量",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
