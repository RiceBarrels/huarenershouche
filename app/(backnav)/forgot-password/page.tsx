"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, KeyRound, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "code" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined,
    });

    if (error) {
      setError(error.message);
    } else {
      setStep("code");
    }
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("请输入6位验证码");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (error) {
      setError(error.message);
    } else {
      setStep("reset");
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setError("密码至少6位");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      setStep("done");
    }
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-mono">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid [mask-image:linear-gradient(to_bottom,black,60%,transparent)]"
      />
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-border bg-background p-6"
        >
        {step === "email" && (
          <>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-mono text-lg font-semibold tracking-tight">
                忘记密码
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                输入注册邮箱，我们会发送验证码
              </p>
            </div>
            <form onSubmit={handleSendCode} className="mt-8 space-y-4">
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
                  autoFocus
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
                {loading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : null}
                {loading ? "发送中..." : "发送验证码"}
              </Button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-mono text-lg font-semibold tracking-tight">
                输入验证码
              </h1>
              <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
                已向{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                发送 6 位验证码
              </p>
            </div>
            <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  验证码
                </Label>
                <Input
                  className="mt-1 font-mono text-sm tracking-[0.3em]"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && (
                <p className="font-mono text-[11px] text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full font-mono text-xs"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : null}
                {loading ? "验证中..." : "验证"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setCode(""); }}
                className="w-full font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                重新发送
              </button>
            </form>
          </>
        )}

        {step === "reset" && (
          <>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-mono text-lg font-semibold tracking-tight">
                重置密码
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                输入你的新密码
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  新密码
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  type="password"
                  placeholder="至少6位"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  确认密码
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  type="password"
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : null}
                {loading ? "重置中..." : "重置密码"}
              </Button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-500" strokeWidth={1.5} />
            <h1 className="mt-4 font-mono text-lg font-semibold">
              密码已重置
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              你现在可以用新密码登录了
            </p>
            <Link href="/login">
              <Button className="mt-6 font-mono text-xs">
                去登录
              </Button>
            </Link>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">
            <Link
              href="/login"
              className="text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
            >
              返回登录
            </Link>
          </p>
        )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
