"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Store, User, CheckCircle } from "lucide-react";

interface ProfileSetupDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

export function ProfileSetupDialog({
  open,
  onComplete,
  userId,
}: ProfileSetupDialogProps) {
  const [step, setStep] = useState<"name" | "type" | "dealer-form" | "submitted">("name");
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState<"private" | "dealer">("private");
  const [loading, setLoading] = useState(false);

  // Dealer form fields
  const [dealerForm, setDealerForm] = useState({
    store_name: "",
    address: "",
    phone: "",
    email: "",
    wechat: "",
  });

  async function handleNameSubmit() {
    if (!username.trim()) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", userId);
    setLoading(false);
    setStep("type");
  }

  async function handleTypeSelect(type: "private" | "dealer") {
    setAccountType(type);
    if (type === "private") {
      setLoading(true);
      await supabase
        .from("profiles")
        .update({ account_type: "private" })
        .eq("id", userId);
      setLoading(false);
      onComplete();
    } else {
      setStep("dealer-form");
    }
  }

  async function handleDealerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ account_type: "dealer", phone: dealerForm.phone })
      .eq("id", userId);
    if (dealerForm.store_name && dealerForm.address) {
      await supabase.from("dealer_stores").insert({
        owner_id: userId,
        name: dealerForm.store_name,
        address: dealerForm.address,
        phone: dealerForm.phone || null,
      });
    }
    setLoading(false);
    setStep("submitted");
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[420px]" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === "name" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">
                设置你的名字
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  用户名 *
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="输入你的用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                className="w-full font-mono text-xs"
                onClick={handleNameSubmit}
                disabled={!username.trim() || loading}
              >
                {loading ? "保存中..." : "下一步"}
              </Button>
            </div>
          </>
        )}

        {step === "type" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">
                选择账户类型
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <button
                onClick={() => handleTypeSelect("private")}
                className="flex w-full items-center gap-3 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
              >
                <User className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div className="text-left">
                  <p className="font-mono text-sm font-medium">个人用户</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    个人买卖二手车
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleTypeSelect("dealer")}
                className="flex w-full items-center gap-3 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
              >
                <Store className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div className="text-left">
                  <p className="font-mono text-sm font-medium">车行</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    需要认证后使用，享受更多功能
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {step === "dealer-form" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">
                车行信息
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDealerSubmit} className="space-y-3">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  店名 *
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="车行名称"
                  value={dealerForm.store_name}
                  onChange={(e) => setDealerForm((f) => ({ ...f, store_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  地址 *
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="车行地址"
                  value={dealerForm.address}
                  onChange={(e) => setDealerForm((f) => ({ ...f, address: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  电话 *
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  type="tel"
                  placeholder="(626) 555-0123"
                  value={dealerForm.phone}
                  onChange={(e) => setDealerForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  邮箱 *
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  type="email"
                  placeholder="dealer@example.com"
                  value={dealerForm.email}
                  onChange={(e) => setDealerForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  微信号
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="WeChat ID"
                  value={dealerForm.wechat}
                  onChange={(e) => setDealerForm((f) => ({ ...f, wechat: e.target.value }))}
                />
              </div>
              <Button
                type="submit"
                className="w-full font-mono text-xs"
                disabled={loading}
              >
                {loading ? "提交中..." : "提交认证申请"}
              </Button>
            </form>
          </>
        )}

        {step === "submitted" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">
                提交成功
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <CheckCircle className="h-10 w-10 text-green-500" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-sm text-center">
                我们会在两天内联系您
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground text-center">
                认证通过后即可使用车行全部功能
              </p>
              <Button
                className="mt-4 font-mono text-xs"
                onClick={onComplete}
              >
                知道了
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
