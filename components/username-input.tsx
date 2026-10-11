"use client";

// 取名输入框:右侧骰子按钮换一个随机名,下方提示可直接修改。
// 状态由 hooks/use-random-username 提供。

import { Dices } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UsernameInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  onReroll: () => void;
  /** 外层容器的 class(放 margin 等,别放到 input 上) */
  containerClassName?: string;
}

export function UsernameInput({
  value,
  onValueChange,
  onReroll,
  className,
  containerClassName,
  ...props
}: UsernameInputProps) {
  const { t } = useI18n();
  return (
    <>
      <div className={cn("relative", containerClassName)}>
        <Input
          className={cn(className, "pr-12")}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          {...props}
        />
        <button
          type="button"
          onClick={onReroll}
          aria-label={t("换一个")}
          title={t("换一个")}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-[color,transform] hover:text-foreground active:scale-90"
        >
          <Dices className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </div>
      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
        {t("随机起的名字，可以直接改")}
      </p>
    </>
  );
}
