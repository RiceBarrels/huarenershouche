import {
  ShieldCheck,
  Search,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Car,
  Wrench,
  Eye,
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

export default function BuyingGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5" strokeWidth={1.5} />
          <h1 className="font-logo text-xl tracking-tight">
            华人购车完全指南
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          从预算规划到交易完成，每一步都为你详细解析
        </p>

        <div className="mt-8 space-y-3">
          {/* 购车预算规划 */}
          <Section title="购车预算规划" icon={DollarSign}>
            <p className="font-semibold">核心原则：月供不超过税后月收入的 15%</p>
            <p className="mt-2">
              这是美国个人理财界公认的安全线。如果你税后月收入 $5,000，
              那么月供上限建议在 $750 以内。注意：这只是月供，还要加上保险和油费。
            </p>

            <h4 className="mt-4 font-semibold">购车总费用构成</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li><span className="font-semibold">车辆价格</span> — 实际成交价，不是标价 (sticker price)</li>
              <li><span className="font-semibold">销售税 (Sales Tax)</span> — 各州不同，CA 约 7.25%-10.25%，TX 6.25%，OR/MT/NH/DE 无销售税</li>
              <li><span className="font-semibold">车辆注册费 (Registration)</span> — 通常 $50-$500，取决于州和车龄</li>
              <li><span className="font-semibold">过户费 (Title Transfer)</span> — 通常 $15-$75</li>
              <li><span className="font-semibold">保险费 (Insurance)</span> — 新司机或信用分低者可能每月 $200-$400</li>
              <li><span className="font-semibold">贷款利息</span> — 信用分 700+ 大约 5-7% APR，600 以下可能 15%+</li>
              <li><span className="font-semibold">验车费 (Inspection)</span> — 独立技师检查，$100-$200</li>
            </ol>

            <h4 className="mt-4 font-semibold">预算计算示例</h4>
            <div className="mt-2 rounded-lg border border-border p-3">
              <p className="text-[10px] text-muted-foreground">假设购买 $20,000 的二手车 (加州)</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between"><span>车价</span><span>$20,000</span></div>
                <div className="flex justify-between"><span>销售税 (~9%)</span><span>$1,800</span></div>
                <div className="flex justify-between"><span>注册 + 过户</span><span>$400</span></div>
                <div className="flex justify-between"><span>验车</span><span>$150</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>总计</span><span>$22,350</span></div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                如贷款 60 个月 / 6% APR / 首付 20%: 月供约 $346 + 保险约 $150 = 每月 $496
              </p>
            </div>

            <h4 className="mt-4 font-semibold">华人买家特别提示</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>刚来美国没有信用记录？先办一张 secured credit card 建立信用，6 个月后再考虑贷款</li>
              <li>国际驾照可以在部分州使用 30-90 天，但买车不需要驾照，只需要有效 ID</li>
              <li>H1B/F1 签证持有者贷款审批可能需要额外文件（I-20、I-797）</li>
              <li>部分信用社 (Credit Union) 对新移民有友好政策，利率比大银行低</li>
            </ul>
          </Section>

          {/* 选车建议 */}
          <Section title="选车建议" icon={Search}>
            <h4 className="font-semibold">可靠性品牌排名 (Consumer Reports / J.D. Power 综合)</h4>
            <div className="mt-2 border border-border">
              <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                <span>等级</span><span>品牌</span><span>5年维修成本</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>顶级</span><span>Toyota / Lexus</span><span>$4,500-$6,000</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>顶级</span><span>Honda / Acura</span><span>$4,800-$6,500</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>优秀</span><span>Mazda</span><span>$5,200-$7,000</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>优秀</span><span>Subaru</span><span>$5,500-$7,500</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>良好</span><span>Hyundai / Kia</span><span>$5,000-$7,200</span>
              </div>
              <div className="grid grid-cols-3 px-3 py-1.5 text-[10px]">
                <span>谨慎</span><span>BMW / Mercedes / Audi</span><span>$10,000-$17,000</span>
              </div>
            </div>

            <h4 className="mt-4 font-semibold">折旧曲线 — 什么时候买最划算？</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><span className="font-semibold">1 年车：</span>贬值 20-30%，性价比一般，不如买新车享受完整保修</li>
              <li><span className="font-semibold">3 年车：</span>贬值 40-50%，最佳甜蜜点。很多车还在原厂保修期内</li>
              <li><span className="font-semibold">5 年车：</span>贬值 60%，价格最低但可能需要更多维修</li>
              <li><span className="font-semibold">建议：</span>2-4 年、3-5 万英里的日系车是华人买家的最佳选择</li>
            </ul>

            <h4 className="mt-4 font-semibold">CPO (Certified Pre-Owned) vs 私人卖家</h4>
            <div className="mt-2 border border-border">
              <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-semibold">
                <span>对比项</span><span>CPO 认证二手车</span><span>私人卖家</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>价格</span><span>高 10-15%</span><span>更便宜</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>保修</span><span>延长保修 1-2 年</span><span>无保修 (As-is)</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>检查</span><span>100+ 点检查</span><span>需自费验车</span>
              </div>
              <div className="grid grid-cols-3 border-b border-border px-3 py-1.5 text-[10px]">
                <span>贷款</span><span>利率更低</span><span>利率较高</span>
              </div>
              <div className="grid grid-cols-3 px-3 py-1.5 text-[10px]">
                <span>适合</span><span>预算宽裕、怕麻烦</span><span>懂车、追求性价比</span>
              </div>
            </div>

            <h4 className="mt-4 font-semibold">华人热门车型推荐</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><span className="font-semibold">家用轿车：</span>Toyota Camry、Honda Accord、Mazda3</li>
              <li><span className="font-semibold">紧凑 SUV：</span>Toyota RAV4、Honda CR-V、Mazda CX-5</li>
              <li><span className="font-semibold">中型 SUV：</span>Toyota Highlander、Honda Pilot、Lexus RX</li>
              <li><span className="font-semibold">省油通勤：</span>Toyota Corolla Hybrid、Honda Civic</li>
              <li><span className="font-semibold">豪华入门：</span>Lexus ES、Acura TLX（维修成本远低于德系）</li>
            </ul>
          </Section>

          {/* 看车检查清单 */}
          <Section title="看车检查清单" icon={Eye}>
            <p className="text-muted-foreground">
              去看车前打印这份清单，逐项检查。如果不确定，花 $100-$200 请独立技师做
              Pre-Purchase Inspection (PPI)。
            </p>

            <h4 className="mt-4 font-semibold">外观检查 (Exterior)</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>检查车身各面板颜色是否一致（色差说明重新喷漆，可能有事故）</li>
              <li>用冰箱贴测试各面板（不吸附 = 补过腻子 = 可能有事故修复）</li>
              <li>检查车门、引擎盖、后备箱的间隙是否均匀对称</li>
              <li>观察轮胎磨损是否均匀（不均匀 = 悬挂或对齐问题）</li>
              <li>检查所有车灯是否正常工作</li>
              <li>查看挡风玻璃有无裂纹、芯片</li>
              <li>检查底盘有无锈蚀（特别是北方雪州的车）</li>
            </ol>

            <h4 className="mt-4 font-semibold">内饰检查 (Interior)</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>闻一闻是否有霉味（可能进过水）、强烈清洁剂味（掩盖问题）</li>
              <li>检查座椅磨损程度是否与里程数匹配</li>
              <li>所有电动窗户、锁、后视镜是否正常</li>
              <li>空调暖气是否正常出风（冷热都要测试）</li>
              <li>中控屏幕、蓝牙、倒车影像是否工作</li>
              <li>翻起地毯/后备箱垫，检查是否有水渍或锈蚀</li>
              <li>安全带是否能正常收紧</li>
            </ol>

            <h4 className="mt-4 font-semibold">发动机舱检查 (Engine)</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>检查机油颜色和量（琥珀色 = 正常，黑色粘稠 = 久未保养）</li>
              <li>检查冷却液颜色和量（绿色/橙色 = 正常，棕色 = 问题）</li>
              <li>变速箱油颜色（红色/粉色 = 正常，棕色/有焦味 = 问题）</li>
              <li>检查所有皮带有无裂纹、磨损</li>
              <li>查看有无漏油痕迹（发动机底部和地面）</li>
              <li>电池端子有无腐蚀（白色/蓝绿色粉末）</li>
              <li>冷启动时听发动机声音（不应有敲击声、嘶嘶声）</li>
            </ol>

            <h4 className="mt-4 font-semibold">试驾检查 (Test Drive)</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>冷车启动是否顺畅（不要让卖家提前热车）</li>
              <li>加速是否平顺，变速是否顿挫</li>
              <li>刹车是否灵敏，有无异响或抖动</li>
              <li>方向盘是否居中，直线行驶是否跑偏</li>
              <li>过减速带时听悬挂有无异响（咯吱声 = 问题）</li>
              <li>高速行驶 (60 mph+) 有无抖动</li>
              <li>倒车时检查转向是否灵活</li>
              <li>测试上坡和下坡表现</li>
              <li>关闭音乐，仔细听各种异响</li>
              <li>停车后检查底部有无新的漏液</li>
            </ol>

            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold">专业提示</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-[10px] text-muted-foreground">
                <li>尽量在白天、干燥天气看车（雨天和夜晚会掩盖漆面问题）</li>
                <li>如果卖家不让你验车或拒绝 PPI，直接走人</li>
                <li>带一个懂车的朋友，两双眼睛总比一双好</li>
                <li>记得拍照记录所有问题，谈判时用得上</li>
              </ul>
            </div>
          </Section>

          {/* 价格谈判技巧 */}
          <Section title="价格谈判技巧" icon={DollarSign}>
            <h4 className="font-semibold">第一步：做好功课</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>在 KBB (Kelley Blue Book) 和 Edmunds 查询该车型的 Fair Market Value</li>
              <li>查看同款车在 CarGurus、AutoTrader 上的售价范围</li>
              <li>了解该车的常见问题（Google &quot;[车型] common problems&quot;）</li>
              <li>查 CarFax/AutoCheck 报告了解车辆历史</li>
            </ul>

            <h4 className="mt-4 font-semibold">第二步：谈判策略</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li><span className="font-semibold">开价低 10-15%。</span>如果车标价 $18,000，你可以从 $15,500 开始谈</li>
              <li><span className="font-semibold">指出具体问题。</span>「轮胎快到期了，换一套要 $600」「这个划痕修要 $300」</li>
              <li><span className="font-semibold">用数据说话。</span>「KBB 上同款车 Fair Value 是 $16,200」</li>
              <li><span className="font-semibold">不要急。</span>永远表现出你还在看其他车，不是非买不可</li>
              <li><span className="font-semibold">现金优势。</span>私人卖家通常更喜欢现金交易，可以据此要求折扣</li>
              <li><span className="font-semibold">善用沉默。</span>给出你的价格后不要说话，让对方先回应</li>
              <li><span className="font-semibold">准备离开。</span>最有效的谈判筹码就是「那我再看看吧」</li>
            </ol>

            <h4 className="mt-4 font-semibold">实用谈判话术</h4>
            <div className="mt-2 space-y-2">
              <div className="rounded-lg border border-border p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">场景：对方开价 $18,000</p>
                <p className="mt-1">&quot;I really like the car, but based on KBB value and the fact that it needs new tires and has a small dent, I was thinking more around $15,500. Would that work for you?&quot;</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">场景：对方拒绝你的开价</p>
                <p className="mt-1">&quot;I understand. What&apos;s the lowest you&apos;d be willing to go? I&apos;m looking at another [同款车] listed at $16,000 nearby.&quot;</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[10px] font-semibold text-muted-foreground">场景：卖家不松口</p>
                <p className="mt-1">&quot;Let me think about it and get back to you. Thanks for your time.&quot; （然后等一两天，很多人会主动联系你降价）</p>
              </div>
            </div>

            <h4 className="mt-4 font-semibold">车行 (Dealer) 谈判额外技巧</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>月末/季末/年末去买车，销售有完成指标的压力</li>
              <li>先谈总价 (Out-the-door price)，不要被月供数字迷惑</li>
              <li>拒绝所有 add-on：延保 (extended warranty)、VIN etching、fabric protection 等，全是高利润项目</li>
              <li>提前拿到银行/信用社的贷款预批，让车行跟你的利率竞争</li>
              <li>不要透露你有 trade-in，先谈好新车价格再提旧车</li>
            </ul>
          </Section>

          {/* 交易安全 */}
          <Section title="交易安全" icon={ShieldCheck}>
            <h4 className="font-semibold">见面安全</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>在公共场所见面：警察局停车场、银行门口、大型超市停车场</li>
              <li>白天见面，带一个朋友同行</li>
              <li>告诉家人/朋友你的去向和预计回来时间</li>
              <li>不要去卖家家里看车（特别是偏远地区）</li>
              <li>第一次见面只看车，不要带大量现金</li>
            </ul>

            <h4 className="mt-4 font-semibold">验证车辆和卖家</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>要求看原始 Title（产权证书），确认卖家名字与 Title 一致</li>
              <li>检查 Title 状态：Clean Title 最好，Salvage/Rebuilt 需谨慎</li>
              <li>核对 VIN 号：仪表板左下角、驾驶侧门框、Title 上的 VIN 必须一致</li>
              <li>查 NICB VINCheck (免费) 确认车辆未被盗</li>
              <li>查 NMVTIS 确认无未披露的事故/水淹/报废记录</li>
              <li>如果 Title 上不是卖家的名字，这是 &quot;跳过户 (title jumping)&quot;，在大多数州是违法的</li>
            </ul>

            <h4 className="mt-4 font-semibold">付款安全</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><span className="font-semibold">最安全：</span>在银行当面开 cashier&apos;s check (银行本票)</li>
              <li><span className="font-semibold">可接受：</span>现金 (在银行大厅交接，可以让银行帮你清点)</li>
              <li><span className="font-semibold">绝对不要：</span>Wire transfer (电汇)、Zelle、Venmo、PayPal 等 — 一旦转出无法追回</li>
              <li>大额交易 ($5,000+) 考虑使用 escrow.com 等第三方托管服务</li>
              <li>一定要签 Bill of Sale，双方各留一份</li>
            </ul>

            <h4 className="mt-4 font-semibold">Bill of Sale 必须包含</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>买卖双方全名和地址</li>
              <li>车辆信息：年份、品牌、型号、VIN、颜色、里程数</li>
              <li>成交价格</li>
              <li>&quot;As-is&quot; 条款（私人交易无保修）</li>
              <li>双方签名和日期</li>
              <li>注明 &quot;vehicle is free of liens&quot;（车辆无贷款未还清）</li>
            </ol>
          </Section>

          {/* 常见骗局防范 */}
          <Section title="常见骗局防范" icon={AlertTriangle}>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400">1. Title Washing (产权洗白)</h4>
                <p className="mt-1">将 Salvage Title 的车跨州注册变成 Clean Title。</p>
                <p className="mt-1 text-muted-foreground"><span className="font-semibold">防范：</span>查 NMVTIS 全国记录，看是否在多个州注册过。如果车频繁跨州过户，红旗。</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400">2. Odometer Fraud (里程表篡改)</h4>
                <p className="mt-1">回调里程表让车看起来跑得少。每年约 45 万辆车被篡改里程。</p>
                <p className="mt-1 text-muted-foreground"><span className="font-semibold">防范：</span>查 CarFax 里程记录是否有跳跃式下降。检查踏板、方向盘、座椅磨损是否与里程匹配。电子仪表盘被篡改后可能显示不均匀亮度。</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400">3. Curbstoning (黑车商冒充个人)</h4>
                <p className="mt-1">无牌照车商冒充私人卖家，卖问题车。他们同时在卖多辆车。</p>
                <p className="mt-1 text-muted-foreground"><span className="font-semibold">防范：</span>搜索卖家电话号码，如果关联多个车辆广告就是 curbstoner。要求看卖家的驾照，名字必须和 Title 一致。</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400">4. Flood/Water Damage (水淹车)</h4>
                <p className="mt-1">飓风/洪水后大量水淹车流入市场，外表修好但电子系统随时会出问题。</p>
                <p className="mt-1 text-muted-foreground"><span className="font-semibold">防范：</span>闻内饰是否有霉味。检查座椅下方、后备箱角落是否有水渍或泥沙。查看车灯内是否有水雾。检查线路接头是否有绿色腐蚀。</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400">5. VIN Cloning (VIN 克隆)</h4>
                <p className="mt-1">将合法车辆的 VIN 贴在被盗车上。</p>
                <p className="mt-1 text-muted-foreground"><span className="font-semibold">防范：</span>对比挡风玻璃、门框、发动机舱三处 VIN 是否一致。VIN 标签是否有被撬动/重新粘贴的痕迹。</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400">6. 针对华人的常见骗局</h4>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>&quot;老乡价&quot; — 利用同胞信任感，实际卖高价或问题车</li>
                  <li>微信群 &quot;急卖&quot; — 声称回国急卖，价格低得离谱，通常是骗定金</li>
                  <li>代购骗局 — 声称可以帮你从拍卖会买车，收定金后消失</li>
                  <li>假 escrow 网站 — 发给你一个看起来像 escrow.com 的假链接</li>
                </ul>
                <p className="mt-2 text-muted-foreground"><span className="font-semibold">防范：</span>不要因为对方说中文就降低戒心。线下见面看车，不要只看照片。不要提前付定金给陌生人。</p>
              </div>
            </div>
          </Section>

          {/* 实用工具和资源 */}
          <Section title="实用工具和资源" icon={Wrench}>
            <h4 className="font-semibold">查价工具</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>KBB (kbb.com) — 最常用的二手车估价工具</li>
              <li>Edmunds (edmunds.com) — 提供 True Market Value</li>
              <li>CarGurus (cargurus.com) — 会标注价格是否合理 (Great/Good/Fair/High)</li>
              <li>NADA Guides (nadaguides.com) — 银行贷款常用这个估价</li>
            </ul>

            <h4 className="mt-4 font-semibold">车辆历史报告</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>CarFax (carfax.com) — $39.99/份，最全面的报告</li>
              <li>AutoCheck (autocheck.com) — $24.99/份，Experian 出品</li>
              <li>NICB VINCheck (nicb.org) — 免费查是否被盗或报废</li>
              <li>NMVTIS — 国家车辆信息系统，查所有州的 Title 历史</li>
            </ul>

            <h4 className="mt-4 font-semibold">找车渠道</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>本平台 — 华人社区二手车交易</li>
              <li>Facebook Marketplace — 本地私人卖家最多</li>
              <li>Craigslist — 老牌平台，注意防骗</li>
              <li>CarGurus / AutoTrader / Cars.com — 车行为主</li>
              <li>Carvana / Vroom — 在线购车，送货上门，7 天退车</li>
            </ul>
          </Section>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-muted/20 p-4">
          <p className="font-mono text-[10px] font-semibold">免责声明</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            本指南仅供参考，不构成法律或财务建议。各州法规不同，
            请以当地 DMV 和法律规定为准。建议重大交易前咨询专业人士。
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
