import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIN 查询 - 免费查召回与安全评级",
  description:
    "免费 VIN 查询工具：查询车辆召回记录与 NHTSA 安全评级，买二手车前先查车况，北美华人买车必备的中文查询工具。",
  alternates: { canonical: "/vin" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
