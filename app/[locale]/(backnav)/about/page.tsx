"use client";

// 关于我们(iOS 26 风格):品牌头卡 + 网站介绍 / 初衷 + 非营利说明 +
// 开源致谢(按类别分组,行点开项目主页)+ 制作团队(进成员详情页)。

import Link from "@/components/localized-navigation";
import { Server, Database, Globe, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SettingsGroup, SettingsRow, GroupHeader, GroupFooter } from "@/components/ios-settings";
import { TeamAvatar } from "@/components/team-member-profile";
import { useI18n } from "@/components/i18n-provider";
import { TEAM } from "@/lib/team";

// 开源致谢:类别名为中文 key;license 为 SPDX 标识
const OPEN_SOURCE: { category: string; items: { name: string; license?: string; url: string }[] }[] = [
  {
    category: "框架与语言",
    items: [
      { name: "Next.js", license: "MIT", url: "https://nextjs.org" },
      { name: "React", license: "MIT", url: "https://react.dev" },
      { name: "TypeScript", license: "Apache-2.0", url: "https://www.typescriptlang.org" },
      { name: "Capacitor", license: "MIT", url: "https://capacitorjs.com" },
      { name: "Bun", license: "MIT", url: "https://bun.sh" },
    ],
  },
  {
    category: "后端与数据",
    items: [
      { name: "Supabase", license: "Apache-2.0", url: "https://supabase.com" },
      { name: "PostgreSQL", license: "PostgreSQL", url: "https://www.postgresql.org" },
      { name: "Zod", license: "MIT", url: "https://zod.dev" },
      { name: "sharp", license: "Apache-2.0", url: "https://sharp.pixelplumbing.com" },
    ],
  },
  {
    category: "界面与交互",
    items: [
      { name: "Tailwind CSS", license: "MIT", url: "https://tailwindcss.com" },
      { name: "shadcn/ui", license: "MIT", url: "https://ui.shadcn.com" },
      { name: "Radix UI", license: "MIT", url: "https://www.radix-ui.com" },
      { name: "Framer Motion", license: "MIT", url: "https://motion.dev" },
      { name: "Lucide", license: "ISC", url: "https://lucide.dev" },
      { name: "cmdk", license: "MIT", url: "https://cmdk.paco.me" },
      { name: "Vaul", license: "MIT", url: "https://vaul.emilkowal.ski" },
      { name: "next-themes", license: "MIT", url: "https://github.com/pacocoursey/next-themes" },
      { name: "pinyin-pro", license: "MIT", url: "https://github.com/zh-lx/pinyin-pro" },
    ],
  },
  {
    category: "地图",
    items: [
      { name: "Leaflet", license: "BSD-2-Clause", url: "https://leafletjs.com" },
      { name: "MapLibre GL JS", license: "BSD-3-Clause", url: "https://maplibre.org" },
      { name: "OpenFreeMap", url: "https://openfreemap.org" },
      { name: "OpenStreetMap", license: "ODbL", url: "https://www.openstreetmap.org/copyright" },
    ],
  },
  {
    category: "字体",
    items: [
      { name: "Geist", license: "OFL-1.1", url: "https://vercel.com/font" },
      { name: "ZCOOL QingKe HuangYou", license: "OFL-1.1", url: "https://fonts.google.com/specimen/ZCOOL+QingKe+HuangYou" },
      { name: "Bagel Fat One", license: "OFL-1.1", url: "https://fonts.google.com/specimen/Bagel+Fat+One" },
    ],
  },
];

// 品牌图标随语言:中/日为汉字版,韩文为 또와카,其余为 CLC
const LOGO_BY_LOCALE: Record<string, string> = { zh: "/logo.png", "zh-hant": "/logo.png", ja: "/logo.png", ko: "/logo-ko.png" };

export default function AboutPage() {
  const { t, locale } = useI18n();
  const iconCls = "h-5 w-5";

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        {/* 品牌头卡 */}
        <SettingsGroup>
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <img
              src={LOGO_BY_LOCALE[locale] ?? "/logo-en.png"}
              alt=""
              className="h-20 w-20 rounded-[22px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
            />
            <h1 className="mt-4 font-logo text-[28px] tracking-tight">{t("常來車網")}</h1>
            <p className="mt-1 font-mono text-[13px] text-muted-foreground">CLCAuto.com</p>
            <p className="mt-3 font-mono text-sm">{t("买车卖车 · 就上常來車網")}</p>
          </div>
        </SettingsGroup>

        <GroupHeader>{t("这是什么")}</GroupHeader>
        <SettingsGroup>
          <div className="space-y-3 px-5 py-4 font-mono text-[15px] leading-relaxed">
            <p>
              {t("常來車網（CLCAuto）是一个面向北美的多语言二手车交易平台。个人卖家和车行都可以免费发布车源，买家可以按品牌、价格、里程和地区筛选，并直接私信卖家沟通。")}
            </p>
            <p>
              {t("站内还有社区、问答、购车指南、VIN 召回查询，以及贷款、油耗等实用工具，界面支持中文、English、한국어、日本語、Español、Français 六种语言。")}
            </p>
          </div>
        </SettingsGroup>

        <GroupHeader>{t("为什么做这个网站")}</GroupHeader>
        <SettingsGroup>
          <div className="px-5 py-4 font-mono text-[15px] leading-relaxed">
            <p>
              {t("在北美买卖二手车，信息往往散落在各种群聊、论坛和分类广告网站里：车况描述不清、语言沟通不便，骗局也不少。我们想做一个干净、好用、没有套路的工具，让每个人——无论习惯用哪种语言——都能更放心地买到或卖掉一辆车。")}
            </p>
          </div>
        </SettingsGroup>

        <GroupHeader>{t("非营利项目")}</GroupHeader>
        <SettingsGroup>
          <div className="border-b border-border/50 px-5 py-4 font-mono text-[15px] leading-relaxed">
            <p>
              {t("常來車網是一个非营利项目，不以盈利为目的。发布和浏览车源完全免费，我们也不从任何交易中抽取佣金。站内展示的广告，只用于维持网站运转的必要开支：")}
            </p>
          </div>
          <SettingsRow
            icon={<Server className={`${iconCls} text-blue-500`} strokeWidth={1.5} />}
            label={t("服务器与带宽")}
          />
          <SettingsRow
            icon={<Database className={`${iconCls} text-emerald-500`} strokeWidth={1.5} />}
            label={t("数据库与图片存储")}
          />
          <SettingsRow
            icon={<Globe className={`${iconCls} text-orange-500`} strokeWidth={1.5} />}
            label={t("域名、地图、翻译等必要服务")}
          />
        </SettingsGroup>

        <GroupHeader>{t("开源技术")}</GroupHeader>
        <SettingsGroup>
          <div className="px-5 py-4 font-mono text-[15px] leading-relaxed">
            <p>{t("常來車網建立在众多优秀的开源项目之上，感谢它们的作者与贡献者。")}</p>
          </div>
          {/* 一个分区一张卡:类别做卡内灰条,每类各包一层让末行免分隔线 */}
          {OPEN_SOURCE.map((group) => (
            <div key={group.category}>
              <p className="bg-muted/50 px-4 py-1.5 font-mono text-[11px] font-medium text-muted-foreground">
                {t(group.category)}
              </p>
              {group.items.map((item) => (
                <SettingsRow
                  key={item.name}
                  label={item.name}
                  value={item.license}
                  href={item.url}
                  external
                />
              ))}
            </div>
          ))}
        </SettingsGroup>
        <GroupFooter>{t("以上项目的商标与版权归各自所有者。点击可访问项目主页。")}</GroupFooter>

        <GroupHeader>{t("制作团队")}</GroupHeader>
        <SettingsGroup>
          {TEAM.map((m) => (
            <Link
              key={m.slug}
              href={`/about/${m.slug}`}
              className="group/row flex items-center gap-3 pl-4 transition-colors active:bg-muted/60 md:hover:bg-muted/40"
            >
              <TeamAvatar initials={m.initials} />
              <span className="flex min-h-[64px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-4 group-last/row:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[15px]">
                    {m.handle ? `${m.handle} / ${m.name}` : m.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{t(m.role)}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
              </span>
            </Link>
          ))}
        </SettingsGroup>
        <GroupFooter>{t("本站由 {maker} 制作，{cofounder} 为联合创始人。", { maker: "rice_barrel / Muheng Fan", cofounder: "Kevin Zhuo" })}</GroupFooter>

        <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground/60">
          常來車網 · CLCAuto.com
        </p>
      </main>
      <Footer />
    </div>
  );
}
