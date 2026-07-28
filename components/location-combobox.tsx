"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, LocateFixed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { detectUserCity, searchCities, type GeoResult } from "@/lib/geocode";

interface LocationComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationCombobox({
  value,
  onValueChange,
  placeholder = "选择地区",
  className,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const isZip = /^\d+$/.test(query);
    const minLen = isZip ? 5 : 2;

    if (!query || query.length < minLen) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchCities(query);
      setResults(res);
      setLoading(false);
    }, isZip ? 100 : 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  async function handleDetectLocation() {
    setDetecting(true);
    const result = await detectUserCity();
    if (result) {
      onValueChange(result.formatted);
      setOpen(false);
    }
    setDetecting(false);
  }

  function selectCity(formatted: string) {
    onValueChange(formatted);
    setOpen(false);
  }

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
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <div className="flex flex-col">
          {/* Search input */}
          <div className="border-b border-border px-3 py-2">
            <input
              ref={inputRef}
              className="w-full bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="城市名或邮编 (如 90001)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Detect location button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting}
            className="flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {detecting ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                strokeWidth={1.5}
              />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {detecting ? "定位中..." : "使用当前位置"}
          </button>

          {/* Results */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  strokeWidth={1.5}
                />
              </div>
            ) : results.length > 0 ? (
              results.map((r) => (
                <button
                  key={r.formatted}
                  type="button"
                  onClick={() => selectCity(r.formatted)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-mono text-xs transition-colors hover:bg-accent"
                >
                  <span>{r.formatted}</span>
                  {value === r.formatted && (
                    <Check className="h-3 w-3" />
                  )}
                </button>
              ))
            ) : query.length >= 2 ? (
              <p className="py-4 text-center font-mono text-xs text-muted-foreground">
                未找到结果
              </p>
            ) : (
              <p className="py-4 text-center font-mono text-xs text-muted-foreground">
                输入城市名或 5 位邮编
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
