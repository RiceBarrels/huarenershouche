"use client";

// 举报(车辆/帖子/评论/用户):用 Drawer 呈现(Dialog z-50 会被移动端详情浮层 z-60 盖住)
// reports 表见 supabase/content-reports.sql;车辆举报同时写 car_id 兼容 admin 页 join

import { useState } from "react";
import { Flag, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";

export type ReportTargetType = "car" | "post" | "post_comment" | "car_comment" | "user";

const CAR_REASONS = [
  "虚假信息 / 诈骗",
  "价格不真实",
  "图片与实车不符",
  "车辆已售但未下架",
  "重复发布",
  "不当内容",
  "其他",
];

// 帖子/评论/用户共用的 UGC 举报原因
const UGC_REASONS = [
  "垃圾广告",
  "辱骂或骚扰",
  "色情或不当内容",
  "虚假信息 / 诈骗",
  "侵犯隐私",
  "其他",
];

const TITLES: Record<ReportTargetType, string> = {
  car: "举报此车辆",
  post: "举报此帖子",
  post_comment: "举报此评论",
  car_comment: "举报此评论",
  user: "举报此用户",
};

export function ReportDialog({
  targetType = "car",
  targetId,
  children,
}: {
  targetType?: ReportTargetType;
  targetId: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reasons = targetType === "car" ? CAR_REASONS : UGC_REASONS;

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("reports").insert({
      car_id: targetType === "car" ? targetId : null,
      target_type: targetType,
      target_id: targetId,
      user_id: user?.id || null,
      reason: selected,
      detail: detail || null,
    });

    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      setSelected("");
      setDetail("");
    }, 1500);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <DrawerClose asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </DrawerClose>
          <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
            <Flag className="h-4 w-4" strokeWidth={1.5} />
            {t(TITLES[targetType])}
          </span>
          <div className="h-8 w-8" />
        </div>

        <div className="mx-auto w-full max-w-sm overflow-y-auto px-4 pb-8">
          {done ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="h-8 w-8 text-green-500" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-sm">{t("感谢你的举报，我们会尽快处理")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {reasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelected(reason)}
                    className={`w-full rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors ${
                      selected === reason
                        ? "bg-foreground text-background"
                        : "bg-card hover:bg-muted/50"
                    }`}
                  >
                    {t(reason)}
                  </button>
                ))}
              </div>

              <textarea
                placeholder={t("补充说明（可选）")}
                className="w-full rounded-xl bg-muted px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />

              <Button
                className="w-full gap-1.5 font-mono text-xs"
                disabled={!selected || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Flag className="h-3 w-3" strokeWidth={1.5} />
                )}
                {t("提交举报")}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
