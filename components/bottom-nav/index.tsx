"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, User, Users, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TABS = [
  { href: "/", icon: Home, label: "首页", match: (p: string) => p === "/" },
  { href: "/browse", icon: Search, label: "买车", match: (p: string) => p === "/browse" },
  { href: "/post", icon: Plus, label: "发布", match: (p: string) => p === "/post" },
  { href: "/community", icon: Users, label: "社区", match: (p: string) => p.startsWith("/community") || p.startsWith("/qa") },
  { href: "/account", icon: User, label: "我的", match: (p: string) => p === "/account" || p === "/messages" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const [user, setUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const isPost = tab.href === "/post";
          const href = tab.href;

          return (
            <Link
              key={tab.href}
              href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                isPost
                  ? ""
                  : active
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {isPost ? (
                <span className="flex h-9 w-9 items-center justify-center border border-foreground bg-foreground text-background">
                  <Plus className="h-5 w-5" strokeWidth={2} />
                </span>
              ) : (
                <tab.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              )}
              <span className={`font-mono text-[10px] ${isPost ? "mt-0.5" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for native */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
