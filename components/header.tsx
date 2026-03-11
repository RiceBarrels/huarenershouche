"use client";

import { Car, Menu, LogOut, User, Plus, Moon, Sun, Search, FileText, Scale as ScaleIcon, BookOpen, GitCompare, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AuthDialog } from "@/components/auth-dialog";
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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
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
              <Link href="/account?tab=messages" className="relative">
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
              <AuthDialog onSuccess={() => window.location.reload()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                >
                  登录
                </Button>
              </AuthDialog>
              <AuthDialog onSuccess={() => window.location.reload()}>
                <Button size="sm" className="font-mono text-xs">
                  免费发布
                </Button>
              </AuthDialog>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">导航菜单</SheetTitle>

            {/* Brand + close */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Link href="/" className="flex items-center gap-2">
                <Car className="h-4 w-4" strokeWidth={1.5} />
                <span className="font-mono text-xs font-semibold tracking-tight">华人二手车</span>
              </Link>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <span className="font-mono text-xs">✕</span>
                </Button>
              </SheetClose>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col px-3 py-3">
              <Link href="/browse" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                买车
              </Link>
              <Link href="/post" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                卖车
              </Link>
              <Link href="/valuation" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                <ScaleIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                估价
              </Link>
              <Link href="/guide" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                资讯
              </Link>
              <Link href="/compare" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                <GitCompare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                对比
              </Link>
            </nav>

            <div className="mx-5 h-px bg-border" />

            {/* User section */}
            <div className="flex flex-col px-3 py-3">
              {user ? (
                <>
              <Link href="/account?tab=messages" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    消息
                    {unreadCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-medium text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/account" className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    我的车辆
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    退出登录
                  </button>
                  <div className="px-3 pt-2">
                    <Link href="/post">
                      <Button size="sm" className="w-full gap-1.5 font-mono text-xs">
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        发布车辆
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-3 pt-1">
                  <AuthDialog onSuccess={() => window.location.reload()}>
                    <Button variant="outline" size="sm" className="w-full font-mono text-xs">
                      登录
                    </Button>
                  </AuthDialog>
                  <AuthDialog onSuccess={() => window.location.reload()}>
                    <Button size="sm" className="w-full font-mono text-xs">
                      免费发布
                    </Button>
                  </AuthDialog>
                </div>
              )}
            </div>

            {/* Theme toggle at bottom */}
            {mounted && (
              <div className="mt-auto border-t border-border px-3 py-3">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex w-full items-center gap-3 px-3 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Moon className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  {theme === "dark" ? "浅色模式" : "深色模式"}
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
