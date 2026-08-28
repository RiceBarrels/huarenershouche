import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "地图找车 - 在地图上浏览附近车源",
  description:
    "在地图上浏览北美华人二手车源，按品牌、价格、里程、地区筛选，一眼看到附近在售的车。",
  alternates: { canonical: "/browse/map" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
