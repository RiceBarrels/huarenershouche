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
  DialogTrigger,
} from "@/components/ui/dialog";

export function AuthDialog({
  children,
  onSuccess,
}: {
  children: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        setOpen(false);
        onSuccess?.();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Create profile
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: fullName,
        });
        setOpen(false);
        onSuccess?.();
      }
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">
            {mode === "login" ? "登录" : "注册"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                姓名
              </Label>
              <Input
                className="mt-1 font-mono text-sm"
                placeholder="你的姓名"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">
              邮箱
            </Label>
            <Input
              className="mt-1 font-mono text-sm"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">
              密码
            </Label>
            <Input
              className="mt-1 font-mono text-sm"
              type="password"
              placeholder="至少6位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && (
            <p className="font-mono text-[11px] text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full font-mono text-xs"
            disabled={loading}
          >
            {loading
              ? "处理中..."
              : mode === "login"
                ? "登录"
                : "注册"}
          </Button>
          <button
            type="button"
            className="w-full font-mono text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "没有账号？点击注册"
              : "已有账号？点击登录"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
