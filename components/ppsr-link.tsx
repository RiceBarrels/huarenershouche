"use client";

// 官方 PPSR 查询页链接(澳大利亚 AFSA ppsr.gov.au / 新西兰 ppsr.govt.nz,lib/title-status.ts PPSR_LINKS)。
// 发布 / 编辑页的澳新产权选项下方、详情页「无欠款 / 曾报废」徽标展开后显示;美 / 加 / 推不出国家时不渲染。
// 只放官网链接,不接付费查询接口。原生壳里经 openExternal(AppLauncher)打开系统浏览器。

import { ExternalLink } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { openExternal } from "@/lib/open-external";
import { ppsrLinkFor } from "@/lib/title-status";

export function PpsrLink({ country, className = "" }: { country: string | null | undefined; className?: string }) {
  const { t } = useI18n();
  const url = ppsrLinkFor(country);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        void openExternal(url);
      }}
      className={`inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground ${className}`}
    >
      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
      {t("去官方 PPSR 网站查询")}
    </a>
  );
}
