"use client";

// 移动端详情浮层顶栏的快捷操作:收藏 / 加入对比 / 分享。
// 浮层不改地址栏,分享链接用车辆的规范地址而非当前 URL。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, GitCompare, Check, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addToCompare, removeFromCompare, isInCompare } from "@/lib/compare";
import { SITE_URL } from "@/lib/seo-pages";
import type { DbCar } from "@/lib/types";

const BTN =
  "flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:text-muted-foreground";

export function CarSheetActions({ car }: { car: DbCar }) {
  const router = useRouter();
  const [inCompare, setInCompare] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [authId, setAuthId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInCompare(isInCompare(car.id));
    function onCompareChange() {
      setInCompare(isInCompare(car.id));
    }
    window.addEventListener("compare-change", onCompareChange);
    return () => window.removeEventListener("compare-change", onCompareChange);
  }, [car.id]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setAuthId(uid);
      if (!uid) return;
      const { data: fav } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", uid)
        .eq("car_id", car.id)
        .maybeSingle();
      if (!cancelled) setIsFavorited(!!fav);
    });
    return () => {
      cancelled = true;
    };
  }, [car.id]);

  async function toggleFavorite() {
    if (!authId) {
      router.push("/login");
      return;
    }
    if (isFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", authId)
        .eq("car_id", car.id);
      if (!error) setIsFavorited(false);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: authId, car_id: car.id });
      if (!error) setIsFavorited(true);
    }
  }

  async function share() {
    // 规范公网地址:App 内 origin 是 capacitor://localhost,浮层内 href 是列表页,都不能用
    const url = `${SITE_URL}/car/${car.id}`;
    const { nativeShare } = await import("@/lib/capacitor");
    const shared = await nativeShare({
      title: car.title_zh,
      text: car.title_zh,
      url,
    });
    if (!shared) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={isFavorited ? "取消收藏" : "收藏"}
        className={BTN}
      >
        <Heart
          className={`h-[18px] w-[18px] ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      <button
        type="button"
        onClick={() => {
          if (inCompare) removeFromCompare(car.id);
          else addToCompare(car.id);
        }}
        aria-label={inCompare ? "移出对比" : "加入对比"}
        className={BTN}
      >
        {inCompare ? (
          <Check className="h-[18px] w-[18px] text-green-500" strokeWidth={2} />
        ) : (
          <GitCompare className="h-[18px] w-[18px]" strokeWidth={1.5} />
        )}
      </button>
      <button type="button" onClick={share} aria-label="分享" className={BTN}>
        {copied ? (
          <Check className="h-[18px] w-[18px] text-green-500" strokeWidth={2} />
        ) : (
          <Share2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
