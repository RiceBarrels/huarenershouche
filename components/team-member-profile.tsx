"use client";

// 「关于我们」制作团队:成员头像(姓名首字母)+ 成员详情页(iOS 26 风格):
// 头卡 + 个人资料分组 + 联系方式分组(iOS 通讯录式:小标签在上、值在下)。

import { Cake, Mail, Globe, UserRound, Sparkles, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { SettingsGroup, SettingsRow, GroupHeader, GroupFooter } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import { getTeamMember, type TeamMember } from "@/lib/team";

export function TeamAvatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "lg" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-mono font-semibold text-primary-foreground ${
        size === "lg" ? "h-20 w-20 text-2xl" : "h-10 w-10 text-sm"
      }`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function ContactRow({ icon, label, value, href }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  const blank = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      target={blank ? "_blank" : undefined}
      rel={blank ? "noopener noreferrer" : undefined}
      className="group/row flex items-center gap-3 pl-4 transition-colors active:bg-muted/60 md:hover:bg-muted/40"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex min-h-[60px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-4 group-last/row:border-0">
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-xs text-muted-foreground">{label}</span>
          <span className="mt-0.5 block truncate font-mono text-[15px] text-brand-ink">{value}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
      </span>
    </a>
  );
}

export function TeamMemberProfile({ slug }: { slug: TeamMember["slug"] }) {
  const { t } = useI18n();
  const m = getTeamMember(slug);
  const iconCls = "h-5 w-5";

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <SettingsGroup>
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <TeamAvatar initials={m.initials} size="lg" />
            <h1 className="mt-4 font-mono text-[22px] font-semibold tracking-tight">{m.name}</h1>
            {m.handle && <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">@{m.handle}</p>}
            <Badge variant="secondary" className="mt-3 font-mono text-[11px]">{t(m.role)}</Badge>
          </div>
        </SettingsGroup>

        <GroupHeader>{t("个人资料")}</GroupHeader>
        <SettingsGroup>
          <SettingsRow
            icon={<Cake className={`${iconCls} text-pink-500`} strokeWidth={1.5} />}
            label={t("生日")}
            value={m.birthday}
          />
          <SettingsRow
            icon={<UserRound className={`${iconCls} text-sky-500`} strokeWidth={1.5} />}
            label={t("性别")}
            value={t(m.gender)}
          />
          <SettingsRow
            icon={<Sparkles className={`${iconCls} text-amber-500`} strokeWidth={1.5} />}
            label={t("星座")}
            value={t(m.zodiac)}
          />
        </SettingsGroup>
        {m.birthdayNote && <GroupFooter>{t(m.birthdayNote)}</GroupFooter>}

        <GroupHeader>{t("联系方式")}</GroupHeader>
        <SettingsGroup capsule={!m.website}>
          <ContactRow
            icon={<Mail className={`${iconCls} text-blue-500`} strokeWidth={1.5} />}
            label="Email"
            value={m.email}
            href={`mailto:${m.email}`}
          />
          {m.website && (
            <ContactRow
              icon={<Globe className={`${iconCls} text-teal-500`} strokeWidth={1.5} />}
              label={t("个人网站")}
              value={m.website.replace(/^https?:\/\//, "")}
              href={m.website}
            />
          )}
        </SettingsGroup>
      </main>
      <Footer />
    </div>
  );
}
