"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  // 一步一个输入:先邮箱,再密码
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    // On native (Capacitor), use in-app browser flow
    // Flow: Browser.open → Google → /auth/callback → com.clcauto.app:// deep link → appUrlOpen
    const { isNative, signInWithGoogleNative } = await import("@/lib/capacitor");
    if (isNative()) {
      const result = await signInWithGoogleNative();
      if (result.error) {
        setError(result.error);
      }
      setGoogleLoading(false);
      // Deep link listener in CapacitorProvider handles the redirect
      return;
    }

    // Web: standard OAuth redirect
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `https://www.clcauto.com/`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleAppleLogin() {
    setAppleLoading(true);
    setError("");

    const { isNative, signInWithAppleNative } = await import("@/lib/capacitor");
    if (isNative()) {
      const result = await signInWithAppleNative();
      if (result.error) {
        setError(result.error);
      }
      setAppleLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `https://www.clcauto.com/`,
      },
    });
    if (error) {
      setError(error.message);
      setAppleLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
        <div className="flex flex-col items-center">
          <Image src="/logo.png" alt="常來車網" width={48} height={48} className="h-12 w-12 object-contain" />
          <h1 className="mt-4 font-logo text-2xl font-bold tracking-tight">
            登录
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            登录你的常來車網账号
          </p>
        </div>

        <div className="mt-8 overflow-x-clip">
          <AnimatePresence mode="popLayout" initial={false}>
            {step === "email" ? (
              <motion.div key="email" {...slide}>
                {/* Social login */}
                <div className="space-y-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className={`${bigBtn} gap-2`}
                    disabled={googleLoading}
                    onClick={handleGoogleLogin}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    使用 Google 登录
                  </Button>
                  <Button
                    type="button"
                    className={`${bigBtn} gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90`}
                    disabled={appleLoading}
                    onClick={handleAppleLogin}
                  >
                    {appleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                    )}
                    使用 Apple 登录
                  </Button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 font-mono text-[11px] text-muted-foreground/60">
                      或使用邮箱登录
                    </span>
                  </div>
                </div>

                {/* 第一步:只填邮箱 */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setError("");
                    setStep("password");
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">
                      邮箱
                    </Label>
                    <Input
                      className={bigInput}
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">{error}</p>
                  )}
                  <Button type="submit" className={bigBtn}>
                    下一步
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="password" {...slide}>
                {/* 已填邮箱:点击返回修改 */}
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="mx-auto flex max-w-full items-center gap-2 rounded-full bg-muted px-4 py-2 transition-colors hover:bg-muted/70"
                >
                  <span className="truncate font-mono text-xs text-foreground">{email}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">修改</span>
                </button>

                {/* 第二步:只填密码 */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-xs text-muted-foreground">
                        密码
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        忘记密码？
                      </Link>
                    </div>
                    <Input
                      className={bigInput}
                      type="password"
                      placeholder="输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                    {loading ? "登录中..." : "登录"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
          没有账号？{" "}
          <Link
            href="/register"
            className="text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
          >
            点击注册
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
