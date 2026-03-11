"use client";

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Eye,
  Heart,
  CheckCircle,
  XCircle,
  Camera,
  Loader2,
  Store,
  MapPin,
  FileText,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocode";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MAKES_ZH } from "@/lib/mock-data";
import { ConversationList } from "@/components/conversation-list";
import type { DbCar, DbProfile, DbDealerStore } from "@/lib/types";

const DRAFT_KEY = "huaren_post_draft";

interface PostDraft {
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
}

const StoreMap = dynamic(
  () => import("@/components/store-map").then((m) => m.StoreMap),
  { ssr: false }
);

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

export default function AccountPage() {
  return (
    <Suspense>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "listings";
  const [user, setUser] = useState<string | null>(null);
  const [myCars, setMyCars] = useState<DbCar[]>([]);
  const [favorites, setFavorites] = useState<DbCar[]>([]);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile settings state
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: "",
    phone: "",
    location: "",
    account_type: "private" as "private" | "dealer",
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Dealer stores state
  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [newStore, setNewStore] = useState({ name: "", address: "", address2: "", city: "", state: "", zipcode: "", phone: "" });
  const [addingStore, setAddingStore] = useState(false);

  // Auto-save profile with debounce
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
    // Trigger auto-save after state updates
    setTimeout(() => autoSaveProfile(), 0);
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/");
        return;
      }
      setUser(authUser.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profileData) {
        setProfile(profileData as DbProfile);
        setProfileForm({
          username: profileData.username || "",
          phone: profileData.phone || "",
          location: profileData.location || "",
          account_type: profileData.account_type || "private",
        });
      }

      const { data: storeData } = await supabase
        .from("dealer_stores")
        .select("*")
        .eq("owner_id", authUser.id)
        .order("created_at", { ascending: false });
      setStores((storeData as DbDealerStore[]) || []);

      const { data: cars } = await supabase
        .from("cars")
        .select("*")
        .eq("seller_id", authUser.id)
        .order("created_at", { ascending: false });
      setMyCars((cars as DbCar[]) || []);

      const { data: favs } = await supabase
        .from("favorites")
        .select("car_id")
        .eq("user_id", authUser.id);
      if (favs && favs.length > 0) {
        const ids = favs.map((f) => f.car_id);
        const { data: favCars } = await supabase
          .from("cars")
          .select("*")
          .in("id", ids);
        setFavorites((favCars as DbCar[]) || []);
      }

      // Load unread count
      const { data: unreadData } = await supabase.rpc("get_unread_count");
      setUnreadCount(unreadData || 0);

      // Load post draft from localStorage
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) setDraft(JSON.parse(raw));
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, [router]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  async function toggleStatus(carId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "removed" : "active";
    await supabase.from("cars").update({ status: newStatus }).eq("id", carId);
    setMyCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, status: newStatus as DbCar["status"] } : c))
    );
  }

  async function markSold(carId: string) {
    await supabase.from("cars").update({ status: "sold" }).eq("id", carId);
    setMyCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, status: "sold" } : c))
    );
  }

  async function deleteCar(carId: string) {
    if (!confirm("确定要删除这辆车吗？此操作不可恢复。")) return;
    await supabase.from("cars").delete().eq("id", carId);
    setMyCars((prev) => prev.filter((c) => c.id !== carId));
  }

  async function removeFavorite(carId: string) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user!)
      .eq("car_id", carId);
    setFavorites((prev) => prev.filter((c) => c.id !== carId));
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user}/avatar-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user);

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    }
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function addStore() {
    if (!user || !newStore.name || !newStore.address || !newStore.city || !newStore.state || !newStore.zipcode) return;
    setAddingStore(true);

    // Build full address string from structured fields
    const addrParts = [newStore.address, newStore.address2].filter(Boolean).join(", ");
    const fullAddress = `${addrParts}, ${newStore.city}, ${newStore.state} ${newStore.zipcode}`;

    // Geocode the full address
    const result = await geocodeAddress(fullAddress);

    const { data, error } = await supabase
      .from("dealer_stores")
      .insert({
        owner_id: user,
        name: newStore.name,
        address: fullAddress,
        zipcode: newStore.zipcode || null,
        phone: newStore.phone || null,
        lat: result?.lat || null,
        lng: result?.lng || null,
      })
      .select()
      .single();
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
    () =>
      stores
        .filter((s) => s.lat && s.lng)
        .map((s) => ({ lat: s.lat!, lng: s.lng!, name: s.name, address: s.address })),
    [stores]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            我的中心
          </h1>
          <Link href="/post">
            <Button size="sm" className="gap-1.5 font-mono text-xs">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              发布新车
            </Button>
          </Link>
        </div>

        <Tabs defaultValue={defaultTab} className="mt-6">
          <TabsList className="font-mono">
            <TabsTrigger value="listings" className="font-mono text-xs">
              我的发布 ({myCars.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="font-mono text-xs">
              我的收藏 ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative font-mono text-xs">
              消息
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[10px] font-medium text-background">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-mono text-xs">
              设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            {/* Draft card */}
            {draft && (draft.form?.make || draft.imageUrls?.length > 0) && (
              <div className="mb-4 border border-dashed border-border p-3">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-28 shrink-0 bg-muted">
                    {draft.imageUrls?.[0] ? (
                      <img src={draft.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                        无图
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        <Badge variant="outline" className="font-mono text-[10px]">草稿</Badge>
                      </div>
                      <p className="mt-1 font-mono text-sm font-semibold">
                        {[
                          draft.form?.year,
                          draft.form?.make ? (MAKES_ZH[draft.form.make] || draft.form.make) : null,
                          draft.form?.model,
                        ].filter(Boolean).join(" ") || "未填写车辆信息"}
                      </p>
                      {draft.form?.price && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatPrice(Number(draft.form.price))}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href="/post">
                        <Button size="sm" className="h-7 gap-1 font-mono text-[11px]">
                          <Plus className="h-3 w-3" strokeWidth={1.5} />
                          继续编辑
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 font-mono text-[11px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          try { localStorage.removeItem(DRAFT_KEY); } catch {}
                          setDraft(null);
                        }}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                        删除草稿
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {myCars.length === 0 && !draft ? (
              <div className="flex flex-col items-center border border-border py-12">
                <p className="font-mono text-sm text-muted-foreground">
                  你还没有发布过车辆
                </p>
                <Link href="/post">
                  <Button size="sm" className="mt-4 font-mono text-xs">
                    立即发布
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myCars.map((car) => (
                  <div
                    key={car.id}
                    className="flex gap-4 border border-border p-3"
                  >
                    <Link href={`/car/${car.id}`} className="shrink-0">
                      <div className="h-20 w-28 bg-muted">
                        {car.image_url ? (
                          <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                            无图
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/car/${car.id}`}>
                            <h3 className="font-mono text-sm font-semibold hover:underline">
                              {car.title_zh}
                            </h3>
                          </Link>
                          <Badge
                            variant={STATUS_MAP[car.status]?.variant || "outline"}
                            className="font-mono text-[10px]"
                          >
                            {STATUS_MAP[car.status]?.label || car.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {formatPrice(car.price)} · {car.location_zh} ·{" "}
                          {car.views_count || 0} 次浏览
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {car.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 font-mono text-[11px]"
                            onClick={() => markSold(car.id)}
                          >
                            <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
                            标为已售
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 font-mono text-[11px]"
                          onClick={() => toggleStatus(car.id, car.status)}
                        >
                          {car.status === "active" ? (
                            <>
                              <XCircle className="h-3 w-3" strokeWidth={1.5} />
                              下架
                            </>
                          ) : car.status === "removed" ? (
                            <>
                              <Eye className="h-3 w-3" strokeWidth={1.5} />
                              重新上架
                            </>
                          ) : null}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 font-mono text-[11px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => deleteCar(car.id)}
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center border border-border py-12">
                <p className="font-mono text-sm text-muted-foreground">
                  还没有收藏车辆
                </p>
                <Link href="/">
                  <Button variant="outline" size="sm" className="mt-4 font-mono text-xs">
                    去看看
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((car) => (
                  <div
                    key={car.id}
                    className="flex gap-4 border border-border p-3"
                  >
                    <Link href={`/car/${car.id}`} className="shrink-0">
                      <div className="h-20 w-28 bg-muted">
                        {car.image_url ? (
                          <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                            无图
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link href={`/car/${car.id}`}>
                          <h3 className="font-mono text-sm font-semibold hover:underline">
                            {car.title_zh}
                          </h3>
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {formatPrice(car.price)} · {car.location_zh}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-fit gap-1 font-mono text-[11px]"
                        onClick={() => removeFavorite(car.id)}
                      >
                        <Heart className="h-3 w-3 fill-current" strokeWidth={1.5} />
                        取消收藏
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            {user && <ConversationList userId={user} initialConvId={searchParams.get("conv")} />}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="max-w-lg space-y-6">
              {/* Saving indicator */}
              {profileSaving && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                  保存中...
                </div>
              )}

              {/* Avatar */}
              <div>
                <Label className="font-mono text-xs">头像</Label>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    className="group relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-muted"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="头像" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                        无头像
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      {avatarUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={1.5} />
                      ) : (
                        <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />
                      )}
                    </div>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <p className="font-mono text-[11px] text-muted-foreground">
                    点击更换头像<br />建议使用正方形图片
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="username" className="font-mono text-xs">昵称</Label>
                <Input
                  id="username"
                  className="mt-1.5 font-mono text-sm"
                  value={profileForm.username}
                  onChange={(e) => updateProfileForm({ username: e.target.value })}
                  placeholder="你的昵称"
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="font-mono text-xs">联系电话</Label>
                <Input
                  id="phone"
                  className="mt-1.5 font-mono text-sm"
                  value={profileForm.phone}
                  onChange={(e) => updateProfileForm({ phone: e.target.value })}
                  placeholder="联系电话"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="font-mono text-xs">所在地区</Label>
                <Input
                  id="location"
                  className="mt-1.5 font-mono text-sm"
                  value={profileForm.location}
                  onChange={(e) => updateProfileForm({ location: e.target.value })}
                  placeholder="例如: Los Angeles, CA"
                />
              </div>

              {/* Account type */}
              <div>
                <Label className="font-mono text-xs">账号类型</Label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateProfileForm({ account_type: "private" })}
                    className={`flex items-center gap-1.5 border px-3 py-2 font-mono text-xs transition-colors ${
                      profileForm.account_type === "private"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    个人
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProfileForm({ account_type: "dealer" })}
                    className={`flex items-center gap-1.5 border px-3 py-2 font-mono text-xs transition-colors ${
                      profileForm.account_type === "dealer"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" strokeWidth={1.5} />
                    车行
                  </button>
                </div>
              </div>

              {/* Dealer stores section */}
              {profileForm.account_type === "dealer" && (
                <div className="border-t border-border pt-6">
                  <h3 className="flex items-center gap-1.5 font-mono text-sm font-semibold">
                    <Store className="h-4 w-4" strokeWidth={1.5} />
                    我的门店
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    添加门店后，发布车辆时可以选择门店地址
                  </p>

                  {/* Map */}
                  {mapMarkers.length > 0 && (
                    <div className="mt-3">
                      <StoreMap markers={mapMarkers} className="h-52 w-full border border-border" />
                    </div>
                  )}

                  {/* Existing stores */}
                  {stores.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {stores.map((store) => (
                        <div
                          key={store.id}
                          className="flex items-start justify-between border border-border p-3"
                        >
                          <div>
                            <p className="font-mono text-xs font-medium">{store.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" strokeWidth={1.5} />
                              {store.address}
                              {store.zipcode && ` · ${store.zipcode}`}
                            </p>
                            {store.phone && (
                              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                {store.phone}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteStore(store.id)}
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new store */}
                  <div className="mt-4 space-y-3 border border-dashed border-border p-3">
                    <p className="font-mono text-[11px] font-medium">添加门店</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="font-mono text-[11px] text-muted-foreground">
                          门店名称 *
                        </Label>
                        <Input
                          className="mt-1 h-8 font-mono text-xs"
                          placeholder="如: XX Auto"
                          value={newStore.name}
                          onChange={(e) =>
                            setNewStore((s) => ({ ...s, name: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="font-mono text-[11px] text-muted-foreground">
                          门店电话
                        </Label>
                        <Input
                          className="mt-1 h-8 font-mono text-xs"
                          placeholder="(626) 555-0123"
                          value={newStore.phone}
                          onChange={(e) =>
                            setNewStore((s) => ({ ...s, phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="font-mono text-[11px] text-muted-foreground">
                        Address *
                      </Label>
                      <Input
                        className="mt-1 h-8 font-mono text-xs"
                        placeholder="123 Main St"
                        value={newStore.address}
                        onChange={(e) =>
                          setNewStore((s) => ({ ...s, address: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="font-mono text-[11px] text-muted-foreground">
                        Address Line 2
                      </Label>
                      <Input
                        className="mt-1 h-8 font-mono text-xs"
                        placeholder="Apt, Suite, Unit (optional)"
                        value={newStore.address2}
                        onChange={(e) =>
                          setNewStore((s) => ({ ...s, address2: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="font-mono text-[11px] text-muted-foreground">
                          City *
                        </Label>
                        <Input
                          className="mt-1 h-8 font-mono text-xs"
                          placeholder="City"
                          value={newStore.city}
                          onChange={(e) =>
                            setNewStore((s) => ({ ...s, city: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="font-mono text-[11px] text-muted-foreground">
                          State *
                        </Label>
                        <Input
                          className="mt-1 h-8 font-mono text-xs"
                          placeholder="CA"
                          maxLength={2}
                          value={newStore.state}
                          onChange={(e) =>
                            setNewStore((s) => ({ ...s, state: e.target.value.toUpperCase() }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="font-mono text-[11px] text-muted-foreground">
                          Zip Code *
                        </Label>
                        <Input
                          className="mt-1 h-8 font-mono text-xs"
                          placeholder="91007"
                          maxLength={5}
                          inputMode="numeric"
                          value={newStore.zipcode}
                          onChange={(e) =>
                            setNewStore((s) => ({
                              ...s,
                              zipcode: e.target.value.replace(/\D/g, "").slice(0, 5),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 font-mono text-xs"
                      onClick={addStore}
                      disabled={addingStore || !newStore.name || !newStore.address || !newStore.city || !newStore.state || !newStore.zipcode}
                    >
                      {addingStore ? (
                        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                      )}
                      添加门店
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
