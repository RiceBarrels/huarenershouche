"use client";

import { useState } from "react";
import { Flag, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

const REPORT_REASONS = [
  "虚假信息 / 诈骗",
  "价格不真实",
  "图片与实车不符",
  "车辆已售但未下架",
  "重复发布",
  "不当内容",
  "其他",
];

export function ReportDialog({ carId, children }: { carId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("reports").insert({
      car_id: carId,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            <Flag className="h-4 w-4" strokeWidth={1.5} />
            举报此车辆
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-8 w-8 text-green-500" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm">感谢你的举报，我们会尽快处理</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelected(reason)}
                  className={`w-full border px-3 py-2 text-left font-mono text-xs transition-colors ${
                    selected === reason
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              placeholder="补充说明（可选）"
              className="w-full border border-border bg-transparent px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
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
              提交举报
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
