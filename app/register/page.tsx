"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Car } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
      });

      // Redirect to email verification with email param
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
        <div className="flex flex-col items-center">
          <Car className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="mt-4 font-mono text-lg font-semibold tracking-tight">
            注册
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            创建你的华人二手车账号
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">
              用户名 *
            </Label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="你的用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label className="font-mono text-[11px] text-muted-foreground">
              邮箱 *
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
              密码 *
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
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            ) : null}
            {loading ? "注册中..." : "注册"}
          </Button>
        </form>

        <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">
          已有账号？{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
          >
            点击登录
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
