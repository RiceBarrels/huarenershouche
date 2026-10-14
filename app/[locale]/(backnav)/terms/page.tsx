import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LargeTitle } from "@/components/ios-settings";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 md:py-8">
        <LargeTitle title="用户协议" subtitle="Terms of Service · 最后更新 2026年10月" />

        {/* 条款正文放进 iOS 白色大圆角卡 */}
        <div className="mt-5 space-y-6 rounded-[26px] bg-card p-6 font-mono text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">1. 接受条款</h2>
            <p className="mt-2">
              欢迎使用常來車網（以下简称「本平台」）。访问或使用本平台即表示您同意受本用户协议约束。如果您不同意这些条款，请勿使用本平台。
            </p>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">2. 平台性质</h2>
            <p className="mt-2">
              本平台仅作为信息发布与交流平台，为买卖双方提供车辆信息展示服务。本平台不参与任何车辆交易的实际过程，不是交易的任何一方，也不对交易结果承担任何责任。
            </p>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">3. 用户账号</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>您必须年满18周岁才能注册和使用本平台。</li>
              <li>您有责任维护账号信息的准确性和安全性。</li>
              <li>每位用户仅可注册一个账号，禁止使用多个账号进行操作。</li>
              <li>本平台有权在违反本协议时暂停或终止您的账号。</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">4. 车辆发布规则</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>发布的车辆信息必须真实、准确、完整。</li>
              <li>禁止发布虚假、误导性信息，包括但不限于虚假价格、篡改里程数、隐瞒事故记录等。</li>
              <li>发布者必须对所售车辆拥有合法处置权。</li>
              <li>禁止发布被盗车辆、有留置权未解除的车辆或存在其他法律纠纷的车辆。</li>
              <li>车行用户须如实标注车行身份，不得以个人名义发布车行车辆。</li>
              <li>本平台有权删除任何违反规则的发布内容，且无需事先通知。</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">5. 交易安全</h2>
            <p className="mt-2">
              本平台强烈建议买卖双方在交易过程中注意以下事项：
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>在公共场所进行看车和交易。</li>
              <li>交易前通过 CarFax 或 AutoCheck 获取车辆历史报告。</li>
              <li>聘请认证技师进行 Pre-purchase Inspection（购前检测）。</li>
              <li>核实车辆 VIN 码与车辆登记信息是否一致。</li>
              <li>通过银行本票（Cashier&apos;s Check）等安全方式完成付款，避免使用现金或电汇。</li>
              <li>确保 Title 过户手续合法合规。</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">6. 禁止行为</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>利用平台进行欺诈、诈骗或其他违法活动。</li>
              <li>发布与车辆买卖无关的广告或垃圾信息。</li>
              <li>骚扰、威胁或侮辱其他用户。</li>
              <li>未经授权爬取或采集平台数据。</li>
              <li>干扰平台正常运营或试图绕过安全措施。</li>
              <li>冒充他人或虚假陈述与任何个人或实体的关系。</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">7. 免责声明</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>本平台不对用户发布的车辆信息的真实性、准确性或合法性做任何保证。</li>
              <li>本平台不对因用户之间的交易产生的任何损失、纠纷或损害承担责任。</li>
              <li>本平台不对因使用或无法使用平台服务而导致的任何直接、间接、附带或惩罚性损害负责。</li>
              <li>平台提供的 VIN 查询、价格参考等工具仅供参考，不构成专业建议。</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">8. 知识产权</h2>
            <p className="mt-2">
              本平台的名称、Logo、界面设计及所有原创内容均受知识产权保护。用户发布的内容，用户保留所有权，但授予本平台在服务范围内展示和使用的非独占性许可。
            </p>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">9. 隐私保护</h2>
            <p className="mt-2">
              我们重视您的隐私。本平台收集的用户信息仅用于提供和改进服务，不会出售给第三方。详情请参阅我们的隐私政策。
            </p>
            {/* 访问统计说明须与 supabase/analytics.sql 的实际行为一致:保留期、删号处理、卖家身份开关 analytics_seller_identity_enabled() 等变化时同步修改,并更新页首日期 */}
            <p className="mt-2">
              为了解平台使用情况并向卖家提供车辆浏览数据，我们会记录访问统计：
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>包括浏览的页面（含搜索与筛选条件）与车辆、访问时间、来源网站与推广链接参数、设备、浏览器、操作系统与界面语言，以及根据 IP 地址推断的大致地区（国家、州/省、城市）；访问统计不保存 IP 地址。</li>
              <li>我们通过保存在您浏览器或 App 中的随机标识识别同一访客；登录后，同一浏览器或 App 上的访问记录（包括未登录时的浏览）会与您的账号关联。您的账号还会保存最近一次登录使用时的大致地区（部分账号根据登录记录中的 IP 推断，IP 定位数据由 DB-IP 提供）。</li>
              <li>完整访问记录与账号的大致地区仅平台管理员可查看。卖家可在「数据面板」查看名下车辆的浏览统计：浏览者以匿名编号区分，不显示用户名或头像，但会显示其浏览时间、是否已登录、大致地区、设备、界面语言与来源。</li>
              <li>访问记录保存 180 天后自动删除；账号的大致地区保留到账号删除为止。删除账号时，与该账号关联的访问记录（包括同一浏览器或 App 上未登录时的浏览）一并删除。</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">10. 协议修改</h2>
            <p className="mt-2">
              本平台保留随时修改本协议的权利。修改后的协议将在平台上公布，继续使用平台即视为接受修改后的条款。
            </p>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">11. 适用法律</h2>
            <p className="mt-2">
              本协议受美国加利福尼亚州法律管辖。因本协议引起的任何争议，双方应首先友好协商解决；协商不成的，提交加利福尼亚州有管辖权的法院裁决。
            </p>
          </section>

          <section>
            <h2 className="font-mono text-sm font-semibold text-foreground">12. 联系我们</h2>
            <p className="mt-2">
              如对本协议有任何疑问，请通过平台内消息功能或发送邮件联系我们。
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
