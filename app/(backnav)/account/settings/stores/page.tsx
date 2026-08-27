"use client";

// 设置 · 门店与车行认证:门店增删、门店照片、认证申请、账号类型升级

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Loader2, MapPin, ImagePlus, ShieldCheck, Clock, XCircle, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocode";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle } from "@/components/ios-settings";
import type { DbDealerStore } from "@/lib/types";

const StoreMap = dynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false }
);

export default function StoresSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"private" | "dealer">("private");
  const [loading, setLoading] = useState(true);

  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [newStore, setNewStore] = useState({ name: "", address: "", address2: "", city: "", state: "", zipcode: "", phone: "", wechat: "" });
  const [addingStore, setAddingStore] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser.id);
      const [profileRes, storeRes] = await Promise.all([
        supabase.from("profiles").select("account_type").eq("id", authUser.id).maybeSingle(),
        supabase.from("dealer_stores").select("*").eq("owner_id", authUser.id).order("created_at", { ascending: false }),
      ]);
      setAccountType((profileRes.data?.account_type as "private" | "dealer") || "private");
      setStores((storeRes.data as DbDealerStore[]) || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function upgradeToDealer() {
    if (!user || upgrading) return;
    setUpgrading(true);
    await supabase.from("profiles").update({ account_type: "dealer" }).eq("id", user);
    setAccountType("dealer");
    setUpgrading(false);
  }

  async function addStoreFn() {
    if (!user || !newStore.name || !newStore.address || !newStore.city || !newStore.state || !newStore.zipcode) return;
    setAddingStore(true);
    const addrParts = [newStore.address, newStore.address2].filter(Boolean).join(", ");
    const fullAddress = `${addrParts}, ${newStore.city}, ${newStore.state} ${newStore.zipcode}`;
    const result = await geocodeAddress(fullAddress);
    const { data, error } = await supabase
      .from("dealer_stores")
      .insert({ owner_id: user, name: newStore.name, address: fullAddress, zipcode: newStore.zipcode || null, phone: newStore.phone || null, wechat: newStore.wechat || null, lat: result?.lat || null, lng: result?.lng || null })
      .select().single();
    if (!error && data) {
      setStores((prev) => [data as DbDealerStore, ...prev]);
      setNewStore({ name: "", address: "", address2: "", city: "", state: "", zipcode: "", phone: "", wechat: "" });
    }
    setAddingStore(false);
  }

  async function deleteStore(storeId: string) {
    if (!confirm("确定要删除该门店吗？")) return;
    await supabase.from("dealer_stores").delete().eq("id", storeId);
    setStores((prev) => prev.filter((s) => s.id !== storeId));
  }

  async function handleStorePhotoUpload(storeId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !user) return;
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;

    const urls: string[] = [...store.store_photos];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user}/${storeId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("store-photos").upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("store-photos").getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    await supabase.from("dealer_stores").update({ store_photos: urls }).eq("id", storeId);
    setStores((prev) => prev.map((s) => s.id === storeId ? { ...s, store_photos: urls } : s));
    e.target.value = "";
  }

  async function removeStorePhoto(storeId: string, index: number) {
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;
    const next = store.store_photos.filter((_, i) => i !== index);
    await supabase.from("dealer_stores").update({ store_photos: next }).eq("id", storeId);
    setStores((prev) => prev.map((s) => s.id === storeId ? { ...s, store_photos: next } : s));
  }

  async function submitVerification(storeId: string) {
    setSubmittingVerification(storeId);
    await supabase
      .from("dealer_stores")
      .update({
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
        verification_note: null,
      })
      .eq("id", storeId);
    setStores((prev) =>
      prev.map((s) =>
        s.id === storeId ? { ...s, verification_status: "pending" as const, verification_submitted_at: new Date().toISOString(), verification_note: null } : s
      )
    );
    setSubmittingVerification(null);
  }

  const mapMarkers = useMemo(
    () => stores.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat!, lng: s.lng!, name: s.name, address: s.address })),
    [stores]
  );

  const hasVerifiedStore = stores.some((s) => s.verification_status === "verified");

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <LargeTitle
          title="门店与车行认证"
          subtitle={accountType === "dealer" ? "管理您的门店信息" : "添加门店并提交认证，审核通过后可升级为认证车行"}
        />

        {loading ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* 账号类型 */}
            <div className="rounded-xl bg-card p-4">
              <Label className="font-mono text-xs">账号类型</Label>
              {accountType === "dealer" ? (
                <div className="mt-2 flex h-11 items-center gap-2 rounded-[10px] bg-foreground px-3 font-mono text-xs text-background">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />认证车行
                </div>
              ) : hasVerifiedStore ? (
                <div className="mt-2 flex gap-2">
                  <div className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-foreground font-mono text-xs text-background">个人</div>
                  <button
                    type="button"
                    onClick={upgradeToDealer}
                    disabled={upgrading}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-muted font-mono text-xs transition-colors hover:bg-muted/70"
                  >
                    {upgrading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      : <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    升级为车行
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex h-11 items-center justify-center rounded-[10px] bg-muted font-mono text-xs">个人</div>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    添加门店并通过认证后可升级为车行账号
                  </p>
                </div>
              )}
            </div>

            {/* 门店地图 */}
            {mapMarkers.length > 0 && (
              <StoreMap markers={mapMarkers} className="h-52 w-full overflow-hidden rounded-xl" />
            )}

            {/* 门店列表 */}
            {stores.map((store) => (
              <div key={store.id} className="rounded-xl bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-medium">{store.name}</p>
                      {store.verification_status === "verified" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />已认证
                        </span>
                      )}
                      {store.verification_status === "pending" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600">
                          <Clock className="h-3 w-3" strokeWidth={1.5} />审核中
                        </span>
                      )}
                      {store.verification_status === "rejected" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" strokeWidth={1.5} />未通过
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />{store.address}{store.zipcode && ` · ${store.zipcode}`}
                    </p>
                    {store.phone && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{store.phone}</p>}
                    {store.wechat && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">微信: {store.wechat}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteStore(store.id)}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>

                {/* 门店照片 */}
                {store.store_photos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-none">
                    {store.store_photos.map((url, i) => (
                      <div key={i} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[10px] bg-muted">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        {store.verification_status !== "pending" && store.verification_status !== "verified" && (
                          <button
                            type="button"
                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                            onClick={() => removeStorePhoto(store.id, i)}
                          >
                            <X className="h-2.5 w-2.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 上传照片 + 申请认证 */}
                {store.verification_status !== "verified" && store.verification_status !== "pending" && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                      <ImagePlus className="h-3 w-3" strokeWidth={1.5} />
                      上传照片
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleStorePhotoUpload(store.id, e)}
                      />
                    </label>
                    {store.store_photos.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-auto gap-1 px-2 py-1 font-mono text-[11px]"
                        onClick={() => submitVerification(store.id)}
                        disabled={submittingVerification === store.id}
                      >
                        {submittingVerification === store.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                        )}
                        申请认证
                      </Button>
                    )}
                  </div>
                )}

                {/* 拒绝原因 */}
                {store.verification_status === "rejected" && store.verification_note && (
                  <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-[11px] text-destructive">
                    拒绝原因: {store.verification_note}
                  </p>
                )}
              </div>
            ))}

            {/* 添加门店 */}
            <div className="rounded-xl bg-card space-y-3 p-4">
              <p className="font-mono text-[11px] font-medium">添加门店</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">门店名称 *</Label>
                  <Input className="mt-1 h-9 font-mono text-xs" placeholder="如: XX Auto" value={newStore.name} onChange={(e) => setNewStore((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">门店电话</Label>
                  <Input className="mt-1 h-9 font-mono text-xs" placeholder="(626) 555-0123" value={newStore.phone} onChange={(e) => setNewStore((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">微信号</Label>
                  <Input className="mt-1 h-9 font-mono text-xs" placeholder="WeChat ID" value={newStore.wechat} onChange={(e) => setNewStore((s) => ({ ...s, wechat: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">Address *</Label>
                <Input className="mt-1 h-9 font-mono text-xs" placeholder="123 Main St" value={newStore.address} onChange={(e) => setNewStore((s) => ({ ...s, address: e.target.value }))} />
              </div>
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">Address Line 2</Label>
                <Input className="mt-1 h-9 font-mono text-xs" placeholder="Apt, Suite (optional)" value={newStore.address2} onChange={(e) => setNewStore((s) => ({ ...s, address2: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">City *</Label>
                  <Input className="mt-1 h-9 font-mono text-xs" placeholder="City" value={newStore.city} onChange={(e) => setNewStore((s) => ({ ...s, city: e.target.value }))} />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">State *</Label>
                  <Input className="mt-1 h-9 font-mono text-xs" placeholder="CA" maxLength={2} value={newStore.state} onChange={(e) => setNewStore((s) => ({ ...s, state: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label className="font-mono text-[11px] text-muted-foreground">Zip *</Label>
                  <Input className="mt-1 h-9 font-mono text-xs" placeholder="91007" maxLength={5} inputMode="numeric" value={newStore.zipcode} onChange={(e) => setNewStore((s) => ({ ...s, zipcode: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
                </div>
              </div>
              <Button size="sm" className="gap-1.5 font-mono text-xs" onClick={addStoreFn} disabled={addingStore || !newStore.name || !newStore.address || !newStore.city || !newStore.state || !newStore.zipcode}>
                {addingStore ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Plus className="h-3 w-3" strokeWidth={1.5} />}添加门店
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
