"use client";

// 桌面端返回条：移动端已有 BackNav（md:hidden），这里只在 md+ 显示
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { setBackNavigation } from "@/components/page-transition";

export function DesktopBack({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        setBackNavigation();
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className="group mb-4 hidden items-center gap-1.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
    >
      {/* hover 时箭头向左微移:符合"微位移"交互规范,暗示返回方向 */}
      <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" strokeWidth={1.5} />
      返回
    </button>
  );
}
