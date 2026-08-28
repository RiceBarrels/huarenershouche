import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "购车指南 - 北美买车攻略",
  description:
    "北美买车攻略大全：新手购车流程、二手车验车要点、DMV 过户、保险与贷款指南，专为华人整理的中文购车指南。",
  alternates: { canonical: "/guide" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
