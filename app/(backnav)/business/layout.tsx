import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "商家入驻 - 车行免费入驻",
  description:
    "车行商家免费入驻常来车网，发布库存车源，直接触达北美华人买家，中文平台助力车行获客。",
  alternates: { canonical: "/business" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
