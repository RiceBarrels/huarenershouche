"use client";

import { Car, Menu, LogOut, User, Plus, Moon, Sun, Scale } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AuthDialog } from "@/components/auth-dialog";
import type { User as SupaUser } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
            href="/"
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
              <Link href="/my-cars">
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
          <SheetContent side="right" className="w-64">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            <nav className="mt-8 flex flex-col gap-4">
              <Link href="/" className="font-mono text-sm">
                买车
              </Link>
              <Link href="/post" className="font-mono text-sm">
                卖车
              </Link>
              <Link href="/valuation" className="font-mono text-sm">
                估价
              </Link>
              <Link href="/guide" className="font-mono text-sm">
                资讯
              </Link>
              <Link href="/compare" className="font-mono text-sm">
                对比
              </Link>
              <div className="my-2 h-px bg-border" />
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-2 font-mono text-sm text-muted-foreground"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Moon className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  {theme === "dark" ? "浅色模式" : "深色模式"}
                </button>
              )}
              {user ? (
                <>
                  <Link href="/my-cars" className="font-mono text-sm">
                    我的车辆
                  </Link>
                  <Link href="/post">
                    <Button size="sm" className="w-full font-mono text-sm">
                      发布车辆
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start font-mono text-sm text-muted-foreground"
                    onClick={handleLogout}
                  >
                    退出登录
                  </Button>
                </>
              ) : (
                <>
                  <AuthDialog onSuccess={() => window.location.reload()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start font-mono text-sm"
                    >
                      登录
                    </Button>
                  </AuthDialog>
                  <AuthDialog onSuccess={() => window.location.reload()}>
                    <Button size="sm" className="font-mono text-sm">
                      免费发布
                    </Button>
                  </AuthDialog>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
