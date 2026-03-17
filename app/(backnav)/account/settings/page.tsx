"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Camera, Loader2, Store, MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocode";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [newStore, setNewStore] = useState({ name: "", address: "", address2: "", city: "", state: "", zipcode: "", phone: "" });
  const [addingStore, setAddingStore] = useState(false);

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

  async function addStoreFn() {
    if (!user || !newStore.name || !newStore.address || !newStore.city || !newStore.state || !newStore.zipcode) return;
    setAddingStore(true);
    const addrParts = [newStore.address, newStore.address2].filter(Boolean).join(", ");
    const fullAddress = `${addrParts}, ${newStore.city}, ${newStore.state} ${newStore.zipcode}`;
    const result = await geocodeAddress(fullAddress);
    const { data, error } = await supabase
      .from("dealer_stores")
      .insert({ owner_id: user, name: newStore.name, address: fullAddress, zipcode: newStore.zipcode || null, phone: newStore.phone || null, lat: result?.lat || null, lng: result?.lng || null })
      .select().single();
    if (!error && data) {
      setStores((prev) => [data as DbDealerStore, ...prev]);
      setNewStore({ name: "", address: "", address2: "", city: "", state: "", zipcode: "", phone: "" });
    }
    setAddingStore(false);
  }

  async function deleteStore(storeId: string) {
    if (!confirm("确定要删除该门店吗？")) return;
    await supabase.from("dealer_stores").delete().eq("id", storeId);
    setStores((prev) => prev.filter((s) => s.id !== storeId));
  }

  const mapMarkers = useMemo(
    () => stores.filter((s) => s.lat && s.lng).map((s) => ({ lat: s.lat!, lng: s.lng!, name: s.name, address: s.address })),
    [stores]
  );

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
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
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
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">无</div>
              )}
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
            <Label htmlFor="phone" className="font-mono text-xs">联系电话</Label>
            <Input id="phone" className="mt-1.5 h-11 font-mono text-sm" value={profileForm.phone} onChange={(e) => updateProfileForm({ phone: e.target.value })} placeholder="联系电话" />
          </div>
          <div>
            <Label htmlFor="location" className="font-mono text-xs">所在地区</Label>
            <Input id="location" className="mt-1.5 h-11 font-mono text-sm" value={profileForm.location} onChange={(e) => updateProfileForm({ location: e.target.value })} placeholder="例如: Los Angeles, CA" />
          </div>

          <div>
            <Label className="font-mono text-xs">账号类型</Label>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => updateProfileForm({ account_type: "private" })} className={`flex h-11 flex-1 items-center justify-center gap-1.5 border font-mono text-xs transition-colors ${profileForm.account_type === "private" ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30"}`}>
                个人
              </button>
              <button type="button" onClick={() => updateProfileForm({ account_type: "dealer" })} className={`flex h-11 flex-1 items-center justify-center gap-1.5 border font-mono text-xs transition-colors ${profileForm.account_type === "dealer" ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30"}`}>
                <Store className="h-3.5 w-3.5" strokeWidth={1.5} />车行
              </button>
            </div>
          </div>

          {/* Dealer stores */}
          {profileForm.account_type === "dealer" && (
            <div className="border-t border-border pt-6">
              <h3 className="flex items-center gap-1.5 font-mono text-sm font-semibold">
                <Store className="h-4 w-4" strokeWidth={1.5} />我的门店
              </h3>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">添加门店后，发布车辆时可以选择门店地址</p>
              {mapMarkers.length > 0 && (
                <div className="mt-3"><StoreMap markers={mapMarkers} className="h-52 w-full border border-border" /></div>
              )}
              {stores.length > 0 && (
                <div className="mt-3 space-y-2">
                  {stores.map((store) => (
                    <div key={store.id} className="flex items-start justify-between border border-border p-3">
                      <div>
                        <p className="font-mono text-xs font-medium">{store.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" strokeWidth={1.5} />{store.address}{store.zipcode && ` · ${store.zipcode}`}
                        </p>
                        {store.phone && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{store.phone}</p>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteStore(store.id)}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-3 border border-dashed border-border p-3">
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
        </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
