"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const OPTIONS = [
  { value: "light", label: "浅色模式", icon: Sun },
  { value: "dark", label: "深色模式", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const;

/** 个性化面板的主题三选一(浅色/深色/跟随系统),Popover 和 Drawer 共用 */
export function ThemeOptions({ onSelect }: { onSelect?: () => void }) {
  const { theme, setTheme } = useTheme();
  const active = theme ?? "system";

  return (
    <div className="space-y-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = active === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setTheme(opt.value);
              onSelect?.();
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted active:bg-muted ${
              selected ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {opt.label}
            {selected && (
              <Check className="ml-auto h-4 w-4 text-primary" strokeWidth={2} />
            )}
          </button>
        );
      })}
    </div>
  );
}
