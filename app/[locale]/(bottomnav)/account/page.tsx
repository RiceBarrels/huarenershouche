"use client";

// 我的账户(iOS 26 风格):个人资料头卡 + 数据条 + 白色分组
// 菜单。原「设置」中间页已拆进本页 —— 账号与安全 / 通知 / 个性化 /
// 门店认证 / 客服 / 协议 均为本页分组行,子页保留原路由。

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { useTheme } from "next-themes";
import {
  Plus, Heart, Camera, Loader2, Store, MapPin, MessageSquare,
  FileText, ChevronRight, Car, Palette, ShieldCheck,
  Handshake, UserCircle, BarChart3, Lock, Bell, Headset, ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarViewer } from "@/components/avatar-viewer";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import { SettingsGroup, SettingsRow, GroupFooter } from "@/components/ios-settings";
import { triggerHaptic } from "@/lib/haptics";
import { useCachedData } from "@/lib/use-cached-data";
import { useIdentity, ACTING_KEY } from "@/components/identity-provider";
import { useI18n } from "@/components/i18n-provider";
import type { DbCar, DbProfile } from "@/lib/types";

const DRAFT_KEY = "huaren_post_draft";

interface PostDraft {
  form: Record<string, string>;
  imageUrls: string[];
  features: string[];
}

const THEME_LABELS: Record<string, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

export default function AccountPage() {
  return <Suspense><AccountContent /></Suspense>;
}

function AccountContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // undefined = 鉴权中，null = 未登录
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 身份切换:切换成车行时,资料/车源/收藏都按 acct(操作身份)展示
  const { actingId, isActingAsClaimed, claimedAccounts, switchTo, switchToSelf } = useIdentity();
  // IdentityProvider 校验完成前,先信任 localStorage 里的操作身份,让缓存数据立即可显示
  const [localActing] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(ACTING_KEY); } catch { return null; }
  });
  const acct = actingId ?? localActing ?? (user || null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载检测,仅首帧一次
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // getSession 读本地会话(不走网络),首屏直接用 localStorage 缓存渲染
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user?.id ?? null);
      setEmail(data.session?.user?.email ?? "");
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 读 localStorage 草稿,仅首帧一次
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

  const { data: favCount, mutate: mutateFavCount } = useCachedData<number>(
    acct ? `account_favcount_${acct}` : null,
    async () => {
      const { count } = await supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", acct!);
      return count || 0;
    },
    [acct],
  );

  // 门店数(设置拆进本页后,「门店与车行认证」行需要展示当前值)
  const { data: storeCount, mutate: mutateStoreCount } = useCachedData<number>(
    user ? `account_storecount_${user}` : null,
    async () => {
      const { count } = await supabase.from("dealer_stores").select("id", { count: "exact", head: true }).eq("owner_id", user!);
      return count || 0;
    },
    [user],
  );

  const loading =
    user === undefined || (user !== null && profileLoading && carsLoading);

  // 下拉刷新：真正重新拉取，而不是原样回写缓存
  const loadAccount = useCallback(async () => {
    if (!acct) return;
    const [profileRes, carsRes, favRes, storeRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", acct).maybeSingle(),
      supabase.from("cars").select("*").eq("seller_id", acct).order("created_at", { ascending: false }),
      supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", acct),
      user
        ? supabase.from("dealer_stores").select("id", { count: "exact", head: true }).eq("owner_id", user)
        : Promise.resolve({ count: null }),
    ]);
    if (profileRes.data !== undefined) mutateProfile((profileRes.data as DbProfile) || null);
    if (carsRes.data) mutateCars(carsRes.data as DbCar[]);
    if (favRes.count !== null) mutateFavCount(favRes.count || 0);
    if (storeRes.count !== null && storeRes.count !== undefined) mutateStoreCount(storeRes.count || 0);
  }, [acct, user, mutateProfile, mutateCars, mutateFavCount, mutateStoreCount]);

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
    if (loggingOut) return;
    setLoggingOut(true);
    // 需要登录态的清理先做(RLS 依赖会话):删本机推送 token,其他设备不受影响
    try {
      const token = localStorage.getItem("clc_push_token");
      if (token) await supabase.from("push_tokens").delete().eq("token", token);
    } catch {}
    // 清掉车行操作身份,避免下次登录残留
    try { localStorage.removeItem(ACTING_KEY); } catch {}
    switchToSelf();
    // 仅退出本设备,不影响其他已登录设备
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    triggerHaptic();
    setUser(null);
    setEmail("");
    setDraft(null);
    setLoggingOut(false);
    setLogoutOpen(false);
    router.refresh();
  }

  const joinedYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;
  const iconCls = "h-5 w-5";

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
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:max-w-5xl md:px-6 md:py-8">
        {/* Header band: profile + data strip */}
        {loading ? (
          <SettingsGroup>
            <div className="flex items-center gap-4 p-4 md:px-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </SettingsGroup>
        ) : (
        <SettingsGroup>
          {!user ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <UserCircle className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("未登录 / Guest")}</p>
              <p className="mt-2 font-mono text-sm">{t("登录后管理车辆、收藏和消息")}</p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href="/login">
                  <Button size="sm" className="h-9 px-6 font-mono text-xs">{t("登录")}</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="sm" className="h-9 px-6 font-mono text-xs">{t("注册")}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 md:px-6 md:py-5">
              <button
                type="button"
                // 桌面头卡更宽,头像升一号避免"小头像大空卡"
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted md:h-20 md:w-20"
                onClick={() => setAvatarViewOpen(true)}
                aria-label={t("查看头像")}
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
              {/* 头像放大查看:菜单可保存;本人(非车行代操作)可更换 */}
              <AvatarViewer
                src={avatarUrl(profile?.avatar_url, acct || undefined)}
                alt={profile?.username || t("头像")}
                open={avatarViewOpen}
                onClose={() => setAvatarViewOpen(false)}
                onEdit={!isActingAsClaimed ? () => avatarInputRef.current?.click() : undefined}
              />
              <Link href="/account/settings/profile" className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-mono text-[17px] font-semibold tracking-tight">
                      {profile?.username || t("未设置昵称")}
                    </span>
                    {profile?.account_type === "dealer" ? (
                      <Badge variant="secondary" className="shrink-0 gap-1 font-mono text-[10px]">
                        <Store className="h-3 w-3" strokeWidth={2} />{t("认证车行")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">{t("个人")}</Badge>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted-foreground">
                    {joinedYear && <span>{t("{y} 年加入", { y: joinedYear })}</span>}
                    {profile?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" strokeWidth={2} />{profile.location}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
              </Link>
            </div>
          )}

        </SettingsGroup>
        )}

        {/* 身份切换：认领过系统车行账号时可切换操作身份 */}
        {user && claimedAccounts.length > 0 && (
          <SettingsGroup className="mt-5">
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
              <Store className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("切换身份")}
              </p>
              {isActingAsClaimed && (
                <Badge variant="secondary" className="ml-auto font-mono text-[10px]">{t("车行模式")}</Badge>
              )}
            </div>
            <button
              type="button"
              onClick={switchToSelf}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/60 md:hover:bg-muted/40 ${!isActingAsClaimed ? "bg-muted/40" : ""}`}
            >
              <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <span className="flex-1 font-mono text-sm">{t("本人账号")}</span>
              {!isActingAsClaimed && <span className="font-mono text-[10px] text-brand-ink">{t("当前")}</span>}
            </button>
            {claimedAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => switchTo(a.id)}
                className={`flex w-full items-center gap-3 border-t border-border/50 px-4 py-3 text-left transition-colors active:bg-muted/60 md:hover:bg-muted/40 ${actingId === a.id ? "bg-muted/40" : ""}`}
              >
                <img src={avatarUrl(a.avatar_url, a.id)} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                <span className="flex-1 truncate font-mono text-sm">{a.username}</span>
                {actingId === a.id ? (
                  <span className="font-mono text-[10px] text-brand-ink">{t("当前")}</span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">{t("车行")}</span>
                )}
              </button>
            ))}
          </SettingsGroup>
        )}

        {/* 分组菜单:设置中间页已拆进本页,行内彩色线条图标 */}
        <div className="mt-5 space-y-5 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
          <div className="space-y-5">
            <SettingsGroup>
              <SettingsRow
                icon={<Car className={`${iconCls} text-blue-500`} strokeWidth={1.5} />}
                label={t("我的发布")}
                value={user ? t("{n} 辆", { n: (myCars || []).length }) : undefined}
                href={user ? "/account/listings" : "/login"}
              />
              <SettingsRow
                icon={<Heart className={`${iconCls} text-red-500`} strokeWidth={1.5} />}
                label={t("我的收藏")}
                value={user ? t("{n} 辆", { n: favCount || 0 }) : undefined}
                href={user ? "/account/favorites" : "/login"}
              />
              <SettingsRow
                icon={<BarChart3 className={`${iconCls} text-emerald-500`} strokeWidth={1.5} />}
                label={t("数据面板")}
                href={user ? "/account/dashboard" : "/login"}
              />
              {draft && (draft.form?.make || draft.imageUrls?.length > 0) && (
                <SettingsRow
                  icon={<FileText className={`${iconCls} text-slate-400`} strokeWidth={1.5} />}
                  label={t("继续编辑草稿")}
                  href="/post"
                />
              )}
            </SettingsGroup>

            <SettingsGroup>
              <SettingsRow
                icon={<MessageSquare className={`${iconCls} text-green-500`} strokeWidth={1.5} />}
                label={t("消息")}
                href={user ? "/messages" : "/login"}
              />
              <SettingsRow
                icon={<Plus className={`${iconCls} text-orange-500`} strokeWidth={1.5} />}
                label={t("发布新车")}
                href={user ? "/post" : "/login"}
              />
            </SettingsGroup>

            <SettingsGroup>
              <SettingsRow
                icon={<Store className={`${iconCls} text-indigo-500`} strokeWidth={1.5} />}
                label={t("车行入驻")}
                value={profile?.account_type === "dealer" ? t("已认证") : undefined}
                href={user ? "/dealer-apply" : "/login"}
              />
              <SettingsRow
                icon={<Handshake className={`${iconCls} text-teal-500`} strokeWidth={1.5} />}
                label={t("商业合作")}
                href="/business"
              />
            </SettingsGroup>
          </div>

          <div className="space-y-5">
            {/* 原「设置」页分组,直接拆到这里 */}
            <SettingsGroup>
              <SettingsRow
                icon={<Lock className={`${iconCls} text-sky-500`} strokeWidth={1.5} />}
                label={t("账号与安全")}
                value={user ? email || undefined : undefined}
                href={user ? "/account/settings/security" : "/login"}
              />
              <SettingsRow
                icon={<Bell className={`${iconCls} text-rose-500`} strokeWidth={1.5} />}
                label={t("通知设置")}
                href={user ? "/account/settings/notifications" : "/login"}
              />
              {mounted && (
                <SettingsRow
                  icon={<Palette className={`${iconCls} text-purple-500`} strokeWidth={1.5} />}
                  label={t("个性化")}
                  value={THEME_LABELS[theme ?? "system"] ? t(THEME_LABELS[theme ?? "system"]) : undefined}
                  href="/account/settings/appearance"
                />
              )}
            </SettingsGroup>

            {user && (
              <>
                <SettingsGroup capsule>
                  <SettingsRow
                    icon={<Store className={`${iconCls} text-amber-500`} strokeWidth={1.5} />}
                    label={t("门店与车行认证")}
                    value={
                      profile?.account_type === "dealer"
                        ? t("认证车行")
                        : storeCount
                          ? t("{n} 家门店", { n: storeCount })
                          : undefined
                    }
                    href="/account/settings/stores"
                  />
                </SettingsGroup>
                {profile?.account_type !== "dealer" && (
                  <GroupFooter>{t("添加门店并通过认证后,可升级为认证车行账号。")}</GroupFooter>
                )}
              </>
            )}

            <SettingsGroup>
              <SettingsRow
                icon={<Headset className={`${iconCls} text-cyan-500`} strokeWidth={1.5} />}
                label={t("联系客服")}
                href="/contact"
              />
              <SettingsRow
                icon={<ScrollText className={`${iconCls} text-stone-400`} strokeWidth={1.5} />}
                label={t("用户协议")}
                href="/terms"
              />
            </SettingsGroup>

            {(profile?.role === "admin" || !user) && (
              <SettingsGroup capsule>
                {profile?.role === "admin" && (
                  <SettingsRow
                    icon={<ShieldCheck className={`${iconCls} text-zinc-600`} strokeWidth={1.5} />}
                    label={t("管理后台")}
                    href="/admin"
                  />
                )}
                {!user && (
                  <SettingsRow
                    icon={<UserCircle className={`${iconCls} text-violet-500`} strokeWidth={1.5} />}
                    label={t("登录 / 注册")}
                    href="/login"
                  />
                )}
              </SettingsGroup>
            )}
          </div>
        </div>

        {/* 退出登录:独立整宽白卡按钮(微信式,置于页面最底) */}
        {user && (
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            // 桌面容器宽达 5xl,整宽红字按钮太夸张:限宽居中并补 hover 态
            className="mt-6 flex min-h-[56px] w-full items-center justify-center rounded-full bg-card text-center font-mono text-[15px] text-destructive transition-colors active:bg-muted/60 md:mx-auto md:max-w-sm md:hover:bg-muted/40"
          >
            {t("退出登录")}
          </button>
        )}

        <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground/60">
          常來車網 · CLCAuto.com
        </p>
      </main>
      <Footer />

      {/* 退出登录确认 */}
      <NonModalDrawer open={logoutOpen} onOpenChange={setLogoutOpen}>
        <div className="px-6 pb-2 pt-3 text-center">
          <p className="font-mono text-base font-semibold">{t("退出登录")}</p>
          <p className="mt-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
            {t("退出后将收不到私信和降价提醒,确定退出当前账号吗?")}
          </p>
        </div>
        <div className="space-y-2.5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4">
          <Button
            variant="destructive"
            className="h-12 w-full font-mono text-[15px] font-semibold transition-transform active:scale-[0.98]"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
            {loggingOut ? t("正在退出…") : t("退出登录")}
          </Button>
          <Button
            variant="secondary"
            className="h-12 w-full font-mono text-[15px] transition-transform active:scale-[0.98]"
            disabled={loggingOut}
            onClick={() => setLogoutOpen(false)}
          >
            {t("取消")}
          </Button>
        </div>
      </NonModalDrawer>
    </div>
    </PullToRefresh>
  );
}
