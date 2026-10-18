"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { carLink, carEditLink } from "@/lib/static-link";
import {
  Plus, Trash2, Eye, CheckCircle, XCircle, Car, Pencil, Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIdentity } from "@/components/identity-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle } from "@/components/ios-settings";
import { useCachedData } from "@/lib/use-cached-data";
import { useI18n } from "@/components/i18n-provider";
import { carTitle, carLocation, brandShortLabel } from "@/lib/i18n";
import { MAKES_ZH } from "@/lib/mock-data";
import { formatCarPrice } from "@/lib/format";
import type { DbCar } from "@/lib/types";

const DRAFT_KEY = "huaren_post_draft";

interface PostDraft {
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "在售", variant: "default" },
  sold: { label: "已售", variant: "secondary" },
  pending: { label: "审核中", variant: "outline" },
  removed: { label: "已下架", variant: "destructive" },
};

// 被 AI 审核或管理员下架的车源卖家不能自行重新上架(数据库触发器拒绝,报 listing_blocked)
function relistLocked(car: DbCar): boolean {
  return car.status === "removed" && (car.removal_reason === "moderation" || car.removal_reason === "admin");
}

export default function ListingsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { actingId, authId, loading: identityLoading } = useIdentity();
  // 以「正在操作的账号」为准(默认本人;切换到已认领的系统车行时为该车行账号)。
  const acct = actingId;
  const [draft, setDraft] = useState<PostDraft | null>(null);
  // 底部轻提示(如重新上架被拒),几秒后自动消失
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!identityLoading && !authId) { router.push("/login"); return; }
  }, [identityLoading, authId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage,仅首帧一次
    try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) setDraft(JSON.parse(raw)); } catch {}
  }, []);

  const { data: myCarsData, loading, mutate } = useCachedData<DbCar[]>(
    acct ? `account_cars_${acct}` : null,
    async () => {
      const { data: cars } = await supabase.from("cars").select("*").eq("seller_id", acct!).order("created_at", { ascending: false });
      return (cars as DbCar[]) || [];
    },
    [acct],
  );
  const myCars = myCarsData || [];

  async function toggleStatus(carId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "removed" : "active";
    const patch: Partial<DbCar> = { status: newStatus as DbCar["status"] };
    const { error } = await supabase.from("cars").update(patch).eq("id", carId);
    if (error) {
      if (!error.message.includes("listing_blocked")) {
        setNotice(t("失败: {msg}", { msg: error.message }));
        return;
      }
      setNotice(t("该车源已被系统或管理员下架，无法重新上架"));
      // 本地缓存可能还没有下架原因:拉回真实状态,隐藏「上架」按钮
      const { data } = await supabase.from("cars").select("status, removal_reason").eq("id", carId).maybeSingle();
      if (data) {
        const fresh = data as Pick<DbCar, "status" | "removal_reason">;
        mutate((prev) => (prev || []).map((c) => (c.id === carId ? { ...c, ...fresh } : c)));
      }
      return;
    }
    mutate((prev) => (prev || []).map((c) => (c.id === carId ? { ...c, ...patch } : c)));
  }

  async function markSold(carId: string) {
    await supabase.from("cars").update({ status: "sold" }).eq("id", carId);
    mutate((prev) => (prev || []).map((c) => (c.id === carId ? { ...c, status: "sold" } : c)));
  }

  async function deleteCar(carId: string) {
    if (!confirm(t("确定要删除这辆车吗？此操作不可恢复。"))) return;
    await supabase.from("cars").delete().eq("id", carId);
    mutate((prev) => (prev || []).filter((c) => c.id !== carId));
  }

  // 自动检索(转载)车辆:只允许停用/启用,翻转 owner_hidden。
  async function toggleDisabled(car: DbCar) {
    const next = !car.owner_hidden;
    await supabase.from("cars").update({ owner_hidden: next }).eq("id", car.id);
    mutate((prev) => (prev || []).map((c) => (c.id === car.id ? { ...c, owner_hidden: next } : c)));
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      {/* 桌面边距与账户主页(md:px-6 md:py-8)对齐,避免子页忽紧忽松 */}
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8">
        <LargeTitle
          title={t("我的发布")}
          trailing={
            <Link href="/post">
              <Button size="sm" className="h-9 gap-1.5 px-4 font-mono text-xs font-medium">
                <Plus className="h-4 w-4" strokeWidth={2} />
                {t("发布新车")}
              </Button>
            </Link>
          }
        />

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-card flex gap-3 p-3">
                <Skeleton className="h-20 w-28 rounded-[14px]" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-7 w-40 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <>
        {/* Draft */}
        {draft && (draft.form?.make || draft.imageUrls?.length > 0) && (
          <div className="rounded-xl bg-card mt-4 p-3">
            <div className="flex items-start gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-[14px] bg-muted">
                {draft.imageUrls?.[0] ? (
                  <img src={draft.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">{t("无图")}</div>
                )}
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="font-mono text-[10px]">{t("草稿")}</Badge>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {[draft.form?.year, draft.form?.make ? brandShortLabel(draft.form.make, MAKES_ZH[draft.form.make], t, locale) : null, draft.form?.model].filter(Boolean).join(" ") || t("未填写")}
                </p>
                <div className="mt-2 flex gap-2">
                  <Link href="/post"><Button size="sm" className="h-8 px-4 font-mono text-xs">{t("继续编辑")}</Button></Link>
                  <Button variant="secondary" size="sm" className="h-8 px-4 font-mono text-xs text-destructive" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} setDraft(null); }}>
                    {t("删除草稿")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {myCars.length === 0 && !draft ? (
            <div className="flex flex-col items-center py-16">
              <Car className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-sm text-muted-foreground">{t("还没有发布过车辆")}</p>
              <Link href="/post"><Button size="sm" className="mt-4 h-9 px-5 font-mono text-xs">{t("立即发布")}</Button></Link>
            </div>
          ) : (
            myCars.map((car) => (
              <div key={car.id} className="rounded-xl bg-card flex gap-3 p-3">
                <Link href={carLink(car.id)} className="shrink-0">
                  {/* 桌面横卡更宽,缩略图升一号,压缩右侧空白 */}
                  <div className="h-20 w-28 overflow-hidden rounded-[14px] bg-muted md:h-24 md:w-36">
                    {car.image_url ? (
                      <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">{t("无图")}</div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={carLink(car.id)}><h3 className="font-mono text-sm font-semibold hover:underline">{carTitle(car, locale)}</h3></Link>
                      <Badge variant={STATUS_MAP[car.status]?.variant || "outline"} className="font-mono text-[10px]">
                        {STATUS_MAP[car.status]?.label ? t(STATUS_MAP[car.status].label) : car.status}
                      </Badge>
                      {car.source_id && (
                        <Badge variant="outline" className="gap-1 font-mono text-[10px]">
                          <Globe className="h-3 w-3" strokeWidth={1.5} />{t("自动检索")}
                        </Badge>
                      )}
                      {car.source_id && car.owner_hidden && (
                        <Badge variant="secondary" className="font-mono text-[10px]">{t("已停用")}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {formatCarPrice(car, car.price)} · {carLocation(car, locale)} · {t("{n} 次浏览", { n: car.views_count || 0 })}
                    </p>
                    {relistLocked(car) && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {t("该车源已被系统或管理员下架，无法重新上架")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {car.source_id ? (
                      // 自动检索(转载)车辆:不可编辑/删除/标记已售,仅可停用/启用。
                      <Button variant="secondary" size="sm" className="h-8 gap-1 px-3 font-mono text-[11px]" onClick={() => toggleDisabled(car)}>
                        {car.owner_hidden
                          ? <><Eye className="h-3 w-3" strokeWidth={1.5} />{t("启用")}</>
                          : <><XCircle className="h-3 w-3" strokeWidth={1.5} />{t("停用")}</>}
                      </Button>
                    ) : (
                      <>
                        <Link href={carEditLink(car.id)}>
                          <Button variant="secondary" size="sm" className="h-8 gap-1 px-3 font-mono text-[11px]">
                            <Pencil className="h-3 w-3" strokeWidth={1.5} />{t("编辑")}
                          </Button>
                        </Link>
                        {car.status === "active" && (
                          <Button variant="secondary" size="sm" className="h-8 gap-1 px-3 font-mono text-[11px]" onClick={() => markSold(car.id)}>
                            <CheckCircle className="h-3 w-3" strokeWidth={1.5} />{t("已售")}
                          </Button>
                        )}
                        {!relistLocked(car) && (
                          <Button variant="secondary" size="sm" className="h-8 gap-1 px-3 font-mono text-[11px]" onClick={() => toggleStatus(car.id, car.status)}>
                            {car.status === "active" ? <><XCircle className="h-3 w-3" strokeWidth={1.5} />{t("下架")}</> : car.status === "removed" ? <><Eye className="h-3 w-3" strokeWidth={1.5} />{t("上架")}</> : null}
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" className="h-8 gap-1 px-3 font-mono text-[11px] text-destructive" onClick={() => deleteCar(car.id)}>
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />{t("删除")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </main>
      <Footer />
      {notice && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] z-50 flex justify-center px-4"
        >
          <p className="max-w-md rounded-xl border border-border bg-card px-4 py-2.5 text-center font-mono text-xs text-foreground shadow-sm">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
}
