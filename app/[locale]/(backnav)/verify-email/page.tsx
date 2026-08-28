"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { Header } from "@/components/header";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ProfileSetupDialog } from "@/components/profile-setup-dialog";

const CODE_LENGTH = 6;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col bg-background font-mono">

        <Header />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </main>
        <Footer />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [userId, setUserId] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === CODE_LENGTH - 1 && newCode.every((c) => c)) {
      handleVerify(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (newCode.every((c) => c)) {
      handleVerify(newCode.join(""));
    }
  }

  async function handleVerify(otp?: string) {
    const token = otp || code.join("");
    if (token.length !== CODE_LENGTH) {
      setError(t("请输入完整的验证码"));
      return;
    }
    if (!email) {
      setError(t("缺少邮箱地址，请从注册页面重新开始"));
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      if (data.user) {
        setUserId(data.user.id);
        setShowProfileSetup(true);
      } else {
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
      }
    }
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;
    setError("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResendCooldown(60);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">

        <Header />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-12">
          <CheckCircle className="h-12 w-12 text-green-500" strokeWidth={1.5} />
          <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">{t("验证成功")}</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {showProfileSetup ? t("请完成账户设置") : t("正在跳转...")}
          </p>
        </main>
        <Footer />

        {showProfileSetup && userId && (
          <ProfileSetupDialog
            open={showProfileSetup}
            userId={userId}
            onComplete={() => {
              setShowProfileSetup(false);
              router.push("/");
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <div className="flex flex-col items-center">
          <Mail className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
            {t("验证邮箱")}
          </h1>
          <p className="mt-2 text-center font-mono text-sm text-muted-foreground">
            {t("我们已向")}{" "}
            <span className="font-medium text-foreground">{email}</span>{" "}
            {t("发送了一个 {n} 位验证码", { n: CODE_LENGTH })}
          </p>
        </div>

        {/* Code input */}
        <div className="mt-8 flex justify-center gap-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="h-12 w-10 rounded-xl bg-muted text-center font-mono text-lg font-semibold outline-none ring-2 ring-transparent transition-all focus:bg-background focus:ring-brand-ink/50"
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-center font-mono text-xs text-destructive">
            {error}
          </p>
        )}

        <Button
          className="mt-6 h-12 w-full font-mono text-base"
          onClick={() => handleVerify()}
          disabled={loading || code.some((c) => !c)}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          ) : null}
          {loading ? t("验证中...") : t("验证")}
        </Button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {resendCooldown > 0
              ? t("{n}s 后可重新发送", { n: resendCooldown })
              : t("没有收到验证码？重新发送")}
          </button>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">
          <Link
            href="/login"
            className="text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
          >
            {t("返回登录")}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
