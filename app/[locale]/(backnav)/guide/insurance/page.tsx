import {
  Shield,
  DollarSign,
  HelpCircle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Header } from "@/components/header";
import { HantProse } from "@/components/content/hant-prose";
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
    <details className="group overflow-hidden rounded-xl bg-card" open>
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

const INSURERS = [
  {
    name: "Progressive",
    pros: ["报价透明，可在线比价", "Snapshot 驾驶监控可省 30%", "接受信用分较低的客户", "Bundle 优惠力度大"],
    cons: ["客服评价一般", "理赔速度中等", "部分州保费偏高"],
    best: "价格敏感、喜欢在线操作的买家",
  },
  {
    name: "GEICO",
    pros: ["保费通常最低之一", "网站和 App 体验好", "军人/联邦雇员折扣", "理赔流程高效"],
    cons: ["无本地代理", "Bundle 选项有限", "新司机保费偏高"],
    best: "追求最低价、不需要本地代理的买家",
  },
  {
    name: "State Farm",
    pros: ["全美最大，代理网点多", "本地代理一对一服务", "理赔满意度高", "产品线全面 (车/房/人寿)"],
    cons: ["保费通常不是最低", "在线体验一般", "折扣力度不如线上公司"],
    best: "希望有本地代理、需要多险种 Bundle 的买家",
  },
  {
    name: "Allstate",
    pros: ["Drivewise 安全驾驶折扣", "Accident Forgiveness 免首次事故涨价", "本地代理网络广", "多种附加保障"],
    cons: ["保费偏高", "折扣条件较严格", "理赔流程较慢"],
    best: "愿意多付一点换更好保障的买家",
  },
  {
    name: "USAA",
    pros: ["保费最低、满意度最高", "理赔速度极快", "服务态度最佳", "军人家庭特别优惠"],
    cons: ["仅限军人及军属", "无本地代理", "加入资格严格"],
    best: "现役/退役军人及直系家属（其他人无法购买）",
  },
];

export default function InsuranceGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <HantProse>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" strokeWidth={1.5} />
          <h1 className="font-logo text-xl tracking-tight">
            汽车保险指南
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          保险类型详解、公司比较、省钱技巧，华人买车必读
        </p>

        <div className="mt-8 space-y-3">
          {/* 保险类型 */}
          <Section title="保险类型详解" icon={Shield}>
            <p>
              美国汽车保险由多种保障组成。每个州要求的最低保险不同，
              但建议购买全面保障以保护自己和资产。
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Liability Insurance (责任险)</h4>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400">必买</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  你撞了别人时赔对方。包含 Bodily Injury (人身伤害) 和 Property Damage (财产损害)。
                  所有州都要求最低额度的 Liability，通常表示为 25/50/25（单人伤害 $25k / 总伤害 $50k / 财产 $25k）。
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  建议额度：100/300/100 或更高。最低额度在大事故中远远不够。
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Collision Coverage (碰撞险)</h4>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold">推荐</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  你的车在碰撞中受损时修理自己的车。不管是撞了别人还是撞了电线杆。
                  有 Deductible (免赔额)，通常 $500 或 $1,000。
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  车龄 &gt;10 年且价值 &lt;$5,000 的车可以考虑不买，因为修理费可能超过车价。
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Comprehensive Coverage (全面险)</h4>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold">推荐</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  非碰撞造成的损失：盗窃、冰雹、洪水、火灾、动物撞击、挡风玻璃破裂等。
                  也有 Deductible。如果你的车有贷款，银行通常要求购买。
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Uninsured/Underinsured Motorist (未投保/投保不足驾驶人险)</h4>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400">强烈推荐</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  对方没保险或保险不够时保护你。美国约 13% 的司机没有保险。
                  部分州 (如 CA、NY) 强制要求。保费很便宜，建议必买。
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <h4 className="font-semibold">PIP / Medical Payments (人身伤害保护)</h4>
                <p className="mt-1 text-muted-foreground">
                  支付你和乘客的医疗费用，不管谁的错。部分 No-Fault 州 (如 FL、MI、NY) 强制要求 PIP。
                  如果你有很好的健康保险 (Health Insurance)，可以选较低额度。
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <h4 className="font-semibold">其他可选保障</h4>
                <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                  <li><span className="font-semibold text-foreground">Rental Reimbursement</span> — 车在修理期间租车费用，通常 $30-$50/天</li>
                  <li><span className="font-semibold text-foreground">Roadside Assistance</span> — 拖车、换轮胎、搭电等道路救援</li>
                  <li><span className="font-semibold text-foreground">Gap Insurance</span> — 贷款金额大于车辆价值时赔差额。新车建议购买</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* 主要保险公司比较 */}
          <Section title="主要保险公司比较" icon={CheckCircle}>
            <p className="text-muted-foreground">
              以下为美国五大汽车保险公司的对比。保费因个人情况 (年龄、信用分、驾驶记录、地区) 差异很大，
              建议至少比较 3 家的报价。
            </p>

            <div className="mt-4 space-y-3">
              {INSURERS.map((ins) => (
                <div key={ins.name} className="overflow-hidden rounded-xl bg-muted/40">
                  <div className="border-b border-border bg-muted/30 px-3 py-2">
                    <h4 className="font-semibold">{ins.name}</h4>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      最适合：{ins.best}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-green-700 dark:text-green-400">优点</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px]">
                        {ins.pros.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">缺点</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px]">
                        {ins.cons.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-muted/20 p-3">
              <p className="text-[10px] font-semibold">如何获取报价</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                直接访问各保险公司官网获取在线报价。需要提供：驾照号码、VIN 号、住址、驾驶历史。
                报价通常 5-10 分钟即可完成。建议比较至少 3 家公司的报价。
              </p>
              <div className="mt-2 space-y-1 text-[10px]">
                <p>Progressive — progressive.com</p>
                <p>GEICO — geico.com</p>
                <p>State Farm — statefarm.com</p>
                <p>Allstate — allstate.com</p>
                <p>USAA — usaa.com (仅限军人及军属)</p>
              </div>
            </div>
          </Section>

          {/* 省钱技巧 */}
          <Section title="省钱技巧" icon={DollarSign}>
            <p>每年多花 30 分钟比价，可能省下几百甚至上千美元。</p>

            <h4 className="mt-4 font-semibold">1. Bundling (捆绑折扣)</h4>
            <p className="mt-1 text-muted-foreground">
              把车险和房屋险/租房险 (Renters Insurance) 放在同一家公司，通常可享 5-25% 折扣。
              Renters Insurance 本身每月只要 $15-$30，加上 Bundle 折扣后几乎免费。
            </p>

            <h4 className="mt-4 font-semibold">2. 提高 Deductible (免赔额)</h4>
            <p className="mt-1 text-muted-foreground">
              将 Deductible 从 $500 提高到 $1,000，保费通常降低 15-30%。
              前提是你有应急储蓄可以承担 $1,000 的自付额。
            </p>

            <h4 className="mt-4 font-semibold">3. Good Driver Discount (安全驾驶折扣)</h4>
            <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
              <li>3-5 年无事故无罚单可享 10-25% 折扣</li>
              <li>完成 Defensive Driving Course 可额外省 5-10%</li>
              <li>部分公司提供驾驶监控 (Telematics) 设备，按驾驶习惯定价</li>
            </ul>

            <h4 className="mt-4 font-semibold">4. Multi-Car Discount (多车折扣)</h4>
            <p className="mt-1 text-muted-foreground">
              一个保单下保多辆车，每辆车通常可省 10-25%。
              家庭成员的车也可以放在同一保单下。
            </p>

            <h4 className="mt-4 font-semibold">5. 信用分的影响</h4>
            <p className="mt-1 text-muted-foreground">
              大部分州（CA、MA、HI 除外）保险公司会参考你的信用分 (Credit-Based Insurance Score)。
              信用分高的人保费可能比信用分低的人少 40-60%。
              建议：按时还信用卡、降低信用使用率、不要频繁开新卡。
            </p>

            <h4 className="mt-4 font-semibold">6. 其他省钱方式</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>一次性付全年保费，省 5-10% (避免分期手续费)</li>
              <li>设置 Autopay (自动付款)，部分公司有 $5-$10/月折扣</li>
              <li>学生 GPA 3.0+ 可享 Good Student Discount (通常到 25 岁)</li>
              <li>低里程 (&lt;7,500 miles/年) 可享 Low Mileage Discount</li>
              <li>部分公司对特定职业 (教师、工程师、医生) 有折扣</li>
              <li>每年到期前重新比价 — 忠诚度不一定换来好价格</li>
            </ul>
          </Section>

          {/* 华人常见问题 */}
          <Section title="华人常见问题" icon={HelpCircle}>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Q: 国内驾龄在美国有用吗？</h4>
                <p className="mt-1 text-muted-foreground">
                  部分保险公司 (如 Progressive、GEICO) 接受国际驾驶经验。
                  你可能需要提供中国驾照翻译件或公证件。能提供的话可以降低保费，
                  因为保险公司把你当作有经验的司机而不是新手。
                  建议打电话问具体的保险代理人，因为在线报价系统通常不支持输入国际驾龄。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 新移民 / 新司机的保费为什么这么贵？</h4>
                <p className="mt-1 text-muted-foreground">
                  保险公司主要看：年龄、驾龄、信用分、驾驶记录。新移民通常：没有美国驾驶记录、
                  没有美国信用分。这会被系统归类为高风险。应对方法：
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>尽快建立信用记录 (Secured Credit Card)</li>
                  <li>完成 Defensive Driving Course</li>
                  <li>考虑先买一辆便宜的车建立保险记录，1-2 年后保费会显著下降</li>
                  <li>让有良好驾驶记录的家人作为主驾驶人，你作为 secondary driver</li>
                  <li>多家比价 — 不同公司对新司机的定价差异很大</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Q: Gap Insurance 是什么？需要买吗？</h4>
                <p className="mt-1 text-muted-foreground">
                  Gap Insurance 赔付车辆实际价值和贷款余额之间的差额。例如：你贷款 $25,000 买车，
                  1 年后车只值 $20,000，如果此时全损 (Total Loss)，普通保险只赔 $20,000，
                  你还要自己还 $5,000 贷款。Gap Insurance 就赔这 $5,000。
                </p>
                <p className="mt-1 text-muted-foreground">
                  如果以下条件满足两个以上，建议购买：首付 &lt;20%、贷款期限 &gt;48 个月、
                  买的是贬值快的新车。建议从保险公司买 (~$20-$40/年)，不要从车行买 ($500-$1,000 一次性)。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 出了事故保费会涨多少？</h4>
                <p className="mt-1 text-muted-foreground">
                  第一次 at-fault 事故平均涨 40-50%，持续 3-5 年。部分公司有 Accident Forgiveness
                  (免首次事故涨价)，但通常需要购买或满足条件。不是你的错的事故 (not-at-fault) 通常不涨价，
                  但一定要确保警察报告正确记录了责任方。
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Q: 保险理赔流程是什么？</h4>
                <ol className="mt-1 list-inside list-decimal space-y-1 text-muted-foreground">
                  <li>事故现场：确保安全、拨打 911（有人受伤时）、拍照记录、交换保险信息</li>
                  <li>24 小时内联系保险公司报案 (File a Claim)</li>
                  <li>保险公司指派 Adjuster (理赔员) 评估损失</li>
                  <li>选择修理厂修车（可以用保险公司推荐的，也可以自己选）</li>
                  <li>支付 Deductible，保险公司支付剩余</li>
                  <li>如果不是你的错，你的保险公司会向对方保险公司追偿 (Subrogation)</li>
                </ol>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-8 rounded-xl bg-muted/20 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-[10px] font-semibold">免责声明</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                本指南仅供参考，不构成保险购买建议。保费因个人情况差异很大。
                建议直接联系各保险公司获取个性化报价。各州保险要求不同，请以当地法律为准。
              </p>
            </div>
          </div>
        </div>
      </HantProse>
      </main>
      <Footer />
    </div>
  );
}
