import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "问答 - 买车卖车问题解答",
  description:
    "北美买车卖车常见问题解答：过户流程、保险贷款、验车砍价、维修保养，华人车友互助问答，中文提问中文解答。",
  alternates: { canonical: "/qa" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
