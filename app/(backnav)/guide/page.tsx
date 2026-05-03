"use client";

import {
  BookOpen,
  Shield,
  FileText,
  DollarSign,
  Search,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Car,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";

const GUIDES: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  tags: string[];
  href?: string;
}[] = [
  {
    icon: Car,
    title: "华人购车完全指南",
    description:
      "从预算规划到交易完成，每一步都为你详细解析。包含选车建议、检查清单、谈判技巧、交易安全和骗局防范。",
    tags: ["新手必读", "完全指南"],
    href: "/guide/buying",
  },
  {
    icon: FileText,
    title: "DMV 过户指南",
    description:
      "二手车过户流程、所需文件清单、各州费用对比。涵盖 10 个华人聚居州的 Title 费用和销售税率参考。",
    tags: ["过户", "DMV"],
    href: "/guide/dmv",
  },
  {
    icon: Shield,
    title: "汽车保险指南",
    description:
      "保险类型详解、五大保险公司优缺点对比、省钱技巧。包含针对华人新移民的常见问题解答。",
    tags: ["保险", "省钱"],
    href: "/guide/insurance",
  },
  {
    icon: Banknote,
    title: "汽车贷款指南",
    description:
      "在线月供计算器、信用分利率对照表、贷款期限对比。支持在线预审，一键比较多家贷款机构报价。",
    tags: ["贷款", "计算器"],
    href: "/guide/loan",
  },
  {
    icon: Search,
    title: "如何选择适合自己的二手车",
    description:
      "从预算规划到车型对比，系统性地帮你找到最适合的车。了解各品牌特点，热门车型推荐，以及新手买车的常见误区。",
    tags: ["新手必读", "选车指南"],
  },
  {
    icon: Shield,
    title: "二手车检查清单 (Pre-purchase Inspection)",
    description:
      "购买前必须检查的 20 个关键点：外观、内饰、发动机、变速箱、底盘、电子系统。附带专业技师推荐的检查流程。",
    tags: ["检查清单", "避坑指南"],
  },
  {
    icon: FileText,
    title: "CarFax 报告怎么看",
    description:
      "手把手教你阅读 CarFax / AutoCheck 报告。了解 Title Status、Accident History、Service Records 等关键信息的含义。",
    tags: ["报告解读", "车辆历史"],
  },
  {
    icon: DollarSign,
    title: "美国二手车贷款全攻略",
    description:
      "信用分数要求、利率对比、贷款机构选择（银行 vs 信用社 vs 车行融资）。教你如何拿到最低利率，节省数千美金。",
    tags: ["贷款", "理财"],
  },
  {
    icon: AlertTriangle,
    title: "常见购车骗局与防范",
    description:
      "Odometer Rollback、Salvage Title 洗白、Curbstoning（黑车商冒充个人）等常见骗局。教你如何识别和避免。",
    tags: ["安全", "防骗"],
  },
  {
    icon: Wrench,
    title: "购车后必做的 5 件事",
    description:
      "过户流程、保险购买、首次保养、常见改装注意事项、保修延长方案。新车到手后的完整 checklist。",
    tags: ["购车后", "保养"],
  },
];

export default function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">

      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" strokeWidth={1.5} />
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            购车资讯
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          华人买车必读指南，帮你在美国买到称心的车
        </p>

        <div className="mt-8 space-y-4">
          {GUIDES.map((guide) => {
            const Icon = guide.icon;
            const content = (
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border">
                  <Icon
                    className="h-5 w-5 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-mono text-sm font-semibold">
                      {guide.title}
                    </h2>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {guide.description}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {guide.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );

            if (guide.href) {
              return (
                <Link key={guide.title} href={guide.href}>
                  <article className="group cursor-pointer border border-border p-4 transition-colors hover:border-foreground/20">
                    {content}
                  </article>
                </Link>
              );
            }

            return (
              <article
                key={guide.title}
                className="group cursor-pointer border border-border p-4 transition-colors hover:border-foreground/20"
              >
                {content}
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
