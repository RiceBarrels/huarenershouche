"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { useRouteParams } from "@/lib/use-route-params";
import {
  Ban, Check, Loader2, Trash2, Eye, Pencil, Store,
  MessageSquare, Car, AlertTriangle, Save, Mail, Phone, Clock,
  Handshake, Link2, Unlink, MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { carTitle } from "@/lib/i18n";
import { avatarUrl } from "@/lib/avatar";
import { carLink, carEditLink } from "@/lib/static-link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguagePicker } from "@/components/language-picker";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbProfile, DbCar, DbDealerStore, DbUserIpGeo } from "@/lib/types";
import { fetchUserIpGeo } from "@/lib/analytics/admin";
import { formatGeoWithFlag } from "@/lib/analytics/geo";
import { UserActivity } from "@/components/admin/analytics/user-activity";
import { cityFromAddress } from "@/components/admin/analytics/user-region";

interface EditForm {
  username: string;
  phone: string;
  location: string;
  preferred_language: string;
  languages: string[];
  account_type: "private" | "dealer";
  is_system: boolean;
  role: "user" | "admin";
  banned: boolean;
  banned_reason: string;
}

// 账号类型三选一:个人 / 车行 / 系统。系统类型 = 车行账号 + is_system 标记(自动检索车源)。
type AccountKind = "private" | "dealer" | "system";
function toKind(f: Pick<EditForm, "account_type" | "is_system">): AccountKind {
  return f.is_system ? "system" : f.account_type;
}

const STATUS_LABEL: Record<string, string> = {
  active: "在售", sold: "已售", pending: "待审", removed: "已下架",
};

function carStatusLabel(c: DbCar): string {
  return STATUS_LABEL[c.status] || c.status;
}

export default function AdminUserManagePage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const params = useRouteParams<{ id: string }>();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);

  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [cars, setCars] = useState<DbCar[]>([]);
  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [convCount, setConvCount] = useState(0);
  const [authInfo, setAuthInfo] = useState<{
    email: string | null;
    email_confirmed_at: string | null;
    phone: string | null;
    last_sign_in_at: string | null;
    auth_created_at: string | null;
  } | null>(null);
  // 邮箱等 auth 信息的读取状态:RPC 出错时不能停留在"读取中",要把错误亮出来
  const [authState, setAuthState] = useState<"loading" | "done" | "error">("loading");
  // IP 地区(user_ip_geo;表未建/无记录时为 null,回退资料地区 / 门店城市)
  const [ipGeo, setIpGeo] = useState<DbUserIpGeo | null>(null);

  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 认领人（仅系统账号)
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [claimInput, setClaimInput] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const [profRes, carsRes, storesRes, postRes, convBuyerRes, convSellerRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("cars").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
      supabase.from("dealer_stores").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
      supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("seller_id", userId),
    ]);

    const p = profRes.data as DbProfile | null;
    setProfile(p);
    setCars((carsRes.data as DbCar[]) || []);
    setStores((storesRes.data as DbDealerStore[]) || []);
    setPostCount(postRes.count ?? 0);
    setConvCount((convBuyerRes.count ?? 0) + (convSellerRes.count ?? 0));

    // IP 地区(与下面的 auth 信息并行,不阻塞)
    fetchUserIpGeo([userId])
      .then((m) => setIpGeo(m[userId] ?? null))
      .catch(() => setIpGeo(null));

    // 邮箱等 auth 信息（auth.users 需经 RPC 读取;函数缺失/无权限时显式进入 error 态）
    const { data: authRows, error: authErr } = await supabase.rpc("admin_get_auth_user", { target: userId });
    if (authErr) {
      setAuthInfo(null);
      setAuthState("error");
    } else {
      setAuthInfo(Array.isArray(authRows) && authRows.length > 0 ? authRows[0] : null);
      setAuthState("done");
    }

    // 系统账号的认领人昵称
    if (p?.is_system && p.claimed_by) {
      const { data: owner } = await supabase.from("profiles").select("id, username").eq("id", p.claimed_by).maybeSingle();
      setOwnerName((owner as { username: string | null } | null)?.username || null);
    } else {
      setOwnerName(null);
    }

    if (p) {
      setForm({
        username: p.username || "",
        phone: p.phone || "",
        location: p.location || "",
        preferred_language: p.preferred_language || "zh",
        languages: (p.languages as string[] | null) || [],
        account_type: p.account_type || "private",
        is_system: !!p.is_system,
        role: p.role || "user",
        banned: !!p.banned,
        banned_reason: p.banned_reason || "",
      });
    }
  }, [userId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setSelfId(user.id);

      const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!me || me.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);

      await load();
      setLoading(false);
    }
    init();
  }, [router, load]);

  function upd<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSavedAt(false);
  }

  async function handleSave() {
    if (!form || !profile || !selfId) return;
    setError("");
    if (form.banned && !form.banned_reason.trim()) {
      setError(t("封禁需要填写原因"));
      return;
    }
    setSaving(true);

    const wasBannedBefore = profile.banned;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        username: form.username || null,
        phone: form.phone || null,
        location: form.location || null,
        preferred_language: form.preferred_language,
        languages: form.languages,
        account_type: form.account_type,
        is_system: form.is_system,
        role: form.role,
        banned: form.banned,
        banned_at: form.banned ? (profile.banned_at || new Date().toISOString()) : null,
        banned_reason: form.banned ? form.banned_reason : null,
      })
      .eq("id", userId);

    if (updErr) {
      setError(t("保存失败: {msg}", { msg: updErr.message }));
      setSaving(false);
      return;
    }

    // 新封禁：连带下架其在售车源
    if (form.banned && !wasBannedBefore) {
      await supabase.from("cars").update({ status: "removed" }).eq("seller_id", userId).eq("status", "active");
    }

    await supabase.from("admin_actions").insert({
      admin_id: selfId,
      action: "edit_user",
      target_type: "user",
      target_id: userId,
      detail: form.banned && !wasBannedBefore ? `ban: ${form.banned_reason}` : "update_profile",
    });

    setSaving(false);
    setSavedAt(true);
    await load();
  }

  async function handleLinkClaim() {
    if (!selfId) return;
    const input = claimInput.trim();
    if (!input) { setClaimError(t("请填写认领人的邮箱或 UUID")); return; }
    setClaimError("");
    setClaimBusy(true);

    let ownerId: string | null = null;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(input)) {
      ownerId = input;
    } else {
      const { data: found, error: findErr } = await supabase.rpc("admin_find_profile_by_email", { lookup_email: input });
      if (findErr) { setClaimError(findErr.message); setClaimBusy(false); return; }
      const row = Array.isArray(found) && found.length > 0 ? found[0] : null;
      if (!row) { setClaimError(t("未找到该邮箱对应的用户")); setClaimBusy(false); return; }
      ownerId = row.id as string;
    }

    const { error: claimErr } = await supabase.rpc("admin_set_claim", { target_system: userId, owner: ownerId });
    if (claimErr) { setClaimError(claimErr.message); setClaimBusy(false); return; }

    await supabase.from("admin_actions").insert({
      admin_id: selfId,
      action: "set_claim",
      target_type: "user",
      target_id: userId,
      detail: input,
    });

    setClaimInput("");
    setClaimBusy(false);
    await load();
  }

  async function handleClearClaim() {
    if (!selfId) return;
    setClaimError("");
    setClaimBusy(true);

    const { error: claimErr } = await supabase.rpc("admin_set_claim", { target_system: userId, owner: null });
    if (claimErr) { setClaimError(claimErr.message); setClaimBusy(false); return; }

    await supabase.from("admin_actions").insert({
      admin_id: selfId,
      action: "clear_claim",
      target_type: "user",
      target_id: userId,
      detail: "unlink",
    });

    setClaimBusy(false);
    await load();
  }

  async function handleDeleteUser() {
    if (!profile) return;
    const confirmName = profile.username || userId.slice(0, 8);
    if (!confirm(t("确定永久删除用户「{name}」？\n\n将同时删除该用户的全部车源、帖子、评论、车行、对话等数据，操作不可恢复。", { name: confirmName }))) return;
    setError("");
    setDeleting(true);

    const { error: rpcErr } = await supabase.rpc("admin_delete_user", { target: userId });
    if (rpcErr) {
      setError(t("删除失败: {msg}", { msg: rpcErr.message }));
      setDeleting(false);
      return;
    }
    if (selfId) {
      await supabase.from("admin_actions").insert({
        admin_id: selfId,
        action: "delete_user",
        target_type: "user",
        target_id: userId,
        detail: confirmName,
      });
    }
    router.push("/admin");
  }

  async function removeCar(carId: string) {
    setActionId(carId);
    await supabase.from("cars").update({ status: "removed" }).eq("id", carId);
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: "removed" as const } : c)));
    setActionId(null);
  }

  async function restoreCar(carId: string) {
    setActionId(carId);
    await supabase.from("cars").update({ status: "active" }).eq("id", carId);
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: "active" as const } : c)));
    setActionId(null);
  }

  async function deleteCar(carId: string) {
    if (!confirm(t("永久删除这辆车？"))) return;
    setActionId(carId);
    const { error: e } = await supabase.from("cars").delete().eq("id", carId);
    if (e) { alert(t("删除失败: {msg}", { msg: e.message })); setActionId(null); return; }
    setCars((prev) => prev.filter((c) => c.id !== carId));
    setActionId(null);
  }

  if (loading || !form) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <div className="mx-auto w-full max-w-2xl px-4 py-4 md:py-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-24 w-full" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <p className="py-12 text-center text-xs text-muted-foreground">{t("找不到该用户")}</p>
          <div className="text-center">
            <Link href="/admin"><Button variant="secondary" size="sm" className="text-xs">{t("返回管理后台")}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = cars.filter((c) => c.status === "active").length;
  // 地区:IP 定位 > 资料地区 > 系统账号门店城市(stores 按创建倒序,取最早一家能解析的)
  const ipRegion = ipGeo ? formatGeoWithFlag(ipGeo, locale) : "";
  const storeCity = profile.is_system
    ? stores.map((s) => cityFromAddress(s.address)).filter(Boolean).pop() ?? null
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-4 md:py-8">

        {/* Identity header */}
        <div className="flex items-start gap-3 rounded-xl bg-card p-3">
          <img src={avatarUrl(profile.avatar_url, profile.username)} alt="" className="h-14 w-14 shrink-0 rounded-full bg-muted object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-base font-semibold">{profile.username || t("未设置昵称")}</h1>
              {profile.is_system ? (
                <span className="rounded-full bg-foreground/80 px-1 py-0.5 text-[10px] text-background">{t("系统")}</span>
              ) : profile.account_type === "dealer" ? (
                <span className="rounded-full bg-muted px-1 py-0.5 text-[10px]">{t("车行")}</span>
              ) : null}
              {profile.role === "admin" && <span className="rounded-full bg-foreground px-1 py-0.5 text-[10px] text-background">{t("管理员")}</span>}
              {profile.banned && <span className="rounded-full bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600 dark:text-red-400">{t("已封禁")}</span>}
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px]">
              <Mail className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              {authState === "loading" ? (
                <span className="text-muted-foreground">{t("邮箱读取中…")}</span>
              ) : authState === "error" ? (
                <span className="text-red-600 dark:text-red-400">
                  {t("邮箱读取失败：数据库缺少 admin_get_auth_user 函数（执行 supabase/admin-expiry.sql 中对应段落）")}
                </span>
              ) : authInfo?.email ? (
                <>
                  <a href={`mailto:${authInfo.email}`} className="break-all font-medium hover:underline">{authInfo.email}</a>
                  {authInfo.email_confirmed_at ? (
                    <span className="shrink-0 text-[9px] text-emerald-600 dark:text-emerald-400">{t("已验证")}</span>
                  ) : (
                    <span className="shrink-0 text-[9px] text-amber-600">{t("未验证")}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{t("无邮箱")}</span>
              )}
            </p>
            {authInfo?.phone && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                {authInfo.phone}
              </p>
            )}
            <p className="mt-0.5 break-all text-[10px] text-muted-foreground">{profile.id}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {t("注册于")} {new Date(profile.created_at).toLocaleString("zh-CN")}
              {authInfo?.last_sign_in_at && <> · {t("最近登录")} {new Date(authInfo.last_sign_in_at).toLocaleString("zh-CN")}</>}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {ipRegion ? (
                <>
                  <span className="text-foreground">{ipRegion}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1 py-0.5 text-[9px]">{t("IP 定位")}</span>
                </>
              ) : (
                profile.location || storeCity || t("未知地区")
              )}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { icon: <Car className="h-3.5 w-3.5" strokeWidth={1.5} />, label: t("车源"), value: `${activeCount}/${cars.length}` },
            { icon: <Store className="h-3.5 w-3.5" strokeWidth={1.5} />, label: t("车行"), value: stores.length },
            { icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />, label: t("帖子"), value: postCount },
            { icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />, label: t("对话"), value: convCount },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-xl bg-card py-2">
              <span className="text-muted-foreground">{s.icon}</span>
              <span className="text-sm font-semibold">{s.value}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <div className="mt-5">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("编辑资料")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">{t("昵称")}</Label>
              <Input className="mt-1 h-9 text-xs" value={form.username} onChange={(e) => upd("username", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{t("电话")}</Label>
              <Input className="mt-1 h-9 text-xs" value={form.phone} onChange={(e) => upd("phone", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{t("地区")}</Label>
              <Input className="mt-1 h-9 text-xs" value={form.location} onChange={(e) => upd("location", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{t("语言")}</Label>
              <select
                className="mt-1 h-9 w-full rounded-xl bg-muted px-2 text-xs transition-colors focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                value={form.preferred_language}
                onChange={(e) => upd("preferred_language", e.target.value)}
              >
                <option value="zh">{t("中文")}</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] text-muted-foreground">{t("沟通语言")}</Label>
              <LanguagePicker size="sm" className="mt-1.5" value={form.languages} onChange={(v) => upd("languages", v)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{t("账号类型")}</Label>
              <select
                className="mt-1 h-9 w-full rounded-xl bg-muted px-2 text-xs transition-colors focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                value={toKind(form)}
                onChange={(e) => {
                  const kind = e.target.value as AccountKind;
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          account_type: kind === "private" ? "private" : "dealer",
                          is_system: kind === "system",
                        }
                      : f,
                  );
                  setSavedAt(false);
                }}
              >
                <option value="private">{t("个人")}</option>
                <option value="dealer">{t("车行")}</option>
                <option value="system">{t("系统（自动检索车源）")}</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{t("角色权限")}</Label>
              <select
                className="mt-1 h-9 w-full rounded-xl bg-muted px-2 text-xs transition-colors focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                value={form.role}
                onChange={(e) => upd("role", e.target.value as EditForm["role"])}
              >
                <option value="user">{t("普通用户")}</option>
                <option value="admin">{t("管理员")}</option>
              </select>
            </div>
          </div>

          {/* Ban control */}
          <div className="mt-3 rounded-xl bg-card p-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.banned}
                onChange={(e) => upd("banned", e.target.checked)}
                className="h-3.5 w-3.5 accent-red-600"
              />
              <Ban className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={1.5} />
              {t("封禁该用户")}
            </label>
            {form.banned && (
              <Input
                className="mt-2 h-8 text-xs"
                placeholder={t("封禁原因（必填）")}
                value={form.banned_reason}
                onChange={(e) => upd("banned_reason", e.target.value)}
              />
            )}
            <p className="mt-1.5 text-[10px] text-muted-foreground">{t("首次封禁会自动下架该用户所有在售车源。")}</p>
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-destructive/10 px-3 py-2.5">
              <p className="text-[11px] text-destructive">{error}</p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button className="gap-1.5 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {t("保存修改")}
            </Button>
            {savedAt && <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" strokeWidth={2} />{t("已保存")}</span>}
          </div>
        </div>

        {/* Listings */}
        {cars.length > 0 && (
          <div className="mt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold">
              <Car className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t("该用户的车源")} ({cars.length})
            </h2>
            <div className="mt-3 space-y-2">
              {cars.map((car) => (
                <div key={car.id} className={`flex items-center gap-3 rounded-xl p-2 ${car.status === "removed" ? "bg-red-500/10 opacity-70" : "bg-card"}`}>
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {car.image_url ? <img src={car.image_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-medium">{carTitle(car, locale)}</p>
                      <span className="shrink-0 rounded-full bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{t(carStatusLabel(car))}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">${car.price?.toLocaleString()} · {car.location_zh}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(carLink(car.id), "_blank")} title={t("查看")}>
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(carEditLink(car.id), "_blank")} title={t("编辑")}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    {car.status === "active" ? (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={() => removeCar(car.id)} disabled={actionId === car.id} title={t("下架")}>
                        {actionId === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      </Button>
                    ) : car.status === "removed" ? (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 dark:text-emerald-400" onClick={() => restoreCar(car.id)} disabled={actionId === car.id} title={t("重新上架")}>
                        {actionId === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 dark:text-red-400" onClick={() => deleteCar(car.id)} disabled={actionId === car.id} title={t("永久删除")}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 浏览记录(访问统计:IP 定位 + 最近事件 + 完整轨迹) */}
        <div className="mt-6">
          <UserActivity userId={userId} />
        </div>

        {/* Stores */}
        {stores.length > 0 && (
          <div className="mt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold">
              <Store className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t("车行")} ({stores.length})
            </h2>
            <div className="mt-3 space-y-2">
              {stores.map((s) => (
                <div key={s.id} className="rounded-xl bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium">{s.name}</p>
                    <span className={`rounded-full px-1 py-0.5 text-[10px] ${
                      s.verification_status === "verified" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : s.verification_status === "pending" ? "bg-amber-500/10 text-amber-600"
                        : s.verification_status === "rejected" ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {s.verification_status === "verified" ? t("已认证") : s.verification_status === "pending" ? t("待审核") : s.verification_status === "rejected" ? t("已拒绝") : t("未认证")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.address}</p>
                  {s.phone && <p className="text-[11px] text-muted-foreground">{t("电话:")} {s.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner / claim (系统账号) */}
        {profile.is_system && (
          <div className="mt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold">
              <Handshake className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t("认领人 (Owner)")}
            </h2>
            <div className="mt-3 rounded-xl bg-card p-3">
              {profile.claimed_by ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{t("已认领:")}</span>
                    <span className="font-medium">{ownerName || profile.claimed_by.slice(0, 8)}</span>
                  </div>
                  <p className="break-all text-[10px] text-muted-foreground">{profile.claimed_by}</p>
                  {claimError && <p className="text-[11px] text-destructive">{claimError}</p>}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={claimBusy}
                    onClick={handleClearClaim}
                  >
                    {claimBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    {t("解除认领")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-muted-foreground">{t("将此系统账号认领给一位真实用户来运营。填写对方的邮箱或用户 UUID。")}</p>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">{t("认领人邮箱 / UUID")}</Label>
                    <Input
                      className="mt-1 h-9 text-xs"
                      placeholder={t("owner@example.com 或 UUID")}
                      value={claimInput}
                      onChange={(e) => { setClaimInput(e.target.value); setClaimError(""); }}
                    />
                  </div>
                  {claimError && <p className="text-[11px] text-destructive">{claimError}</p>}
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={claimBusy || !claimInput.trim()}
                    onClick={handleLinkClaim}
                  >
                    {claimBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    {t("链接认领人")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-8 rounded-xl bg-red-50/50 p-3 dark:bg-red-950/10">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("危险操作")}
          </h2>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("永久删除该用户，同时清除其全部车源、帖子、评论、车行、对话等数据。此操作不可恢复。")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2.5 gap-1.5 bg-red-500/10 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/30"
            onClick={handleDeleteUser}
            disabled={deleting || profile.id === selfId}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {profile.id === selfId ? t("不能删除自己") : t("永久删除此用户")}
          </Button>
        </div>
      </div>
    </div>
  );
}
