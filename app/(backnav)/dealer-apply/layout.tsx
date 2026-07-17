import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "车行入驻 - 华人车行免费入驻申请",
  description:
    "华人车行免费入驻常来车网：批量发布车源、门店品牌展示、地图曝光、优先排序。提交门店资料，1-2 个工作日完成审核，升级认证车行账号。",
  alternates: { canonical: "/dealer-apply" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
