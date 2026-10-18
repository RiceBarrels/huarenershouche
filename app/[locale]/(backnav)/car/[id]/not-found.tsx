"use client";

// 车源 404:page.tsx 的 getPublicCar 为空(不存在 / 已下架 / 已售 / 车主停用)时 notFound() 渲染这里,
// HTTP 状态是真正的 404。公开访客只看到 404 文案;登录用户再用自己的会话拉一次 ——
// 已下架的行 RLS 只返回给车主 / 认领者 / 管理员,于是本人仍能在「仅你可见」提示条下查看、编辑、重新上架。

import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";
import Link, { useParams } from "@/components/localized-navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useI18n } from "@/components/i18n-provider";
import { useIdentity } from "@/components/identity-provider";
import { supabase } from "@/lib/supabase";
import type { PublicCar } from "@/lib/types";
import CarDetail, { fetchCarRow } from "../car-detail";

/** 这辆车对公众不可见,且当前用户有权看(车主 / 认领者 / 管理员) */
async function visibleToViewer(car: PublicCar, viewerId: string): Promise<boolean> {
  const offline = car.status !== "active" || car.owner_hidden;
  if (!offline) return false;
  // 非 active 的行 RLS 只给车主 / 认领者 / 管理员,能读到即有权
  if (car.status !== "active") return true;
  // 车主停用(owner_hidden)但仍是 active 的行任何登录用户都读得到,需要自己判身份
  if (car.seller_id === viewerId || car.profiles?.claimed_by === viewerId) return true;
  const { data } = await supabase.from("profiles").select("role").eq("id", viewerId).maybeSingle();
  return (data as { role?: string } | null)?.role === "admin";
}

export default function CarNotFound() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { authId } = useIdentity();
  // 连同取数时的登录用户一起记:退出登录 / 换号后不再显示上一位用户的车
  const [loaded, setLoaded] = useState<{ viewer: string; car: PublicCar } | null>(null);
  // 在本页重新上架成功后收起提示条(车主停用的车上架后仍不公开,提示保留)
  const [relisted, setRelisted] = useState(false);

  useEffect(() => {
    if (!id || !authId) return;
    let cancelled = false;
    (async () => {
      const { row } = await fetchCarRow(id);
      if (!row || cancelled) return;
      if ((await visibleToViewer(row, authId)) && !cancelled) setLoaded({ viewer: authId, car: row });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authId]);

  const car = loaded && loaded.viewer === authId ? loaded.car : null;
  if (car) {
    return (
      <>
        {!(relisted && !car.owner_hidden) && (
          <div role="status" className="border-b border-border bg-muted/60">
            {/* 与详情主体同宽对齐 */}
            <p className="mx-auto flex max-w-5xl items-center gap-1.5 px-4 py-2 font-mono text-[11px] text-muted-foreground 2xl:max-w-6xl min-[1920px]:max-w-7xl min-[2560px]:max-w-[88rem]">
              <EyeOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {t("该车源已下架，仅你可见")}
            </p>
          </div>
        )}
        <CarDetail initialCar={car} onRelisted={() => setRelisted(true)} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <p className="text-7xl font-bold tracking-tighter text-foreground md:text-8xl">
          4<span className="text-brand-ink">0</span>4
        </p>
        <div className="mt-4 h-1 w-10 bg-brand" aria-hidden="true" />
        <h1 className="mt-6 text-center text-base font-semibold text-foreground">
          {t("车源不存在或已下架")}
        </h1>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 items-center bg-primary px-5 text-xs text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("返回首页")}
          </Link>
          <Link
            href="/browse"
            className="flex h-9 items-center border border-border px-5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {t("浏览车源")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
