"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { setBackNavigation, animatedBack } from "@/components/page-transition";

interface BackNavProps {
  title?: string;
  fallback?: string;
}

export function BackNav({ title, fallback = "/" }: BackNavProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (window.history.length <= 1) {
      router.push(fallback);
      return;
    }
    // 与边缘手势同款的「当前页滑出」动画(内部自行 router.back);无人接管再退回普通返回
    if (animatedBack()) return;
    setBackNavigation();
    router.back();
  }, [router, fallback]);

  return (
    <nav
      className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 md:hidden"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <button
        onClick={handleBack}
        className="flex h-10 w-8 items-center justify-center text-foreground -ml-1"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {title && (
        <span className="font-logo text-base truncate">
          {title}
        </span>
      )}
    </nav>
  );
}
