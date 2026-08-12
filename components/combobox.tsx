"use client";

import { useCallback, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { match } from "pinyin-pro";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "请选择...",
  searchPlaceholder = "搜索...",
  emptyText = "未找到结果",
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selected = options.find((o) => o.value === value);

  const pinyinFilter = useCallback((value: string, search: string) => {
    // Default text match
    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
    // Pinyin match (full pinyin, initials, mixed)
    if (match(value, search) !== null) return 1;
    return 0;
  }, []);

  const trigger = (
    <Button
      variant="secondary"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "h-9 w-full justify-between font-mono text-xs font-normal",
        !value && "text-muted-foreground",
        className
      )}
    >
      {selected ? (
        <span className="flex items-center gap-2 truncate">
          {selected.icon}
          {selected.label}
        </span>
      ) : (
        placeholder
      )}
      <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
    </Button>
  );

  // 选项列表(移动端触摸目标更大)
  const list = (mobile: boolean) => (
    <Command filter={pinyinFilter} className={mobile ? "bg-transparent" : undefined}>
      <CommandInput
        placeholder={searchPlaceholder}
        className={mobile ? "text-[15px]" : "font-mono text-xs"}
      />
      <CommandList className={mobile ? "max-h-[45vh]" : undefined}>
        <CommandEmpty
          className={cn(
            "py-3 text-center text-muted-foreground",
            mobile ? "text-sm" : "font-mono text-xs"
          )}
        >
          {emptyText}
        </CommandEmpty>
        <CommandGroup className={mobile ? "px-2" : undefined}>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => {
                onValueChange(option.value === value ? "" : option.value);
                setOpen(false);
              }}
              className={mobile ? "py-3 text-[15px]" : "font-mono text-xs"}
            >
              <span className="flex flex-1 items-center gap-2">
                {option.icon}
                {option.label}
              </span>
              <Check
                className={cn(
                  mobile ? "h-4 w-4" : "h-3 w-3",
                  value === option.value ? "opacity-100" : "opacity-0"
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // 移动端:底部 drawer 呈现,触摸友好;桌面端保留贴着触发器的 popover
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="pb-1 pt-3">
            <DrawerTitle>{placeholder.replace(/\s*\*$/, "")}</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden px-2 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)]">
            {list(true)}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {list(false)}
      </PopoverContent>
    </Popover>
  );
}
