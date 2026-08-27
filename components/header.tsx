"use client";

import { LogOut, User, Plus, Palette, MessageSquare, Store, ChevronDown, Repeat, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeOptions } from "@/components/theme-options";
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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 2xl:max-w-[88rem] min-[1920px]:max-w-[104rem] min-[2560px]:max-w-[120rem]">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="常來車網" width={24} height={24} className="h-6 w-6" />
          <span className="font-logo text-base tracking-tight">
            常來車網
            <span className="animate-cursor-blink text-brand-ink">_</span>
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">beta</span>
        </Link>

        {/* md 断点(768–1024)横向空间紧张,链接与右侧按钮的间距到 lg 才放开,避免整行溢出换行 */}
        <nav className="flex items-center gap-4 lg:gap-6">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative py-1 font-mono text-xs tracking-widest transition-colors ${
                  active
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand"
                    : // 未激活项 hover 时先给一条中性色下划线做"就位"暗示,点击后换品牌色
                      "text-muted-foreground hover:text-foreground hover:after:absolute hover:after:inset-x-0 hover:after:bottom-0 hover:after:h-px hover:after:bg-border"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* 搜索入口:桌面无底部导航,给一个直达浏览页搜索的图标入口 */}
          <Link href="/browse" aria-label="搜索车辆">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="搜索车辆" tabIndex={-1}>
              <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </Link>
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="个性化"
                >
                  <Palette className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </PopoverTrigger>
              {/* sideOffset 让下拉与 header 分隔线保持呼吸感,不贴边 */}
              <PopoverContent align="end" sideOffset={8} className="w-48 p-1.5 font-mono">
                <p className="px-3 pb-1 pt-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  个性化
                </p>
                <ThemeOptions />
              </PopoverContent>
            </Popover>
          )}
          {authUser ? (
            <>
              {/* 身份切换:仅当本人认领过系统车行账号时显示 */}
              {hasClaimed && (
                <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={isActingAsClaimed ? "default" : "secondary"}
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
                  <PopoverContent align="end" sideOffset={8} className="w-64 p-1 font-mono">
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
                      {!isActingAsClaimed && <span className="text-[10px] text-brand-ink">当前</span>}
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
                          className="h-4 w-4 shrink-0 rounded-full object-cover"
                        />
                        <span className="flex-1 truncate">{acct.username}</span>
                        {actingId === acct.id ? (
                          <span className="text-[10px] text-brand-ink">当前</span>
                        ) : (
                          <Store className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
              <Link href="/messages" className="relative" aria-label="消息">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="消息"
                  tabIndex={-1}
                >
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-medium text-white">
                    {/* 三位数会撑破圆形徽标,封顶展示 */}
                    {unreadCount > 99 ? "99+" : unreadCount}
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
                aria-label="退出登录"
                title="退出登录"
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
        <div className="bg-amber-500/10">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 2xl:max-w-[88rem] min-[1920px]:max-w-[104rem] min-[2560px]:max-w-[120rem]">
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
