"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Trash2, Eye, CheckCircle, XCircle, Car, Loader2, Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MAKES_ZH } from "@/lib/mock-data";
import type { DbCar } from "@/lib/types";

const DRAFT_KEY = "huaren_post_draft";

interface PostDraft {
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "在售", variant: "default" },
  sold: { label: "已售", variant: "secondary" },
  pending: { label: "审核中", variant: "outline" },
  removed: { label: "已下架", variant: "destructive" },
};

export default function ListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [myCars, setMyCars] = useState<DbCar[]>([]);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser.id);

      const { data: cars } = await supabase.from("cars").select("*").eq("seller_id", authUser.id).order("created_at", { ascending: false });
      setMyCars((cars as DbCar[]) || []);

      try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) setDraft(JSON.parse(raw)); } catch {}
      setLoading(false);
    }
    load();
  }, [router]);

  async function toggleStatus(carId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "removed" : "active";
    await supabase.from("cars").update({ status: newStatus }).eq("id", carId);
    setMyCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: newStatus as DbCar["status"] } : c)));
  }

  async function markSold(carId: string) {
    await supabase.from("cars").update({ status: "sold" }).eq("id", carId);
    setMyCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: "sold" } : c)));
  }

  async function deleteCar(carId: string) {
    if (!confirm("确定要删除这辆车吗？此操作不可恢复。")) return;
    await supabase.from("cars").delete().eq("id", carId);
    setMyCars((prev) => prev.filter((c) => c.id !== carId));
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-lg font-semibold">我的发布</h1>
          <Link href="/post">
            <Button size="sm" className="gap-1.5 font-mono text-xs">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              发布新车
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 border border-border p-3">
                <Skeleton className="h-20 w-28 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <>
        {/* Draft */}
        {draft && (draft.form?.make || draft.imageUrls?.length > 0) && (
          <div className="mt-4 border border-dashed border-border p-3">
            <div className="flex items-start gap-3">
              <div className="h-16 w-24 shrink-0 bg-muted">
                {draft.imageUrls?.[0] ? (
                  <img src={draft.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">无图</div>
                )}
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="font-mono text-[10px]">草稿</Badge>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {[draft.form?.year, draft.form?.make ? (MAKES_ZH[draft.form.make] || draft.form.make) : null, draft.form?.model].filter(Boolean).join(" ") || "未填写"}
                </p>
                <div className="mt-2 flex gap-2">
                  <Link href="/post"><Button size="sm" className="h-8 font-mono text-xs">继续编辑</Button></Link>
                  <Button variant="outline" size="sm" className="h-8 font-mono text-xs text-destructive" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} setDraft(null); }}>
                    删除草稿
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {myCars.length === 0 && !draft ? (
            <div className="flex flex-col items-center py-16">
              <Car className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
              <p className="mt-3 font-mono text-sm text-muted-foreground">还没有发布过车辆</p>
              <Link href="/post"><Button size="sm" className="mt-4 font-mono text-xs">立即发布</Button></Link>
            </div>
          ) : (
            myCars.map((car) => (
              <div key={car.id} className="flex gap-3 border border-border p-3">
                <Link href={`/car/${car.id}`} className="shrink-0">
                  <div className="h-20 w-28 bg-muted">
                    {car.image_url ? (
                      <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">无图</div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/car/${car.id}`}><h3 className="font-mono text-sm font-semibold hover:underline">{car.title_zh}</h3></Link>
                      <Badge variant={STATUS_MAP[car.status]?.variant || "outline"} className="font-mono text-[10px]">
                        {STATUS_MAP[car.status]?.label || car.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {formatPrice(car.price)} · {car.location_zh} · {car.views_count || 0} 次浏览
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/car/${car.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8 gap-1 font-mono text-[11px]">
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />编辑
                      </Button>
                    </Link>
                    {car.status === "active" && (
                      <Button variant="outline" size="sm" className="h-8 gap-1 font-mono text-[11px]" onClick={() => markSold(car.id)}>
                        <CheckCircle className="h-3 w-3" strokeWidth={1.5} />已售
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-8 gap-1 font-mono text-[11px]" onClick={() => toggleStatus(car.id, car.status)}>
                      {car.status === "active" ? <><XCircle className="h-3 w-3" strokeWidth={1.5} />下架</> : car.status === "removed" ? <><Eye className="h-3 w-3" strokeWidth={1.5} />上架</> : null}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 font-mono text-[11px] text-destructive" onClick={() => deleteCar(car.id)}>
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />删除
                    </Button>
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
    </div>
  );
}
