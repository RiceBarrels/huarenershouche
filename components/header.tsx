"use client";

import { Car, LogOut, User, Plus, Moon, Sun, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { User as SupaUser } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase.rpc("get_unread_count").then(({ data: count }) => setUnreadCount(count || 0));
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.rpc("get_unread_count").then(({ data: count }) => setUnreadCount(count || 0));
      } else {
        setUnreadCount(0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 md:h-14">
        <Link href="/" className="flex items-center gap-2">
          <Car className="h-5 w-5" strokeWidth={1.5} />
          <span className="font-mono text-sm font-semibold tracking-tight">
            华人二手车
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/browse"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            买车
          </Link>
          <Link
            href="/post"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            卖车
          </Link>
          <Link
            href="/valuation"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            估价
          </Link>
          <Link
            href="/guide"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            资讯
          </Link>
          <Link
            href="/compare"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            对比
          </Link>
          <Link
            href="/vin"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            VIN认证
          </Link>
          <Link
            href="/services"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            服务
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="切换主题"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </Button>
          )}
          {user ? (
            <>
              <Link href="/messages" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/account">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 font-mono text-xs"
                >
                  <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                  我的
                </Button>
              </Link>
              <Link href="/post">
                <Button size="sm" className="gap-1.5 font-mono text-xs">
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  发布车辆
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                >
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-mono text-xs">
                  免费发布
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme toggle only (tab bar handles navigation) */}
        <div className="flex items-center gap-2 md:hidden">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="切换主题"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.5} />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
