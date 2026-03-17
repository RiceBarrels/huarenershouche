"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface MobileNavBarProps {
  title: string;
  /** Optional right-side action slot */
  children?: React.ReactNode;
}

export function MobileNavBar({ title, children }: MobileNavBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <span className="font-mono text-sm font-semibold tracking-tight h-10 flex items-center">
        {title}
      </span>
      <div className="flex items-center gap-1">
        {children}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center text-muted-foreground"
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
