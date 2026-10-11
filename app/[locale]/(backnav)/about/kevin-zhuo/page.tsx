import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";
import { getTeamMember } from "@/lib/team";
import { TeamMemberProfile } from "@/components/team-member-profile";

const member = getTeamMember("kevin-zhuo");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = serverT(locale);
  return {
    title: member.handle ? `${member.name} (${member.handle})` : member.name,
    description: t("{site}{role} {name} 的个人介绍", { name: member.name, site: t("常來車網"), role: t(member.role) }),
    alternates: localeAlternates(locale, "/about/kevin-zhuo"),
  };
}

export default function KevinZhuoPage() {
  return <TeamMemberProfile slug="kevin-zhuo" />;
}
