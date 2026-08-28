"use client";

import { BadgePlus, Bot } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// 用户身份图标徽章:认证车行 = 加号徽章(品牌绿底深墨),系统账号 = 机器人。
// 两者可同时出现(已认领的系统账号既是认证车行也是系统账号),紧跟在用户名旁。
// 点击弹出解释;徽章可能嵌在 <Link> 里,需阻止冒泡避免触发跳转。

function ExplainBadge({
  label,
  explain,
  children,
}: {
  label: string;
  explain: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="inline-flex shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-64 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs font-semibold">{label}</p>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">{explain}</p>
      </PopoverContent>
    </Popover>
  );
}

export function ProfileBadges({
  verifiedDealer,
  system,
  className = "h-4 w-4",
}: {
  verifiedDealer?: boolean;
  system?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  if (!verifiedDealer && !system) return null;
  return (
    <>
      {verifiedDealer && (
        <ExplainBadge
          label={t("认证车行")}
          explain={t("该车行已提交门店资料并通过平台人工审核认证。")}
        >
          <BadgePlus className={`${className} fill-primary text-primary-foreground`} strokeWidth={1.5} />
        </ExplainBadge>
      )}
      {system && (
        <ExplainBadge
          label={t("系统账号")}
          explain={t("该账号由系统自动从车行公开官网检索并每日同步车源，非车行本人运营，价格与状态以原站为准。")}
        >
          <Bot className={`${className} text-muted-foreground`} strokeWidth={1.5} />
        </ExplainBadge>
      )}
    </>
  );
}
