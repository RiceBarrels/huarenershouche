import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "联系我们",
  description:
    "联系常來車網团队：问题反馈、商务合作或使用帮助，我们为北美华人用户提供中文服务。",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
