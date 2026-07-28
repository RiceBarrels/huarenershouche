import {
  FileText,
  ClipboardList,
  Clock,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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

const STATE_FEES = [
  { state: "California (CA)", titleFee: "$23", salesTax: "7.25%+", notes: "含地方税可达 10.25%，需 Smog Check" },
  { state: "New York (NY)", titleFee: "$50", salesTax: "8%", notes: "NYC 额外 0.375%，需 Safety Inspection" },
  { state: "Texas (TX)", titleFee: "$33", salesTax: "6.25%", notes: "无州个人所得税，需 Safety + Emissions" },
  { state: "Florida (FL)", titleFee: "$75.25", salesTax: "6%+", notes: "含地方税可达 8%，无 Safety Inspection" },
  { state: "Illinois (IL)", titleFee: "$150", salesTax: "6.25%+", notes: "Cook County 额外 1.75%，需 Emissions" },
  { state: "Washington (WA)", titleFee: "$12", salesTax: "6.5%+", notes: "含地方税可达 10.4%，需 Emissions (部分地区)" },
  { state: "Massachusetts (MA)", titleFee: "$75", salesTax: "6.25%", notes: "需 Safety + Emissions Inspection" },
  { state: "New Jersey (NJ)", titleFee: "$60", salesTax: "6.625%", notes: "需 VIN Inspection (私人购买)" },
  { state: "Pennsylvania (PA)", titleFee: "$58", salesTax: "6%+", notes: "Philadelphia 额外 2%，需 Safety + Emissions" },
  { state: "Georgia (GA)", titleFee: "$18", salesTax: "TAVT 6.6%", notes: "一次性 Title Ad Valorem Tax 代替年度财产税" },
];

export default function DmvGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" strokeWidth={1.5} />
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            DMV 过户指南
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          二手车过户流程、所需文件、各州费用一览
        </p>

        <div className="mt-8 space-y-3">
          {/* 过户基本流程 */}
          <Section title="过户基本流程" icon={ClipboardList}>
            <p>
              在美国购买二手车后，买家需要在规定时间内到当地 DMV 完成过户 (Title Transfer)
              和注册 (Registration)。各州流程略有不同，但基本步骤一致：
            </p>

            <h4 className="mt-4 font-semibold">第一步：签署购买文件</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>卖家在 Title 背面签名并填写买家信息、里程数、日期</li>
              <li>双方签署 Bill of Sale（买卖合同）</li>
              <li>卖家提供 Smog/Emissions 证书（部分州要求卖家提供）</li>
              <li>如果有贷款，卖家需提供 Lien Release（贷款结清证明）</li>
            </ol>

            <h4 className="mt-4 font-semibold">第二步：购买保险</h4>
            <p className="mt-1">
              在过户之前，你必须先购买汽车保险。大部分州法律要求车辆有有效保险才能注册。
              可以打电话给保险公司，提供 VIN 号，通常几分钟就能出保单。
            </p>

            <h4 className="mt-4 font-semibold">第三步：完成排放测试 (Emissions/Smog Test)</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>CA: 卖家负责 Smog Check，买家不用再做（除非是外州车）</li>
              <li>TX: 买家需要在过户时提供有效的 Inspection 报告</li>
              <li>FL: 不需要 Safety Inspection 或 Emissions Test</li>
              <li>NY: 需要 Safety + Emissions Inspection</li>
              <li>费用通常 $30-$90，在认证检测站完成</li>
            </ul>

            <h4 className="mt-4 font-semibold">第四步：去 DMV 办理过户</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>携带所有文件到当地 DMV（建议提前预约）</li>
              <li>填写 Title Transfer 申请表</li>
              <li>缴纳 Title 费、注册费和销售税</li>
              <li>领取新的 Title（可能邮寄，2-6 周到达）</li>
              <li>获取新车牌或转移旧车牌</li>
              <li>拿到临时注册证 (Temporary Registration)</li>
            </ol>

            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold">提示：DMV 预约</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                大部分州的 DMV 可以在线预约。强烈建议预约，walk-in 可能要等 2-4 小时。
                加州 DMV 预约网站: dmv.ca.gov/portal/appointments
              </p>
            </div>
          </Section>

          {/* 所需文件 */}
          <Section title="所需文件清单" icon={FileText}>
            <h4 className="font-semibold">买家需要准备</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li><span className="font-semibold">有效身份证件</span> — 驾照、州 ID、或护照 + I-94</li>
              <li><span className="font-semibold">车辆 Title</span> — 卖家签名的原始 Title（不接受复印件）</li>
              <li><span className="font-semibold">Bill of Sale</span> — 双方签名，注明价格、VIN、日期</li>
              <li><span className="font-semibold">保险证明</span> — 有效的汽车保险卡或保单号</li>
              <li><span className="font-semibold">排放测试报告</span> — Smog/Emissions 证书（视州而定）</li>
              <li><span className="font-semibold">过户申请表</span> — 各州不同，可在 DMV 网站下载或现场领取</li>
              <li><span className="font-semibold">付款方式</span> — 现金、支票或信用卡（缴纳税费）</li>
            </ol>

            <h4 className="mt-4 font-semibold">卖家需要提供</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>在 Title 背面签名并填写里程数</li>
              <li>签署 Bill of Sale</li>
              <li>提供 Smog/Emissions 证书（视州而定）</li>
              <li>提供 Lien Release（如果车辆有贷款已还清）</li>
              <li>交出所有车钥匙（包括备用钥匙）</li>
              <li>通知保险公司取消该车保险</li>
              <li>向 DMV 提交 Release of Liability（免责通知，非常重要）</li>
            </ol>

            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold">华人买家特别注意</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-muted-foreground">
                <li>F1/H1B 签证持有者可以用护照 + I-94 + I-20/I-797 作为身份证明</li>
                <li>部分州接受 ITIN (Individual Taxpayer Identification Number) 代替 SSN</li>
                <li>如果没有驾照，可以先过户再考驾照 — 买车不需要驾照</li>
                <li>名字要和 ID 上完全一致，中文名的拼音顺序要注意</li>
              </ul>
            </div>
          </Section>

          {/* 各州费用参考 */}
          <Section title="各州费用参考" icon={FileText}>
            <p className="text-muted-foreground">
              以下为 10 个华人聚居州的过户费用参考。实际费用可能因车辆价值、地区和政策变化而不同。
            </p>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[600px] border border-border">
                <div className="grid grid-cols-4 border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold">
                  <span>州</span>
                  <span>Title 费用</span>
                  <span>销售税率</span>
                  <span>备注</span>
                </div>
                {STATE_FEES.map((s, i) => (
                  <div
                    key={s.state}
                    className={`grid grid-cols-4 px-3 py-2 text-[10px] ${
                      i < STATE_FEES.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="font-medium">{s.state}</span>
                    <span>{s.titleFee}</span>
                    <span>{s.salesTax}</span>
                    <span className="text-muted-foreground">{s.notes}</span>
                  </div>
                ))}
              </div>
            </div>

            <h4 className="mt-4 font-semibold">费用计算示例</h4>
            <div className="mt-2 rounded-lg border border-border p-3">
              <p className="text-[10px] text-muted-foreground">
                在加州购买 $15,000 的二手车
              </p>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex justify-between"><span>Title 过户费</span><span>$23</span></div>
                <div className="flex justify-between"><span>注册费 (Registration)</span><span>~$200-$400</span></div>
                <div className="flex justify-between"><span>销售税 (约 9%)</span><span>$1,350</span></div>
                <div className="flex justify-between"><span>Smog Transfer Fee</span><span>$8</span></div>
                <div className="flex justify-between"><span>CHP Fee</span><span>$26</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>预估总费用</span><span>$1,607-$1,807</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold">省钱提示</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-muted-foreground">
                <li>Oregon、Montana、New Hampshire、Delaware 无销售税</li>
                <li>部分州对 &quot;gift&quot; 转让免税 — 但仅限直系亲属</li>
                <li>军人和退伍军人在部分州可享受过户费减免</li>
                <li>部分州可以用旧车牌转移到新车，省一笔车牌费</li>
              </ul>
            </div>
          </Section>

          {/* 重要提示 */}
          <Section title="重要提示和时间要求" icon={Clock}>
            <h4 className="font-semibold">过户时间限制</h4>
            <div className="mt-2 border border-border">
              <div className="grid grid-cols-2 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                <span>州</span><span>过户截止期限</span>
              </div>
              <div className="grid grid-cols-2 border-b border-border px-3 py-1.5 text-[10px]">
                <span>California</span><span>10 天内</span>
              </div>
              <div className="grid grid-cols-2 border-b border-border px-3 py-1.5 text-[10px]">
                <span>Texas</span><span>30 天内</span>
              </div>
              <div className="grid grid-cols-2 border-b border-border px-3 py-1.5 text-[10px]">
                <span>New York</span><span>10 天内</span>
              </div>
              <div className="grid grid-cols-2 border-b border-border px-3 py-1.5 text-[10px]">
                <span>Florida</span><span>30 天内</span>
              </div>
              <div className="grid grid-cols-2 border-b border-border px-3 py-1.5 text-[10px]">
                <span>Illinois</span><span>20 天内</span>
              </div>
              <div className="grid grid-cols-2 px-3 py-1.5 text-[10px]">
                <span>其他州</span><span>通常 10-30 天</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              超过截止期限可能面临罚款 ($25-$500)。购车后请尽快办理过户。
            </p>

            <h4 className="mt-4 font-semibold">临时行驶许可 (Temporary Tags)</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>过户后通常会拿到临时注册 (Temporary Registration)，有效期 30-90 天</li>
              <li>部分州允许在线申请临时行驶许可 (Temporary Permit / Transit Permit)</li>
              <li>临时标签必须放在挡风玻璃可见位置或后窗</li>
              <li>正式车牌通常 2-8 周邮寄到家</li>
            </ul>

            <h4 className="mt-4 font-semibold">外州购车过户</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>在购买所在州获取临时行驶许可 (Transit Permit)</li>
              <li>在你的居住州办理过户和注册 — 销售税按居住州税率征收</li>
              <li>部分州如果在购买州已缴纳销售税，居住州可以抵扣</li>
              <li>需要在居住州完成排放/安全检查</li>
              <li>外州 Title 需要在 DMV 转换为本州 Title</li>
            </ol>
          </Section>

          {/* 常见问题 */}
          <Section title="常见问题 FAQ" icon={HelpCircle}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Q: Title 丢失了怎么办？</h4>
                <p className="mt-1 text-muted-foreground">
                  卖家需要向所在州 DMV 申请 Duplicate Title (补发 Title)。费用通常 $15-$75，
                  处理时间 1-4 周。买家不应该购买没有 Title 的车。如果卖家说 &quot;Title 在邮寄途中&quot;，
                  等拿到 Title 再交易。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 车辆有 Lien (贷款未还清) 怎么办？</h4>
                <p className="mt-1 text-muted-foreground">
                  如果 Title 上有 Lienholder (银行名字)，说明贷款未结清。卖家必须先还清贷款
                  拿到 Lien Release 才能过户。可以：(1) 和卖家一起去银行，买家的钱直接付给银行；
                  (2) 使用 escrow 服务；(3) 在信贷机构办公室完成交易。绝对不要购买 Title 上有
                  Lien 且卖家无法提供 Lien Release 的车。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 把车作为礼物赠送给亲属怎么操作？</h4>
                <p className="mt-1 text-muted-foreground">
                  大部分州允许直系亲属之间赠送车辆免缴销售税。流程：(1) 在 Title 背面填写
                  &quot;gift&quot;；(2) 填写州的 Gift Affidavit 表格；(3) 提供亲属关系证明。
                  注意：部分州对 &quot;gift&quot; 的定义很严格，仅限父母、子女、配偶。朋友之间
                  标注 &quot;gift&quot; 但实际有交易是违法行为。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 从车行 (Dealer) 购买和私人购买有什么区别？</h4>
                <div className="mt-1 border border-border">
                  <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                    <span>对比项</span><span>车行 (Dealer)</span><span>私人 (Private)</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                    <span>过户</span><span>车行代办</span><span>买家自己去 DMV</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                    <span>销售税</span><span>车行代收代缴</span><span>买家自行缴纳</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                    <span>车牌</span><span>车行办理</span><span>买家自行办理</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                    <span>保障</span><span>Lemon Law 保护</span><span>通常 As-is</span>
                  </div>
                  <div className="grid grid-cols-3 px-3 py-1.5 text-[10px]">
                    <span>价格</span><span>较高 (含 dealer fee)</span><span>通常更便宜</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Q: 没有 SSN 可以过户吗？</h4>
                <p className="mt-1 text-muted-foreground">
                  可以。大部分州接受 ITIN (Individual Taxpayer Identification Number) 代替 SSN。
                  部分州（如加州）甚至不要求 SSN 或 ITIN 就可以办理注册。具体要求因州而异，
                  建议提前致电当地 DMV 确认所需文件。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 电子 Title (e-Title) 是什么？</h4>
                <p className="mt-1 text-muted-foreground">
                  越来越多的州推行电子 Title。车辆信息存储在 DMV 数据库中，没有纸质 Title。
                  如果卖家的车是 e-Title，需要先在 DMV 申请纸质 Title 才能交易。部分州
                  支持在线过户 e-Title，无需纸质文件。
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
                以上费用和流程信息仅供参考，可能随政策变化而调整。请以当地 DMV 官方网站公布的
                最新信息为准。各州 DMV 网站可在 dmv.org 查询。
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
