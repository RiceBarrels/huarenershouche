"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";

interface BackNavProps {
  title?: string;
  fallback?: string;
}

export function BackNav({ title, fallback = "/" }: BackNavProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    const el = document.getElementById("backnav-content");
    if (el) {
      el.style.transition = "transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.3s ease";
      el.style.transform = "translateX(100%)";
      el.style.opacity = "0.6";
      setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
        el.style.opacity = "";
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }, 300);
    } else {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(fallback);
      }
    }
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
        <span className="font-mono text-sm font-medium truncate">
          {title}
        </span>
      )}
    </nav>
  );
}
