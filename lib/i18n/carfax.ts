// Carfax 摘要按界面语言显示(纯函数,server / client 通用)。库里存的是 lib/carfax.ts formatCarfaxSummary
// 与转载源生成的中文短语(「1 任车主 · 无事故 · 12 条维保记录」),存储格式不变,只在显示时逐段映射到词典;
// 认不出的段(如抓不到数字时存的英文报告标题)原样保留。

import type { TFn } from "@/lib/i18n/content/types";

const OWNERS_RE = /^(\d+)\s*任车主$/;
const ACCIDENTS_RE = /^(\d+)\s*次事故$/;
const SERVICE_RE = /^(\d+)\s*条维保记录$/;

export function localizeCarfaxSummary(summary: string | null | undefined, t: TFn): string | null {
  const parts = (summary ?? "")
    .split(" · ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts
    .map((part) => {
      if (part === "无事故") return t("无事故");
      const owners = OWNERS_RE.exec(part);
      if (owners) return t("{n} 任车主", { n: Number(owners[1]) });
      const accidents = ACCIDENTS_RE.exec(part);
      if (accidents) return t("{n} 次事故", { n: Number(accidents[1]) });
      const service = SERVICE_RE.exec(part);
      if (service) return t("{n} 条维保记录", { n: Number(service[1]) });
      return part;
    })
    .join(" · ");
}
