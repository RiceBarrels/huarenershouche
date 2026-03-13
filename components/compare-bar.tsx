"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, GitCompare, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getCompareIds, removeFromCompare, clearCompare } from "@/lib/compare";
import { supabase } from "@/lib/supabase";
import type { DbCar } from "@/lib/types";

export function CompareBar() {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [cars, setCars] = useState<Map<string, DbCar>>(new Map());

  useEffect(() => {
    setIds(getCompareIds());
    function onCompareChange() {
      setIds(getCompareIds());
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, []);

  // Fetch car data when ids change
  useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter((id) => !cars.has(id));
    if (missing.length === 0) return;
    supabase
      .from("cars")
      .select("*")
      .in("id", missing)
      .then(({ data }) => {
        if (data) {
          setCars((prev) => {
            const next = new Map(prev);
            for (const car of data as DbCar[]) {
              next.set(car.id, car);
            }
            return next;
          });
        }
      });
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <GitCompare className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {ids.map((id) => {
              const car = cars.get(id);
              return (
                <div
                  key={id}
                  className="flex shrink-0 items-center gap-2 border border-border px-2 py-1"
                >
                  {car?.image_url && (
                    <img
                      src={car.image_url}
                      alt=""
                      className="h-8 w-12 object-cover"
                    />
                  )}
                  <span className="max-w-[120px] truncate font-mono text-[11px]">
                    {car?.title_zh || "加载中..."}
                  </span>
                  <button
                    onClick={() => removeFromCompare(id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
            {ids.length < 3 && (
              <span className="font-mono text-[10px] text-muted-foreground">
                还可添加 {3 - ids.length} 辆
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 font-mono text-[11px]"
              onClick={() => clearCompare()}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              清空
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1 font-mono text-[11px]"
              disabled={ids.length < 2}
              onClick={() => router.push("/compare")}
            >
              <GitCompare className="h-3 w-3" strokeWidth={1.5} />
              对比 ({ids.length})
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
