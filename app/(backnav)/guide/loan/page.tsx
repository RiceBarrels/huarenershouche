"use client";

import { useState } from "react";
import {
  Banknote,
  ExternalLink,
  Star,
  AlertCircle,
  CreditCard,
  Clock,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoanCalculator } from "@/components/loan-calculator";
import { LOAN_PARTNERS } from "@/lib/loan-partners";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-xl border border-border" open>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-mono text-sm font-semibold hover:bg-muted/30">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span>{title}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground group-open:hidden">
          展开
        </span>
      </summary>
      <div className="border-t border-border px-4 py-4 font-mono text-xs leading-relaxed text-foreground/90">
        {children}
      </div>
    </details>
  );
}

export default function LoanGuidePage() {
  const [price, setPrice] = useState(25000);

  async function handleOpenUrl(url: string) {
    try {
      const { openBrowser } = await import("@/lib/capacitor");
      openBrowser(url);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5" strokeWidth={1.5} />
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            汽车贷款指南
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          贷款计算、利率比较、预审申请，一站式解决
        </p>

        {/* Loan Calculator Section */}
        <div className="mt-8 rounded-xl border border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-sm font-semibold">贷款计算器</h2>
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px] text-muted-foreground">
                车价 $
              </Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 0 && v <= 500000) setPrice(v);
                }}
                min={0}
                max={500000}
                step={1000}
                className="h-7 w-24 font-mono text-xs"
              />
            </div>
          </div>
          <LoanCalculator price={price} />
        </div>

        <div className="mt-8 space-y-3">
          {/* 贷款基础知识 */}
          <Section title="贷款基础知识" icon={CreditCard}>
            <h4 className="font-semibold">APR vs Interest Rate (年利率 vs 利率)</h4>
            <p className="mt-1 text-muted-foreground">
              Interest Rate 是纯利率，APR (Annual Percentage Rate) 包含利率加上贷款手续费、
              origination fee 等所有费用。APR 更能反映你实际支付的成本。
              比较不同贷款时，应该看 APR 而不是 Interest Rate。
            </p>

            <h4 className="mt-4 font-semibold">信用分与利率对照</h4>
            <div className="mt-2 border border-border">
              <div className="grid grid-cols-4 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                <span>信用分范围</span>
                <span>评级</span>
                <span>新车 APR</span>
                <span>二手车 APR</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>781-850</span>
                <span>Exceptional</span>
                <span>3.5-5.0%</span>
                <span>4.5-6.5%</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>661-780</span>
                <span>Good</span>
                <span>5.0-7.5%</span>
                <span>6.5-9.0%</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>601-660</span>
                <span>Fair</span>
                <span>7.5-11.0%</span>
                <span>9.0-14.0%</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>501-600</span>
                <span>Poor</span>
                <span>11.0-16.0%</span>
                <span>14.0-20.0%</span>
              </div>
              <div className="grid grid-cols-4 px-3 py-1.5 text-[10px]">
                <span>300-500</span>
                <span>Very Poor</span>
                <span>16.0%+</span>
                <span>20.0%+</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              * 以上为 2024-2025 年市场平均水平参考，实际利率因贷款机构和个人情况而异。
            </p>

            <h4 className="mt-4 font-semibold">首付建议 (Down Payment)</h4>
            <ul className="mt-2 list-inside list-disc space-y-1.5">
              <li>
                <span className="font-semibold">理想首付：20%</span> — 降低月供、减少总利息、
                避免 &quot;underwater&quot;（贷款超过车价）
              </li>
              <li>
                <span className="font-semibold">最低建议：10%</span> — 低于此可能导致利率更高，
                且贬值后可能欠银行的比车值还多
              </li>
              <li>
                <span className="font-semibold">零首付：</span>不推荐。月供高、总利息多、
                银行会收取更高利率作为风险补偿
              </li>
            </ul>

            <h4 className="mt-4 font-semibold">贷款期限对比 (Loan Term)</h4>
            <div className="mt-2 border border-border">
              <div className="grid grid-cols-4 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                <span>期限</span>
                <span>月供</span>
                <span>总利息</span>
                <span>适合人群</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>36 个月</span>
                <span>最高</span>
                <span>最少</span>
                <span>预算宽裕、想省利息</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>48 个月</span>
                <span>较高</span>
                <span>较少</span>
                <span>平衡选择</span>
              </div>
              <div className="grid grid-cols-4 border-b border-border px-3 py-1.5 text-[10px]">
                <span>60 个月</span>
                <span>中等</span>
                <span>中等</span>
                <span>最常见选择</span>
              </div>
              <div className="grid grid-cols-4 px-3 py-1.5 text-[10px]">
                <span>72 个月</span>
                <span>最低</span>
                <span>最多</span>
                <span>月供压力大的买家</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border p-3">
              <p className="text-[10px] font-semibold">实际对比：$20,000 贷款 / 7% APR</p>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>36 个月</span>
                  <span>月供 $617 / 总利息 $2,225</span>
                </div>
                <div className="flex justify-between">
                  <span>48 个月</span>
                  <span>月供 $479 / 总利息 $2,994</span>
                </div>
                <div className="flex justify-between">
                  <span>60 个月</span>
                  <span>月供 $396 / 总利息 $3,761</span>
                </div>
                <div className="flex justify-between">
                  <span>72 个月</span>
                  <span>月供 $341 / 总利息 $4,537</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                72 个月比 36 个月多付 $2,312 利息 — 超过两个月的额外月供
              </p>
            </div>

            <h4 className="mt-4 font-semibold">贷款来源对比</h4>
            <div className="mt-2 border border-border">
              <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                <span>来源</span>
                <span>优点</span>
                <span>缺点</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span className="font-medium">信用社 (Credit Union)</span>
                <span>利率最低、服务好</span>
                <span>需要加入会员</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span className="font-medium">银行 (Bank)</span>
                <span>方便、品牌信誉</span>
                <span>利率中等偏高</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span className="font-medium">在线贷款 (Online)</span>
                <span>申请快、可比价</span>
                <span>部分限制车龄</span>
              </div>
              <div className="grid grid-cols-3 px-3 py-1.5 text-[10px]">
                <span className="font-medium">车行融资 (Dealer)</span>
                <span>方便一站式</span>
                <span>利率通常最高</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              建议：先从信用社或银行拿到预批 (Pre-approval)，然后让车行跟你的利率竞争。
            </p>
          </Section>

          {/* 在线预审 */}
          <Section title="在线预审" icon={Star}>
            <p className="text-muted-foreground">
              预审 (Pre-qualification) 通常是 &quot;软查询&quot; (Soft Pull)，不影响信用分。
              拿到预审信后可以更有底气地和车行谈判。
            </p>

            <div className="mt-4 space-y-3">
              {LOAN_PARTNERS.map((partner) => (
                <div key={partner.id} className="rounded-xl border border-border">
                  <div className="border-b border-border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{partner.nameZh}</h4>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {partner.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold">{partner.aprRange}</p>
                        <p className="text-[10px] text-muted-foreground">
                          最低信用分 {partner.minCreditScore}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {partner.description}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <ul className="list-inside list-disc space-y-0.5 text-[10px] text-muted-foreground">
                      {partner.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full font-mono text-[10px]"
                      onClick={() => handleOpenUrl(partner.url)}
                    >
                      <ExternalLink className="mr-1.5 h-3 w-3" strokeWidth={1.5} />
                      立即预审
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold">预审申请流程</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-[10px] text-muted-foreground">
                <li>选择上面的贷款机构，点击「立即预审」</li>
                <li>填写基本信息：姓名、地址、收入、SSN</li>
                <li>选择贷款金额和期限</li>
                <li>软查询不影响信用分，通常 60 秒出结果</li>
                <li>比较多家报价，选择最优利率</li>
                <li>确定后进行正式申请 (Hard Pull)</li>
              </ol>
            </div>
          </Section>

          {/* 额外贷款知识 */}
          <Section title="华人贷款常见问题" icon={Clock}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Q: 没有 SSN 可以贷款买车吗？</h4>
                <p className="mt-1 text-muted-foreground">
                  有困难但并非不可能。部分贷款机构接受 ITIN 申请。你可能需要：更高的首付 (30-50%)、
                  提供收入证明和银行流水、找一个有 SSN 的 co-signer。部分车行专门服务新移民，
                  但利率通常较高 (15-25%)。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 信用分不够怎么办？</h4>
                <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>找有好信用的亲属做 co-signer (共同签约人)</li>
                  <li>增加首付比例以降低贷款风险</li>
                  <li>考虑信用社 (Credit Union)，通常比银行更灵活</li>
                  <li>先花 6-12 个月建立信用 (Secured Card、Authorized User)</li>
                  <li>买便宜一点的车，减少贷款金额</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Q: 贷款预批有效期多久？</h4>
                <p className="mt-1 text-muted-foreground">
                  大部分预批有效期 30-60 天。14 天内多次贷款查询只算一次 Hard Pull，
                  所以集中在两周内比价不会反复伤信用分。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 可以提前还清贷款吗？</h4>
                <p className="mt-1 text-muted-foreground">
                  大部分汽车贷款没有 prepayment penalty (提前还款罚金)。
                  提前还清可以节省大量利息。每月多还一点或每年做一次大额还款都有帮助。
                  还清后记得向银行要 Lien Release 文件并更新 Title。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: Refinance (再融资) 值得吗？</h4>
                <p className="mt-1 text-muted-foreground">
                  如果你的信用分在贷款后提升了 50 分以上，或者市场利率下降了 1%+，
                  Refinance 通常值得。注意：(1) 确认没有 refinance 费用或费用低于省下的利息；
                  (2) 不要延长贷款期限 — 月供降低但总利息可能更多；(3) 车龄超过 10 年或
                  里程超过 10 万英里的车可能无法 refinance。
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-[10px] font-semibold">免责声明</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                本页面包含第三方贷款机构链接，仅供参考。我们不代表任何贷款机构，
                不对其服务质量或利率负责。贷款决定前请仔细阅读条款。
                实际利率和审批结果取决于个人信用状况和贷款机构政策。
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
