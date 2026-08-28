"use client";

import { useState } from "react";
import Link from "@/components/localized-navigation";
import { Loader2, KeyRound, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { EASE } from "@/lib/motion";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 分步出现的滑入/滑出过渡
const slide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
  transition: { duration: 0.22, ease: EASE },
} as const;

// 大号输入框(text-base=16px,避免 iOS 聚焦自动放大)与大号按钮
const bigInput = "mt-1.5 h-12 font-mono text-base";
const bigBtn = "h-12 w-full font-mono text-base";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  // 一步一个输入:邮箱 → 验证码 → 新密码 → 确认密码
  const [step, setStep] = useState<"email" | "code" | "reset" | "confirm" | "done">("email");
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
      setError(t("请输入6位验证码"));
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

  function handleNewPasswordNext(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError(t("密码至少6位"));
      return;
    }
    setError("");
    setConfirmPassword("");
    setStep("confirm");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("两次输入的密码不一致"));
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
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="overflow-x-clip rounded-xl bg-background p-6"
        >
        <AnimatePresence mode="popLayout" initial={false}>
        {step === "email" && (
          <motion.div key="email" {...slide}>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
                {t("忘记密码")}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {t("输入注册邮箱，我们会发送验证码")}
              </p>
            </div>
            <form onSubmit={handleSendCode} className="mt-8 space-y-4">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">
                  {t("邮箱")}
                </Label>
                <Input
                  className={bigInput}
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">{error}</p>
              )}
              <Button type="submit" className={bigBtn} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
                {loading ? t("发送中...") : t("发送验证码")}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "code" && (
          <motion.div key="code" {...slide}>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
                {t("输入验证码")}
              </h1>
              <p className="mt-2 text-center font-mono text-sm text-muted-foreground">
                {t("已向")}{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                {t("发送 6 位验证码")}
              </p>
            </div>
            <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">
                  {t("验证码")}
                </Label>
                <Input
                  className={`${bigInput} text-center text-lg tracking-[0.5em]`}
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">{error}</p>
              )}
              <Button type="submit" className={bigBtn} disabled={loading || code.length !== 6}>
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
                {loading ? t("验证中...") : t("验证")}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setCode(""); }}
                className="w-full py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("重新发送")}
              </button>
            </form>
          </motion.div>
        )}

        {step === "reset" && (
          <motion.div key="reset" {...slide}>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
                {t("重置密码")}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {t("输入你的新密码")}
              </p>
            </div>
            <form onSubmit={handleNewPasswordNext} className="mt-8 space-y-4">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">
                  {t("新密码")}
                </Label>
                <Input
                  className={bigInput}
                  type="password"
                  placeholder={t("至少6位")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">{error}</p>
              )}
              <Button type="submit" className={bigBtn}>
                {t("下一步")}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div key="confirm" {...slide}>
            <div className="flex flex-col items-center">
              <KeyRound className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
                {t("确认新密码")}
              </h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {t("再输入一次刚才的新密码")}
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">
                  {t("确认密码")}
                </Label>
                <Input
                  className={bigInput}
                  type="password"
                  placeholder={t("再次输入新密码")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">{error}</p>
              )}
              <Button type="submit" className={bigBtn} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
                {loading ? t("重置中...") : t("重置密码")}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("reset"); setError(""); setConfirmPassword(""); }}
                className="w-full py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("上一步")}
              </button>
            </form>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" {...slide} className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-500" strokeWidth={1.5} />
            <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
              {t("密码已重置")}
            </h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              {t("你现在可以用新密码登录了")}
            </p>
            <Link href="/login" className="mt-6 w-full">
              <Button className={bigBtn}>
                {t("去登录")}
              </Button>
            </Link>
          </motion.div>
        )}
        </AnimatePresence>

        {step !== "done" && (
          <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
            <Link
              href="/login"
              className="text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
            >
              {t("返回登录")}
            </Link>
          </p>
        )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
