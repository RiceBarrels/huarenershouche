"use client";

import { useCallback, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { match } from "pinyin-pro";
import { cn } from "@/lib/utils";
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

  const selected = options.find((o) => o.value === value);

  const pinyinFilter = useCallback((value: string, search: string) => {
    // Default text match
    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
    // Pinyin match (full pinyin, initials, mixed)
    if (match(value, search) !== null) return 1;
    return 0;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
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
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={pinyinFilter}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="font-mono text-xs"
          />
          <CommandList>
            <CommandEmpty className="py-3 text-center font-mono text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                  className="font-mono text-xs"
                >
                  <span className="flex flex-1 items-center gap-2">
                    {option.icon}
                    {option.label}
                  </span>
                  <Check
                    className={cn(
                      "h-3 w-3",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
