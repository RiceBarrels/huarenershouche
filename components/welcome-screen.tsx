"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Car, ChevronRight, Loader2, MapPin, Shield, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

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

const SLIDES = [
  {
    icon: Car,
    title: "华人二手车",
    subtitle: "北美华人最信赖的二手车交易平台",
    description: "免费发布 · 中文沟通 · 覆盖全美",
  },
  {
    icon: MapPin,
    title: "身边的车源",
    subtitle: "智能定位附近车辆",
    description: "支持全美50州，精准到城市和社区",
  },
  {
    icon: Shield,
    title: "可靠透明",
    subtitle: "VIN认证 · 价格参考 · 真实评价",
    description: "让每一笔交易都放心",
  },
];

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const isLastSlide = step === SLIDES.length - 1;
  const showAuth = step >= SLIDES.length;

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");
    const { isNative, signInWithGoogleNative } = await import("@/lib/capacitor");
    if (isNative()) {
      const result = await signInWithGoogleNative();
      if (result.error) {
        setError(result.error);
      }
      setGoogleLoading(false);
      // Deep link listener handles the rest
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `https://cars.ricebarrel.com/` },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
      localStorage.setItem("huaren_welcome_seen", "1");
    }
  }

  function handleSkip() {
    localStorage.setItem("huaren_welcome_seen", "1");
    onComplete();
  }

  function handleEmailLogin() {
    localStorage.setItem("huaren_welcome_seen", "1");
    onComplete();
    router.push("/login");
  }

  function handleNext() {
    if (isLastSlide) {
      setStep(SLIDES.length); // show auth
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Safe area top spacer */}
      <div className="h-[env(safe-area-inset-top,0px)]" />

      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!showAuth ? (
            <motion.div
              key={`slide-${step}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-1 flex-col items-center justify-center px-8"
            >
              {(() => {
                const slide = SLIDES[step];
                const Icon = slide.icon;
                return (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center border border-border bg-muted/50">
                      <Icon className="h-9 w-9 text-foreground" strokeWidth={1.2} />
                    </div>
                    <h1 className="mt-8 text-center font-mono text-2xl font-semibold tracking-tight">
                      {slide.title}
                    </h1>
                    <p className="mt-3 text-center font-mono text-sm text-muted-foreground">
                      {slide.subtitle}
                    </p>
                    <p className="mt-1.5 text-center font-mono text-xs text-muted-foreground/70">
                      {slide.description}
                    </p>
                  </>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-1 flex-col items-center justify-center px-8"
            >
              <div className="flex h-16 w-16 items-center justify-center border border-border bg-muted/50">
                <Zap className="h-7 w-7 text-foreground" strokeWidth={1.2} />
              </div>
              <h1 className="mt-6 text-center font-mono text-xl font-semibold tracking-tight">
                开始使用
              </h1>
              <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
                登录后可发布车辆、收藏、私信卖家
              </p>

              <div className="mt-8 w-full max-w-xs space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2.5 py-5 font-mono text-sm"
                  disabled={googleLoading}
                  onClick={handleGoogleLogin}
                >
                  {googleLoading ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <GoogleIcon className="h-4.5 w-4.5" />
                  )}
                  使用 Google 登录
                </Button>

                <Button
                  type="button"
                  className="w-full py-5 font-mono text-sm"
                  onClick={handleEmailLogin}
                >
                  使用邮箱登录
                </Button>

                {error && (
                  <p className="text-center font-mono text-[11px] text-destructive">{error}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom section */}
        <div className="px-8 pb-8">
          {!showAuth ? (
            <>
              {/* Dots */}
              <div className="flex items-center justify-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`h-1.5 transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-foreground"
                        : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={handleSkip}
                >
                  跳过
                </button>
                <Button
                  size="sm"
                  className="gap-1 font-mono text-xs"
                  onClick={handleNext}
                >
                  {isLastSlide ? "开始" : "下一步"}
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="w-full py-2 text-center font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={handleSkip}
            >
              先逛逛，稍后再说
            </button>
          )}
        </div>

        {/* Safe area bottom spacer */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
