"use client";

import { LogOut, User, Plus, Moon, Sun, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { User as SupaUser } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/browse", label: "买车" },
  { href: "/guide", label: "资讯" },
  { href: "/compare", label: "对比" },
  { href: "/vin", label: "VIN认证" },
  { href: "/community", label: "社区" },
  { href: "/qa", label: "问答" },
  { href: "/services", label: "服务" },
];

export function Header() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
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
    <header
      className={`sticky top-0 z-50 hidden border-b transition-[background-color,border-color,backdrop-filter] duration-200 md:block ${
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-background"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="常来车网" width={24} height={24} className="h-6 w-6" />
          <span className="font-mono text-sm font-semibold tracking-tight">
            常来车网
            <span className="animate-cursor-blink text-brand">_</span>
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">beta</span>
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 font-mono text-xs tracking-widest transition-colors hover:text-foreground ${
                  active
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
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

      </div>
    </header>
  );
}
