import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "开发者 / API",
  description: "常來車網 Public API:只读车源与车行数据接口、车行库存自动上传,API key 管理与用量。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
