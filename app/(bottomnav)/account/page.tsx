"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Heart, Camera, Loader2, Store, MapPin, MessageSquare,
  FileText, ChevronRight, Car, Settings, LogOut, Moon, Sun, ScrollText, ShieldCheck,
  Headset, Handshake, UserCircle, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/count-up";
import { useCachedData } from "@/lib/use-cached-data";
import { useIdentity, ACTING_KEY } from "@/components/identity-provider";
import type { DbCar, DbProfile } from "@/lib/types";

const DRAFT_KEY = "huaren_post_draft";

interface PostDraft {
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
}

// Menu row — flat 1px-bordered list item
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
    <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted ${destructive ? "text-destructive" : ""}`}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex-1 font-mono text-sm">{label}</span>
      {value && <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return <button type="button" className="w-full text-left" onClick={onClick}>{inner}</button>;
}

// Uppercase micro-label group title above a 1px rule
function GroupTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// Stat cell for the data strip
function StatCell({
  href, value, label, brand, animate,
}: {
  href: string;
  value: number;
  label: string;
  brand?: boolean;
  animate: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted">
      {animate ? (
        <CountUp value={value} className={`font-mono text-xl font-semibold tabular-nums ${brand ? "text-brand" : ""}`} />
      ) : (
        <span className={`font-mono text-xl font-semibold tabular-nums ${brand ? "text-brand" : ""}`}>{value}</span>
      )}
      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">{label}</span>
    </Link>
  );
}

export default function AccountPage() {
  return <Suspense><AccountContent /></Suspense>;
}

function AccountContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // undefined = 鉴权中，null = 未登录
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 身份切换:切换成车行时,资料/车源/收藏都按 acct(操作身份)展示
  const { actingId, isActingAsClaimed, claimedAccounts, switchTo, switchToSelf } = useIdentity();
  // IdentityProvider 校验完成前,先信任 localStorage 里的操作身份,让缓存数据立即可显示
  const [localActing] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(ACTING_KEY); } catch { return null; }
  });
  const acct = actingId ?? localActing ?? (user || null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // getSession 读本地会话(不走网络),首屏直接用 localStorage 缓存渲染
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user?.id ?? null);
    });
    try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) setDraft(JSON.parse(raw)); } catch {}
  }, []);

  const { data: profile, loading: profileLoading, mutate: mutateProfile } = useCachedData<DbProfile | null>(
    acct ? `account_profile_${acct}` : null,
    async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", acct!).maybeSingle();
      return (data as DbProfile) || null;
    },
    [acct],
  );

  const { data: myCars, loading: carsLoading, mutate: mutateCars } = useCachedData<DbCar[]>(
    acct ? `account_cars_${acct}` : null,
    async () => {
      const { data } = await supabase.from("cars").select("*").eq("seller_id", acct!).order("created_at", { ascending: false });
      return (data as DbCar[]) || [];
    },
    [acct],
  );

  const { data: favCount, loading: favLoading, mutate: mutateFavCount } = useCachedData<number>(
    acct ? `account_favcount_${acct}` : null,
    async () => {
      const { count } = await supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", acct!);
      return count || 0;
    },
    [acct],
  );

  const loading =
    user === undefined || (user !== null && profileLoading && carsLoading);

  // 下拉刷新：真正重新拉取，而不是原样回写缓存
  const loadAccount = useCallback(async () => {
    if (!acct) return;
    const [profileRes, carsRes, favRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", acct).maybeSingle(),
      supabase.from("cars").select("*").eq("seller_id", acct).order("created_at", { ascending: false }),
      supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", acct),
    ]);
    if (profileRes.data !== undefined) mutateProfile((profileRes.data as DbProfile) || null);
    if (carsRes.data) mutateCars(carsRes.data as DbCar[]);
    if (favRes.count !== null) mutateFavCount(favRes.count || 0);
  }, [acct, mutateProfile, mutateCars, mutateFavCount]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 车行身份下头像由存储桶 RLS(按 auth.uid() 文件夹)限制,此处仅本人可换
    if (!file || !user || isActingAsClaimed) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user);
      mutateProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    }
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setDraft(null);
    router.refresh();
  }

  const activeCars = (myCars || []).filter((c) => c.status === "active").length;
  const joinedYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;

  return (
    <PullToRefresh onRefresh={loadAccount}>
    <div
    className="flex min-h-screen flex-col bg-background font-mono"
    style={{
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}
    >
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 md:max-w-5xl md:px-6 md:py-8">
        {/* Header band: profile + data strip */}
        {loading ? (
          <div className="overflow-hidden rounded-xl border border-border md:flex md:items-stretch">
            <div className="flex items-center gap-4 p-4 md:flex-1 md:px-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border border-t border-border md:w-80 md:border-l md:border-t-0 lg:w-96">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2.75 py-3.5">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="overflow-hidden rounded-xl border border-border md:flex md:items-stretch">
          {!user ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center md:flex-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
                <UserCircle className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">未登录 / Guest</p>
              <p className="mt-2 font-mono text-sm">登录后管理车辆、收藏和消息</p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href="/login">
                  <Button size="sm" className="h-9 px-6 font-mono text-xs">登录</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="sm" className="h-9 px-6 font-mono text-xs">注册</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 md:flex-1 md:px-6 md:py-5">
              <button
                type="button"
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted"
                onClick={() => { if (!isActingAsClaimed) avatarInputRef.current?.click(); }}
                aria-label="更换头像"
                disabled={isActingAsClaimed}
              >
                <img src={avatarUrl(profile?.avatar_url, acct || undefined)} alt="" className="h-full w-full object-cover" />
                {avatarUploading ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  </span>
                ) : !isActingAsClaimed ? (
                  <span className="absolute inset-0 hidden items-center justify-center bg-background/70 group-hover:flex">
                    <Camera className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                ) : null}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-mono text-base font-semibold tracking-tight">
                    {profile?.username || "未设置昵称"}
                  </p>
                  {profile?.account_type === "dealer" ? (
                    <Badge variant="secondary" className="shrink-0 gap-1 font-mono text-[10px]">
                      <Store className="h-3 w-3" strokeWidth={1.5} />认证车行
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">个人</Badge>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {joinedYear && <span>Since {joinedYear}</span>}
                  {profile?.location && (
                    <span className="flex items-center gap-1 normal-case tracking-normal">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />{profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data strip */}
          <div className="grid grid-cols-3 divide-x divide-border border-t border-border md:w-80 md:border-l md:border-t-0 lg:w-96">
            <StatCell href={user ? "/account/listings" : "/login"} value={activeCars} label="在售" brand animate={!!user} />
            <StatCell href={user ? "/account/listings" : "/login"} value={(myCars || []).length} label="发布" animate={!!user} />
            <StatCell href={user ? "/account/favorites" : "/login"} value={favCount || 0} label="收藏" animate={!!user} />
          </div>
        </div>
        )}

        {/* 身份切换：认领过系统车行账号时可切换操作身份 */}
        {user && claimedAccounts.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Store className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                切换身份
              </p>
              {isActingAsClaimed && (
                <Badge variant="secondary" className="ml-auto font-mono text-[10px]">车行模式</Badge>
              )}
            </div>
            <button
              type="button"
              onClick={switchToSelf}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${!isActingAsClaimed ? "bg-muted/40" : ""}`}
            >
              <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <span className="flex-1 font-mono text-sm">本人账号</span>
              {!isActingAsClaimed && <span className="font-mono text-[10px] text-brand">当前</span>}
            </button>
            {claimedAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => switchTo(a.id)}
                className={`flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${actingId === a.id ? "bg-muted/40" : ""}`}
              >
                <img src={avatarUrl(a.avatar_url, a.id)} alt="" className="h-5 w-5 shrink-0 rounded-full border border-border object-cover" />
                <span className="flex-1 truncate font-mono text-sm">{a.username}</span>
                {actingId === a.id ? (
                  <span className="font-mono text-[10px] text-brand">当前</span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">车行</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Menu sections */}
        <div className="mt-6 space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
          <div>
            <GroupTitle label="车辆管理" />
            <div className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
              <MenuRow
                icon={<Car className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="我的发布"
                value={user ? `${(myCars || []).length} 辆` : undefined}
                href={user ? "/account/listings" : "/login"}
              />
              <MenuRow
                icon={<BarChart3 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="数据面板"
                href={user ? "/account/dashboard" : "/login"}
              />
              <MenuRow
                icon={<Heart className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="我的收藏"
                value={user ? `${favCount || 0} 辆` : undefined}
                href={user ? "/account/favorites" : "/login"}
              />
              <MenuRow
                icon={<MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="消息"
                href={user ? "/messages" : "/login"}
              />
              <MenuRow
                icon={<Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="发布新车"
                href={user ? "/post" : "/login"}
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

          <div>
            <GroupTitle label="账号" />
            <div className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
              <MenuRow
                icon={<Settings className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="账号设置"
                href={user ? "/account/settings" : "/login"}
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
                icon={<Store className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                label="车行入驻"
                value={profile?.account_type === "dealer" ? "已认证" : undefined}
                href={user ? "/dealer-apply" : "/login"}
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
              {user ? (
                <MenuRow
                  icon={<LogOut className="h-4 w-4 text-destructive" strokeWidth={1.5} />}
                  label="退出登录"
                  onClick={handleLogout}
                  destructive
                />
              ) : (
                <MenuRow
                  icon={<UserCircle className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
                  label="登录 / 注册"
                  href="/login"
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </PullToRefresh>
  );
}
