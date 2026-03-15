"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { ProfileSetupDialog } from "@/components/profile-setup-dialog";

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
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [newUserId, setNewUserId] = useState("");

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    // On native (Capacitor), use in-app browser flow
    const { isNative, signInWithGoogleNative } = await import("@/lib/capacitor");
    if (isNative()) {
      const result = await signInWithGoogleNative(() => {
        setOpen(false);
        onSuccess?.();
      });
      if (result.error) {
        setError(result.error);
      }
      setGoogleLoading(false);
      return;
    }

    // Web: standard OAuth redirect
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

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
          data: { username },
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Create profile
        await supabase.from("profiles").insert({
          id: data.user.id,
          username: username,
        });
        setOpen(false);
        setNewUserId(data.user.id);
        setShowProfileSetup(true);
      }
    }
    setLoading(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {mode === "login" ? "登录" : "注册"}
            </DialogTitle>
          </DialogHeader>

          {/* Google login */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 font-mono text-xs"
            disabled={googleLoading}
            onClick={handleGoogleLogin}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            使用 Google {mode === "login" ? "登录" : "注册"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-popover px-3 font-mono text-[10px] text-muted-foreground">
                或使用邮箱
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  用户名
                </Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="你的用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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

      {showProfileSetup && newUserId && (
        <ProfileSetupDialog
          open={showProfileSetup}
          userId={newUserId}
          onComplete={() => {
            setShowProfileSetup(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
