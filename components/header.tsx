"use client";

import { LogOut, User, Plus, Moon, Sun, MessageSquare, Store, ChevronDown, Repeat } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { avatarUrl } from "@/lib/avatar";
import { useIdentity } from "@/components/identity-provider";

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
  const {
    authUser,
    actingId,
    actingProfile,
    claimedAccounts,
    isActingAsClaimed,
    switchTo,
    switchToSelf,
  } = useIdentity();
  const [unreadCount, setUnreadCount] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
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

  // 未读数按「当前操作身份」(actingId)统计 —— 切换成车行时看车行收件箱。
  useEffect(() => {
    if (!actingId) {
      setUnreadCount(0);
      return;
    }
    supabase
      .rpc("get_unread_count_for", { target: actingId })
      .then(({ data: count }) => setUnreadCount(count || 0));
  }, [actingId]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const hasClaimed = claimedAccounts.length > 0;

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
          {authUser ? (
            <>
              {/* 身份切换:仅当本人认领过系统车行账号时显示 */}
              {hasClaimed && (
                <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={isActingAsClaimed ? "default" : "outline"}
                      size="sm"
                      className="h-8 max-w-[180px] gap-1.5 font-mono text-xs"
                    >
                      {isActingAsClaimed ? (
                        <Store className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      ) : (
                        <User className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      )}
                      <span className="truncate">
                        {isActingAsClaimed ? actingProfile?.username || "车行" : "本人账号"}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-60" strokeWidth={1.5} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-1 font-mono">
                    <p className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      切换身份
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        switchToSelf();
                        setSwitcherOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted ${
                        !isActingAsClaimed ? "bg-muted/60" : ""
                      }`}
                    >
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                      <span className="flex-1 truncate">本人账号</span>
                      {!isActingAsClaimed && <span className="text-[10px] text-brand">当前</span>}
                    </button>
                    {claimedAccounts.map((acct) => (
                      <button
                        key={acct.id}
                        type="button"
                        onClick={() => {
                          switchTo(acct.id);
                          setSwitcherOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted ${
                          actingId === acct.id ? "bg-muted/60" : ""
                        }`}
                      >
                        <img
                          src={avatarUrl(acct.avatar_url, acct.id)}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-full border border-border object-cover"
                        />
                        <span className="flex-1 truncate">{acct.username}</span>
                        {actingId === acct.id ? (
                          <span className="text-[10px] text-brand">当前</span>
                        ) : (
                          <Store className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
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

      {/* 正在以车行身份操作的提示条 */}
      {isActingAsClaimed && (
        <div className="border-t border-amber-500/30 bg-amber-500/10">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-700 dark:text-amber-400">
              <Store className="h-3 w-3" strokeWidth={1.5} />
              正在以「{actingProfile?.username || "车行"}」身份操作
            </span>
            <button
              type="button"
              onClick={switchToSelf}
              className="flex items-center gap-1 font-mono text-[11px] text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
            >
              <Repeat className="h-3 w-3" strokeWidth={1.5} />
              切回本人
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
