"use client";

import { LogOut, User, Plus, Palette, MessageSquare, Store, ChevronDown, Repeat, Search, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeOptions } from "@/components/theme-options";
import { avatarUrl } from "@/lib/avatar";
import { useIdentity } from "@/components/identity-provider";
import { useShowNavBack } from "@/components/nav-back-context";
import { setBackNavigation } from "@/components/page-transition";

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
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  // (backnav) 布局组内:导航链接行最左侧显示统一的返回按钮
  const showNavBack = useShowNavBack();

  // 社区(帖子)路由下,导航搜索框切换为搜索帖子;其余场景一律搜车源进 /browse
  const inCommunity = pathname === "/community" || pathname.startsWith("/community/");

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

  // 路由切换时,把当前页 URL 里的 ?q= 回填进搜索框(/browse?q=、/community?q= 深链进来时同步)。
  // 不用 useSearchParams:Header 被大量静态页复用,避免每页都要包 Suspense 边界。
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读当前 URL 回填,仅路由切换时一次
    setQuery(q);
  }, [pathname]);

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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (inCommunity) {
      // 社区页以 ?q= 为搜索开关的唯一事实来源,空串也会打开搜索层
      router.push(`/community?q=${encodeURIComponent(q)}`);
    } else {
      router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    }
  }

  const hasClaimed = claimedAccounts.length > 0;

  return (
    <header
      className={`sticky top-0 z-50 hidden border-b transition-[background-color,border-color,backdrop-filter] duration-200 md:block ${
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 2xl:max-w-[88rem] min-[1920px]:max-w-[104rem] min-[2560px]:max-w-[120rem]">
        {/* 第一行:logo + 搜索框 + 操作区(瓜子式) */}
        <div className="flex h-14 items-center gap-4 lg:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/logo.png" alt="常來車網" width={24} height={24} className="h-6 w-6" />
            <span className="font-logo text-base tracking-tight">
              常來車網
              <span className="animate-cursor-blink text-brand-ink">_</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">beta</span>
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            /* 社区首页宽屏(xl+)自带右栏搜索框,导航这只藏掉避免双搜索框 */
            className={`min-w-0 max-w-xl flex-1 ${pathname === "/community" ? "xl:hidden" : ""}`}
          >
            <div className="flex items-center overflow-hidden rounded-full border border-border bg-muted/60 transition-colors focus-within:border-brand-ink/40 focus-within:bg-background">
              <Search className="ml-3.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={inCommunity ? "搜索帖子、话题..." : "搜索品牌、车型、关键词..."}
                aria-label={inCommunity ? "搜索帖子" : "搜索车辆"}
                className="h-9 w-full min-w-0 bg-transparent px-2.5 font-mono text-xs outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                className="mr-1 flex h-7 shrink-0 items-center rounded-full bg-primary px-3.5 font-mono text-xs text-primary-foreground transition-opacity hover:opacity-90"
              >
                搜索
              </button>
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
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

        {/* 第二行:导航链接(backnav 组最左侧带统一返回按钮) */}
        <nav className="flex h-11 items-center gap-4 lg:gap-6">
          {showNavBack && (
            <>
              <button
                type="button"
                onClick={() => {
                  setBackNavigation();
                  if (window.history.length > 1) router.back();
                  else router.push("/");
                }}
                className="group -ml-1 flex items-center gap-1.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {/* hover 时箭头向左微移:符合"微位移"交互规范,暗示返回方向 */}
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" strokeWidth={1.5} />
                返回
              </button>
              <span aria-hidden="true" className="h-4 w-px bg-border" />
            </>
          )}
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
          <Link
            href="/business"
            className="ml-auto py-1 font-mono text-xs tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            车行入驻
          </Link>
        </nav>
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
