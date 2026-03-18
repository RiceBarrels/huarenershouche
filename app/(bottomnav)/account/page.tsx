"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Heart, Camera, Loader2, Store, MapPin,
  FileText, ChevronRight, Car, Settings, LogOut, Moon, Sun, ScrollText, ShieldCheck,
  Headset, Handshake,
} from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbCar, DbProfile } from "@/lib/types";

const DRAFT_KEY = "huaren_post_draft";

interface PostDraft {
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
}

// Mobile menu row
function MenuRow({
  icon, label, value, href, onClick, destructive,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | React.ReactNode;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted ${destructive ? "text-destructive" : ""}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">{icon}</span>
      <span className="flex-1 font-mono text-sm">{label}</span>
      {value && <span className="font-mono text-xs text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return <button type="button" className="w-full text-left" onClick={onClick}>{inner}</button>;
}

export default function AccountPage() {
  return <Suspense><AccountContent /></Suspense>;
}

function AccountContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [myCars, setMyCars] = useState<DbCar[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const loadAccount = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push("/login"); return; }
    setUser(authUser.id);

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
    if (profileData) setProfile(profileData as DbProfile);

    const { data: cars } = await supabase.from("cars").select("*").eq("seller_id", authUser.id).order("created_at", { ascending: false });
    setMyCars((cars as DbCar[]) || []);

    const { count } = await supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", authUser.id);
    setFavCount(count || 0);

    try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) setDraft(JSON.parse(raw)); } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const activeCars = myCars.filter((c) => c.status === "active").length;

  return (
    <PullToRefresh onRefresh={loadAccount}>
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        {/* Profile card */}
        {loading ? (
          <>
          <div className="flex items-center gap-4 px-2 py-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex border-y border-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1 py-3">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
          </>
        ) : (
        <>
        <div className="flex items-center gap-4 px-2 py-4">
          <button
            type="button"
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted"
            onClick={() => avatarInputRef.current?.click()}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-lg text-muted-foreground">
                {profile?.username?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <div className="flex-1">
            <p className="font-mono text-base font-semibold">
              {profile?.username || "未设置昵称"}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              {profile?.account_type === "dealer" ? (
                <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                  <Store className="h-3 w-3" strokeWidth={1.5} />认证车行
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono text-[10px]">个人</Badge>
              )}
              {profile?.location && (
                <span className="flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" strokeWidth={1.5} />{profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex border-y border-border">
          <Link href="/account/listings" className="flex flex-1 flex-col items-center gap-0.5 py-3 transition-colors active:bg-muted">
            <span className="font-mono text-lg font-bold">{activeCars}</span>
            <span className="font-mono text-[11px] text-muted-foreground">在售</span>
          </Link>
          <div className="w-px bg-border" />
          <Link href="/account/listings" className="flex flex-1 flex-col items-center gap-0.5 py-3 transition-colors active:bg-muted">
            <span className="font-mono text-lg font-bold">{myCars.length}</span>
            <span className="font-mono text-[11px] text-muted-foreground">发布</span>
          </Link>
          <div className="w-px bg-border" />
          <Link href="/account/favorites" className="flex flex-1 flex-col items-center gap-0.5 py-3 transition-colors active:bg-muted">
            <span className="font-mono text-lg font-bold">{favCount}</span>
            <span className="font-mono text-[11px] text-muted-foreground">收藏</span>
          </Link>
        </div>
        </>
        )}

        {/* Menu sections */}
        <div className="mt-4">
          <p className="px-4 font-mono text-[11px] font-medium text-muted-foreground">车辆管理</p>
          <div className="mt-1">
            <MenuRow
              icon={<Car className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="我的发布"
              value={loading ? undefined : `${myCars.length} 辆`}
              href="/account/listings"
            />
            <MenuRow
              icon={<Heart className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="我的收藏"
              value={loading ? undefined : `${favCount} 辆`}
              href="/account/favorites"
            />
            <MenuRow
              icon={<Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="发布新车"
              href="/post"
            />
            {draft && (draft.form?.make || draft.imageUrls?.length > 0) && (
              <MenuRow
                icon={<FileText className="h-4 w-4 text-amber-500" strokeWidth={1.5} />}
                label="继续编辑草稿"
                href="/post"
              />
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="px-4 font-mono text-[11px] font-medium text-muted-foreground">账号</p>
          <div className="mt-1">
            <MenuRow
              icon={<Settings className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="账号设置"
              href="/account/settings"
            />
            {mounted && (
              <MenuRow
                icon={theme === "dark"
                  ? <Sun className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  : <Moon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                }
                label={theme === "dark" ? "浅色模式" : "深色模式"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            )}
            {profile?.role === "admin" && (
              <MenuRow
                icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="管理后台"
                href="/admin"
              />
            )}
            <MenuRow
              icon={<Headset className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="联系客服"
              href="/contact"
            />
            <MenuRow
              icon={<Handshake className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="商业合作"
              href="/business"
            />
            <MenuRow
              icon={<ScrollText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
              label="用户协议"
              href="/terms"
            />
            <MenuRow
              icon={<LogOut className="h-4 w-4 text-destructive" strokeWidth={1.5} />}
              label="退出登录"
              onClick={handleLogout}
              destructive
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </PullToRefresh>
  );
}
