"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Camera, Loader2, Store, MapPin, ImagePlus, ShieldCheck, Clock, XCircle, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { geocodeAddress } from "@/lib/geocode";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationSettings } from "@/components/notification-settings";
import { ACTING_KEY } from "@/components/identity-provider";
import type { DbProfile, DbDealerStore } from "@/lib/types";

const StoreMap = dynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false }
);

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: "",
    phone: "",
    location: "",
    account_type: "private" as "private" | "dealer",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [newStore, setNewStore] = useState({ name: "", address: "", address2: "", city: "", state: "", zipcode: "", phone: "", wechat: "" });
  const [addingStore, setAddingStore] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileFormRef = useRef(profileForm);
  profileFormRef.current = profileForm;

  const autoSaveProfile = useCallback(() => {
    if (!user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const f = profileFormRef.current;
      setProfileSaving(true);
      await supabase
        .from("profiles")
        .update({
          username: f.username,
          phone: f.phone,
          location: f.location,
          account_type: f.account_type,
        })
        .eq("id", user);
      setProfile((prev) =>
        prev ? { ...prev, username: f.username, phone: f.phone, location: f.location, account_type: f.account_type } : prev
      );
      setProfileSaving(false);
    }, 800);
  }, [user]);

  function updateProfileForm(patch: Partial<typeof profileForm>) {
    setProfileForm((p) => ({ ...p, ...patch }));
    setTimeout(() => autoSaveProfile(), 0);
  }

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser.id);
      setEmail(authUser.email || "");

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (profileData) {
        setProfile(profileData as DbProfile);
        setProfileForm({
          username: profileData.username || "",
          phone: profileData.phone || "",
          location: profileData.location || "",
          account_type: profileData.account_type || "private",
        });
      }

      const { data: storeData } = await supabase.from("dealer_stores").select("*").eq("owner_id", authUser.id).order("created_at", { ascending: false });
      setStores((storeData as DbDealerStore[]) || []);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user);
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    }
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleEmailUpdate() {
    if (!email.trim()) return;
    setEmailSaving(true);
    setEmailMessage("");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      setEmailMessage(error.message);
    } else {
      setEmailMessage("验证邮件已发送到新邮箱，请查收确认");
    }
    setEmailSaving(false);
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

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "删除" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    const { error } = await supabase.rpc("delete_account");
    if (error) {
      setDeleteError(`删除失败: ${error.message}`);
      setDeleting(false);
      return;
    }
    // 服务端账号已删除,仅需清理本地会话与操作身份
    try { localStorage.removeItem(ACTING_KEY); } catch {}
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    router.replace("/");
  }

  const mapMarkers = useMemo(
    () => stores.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat!, lng: s.lng!, name: s.name, address: s.address })),
    [stores]
  );

  const hasVerifiedStore = stores.some((s) => s.verification_status === "verified");

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <h1 className="font-mono text-lg font-semibold">设置</h1>

        {profileSaving && (
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />保存中...
          </div>
        )}

        {loading ? (
          <div className="mt-4 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        ) : (
        <div className="mt-4 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
            >
              <img src={avatarUrl(profile?.avatar_url, user)} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {avatarUploading ? <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={1.5} /> : <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />}
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div>
              <p className="font-mono text-sm font-medium">{profileForm.username || "未设置"}</p>
              <p className="font-mono text-[11px] text-muted-foreground">点击头像更换</p>
            </div>
          </div>

          <div>
            <Label htmlFor="username" className="font-mono text-xs">昵称</Label>
            <Input id="username" className="mt-1.5 h-11 font-mono text-sm" value={profileForm.username} onChange={(e) => updateProfileForm({ username: e.target.value })} placeholder="你的昵称" />
          </div>
          <div>
            <Label htmlFor="email" className="font-mono text-xs">邮箱</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="email" type="email" className="h-11 flex-1 font-mono text-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
              <Button
                variant="outline"
                className="h-11 shrink-0 font-mono text-xs"
                onClick={handleEmailUpdate}
                disabled={emailSaving}
              >
                {emailSaving ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : "更改"}
              </Button>
            </div>
            {emailMessage && (
              <p className={`mt-1.5 font-mono text-[11px] ${emailMessage.includes("验证") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {emailMessage}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="phone" className="font-mono text-xs">联系电话</Label>
            <Input id="phone" className="mt-1.5 h-11 font-mono text-sm" value={profileForm.phone} onChange={(e) => updateProfileForm({ phone: e.target.value })} placeholder="联系电话" />
          </div>
          <div>
            <Label htmlFor="location" className="font-mono text-xs">所在地区</Label>
            <Input id="location" className="mt-1.5 h-11 font-mono text-sm" value={profileForm.location} onChange={(e) => updateProfileForm({ location: e.target.value })} placeholder="例如: Los Angeles, CA" />
          </div>

          <div>
            <Label className="font-mono text-xs">账号类型</Label>
            {profileForm.account_type === "dealer" ? (
              <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-foreground bg-foreground px-3 font-mono text-xs text-background">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />认证车行
              </div>
            ) : hasVerifiedStore ? (
              <div className="mt-2 flex gap-2">
                <div className="flex h-11 flex-1 items-center justify-center rounded-lg border border-foreground bg-foreground font-mono text-xs text-background">个人</div>
                <button type="button" onClick={() => updateProfileForm({ account_type: "dealer" })} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border font-mono text-xs transition-colors hover:border-foreground/30">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />升级为车行
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex h-11 items-center justify-center rounded-lg border border-foreground bg-foreground font-mono text-xs text-background">个人</div>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  添加门店并通过认证后可升级为车行账号
                </p>
              </div>
            )}
          </div>

          {/* Dealer stores */}
          <div className="border-t border-border pt-6">
            <h3 className="flex items-center gap-1.5 font-mono text-sm font-semibold">
              <Store className="h-4 w-4" strokeWidth={1.5} />我的门店
            </h3>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {profileForm.account_type === "dealer" ? "管理您的门店信息" : "添加门店并提交认证，审核通过后可升级为认证车行"}
            </p>
              {mapMarkers.length > 0 && (
                <div className="mt-3"><StoreMap markers={mapMarkers} className="h-52 w-full overflow-hidden rounded-xl border border-border" /></div>
              )}
              {stores.length > 0 && (
                <div className="mt-3 space-y-3">
                  {stores.map((store) => (
                    <div key={store.id} className="rounded-xl border border-border p-3">
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

                      {/* Store photos */}
                      {store.store_photos.length > 0 && (
                        <div className="mt-2 flex gap-2 overflow-x-auto">
                          {store.store_photos.map((url, i) => (
                            <div key={i} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
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

                      {/* Upload photos + Apply verification */}
                      {store.verification_status !== "verified" && store.verification_status !== "pending" && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
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

                      {/* Rejection note */}
                      {store.verification_status === "rejected" && store.verification_note && (
                        <p className="mt-2 border-l-2 border-red-300 pl-2 font-mono text-[11px] text-red-600 dark:text-red-400">
                          拒绝原因: {store.verification_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-3">
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
          </div>
        )}

        {/* Notification settings */}
        {!loading && (
          <div className="mt-6">
            <h2 className="mb-3 font-mono text-sm font-semibold">通知设置</h2>
            <NotificationSettings />
          </div>
        )}

        {/* Danger zone: account deletion (App Store 5.1.1(v)) */}
        {!loading && (
          <div className="mt-6 overflow-hidden rounded-xl border border-destructive/30">
            <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3">
              <h2 className="font-mono text-sm font-semibold text-destructive">删除账号</h2>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                永久删除您的账号及全部数据，包括发布的车源、消息、收藏、评论和上传的图片。此操作立即生效且不可恢复。
              </p>
            </div>
            <div className="p-4">
              {!deleteOpen ? (
                <Button
                  variant="outline"
                  className="h-10 gap-1.5 border-destructive/40 font-mono text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  删除我的账号
                </Button>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="delete-confirm" className="font-mono text-xs">
                    请输入「删除」以确认永久删除账号
                  </Label>
                  <Input
                    id="delete-confirm"
                    className="h-10 font-mono text-sm"
                    placeholder="删除"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    disabled={deleting}
                  />
                  {deleteError && (
                    <p className="font-mono text-[11px] text-red-600 dark:text-red-400">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="h-10 flex-1 gap-1.5 font-mono text-xs"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "删除" || deleting}
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                      确认永久删除
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 font-mono text-xs"
                      onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); setDeleteError(""); }}
                      disabled={deleting}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
